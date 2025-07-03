import { McpServer, type ReadResourceTemplateCallback, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPTransport } from '@hono/mcp'
import { Hono } from 'hono'
import { z } from 'zod'
import { cors } from 'hono/cors'

const app = new Hono()

app.use(
  '/*',
  cors({
    origin: '*',
    allowHeaders: ['content-type', 'mcp-session-id', 'mcp-protocol-version'],
    exposeHeaders: ['mcp-session-id'],
  }),
)

// Your MCP server implementation
const mcpServer = new McpServer({
  name: 'my-mcp-server',
  version: '1.0.0',
})

mcpServer.registerTool(
  'add',
  {
    title: 'Addition Tool',
    description: 'Add two numbers',
    inputSchema: { a: z.number(), b: z.number() },
  },
  async ({ a, b }) => ({
    content: [{ type: 'text', text: String(a + b) }],
  }),
)

mcpServer.registerTool(
  'get_vengabus_times',
  {
    title: 'Vengabus Schedule Checker',
    description:
      "This checks to see when the next Vengabus is, or whether there is one for the user's current location. Please display all the information to the user in a tabulated form.",
    inputSchema: {},
  },
  async () => {
    // Simulate some async work
    await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 100))
    return {
      content: [
        {
          type: 'text',
          text: `Next Vengabus: imminent. Current user's route: New York to San Francisco. Route name: "Intercity Disco".`,
        },
      ],
    }
  },
)

// Register sample resources
mcpServer.registerResource(
  'config',
  'config://app',
  {
    title: 'Application Configuration',
    description: 'Current application configuration settings',
    mimeType: 'application/json',
  },
  async (uri: URL) => ({
    contents: [
      {
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(
          {
            version: '1.0.0',
            environment: 'test',
            features: {
              vengabus: true,
              calculator: true,
            },
          },
          null,
          2,
        ),
      },
    ],
  }),
)

mcpServer.registerResource(
  'readme',
  'file://readme.md',
  {
    title: 'README',
    description: 'Server documentation',
    mimeType: 'text/markdown',
  },
  async (uri: URL) => ({
    contents: [
      {
        uri: uri.href,
        mimeType: 'text/markdown',
        text: '# Test MCP Server\n\nThis is a test server for the use-mcp integration tests.\n\n## Features\n- Addition tool\n- Vengabus schedule checker\n- Sample resources\n- Sample prompts',
      },
    ],
  }),
)

// Register a resource template
mcpServer.registerResource(
  'stats',
  new ResourceTemplate('data://stats/{type}', { list: undefined }),
  {
    title: 'Statistics Data',
    description: 'Get statistics for different types',
    mimeType: 'application/json',
  },
  // @ts-expect-error - type is missing in the callback
  async (uri: URL, { type }) => ({
    contents: [
      {
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(
          {
            type: type,
            count: Math.floor(Math.random() * 100),
            lastUpdated: new Date().toISOString(),
          },
          null,
          2,
        ),
      },
    ],
  }),
)

// Register sample prompts
mcpServer.registerPrompt(
  'greeting',
  {
    title: 'Generate Greeting',
    description: 'Generate a greeting message',
    argsSchema: {
      name: z.string().describe('Name of the person to greet'),
      style: z.string().optional().describe('Style of greeting (formal/casual)'),
    },
  },
  ({ name, style }) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Generate a ${style || 'casual'} greeting for ${name}`,
        },
      },
      {
        role: 'assistant',
        content: {
          type: 'text',
          text: style === 'formal' ? `Good day, ${name}. I hope this message finds you well.` : `Hey ${name}! How's it going?`,
        },
      },
    ],
  }),
)

mcpServer.registerPrompt(
  'code_review',
  {
    title: 'Code Review Template',
    description: 'Template for code review requests',
    argsSchema: {
      language: z.string().describe('Programming language'),
      focus: z.string().optional().describe('What to focus on (performance/security/style)'),
    },
  },
  ({ language, focus }) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Please review the following ${language} code${focus ? ` with a focus on ${focus}` : ''}:`,
        },
      },
    ],
  }),
)

app.post('/mcp', async (c) => {
  const transport = new StreamableHTTPTransport()
  await mcpServer.connect(transport)
  return transport.handleRequest(c)
})

export default app
