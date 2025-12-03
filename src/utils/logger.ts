/**
 * Logger utility for the FindMine MCP server.
 *
 * Important: The MCP protocol expects only valid JSON on stdout.
 * We use process.stderr.write to avoid interfering with the protocol.
 */

const DEBUG_MODE = process.env.FINDMINE_DEBUG === 'true';

/**
 * Silent logger that only outputs in debug mode.
 * All output goes to stderr to avoid corrupting MCP JSON protocol on stdout.
 */
export const logger = {
  log: (message: string, ...args: unknown[]): void => {
    if (DEBUG_MODE) {
      process.stderr.write(`[INFO] ${message} ${args.map((a) => String(a)).join(' ')}\n`);
    }
  },
  error: (message: string, ...args: unknown[]): void => {
    if (DEBUG_MODE) {
      process.stderr.write(`[ERROR] ${message} ${args.map((a) => String(a)).join(' ')}\n`);
    }
  },
};
