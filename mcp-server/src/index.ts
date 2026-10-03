import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { financeTools } from "./tools/finance.js";
import { habitTools } from "./tools/habits.js";
import { fitnessTools } from "./tools/fitness.js";
import { goalTools } from "./tools/goals.js";
import { noteTools } from "./tools/notes.js";
import { investmentTools } from "./tools/investments.js";

const server = new McpServer({
  name: "life-hub",
  version: "1.0.0",
});

const allTools = [
  ...financeTools,
  ...investmentTools,
  ...habitTools,
  ...fitnessTools,
  ...goalTools,
  ...noteTools,
];

for (const tool of allTools) {
  server.tool(tool.name, tool.description, tool.inputSchema.shape, async (args) => {
    try {
      const result = await tool.handler(args as any);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${err.message}`,
          },
        ],
        isError: true,
      };
    }
  });
}

const transport = new StdioServerTransport();
await server.connect(transport);
