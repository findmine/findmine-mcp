/**
 * Configuration for the FindMine MCP Server
 */

/**
 * Server configuration type
 */
export interface ServerConfig {
  /**
   * FindMine API configuration
   */
  findmine: {
    /**
     * API base URL
     */
    apiBaseUrl: string;

    /**
     * FindMine application ID
     */
    applicationId: string;

    /**
     * API version to use (optional)
     */
    apiVersion?: string;

    /**
     * Default region (optional)
     */
    defaultRegion?: string;

    /**
     * Default language (optional)
     */
    defaultLanguage?: string;
  };

  /**
   * Session configuration
   */
  session: {
    /**
     * Default session ID to use when none is provided
     */
    defaultSessionId: string;
  };

  /**
   * Cache configuration
   */
  cache: {
    /**
     * Whether to enable caching
     */
    enabled: boolean;

    /**
     * Cache time to live in milliseconds
     */
    ttlMs: number;
  };

  /**
   * Features configuration
   */
  features: {
    /**
     * Whether to enable tracking
     */
    enableTracking: boolean;

    /**
     * Whether to enable item details updates
     */
    enableItemDetailsUpdates: boolean;
  };
}

/**
 * Default server configuration
 */
export const config: ServerConfig = {
  findmine: {
    apiBaseUrl: process.env.FINDMINE_API_URL || 'https://api.findmine.com',
    applicationId: process.env.FINDMINE_APP_ID || 'DEMO_APP_ID',
    apiVersion: process.env.FINDMINE_API_VERSION || 'v3',
    defaultRegion: process.env.FINDMINE_DEFAULT_REGION || 'us',
    defaultLanguage: process.env.FINDMINE_DEFAULT_LANGUAGE || 'en',
  },
  session: {
    defaultSessionId: process.env.FINDMINE_DEFAULT_SESSION_ID || 'mcp-default-session',
  },
  cache: {
    enabled: process.env.FINDMINE_CACHE_ENABLED !== 'false',
    ttlMs: parseInt(process.env.FINDMINE_CACHE_TTL_MS || '3600000', 10), // Default: 1 hour
  },
  features: {
    enableTracking: process.env.FINDMINE_ENABLE_TRACKING === 'true',
    enableItemDetailsUpdates: process.env.FINDMINE_ENABLE_ITEM_UPDATES === 'true',
  },
};
