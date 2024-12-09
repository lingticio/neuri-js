export interface OpenAIProviderOptions {
  apiKey: string
  baseURL?: string
}

/**
 * Create an OpenAI provider.
 * @param options - The options to create the OpenAI provider.
 * @param options.apiKey - The API key to use for the OpenAI provider.
 * @param options.baseURL - The base URL to use for the OpenAI provider.
 * @returns The OpenAI provider.
 */
export function createOpenAIProvider(options: OpenAIProviderOptions) {
  if (!options.baseURL?.endsWith('/')) {
    options.baseURL += '/'
  }

  return {
    apiKey: options.apiKey,
    baseURL: options.baseURL,
  } as OpenAIProviderOptions
}
