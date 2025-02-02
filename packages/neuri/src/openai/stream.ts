import type { StreamTextOptions, ChunkResult as XSAIChunkResult } from '@xsai/stream-text'
import { streamText } from '@xsai/stream-text'

export interface ChunkResult extends XSAIChunkResult {
  textPart: () => string
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
  chunkStream: () => AsyncGenerator<ChunkResult, void, unknown>
  /**
   * Get the completion response as a stream of chunks.
   *
   * @returns The completion response as a stream of chunks.
   */
  chunks: () => Promise<ChunkResult[]>
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
 * @returns The completion response stream.
 */
export async function stream(params: StreamTextOptions): Promise<StreamResponse> {
  const res = await streamText(params)

  const textStreamHooks: PipeHook<string, string>[] = []
  const accumulatedText = new Promise<string>((resolve) => {
    const chunks: string[] = []
    textStreamHooks.push({
      onChunk: (chunk) => { chunks.push(chunk) },
      onDone: () => { resolve(chunks.join('')) },
    })
  })

  const chunkStreamHooks: PipeHook<XSAIChunkResult, ChunkResult>[] = []
  const accumulatedChunks = new Promise<ChunkResult[]>((resolve) => {
    const chunks: ChunkResult[] = []
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
      res.textStream,
      async (value: string) => value,
      textStreamHooks,
    ),
    chunkStream: () => asyncIteratorFromReadableStream(
      res.chunkStream,
      async (value: XSAIChunkResult): Promise<ChunkResult> => {
        return {
          ...value,
          textPart: () => {
            if (value.choices.length === 0) {
              return ''
            }

            return value.choices[0].delta.content
          },
        }
      },
      chunkStreamHooks,
    ),
  } satisfies StreamResponse
}
