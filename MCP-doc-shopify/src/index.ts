import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { getSectionRules } from "./tools/getSectionRules.js";
import { getSchemaGuide } from "./tools/getSchemaGuide.js";
import {
  suggestSettings,
  suggestSettingsInputSchema,
} from "./tools/suggestSettings.js";

const server = new McpServer({
  name: "shopify-docs-mcp",
  version: "0.1.0",
});

server.registerTool(
  "get_section_rules",
  {
    title: "Get Shopify section rules",
    description:
      "Returns core rules and best practices for Shopify theme sections.",
    inputSchema: {},
  },
  async () => {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(getSectionRules(), null, 2),
        },
      ],
    };
  },
);

server.registerTool(
  "get_schema_guide",
  {
    title: "Get Shopify schema guide",
    description:
      "Returns the main structure and attributes of a Shopify section schema.",
    inputSchema: {},
  },
  async () => {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(getSchemaGuide(), null, 2),
        },
      ],
    };
  },
);

server.registerTool(
  "suggest_settings_for_category",
  {
    title: "Suggest settings for section category",
    description:
      "Suggests useful section settings based on a category like hero, faq, testimonial.",
    inputSchema: {
      category: z.string(),
    },
  },
  async (input) => {
    const parsed = suggestSettingsInputSchema.parse(input);
    const result = suggestSettings(parsed);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
