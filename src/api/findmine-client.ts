/**
 * FindMine API Client
 * Handles all interactions with the FindMine API
 */

import {
  FindMineBaseRequest,
  CompleteTheLookRequest,
  CompleteTheLookResponse,
  VisuallySimilarRequest,
  VisuallySimilarResponse,
  ItemDetailsUpdateRequest,
  ItemDetailsUpdateResponse,
  AnalyticsRequest,
  AnalyticsResponse,
  FindMineErrorResponse
} from '../types/findmine-api.js';

/**
 * Configuration for the FindMine API client
 */
export interface FindMineClientConfig {
  apiBaseUrl: string;
  applicationId: string;
  apiVersion?: string;
  defaultRegion?: string;
  defaultLanguage?: string;
  retryCount?: number;
  retryDelayMs?: number;
}

/**
 * FindMine API client
 */
export class FindMineClient {
  private config: FindMineClientConfig;

  constructor(config: FindMineClientConfig) {
    this.config = {
      ...config,
      apiVersion: config.apiVersion ?? 'v3',
      retryCount: config.retryCount ?? 3,
      retryDelayMs: config.retryDelayMs ?? 1000,
    };
  }

  /**
   * Make API request with retries
   */
  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST',
    params: Record<string, any>
  ): Promise<T> {
    let url = `${this.config.apiBaseUrl}${endpoint}`;
    let body: string | undefined;
    
    // Build URL for GET requests, or request body for POST
    if (method === 'GET') {
      const queryParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      }
      url = `${url}?${queryParams.toString()}`;
    } else {
      body = JSON.stringify(params);
    }

    // Try the request with retries
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= this.config.retryCount!; attempt++) {
      try {
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: method === 'POST' ? body : undefined,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            `FindMine API error: ${(data as FindMineErrorResponse).error.message}`
          );
        }

        return data as T;
      } catch (error) {
        lastError = error as Error;
        
        // Don't wait on the last attempt
        if (attempt < this.config.retryCount!) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelayMs!));
        }
      }
    }

    throw lastError || new Error('Unknown error in FindMine API');
  }

  /**
   * Create a base request with common parameters
   */
  private createBaseRequest(sessionId: string, customerId?: string): FindMineBaseRequest {
    return {
      application: this.config.applicationId,
      customer_session_id: sessionId,
      customer_id: customerId,
      region: this.config.defaultRegion,
      language: this.config.defaultLanguage,
    };
  }

  /**
   * Get complete the look recommendations for a product
   */
  async getCompleteTheLook(
    productId: string,
    inStock: boolean,
    onSale: boolean,
    sessionId: string,
    options: {
      colorId?: string;
      customerId?: string;
      returnPdpItem?: boolean;
      gender?: 'M' | 'W' | 'U';
      apiVersion?: string;
    } = {}
  ): Promise<CompleteTheLookResponse> {
    const apiVersion = options.apiVersion || this.config.apiVersion;
    const params: CompleteTheLookRequest = {
      ...this.createBaseRequest(sessionId, options.customerId),
      product_id: productId,
      product_color_id: options.colorId,
      product_in_stock: inStock,
      product_on_sale: onSale,
      return_pdp_item: options.returnPdpItem,
      customer_gender: options.gender,
    };

    return this.makeRequest<CompleteTheLookResponse>(
      `/api/${apiVersion}/complete-the-look`,
      'GET',
      params
    );
  }

  /**
   * Get visually similar products
   */
  async getVisuallySimilar(
    productId: string,
    sessionId: string,
    options: {
      colorId?: string;
      customerId?: string;
      limit?: number;
      offset?: number;
      gender?: 'M' | 'W' | 'U';
      apiVersion?: string;
    } = {}
  ): Promise<VisuallySimilarResponse> {
    const apiVersion = options.apiVersion || this.config.apiVersion;
    const params: VisuallySimilarRequest = {
      ...this.createBaseRequest(sessionId, options.customerId),
      product_id: productId,
      product_color_id: options.colorId,
      limit: options.limit,
      offset: options.offset,
      customer_gender: options.gender,
    };

    return this.makeRequest<VisuallySimilarResponse>(
      `/api/${apiVersion}/visually-similar`,
      'GET',
      params
    );
  }

  /**
   * Update item details (stock status, sale status)
   */
  async updateItemDetails(
    items: Array<{
      productId: string;
      colorId?: string;
      inStock: boolean;
      onSale: boolean;
    }>,
    sessionId: string,
    options: {
      customerId?: string;
      apiVersion?: string;
    } = {}
  ): Promise<ItemDetailsUpdateResponse> {
    const apiVersion = options.apiVersion || this.config.apiVersion;
    const params: ItemDetailsUpdateRequest = {
      ...this.createBaseRequest(sessionId, options.customerId),
      items: items.map(item => ({
        product_id: item.productId,
        product_color_id: item.colorId,
        in_stock: item.inStock,
        on_sale: item.onSale,
      })),
    };

    return this.makeRequest<ItemDetailsUpdateResponse>(
      `/api/${apiVersion}/item-details`,
      'POST',
      params
    );
  }

  /**
   * Track an analytics event
   */
  async trackEvent(
    eventType: 'view' | 'click' | 'add_to_cart' | 'purchase',
    productId: string,
    sessionId: string,
    options: {
      colorId?: string;
      lookId?: string;
      sourceProductId?: string;
      price?: number;
      quantity?: number;
      customerId?: string;
      apiVersion?: string;
    } = {}
  ): Promise<AnalyticsResponse> {
    const apiVersion = options.apiVersion || this.config.apiVersion;
    const params: AnalyticsRequest = {
      ...this.createBaseRequest(sessionId, options.customerId),
      event_type: eventType,
      product_id: productId,
      product_color_id: options.colorId,
      look_id: options.lookId,
      source_product_id: options.sourceProductId,
      price: options.price,
      quantity: options.quantity,
    };

    return this.makeRequest<AnalyticsResponse>(
      `/api/${apiVersion}/analytics`,
      'POST',
      params
    );
  }
}