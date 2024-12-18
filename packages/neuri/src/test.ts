import type { DefinedTool, InvokeContext } from './openai'

export function newTestInvokeContext<P, R>(parameters?: P): InvokeContext<P, R> {
  return { parameters } as InvokeContext<P, R>
}

export async function invoke<P, R>(tool: DefinedTool<P, R>, parameters: P): Promise<Awaited<R>> {
  return await tool.func(newTestInvokeContext(parameters))
}
