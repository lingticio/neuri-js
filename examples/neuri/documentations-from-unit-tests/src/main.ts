import { env } from 'node:process'
import OpenAI from 'openai'

import {
  composeAgent,
} from 'neuri/openai'

async function main() {
  const o = new OpenAI({
    baseURL: env.OPENAI_API_BASEURL,
    apiKey: env.OPENAI_API_KEY,
  })

  const { call } = composeAgent({
    openAI: o,
    tools: [

    ],
  })

  call([], { model: 'openai/gpt-3.5-turbo' })
}

// eslint-disable-next-line no-console
main().then(console.log).catch(console.error)
