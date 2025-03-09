/**
 * FindMine Service
 * Provides access to FindMine API functionality with caching
 */

import { FindMineClient } from '../api/findmine-client.js';
import { Cache } from '../utils/cache.js';
import { config } from '../config.js';
import { 
  CompleteTheLookResponse, 
  VisuallySimilarResponse,
  AnalyticsResponse,
  ItemDetailsUpdateResponse
} from '../types/findmine-api.js';
import {
  mapProductToResource,
  mapLookToResource
} from '../utils/resource-mapper.js';
import {
  ProductResource,
  LookResource,
  ResourceStore
} from '../types/mcp.js';

/**
 * FindMine service class
 */
export class FindMineService {
  private client: FindMineClient;
  private completeTheLookCache: Cache<CompleteTheLookResponse>;
  private visuallySimilarCache: Cache<VisuallySimilarResponse>;
  private resources: ResourceStore = {
    products: {},
    looks: {},
  };

  constructor() {
    // Initialize the FindMine API client
    this.client = new FindMineClient({
      apiBaseUrl: config.findmine.apiBaseUrl,
      applicationId: config.findmine.applicationId,
      apiVersion: config.findmine.apiVersion,
      defaultRegion: config.findmine.defaultRegion,
      defaultLanguage: config.findmine.defaultLanguage,
    });

    // Initialize caches
    this.completeTheLookCache = new Cache<CompleteTheLookResponse>(config.cache.ttlMs);
    this.visuallySimilarCache = new Cache<VisuallySimilarResponse>(config.cache.ttlMs);
  }

  /**
   * Get complete the look recommendations
   */
  async getCompleteTheLook(
    productId: string,
    inStock: boolean,
    onSale: boolean,
    options: {
      colorId?: string;
      sessionId?: string;
      customerId?: string;
      returnPdpItem?: boolean;
      gender?: 'M' | 'W' | 'U';
      useCache?: boolean;
      apiVersion?: string;
    } = {}
  ): Promise<{
    product?: ProductResource;
    looks: LookResource[];
  }> {
    const sessionId = options.sessionId || config.session.defaultSessionId;
    const useCache = options.useCache !== false && config.cache.enabled;
    
    // Create cache key
    const cacheKey = Cache.createKey([
      'completeTheLook',
      productId,
      options.colorId || 'default',
      String(inStock),
      String(onSale),
      String(options.returnPdpItem)
    ]);

    // Try to get from cache
    let response: CompleteTheLookResponse;
    if (useCache) {
      const cached = this.completeTheLookCache.get(cacheKey);
      if (cached) {
        response = cached;
      } else {
        response = await this.client.getCompleteTheLook(
          productId,
          inStock,
          onSale,
          sessionId,
          {
            colorId: options.colorId,
            customerId: options.customerId,
            returnPdpItem: options.returnPdpItem,
            gender: options.gender,
            apiVersion: options.apiVersion,
          }
        );
        
        // Store in cache
        this.completeTheLookCache.set(cacheKey, response);
      }
    } else {
      response = await this.client.getCompleteTheLook(
        productId,
        inStock,
        onSale,
        sessionId,
        {
          colorId: options.colorId,
          customerId: options.customerId,
          returnPdpItem: options.returnPdpItem,
          gender: options.gender,
          apiVersion: options.apiVersion,
        }
      );
    }

    // Convert to internal resources
    let product: ProductResource | undefined;
    if (response.pdp_item) {
      product = mapProductToResource(response.pdp_item);
      this.resources.products[product.id] = product;
    }

    const looks: LookResource[] = [];
    for (const look of response.looks) {
      try {
        const lookResource = mapLookToResource(look);
        this.resources.looks[lookResource.id] = lookResource;
        looks.push(lookResource);

        // Store all products from the look - handle different API formats
        const products = look.products || look.items || [];
        if (Array.isArray(products)) {
          for (const product of products) {
            try {
              if (product && product.product_id) {
                const productResource = mapProductToResource(product);
                this.resources.products[productResource.id] = productResource;
              }
            } catch (productError) {
              if (process.env.FINDMINE_DEBUG === 'true') {
                console.error(`[FindMineService] Error mapping product in look ${lookResource.id}:`, productError);
              }
              // Continue with next product even if one fails
            }
          }
        }
      } catch (lookError) {
        if (process.env.FINDMINE_DEBUG === 'true') {
          console.error(`[FindMineService] Error mapping look:`, lookError);
        }
        // Continue with next look even if one fails
      }
    }

    return {
      product,
      looks,
    };
  }

