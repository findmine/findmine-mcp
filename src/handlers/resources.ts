/**
 * Resource handlers for the FindMine MCP server.
 * Handles listing and reading product and look resources.
 */

import { logger } from '../utils/logger.js';
import { findMineService } from '../services/findmine-service.js';
import { parseProductUri, parseLookUri } from '../types/mcp.js';
import {
  productToResourceMetadata,
  lookToResourceMetadata,
  productToResourceContent,
  lookToResourceContent,
} from '../utils/resource-mapper.js';

/**
 * Handler for listing available resources.
 * Exposes products and looks as resources.
 * @returns List of available resources or error
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function handleListResources() {
  try {
    logger.error('Listing available resources');

    const products = findMineService.getAllProducts();
    const looks = findMineService.getAllLooks();

    logger.error(`Found ${String(products.length)} products and ${String(looks.length)} looks`);

    const resources = [
      ...products.map((product) => productToResourceMetadata(product)),
      ...looks.map((look) => lookToResourceMetadata(look)),
    ];

    return {
      success: true,
      resources,
    };
  } catch (error) {
    logger.error(
      `Error listing resources: ${error instanceof Error ? error.message : String(error)}`,
      error
    );
    return {
      error: {
        message:
          error instanceof Error ? error.message : 'Unknown error occurred while listing resources',
        code: 'RESOURCE_LIST_ERROR',
      },
    };
  }
}

/**
 * Handler for reading a specific resource.
 * Handles both product:/// and look:/// URI schemes.
 * @param uri - Resource URI
 * @returns Resource contents or error
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function handleReadResource(uri: string) {
  try {
    logger.error(`Reading resource: ${uri}`);

    if (uri.startsWith('product://')) {
      // Handle product resource
      const { productId } = parseProductUri(uri);
      const product = findMineService.getProduct(productId);

      if (!product) {
        logger.error(`Product not found: ${productId}`);
        return {
          error: {
            message: `Product ${productId} not found`,
            code: 'RESOURCE_NOT_FOUND',
          },
        };
      }

      return {
        success: true,
        contents: [productToResourceContent(product, uri)],
      };
    } else if (uri.startsWith('look://')) {
      // Handle look resource
      const { lookId } = parseLookUri(uri);
      const look = findMineService.getLook(lookId);

      if (!look) {
        logger.error(`Look not found: ${lookId}`);
        return {
          error: {
            message: `Look ${lookId} not found`,
            code: 'RESOURCE_NOT_FOUND',
          },
        };
      }

      return {
        success: true,
        contents: [lookToResourceContent(look, uri)],
      };
    } else {
      logger.error(`Unsupported URI scheme: ${uri}`);
      return {
        error: {
          message: `Unsupported resource URI scheme: ${uri}`,
          code: 'INVALID_URI_SCHEME',
        },
      };
    }
  } catch (error) {
    logger.error(
      `Error reading resource: ${error instanceof Error ? error.message : String(error)}`,
      error
    );
    return {
      error: {
        message:
          error instanceof Error ? error.message : 'Unknown error occurred while reading resource',
        code: 'RESOURCE_READ_ERROR',
      },
    };
  }
}
