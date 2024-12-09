import type { Schema } from '@typeschema/main'
import { tool, type ToolOptions, type ToolResult } from '@xsai/tool'

// TODO: generic support
/**
 * Define a tool function.
 * @param toolOptions - The options to define the tool.
 * @returns The tool result.
 */
export function defineToolFunction<T extends Schema>(toolOptions: ToolOptions<T>): Promise<ToolResult<T>> {
  // TODO: hooks
  return tool<T>(toolOptions)
}
