import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  getGuideResourceOrThrow,
  listGuideResources,
} from "./readResourceByUri.js";

export function registerGuideResources(server: McpServer): void {
  const guides = listGuideResources();

  for (const guide of guides) {
    server.registerResource(
      guide.name,
      guide.uri,
      {
        title: guide.title,
        description: guide.description,
        mimeType: "text/markdown",
      },
      async () => {
        try {
          const resolved = getGuideResourceOrThrow(guide.uri);

          return {
            contents: [
              {
                uri: resolved.uri,
                text: resolved.markdown,
              },
            ],
          };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          return {
            contents: [
              {
                uri: guide.uri,
                text: `# Resource Error\n\n${message}`,
              },
            ],
          };
        }
      },
    );
  }
}
