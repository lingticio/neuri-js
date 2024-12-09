import type OpenAI from 'openai'

export interface StreamChunk {
  raw: () => Uint8Array
  textPart: () => string
  chunk: () => OpenAI.Chat.ChatCompletionChunk
}

function parseChunkFromBuffer(value: Uint8Array) {
  const str = new TextDecoder().decode(value)
  return JSON.parse(str) as unknown as OpenAI.Chat.ChatCompletionChunk
}

function newStreamChunk(raw: Uint8Array, resChunk: OpenAI.Chat.ChatCompletionChunk): StreamChunk {
  return {
    raw: () => raw,
    chunk: () => resChunk,
    textPart: () => resChunk.choices?.[0]?.delta.content ?? '',
  } satisfies StreamChunk
}

export interface StreamResponse {
  /**
   * Get the completion response.
   *
   * @returns The completion response.
   */
  response: () => Promise<any>
  /**
   * Get the entire completion response as a text.
   *
   * @returns The entire completion response as a text.
   */
  text: () => Promise<string>
  /**
   *
   * Get the completion response as a stream of text.
   *
   * @returns The completion response as a stream of text.
   */
  textStream: () => AsyncGenerator<string, void, unknown>
  /**
   * Get the completion response as a stream of chunks.
   *
   * @returns The completion response as a stream of chunks.
   */
  chunkStream: () => AsyncGenerator<StreamChunk, void, unknown>
  /**
   * Get the completion response as a stream of chunks.
   *
   * @returns The completion response as a stream of chunks.
   */
  chunks: () => Promise<StreamChunk[]>
  /**
   * Convert the completion response to a iterable readable stream.
   *
   * This function is 100% sure to be ok to use even if your browser or environments didn't implemented the `Symbol.asyncIterator` feature.
   *
   * @param options
   * @returns
   */
  toReadableStream: () => AsyncGenerator<Uint8Array, void, unknown>
}

interface PipeHook<F, T> {
  onValue?: (value: F) => void
  onChunk?: (chunk: T) => void
  onDone?: () => void
}

async function* asyncIteratorFromReadableStream<T, F = Uint8Array>(res: ReadableStream<F>, func: (value: F) => Promise<T>, hooks?: PipeHook<F, T>[]): AsyncGenerator<T, void, unknown> {
  // reactjs - TS2504: Type 'ReadableStream<Uint8Array>' must have a '[Symbol.asyncIterator]()' method that returns an async iterator - Stack Overflow
  // https://stackoverflow.com/questions/76700924/ts2504-type-readablestreamuint8array-must-have-a-symbol-asynciterator
  const reader = res.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        hooks?.forEach(i => i.onDone?.())
        return
      }

      const chunk = await func(value)
      hooks?.forEach(i => i.onChunk?.(chunk))
      yield chunk
    }
  }
  finally {
    reader.releaseLock()
  }
}

/**
 * Stream the completion response from LLM API.
 *
 * @param params - The parameters to stream the completion response.
 * @param params.options - The options to create the completion.
 * @param params.openAI - The OpenAI instance.
 * @returns The completion response stream.
 */
export async function stream(params: {
  options: Omit<OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming, 'stream'>
  openAI: OpenAI
}): Promise<StreamResponse> {
  const res = await params.openAI.chat.completions.create({ ...params.options, stream: true, stream_options: { include_usage: true } })

  const [fullStream, rawStream] = res.tee()
  const [textStream, chunkStream] = fullStream.tee()

  const textStreamHooks: PipeHook<Uint8Array, string>[] = []
  const accumulatedText = new Promise<string>((resolve) => {
    const chunks: string[] = []
    textStreamHooks.push({
      onChunk: (chunk) => { chunks.push(chunk) },
      onDone: () => { resolve(chunks.join('')) },
    })
  })

  const chunkStreamHooks: PipeHook<Uint8Array, StreamChunk>[] = []
  const accumulatedChunks = new Promise<StreamChunk[]>((resolve) => {
    const chunks: StreamChunk[] = []
    chunkStreamHooks.push({
      onChunk: (chunk) => { chunks.push(chunk) },
      onDone: () => { resolve(chunks) },
    })
  })

  return {
    response: async () => res,
    text: () => accumulatedText,
    chunks: () => accumulatedChunks,
    textStream: () => asyncIteratorFromReadableStream(
      textStream.toReadableStream(),
      async (value: Uint8Array) => newStreamChunk(value, parseChunkFromBuffer(value)).textPart(),
      textStreamHooks,
    ),
    chunkStream: () => asyncIteratorFromReadableStream(
      chunkStream.toReadableStream(),
      async (value: Uint8Array) => newStreamChunk(value, parseChunkFromBuffer(value)),
      chunkStreamHooks,
    ),
    toReadableStream: () => rawStream.toReadableStream() as unknown as AsyncGenerator<Uint8Array, void, unknown>,
  } satisfies StreamResponse
}