  /**
   * Get visually similar products
   */
  async getVisuallySimilar(
    productId: string,
    options: {
      colorId?: string;
      sessionId?: string;
      customerId?: string;
      limit?: number;
      offset?: number;
      gender?: 'M' | 'W' | 'U';
      useCache?: boolean;
      apiVersion?: string;
    } = {}
  ): Promise<{
    products: ProductResource[];
    total: number;
  }> {
    const sessionId = options.sessionId || config.session.defaultSessionId;
    const useCache = options.useCache !== false && config.cache.enabled;
    
    // Create cache key
    const cacheKey = Cache.createKey([
      'visuallySimilar',
      productId,
      options.colorId || 'default',
      String(options.limit || 'default'),
      String(options.offset || 'default')
    ]);

    // Try to get from cache
    let response: VisuallySimilarResponse;
    if (useCache) {
      const cached = this.visuallySimilarCache.get(cacheKey);
      if (cached) {
        response = cached;
      } else {
        response = await this.client.getVisuallySimilar(
          productId,
          sessionId,
          {
            colorId: options.colorId,
            customerId: options.customerId,
            limit: options.limit,
            offset: options.offset,
            gender: options.gender,
            apiVersion: options.apiVersion,
          }
        );
        
        // Store in cache
        this.visuallySimilarCache.set(cacheKey, response);
      }
    } else {
      response = await this.client.getVisuallySimilar(
        productId,
        sessionId,
        {
          colorId: options.colorId,
          customerId: options.customerId,
          limit: options.limit,
          offset: options.offset,
          gender: options.gender,
          apiVersion: options.apiVersion,
        }
      );
    }

    // Convert to internal resources
    const products: ProductResource[] = response.products.map(product => {
      const productResource = mapProductToResource(product);
      this.resources.products[productResource.id] = productResource;
      return productResource;
    });

    return {
      products,
      total: response.total,
    };
  }

  /**
   * Track an analytics event
   */
  async trackEvent(
    eventType: 'view' | 'click' | 'add_to_cart' | 'purchase',
    productId: string,
    options: {
      colorId?: string;
      lookId?: string;
      sourceProductId?: string;
      price?: number;
      quantity?: number;
      sessionId?: string;
      customerId?: string;
      apiVersion?: string;
    } = {}
  ): Promise<AnalyticsResponse> {
    const sessionId = options.sessionId || config.session.defaultSessionId;
    
    return this.client.trackEvent(
      eventType,
      productId,
      sessionId,
      {
        colorId: options.colorId,
        lookId: options.lookId,
        sourceProductId: options.sourceProductId,
        price: options.price,
        quantity: options.quantity,
        customerId: options.customerId,
        apiVersion: options.apiVersion,
      }
    );
  }

  /**
   * Update item details
   */
  async updateItemDetails(
    items: Array<{
      productId: string;
      colorId?: string;
      inStock: boolean;
      onSale: boolean;
    }>,
    options: {
      sessionId?: string;
      customerId?: string;
      apiVersion?: string;
    } = {}
  ): Promise<ItemDetailsUpdateResponse> {
    const sessionId = options.sessionId || config.session.defaultSessionId;
    
    return this.client.updateItemDetails(
      items,
      sessionId,
      {
        customerId: options.customerId,
        apiVersion: options.apiVersion,
      }
    );
  }

  /**
   * Get a product by ID
   */
  getProduct(productId: string): ProductResource | undefined {
    return this.resources.products[productId];
  }

  /**
   * Get a look by ID
   */
  getLook(lookId: string): LookResource | undefined {
    return this.resources.looks[lookId];
  }

  /**
   * Get all products
   */
  getAllProducts(): ProductResource[] {
    return Object.values(this.resources.products);
  }

  /**
   * Get all looks
   */
  getAllLooks(): LookResource[] {
    return Object.values(this.resources.looks);
  }
}

// Create a singleton instance
export const findMineService = new FindMineService();