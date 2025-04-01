import { env } from 'node:process'
import {
  composeAgent,
} from 'neuri/openai'

async function main() {
  const { call } = composeAgent({
    provider: {
      baseURL: env.OPENAI_API_BASEURL!,
      apiKey: env.OPENAI_API_KEY,
    },
    tools: [

    ],
  })

  call([], { model: 'openai/gpt-3.5-turbo' })
}

// eslint-disable-next-line no-console
main().then(console.log).catch(console.error)
