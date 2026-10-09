import { McpServer } from "@modelcontextprotocol/server";
import { financeTools } from "./tools/finance";
import { habitTools } from "./tools/habits";
import { fitnessTools } from "./tools/fitness";
import { goalTools } from "./tools/goals";
import { noteTools } from "./tools/notes";
import { investmentTools } from "./tools/investments";
import { setupTools } from "./tools/setup";

const allTools = [
  ...financeTools,
  ...setupTools,
  ...investmentTools,
  ...habitTools,
  ...fitnessTools,
  ...goalTools,
  ...noteTools,
];

// Tools that only read data. Assistants use these hints to group tools, so people can let
// reads run automatically and ask for approval on writes (Claude, ChatGPT).
const READ_ONLY = new Set(["generate_fitness_plan"]);
const isReadOnly = (name: string) => /^(get|search)_/.test(name) || READ_ONLY.has(name);
// Writes that replace a stored value. Every other write only adds records (journal entries append).
const OVERWRITES = new Set(["update_goal_progress"]);

function annotationsFor(name: string) {
  const readOnly = isReadOnly(name);
  return {
    title: name.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()),
    readOnlyHint: readOnly,
    // No tool deletes anything.
    destructiveHint: OVERWRITES.has(name),
    idempotentHint: readOnly || OVERWRITES.has(name),
    openWorldHint: name === "get_market_price",
  };
}

export function createHiveMcpServer() {
  const server = new McpServer({ name: "hive", version: "1.0.0" });

  for (const tool of allTools) {
    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema: tool.inputSchema, annotations: annotationsFor(tool.name) },
      async (args: Record<string, unknown>) => {
        try {
          const result = await tool.handler(args as any);
          return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
        } catch (err: any) {
          return { content: [{ type: "text" as const, text: `Error: ${err.message}` }], isError: true };
        }
      }
    );
  }

  return server;
}
