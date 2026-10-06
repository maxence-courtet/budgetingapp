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

export function createHiveMcpServer() {
  const server = new McpServer({ name: "hive", version: "1.0.0" });

  for (const tool of allTools) {
    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema: tool.inputSchema },
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
