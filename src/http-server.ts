import { createServer, IncomingMessage, ServerResponse, Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { TransportConfig } from './types/config.js';
import { getLogger } from './utils/logger.js';

// Lazy getter since logger is initialized in main()
const logger = () => getLogger().child({ component: 'http-server' });

/**
 * Active transport sessions mapped by session ID
 */
const sessions = new Map<string, StreamableHTTPServerTransport>();

/**
 * HTTP server options
 */
export interface HttpServerOptions {
  config: TransportConfig;
  serverVersion: string;
  mcpServer: McpServer;
}

/**
 * Creates and starts an HTTP server with MCP StreamableHTTP transport
 */
export async function createHttpServer(options: HttpServerOptions): Promise<Server> {
  const { config, serverVersion, mcpServer } = options;

  const corsOrigin = config.corsOrigin ?? 'http://localhost';

  const httpServer = createServer((req, res) => {
    handleRequest(req, res, mcpServer, serverVersion, corsOrigin).catch((error) => {
      logger().error('Unhandled request error', { error: error instanceof Error ? error.message : String(error) });
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });
  });

  return new Promise((resolve, reject) => {
    httpServer.on('error', (error) => {
      logger().error('HTTP server error', { error: error.message });
      reject(error);
    });

    httpServer.listen(config.port, config.host, () => {
      logger().info('HTTP server started', {
        host: config.host,
        port: config.port,
        url: `http://${config.host}:${config.port}`,
      });
      resolve(httpServer);
    });
  });
}

/**
 * Handle incoming HTTP requests
 */
async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  mcpServer: McpServer,
  serverVersion: string,
  corsOrigin: string
): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);

  // CORS headers for browser-based clients (configurable origin)
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Route requests
  if (url.pathname === '/health') {
    handleHealthCheck(res, serverVersion);
    return;
  }

  if (url.pathname === '/mcp') {
    await handleMcpRequest(req, res, mcpServer);
    return;
  }

  // 404 for unknown paths
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
}

/**
 * Handle health check requests
 */
function handleHealthCheck(res: ServerResponse, serverVersion: string): void {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'healthy',
    version: serverVersion,
    timestamp: new Date().toISOString(),
  }));
}

/**
 * Handle MCP protocol requests
 */
async function handleMcpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  mcpServer: McpServer
): Promise<void> {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;

  // For existing sessions, reuse the transport
  if (sessionId && sessions.has(sessionId)) {
    const transport = sessions.get(sessionId)!;
    await transport.handleRequest(req, res);
    return;
  }

  // For new connections, create a new transport
  if (req.method === 'GET' || (req.method === 'POST' && !sessionId)) {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (newSessionId) => {
        logger().debug('Session initialized', { sessionId: newSessionId });
        sessions.set(newSessionId, transport);
      },
      onsessionclosed: (closedSessionId) => {
        logger().debug('Session closed', { sessionId: closedSessionId });
        sessions.delete(closedSessionId);
      },
    });

    // Connect transport to the MCP server
    await mcpServer.connect(transport);

    // Handle the request
    await transport.handleRequest(req, res);
    return;
  }

  // Invalid request - no session ID for POST/DELETE
  res.writeHead(400, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Session ID required' }));
}

/**
 * Gracefully close all active sessions
 */
export async function closeAllSessions(): Promise<void> {
  logger().info('Closing all active sessions', { count: sessions.size });

  const closePromises = Array.from(sessions.values()).map(async (transport) => {
    try {
      await transport.close();
    } catch (error) {
      logger().error('Error closing transport', { error: error instanceof Error ? error.message : String(error) });
    }
  });

  await Promise.all(closePromises);
  sessions.clear();
}

/**
 * Gracefully shutdown the HTTP server
 */
export async function shutdownHttpServer(server: Server, timeoutMs: number = 5000): Promise<void> {
  logger().info('Shutting down HTTP server');

  // Close all sessions first
  await closeAllSessions();

  // Close the HTTP server
  return new Promise((resolve) => {
    // Set a timeout for force close
    const forceCloseTimeout = setTimeout(() => {
      logger().warn('Force closing HTTP server after timeout');
      resolve();
    }, timeoutMs);

    server.close(() => {
      clearTimeout(forceCloseTimeout);
      logger().info('HTTP server closed gracefully');
      resolve();
    });
  });
}
