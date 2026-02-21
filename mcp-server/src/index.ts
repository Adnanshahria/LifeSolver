import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequest,
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import { join } from "path";

// Load environment variables from the parent directory's .env file
dotenv.config({ path: join(process.cwd(), "..", ".env") });

const db = createClient({
    url: process.env.VITE_TURSO_DB_URL || "",
    authToken: process.env.VITE_TURSO_AUTH_TOKEN || "",
});

const server = new Server(
    {
        name: "life-hub-mcp-server",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

/**
 * Tool Definitions
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "list_notes",
                description: "Lists all notes from the LifeHub database",
                inputSchema: {
                    type: "object",
                    properties: {
                        limit: { type: "number", default: 10 },
                    },
                },
            },
            {
                name: "search_notes",
                description: "Searches for notes containing specific text",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: { type: "string" },
                    },
                    required: ["query"],
                },
            },
            {
                name: "list_tasks",
                description: "Lists all tasks for the user",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
        ],
    };
});

/**
 * Tool Logic
 */
server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
    const { name, arguments: args } = request.params;

    try {
        if (name === "list_notes") {
            const { limit } = z.object({ limit: z.number().optional() }).parse(args);
            const result = await db.execute({
                sql: "SELECT title, content, tags FROM notes ORDER BY updated_at DESC LIMIT ?",
                args: [limit || 10],
            });
            return {
                content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }],
            };
        }

        if (name === "search_notes") {
            const { query } = z.object({ query: z.string() }).parse(args);
            const result = await db.execute({
                sql: "SELECT title, content, tags FROM notes WHERE title LIKE ? OR content LIKE ? LIMIT 10",
                args: [`%${query}%`, `%${query}%`],
            });
            return {
                content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }],
            };
        }

        if (name === "list_tasks") {
            const result = await db.execute("SELECT title, status, priority, due_date FROM tasks WHERE is_deleted = 0");
            return {
                content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }],
            };
        }

        throw new Error(`Tool not found: ${name}`);
    } catch (error: any) {
        return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true,
        };
    }
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("LifeHub MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
