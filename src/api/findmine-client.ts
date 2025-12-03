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
  FindMineProduct,
} from '../types/findmine-api.js';

/**
 * Raw look data from API before normalization
 */
interface RawLook {
  look_id?: string;
  id?: string;
  products?: FindMineProduct[];
  items?: FindMineProduct[] | Record<string, FindMineProduct>;
  [key: string]: unknown;
}

/**
 * Raw response from complete-the-look API
 */
interface RawCompleteTheLookResponse {
  looks?: RawLook[];
  pdp_item?: FindMineProduct;
  [key: string]: unknown;
}

/**
 * Raw error response from API
 */
interface RawErrorResponse {
  error?: {
    message?: string;
  };
}

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
    params: object
  ): Promise<T> {
    let url = `${this.config.apiBaseUrl}${endpoint}`;
    let body: string | undefined;

    // Build URL for GET requests, or request body for POST
    if (method === 'GET') {
      const queryParams = new URLSearchParams();
      const entries = Object.entries(params) as Array<[string, unknown]>;
      for (const [key, value] of entries) {
        if (value !== undefined && value !== null) {
          // Convert primitives safely; skip objects/arrays in query params
          if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            queryParams.append(key, String(value));
          }
        }
      }
      url = `${url}?${queryParams.toString()}`;
    } else {
      body = JSON.stringify(params);
    }

    // Print request info to stderr for debugging
    if (process.env.FINDMINE_DEBUG === 'true') {
      console.error(`[FindMineClient] ${method} ${url}`);
      console.error(`[FindMineClient] Params: ${JSON.stringify(params)}`);
    }

    // Try the request with retries
    const retryCount = this.config.retryCount ?? 3;
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        if (process.env.FINDMINE_DEBUG === 'true') {
          console.error(
            `[FindMineClient] Request attempt ${String(attempt + 1)} of ${String(retryCount + 1)}`
          );
        }

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: method === 'POST' ? body : undefined,
        });

        // Get response as text first to help with debugging
        const responseText = await response.text();

        // Print response info to stderr for debugging
        if (process.env.FINDMINE_DEBUG === 'true') {
          console.error(
            `[FindMineClient] Response status: ${String(response.status)} ${response.statusText}`
          );
          console.error(
            `[FindMineClient] Response body: ${responseText.substring(0, 500)}${responseText.length > 500 ? '...' : ''}`
          );
        }

        // Parse as JSON (if valid)
        let data: unknown;
        try {
          data = JSON.parse(responseText) as unknown;
        } catch {
          throw new Error(
            `Failed to parse API response as JSON: ${responseText.substring(0, 100)}...`
          );
        }

        if (!response.ok) {
          const errorData = data as RawErrorResponse;
          const errorMessage = errorData.error?.message ?? 'Unknown error';
          throw new Error(`FindMine API error: ${errorMessage}`);
        }

        // Verify and normalize the response structure for complete-the-look
        if (endpoint.includes('complete-the-look')) {
          const ctlData = data as RawCompleteTheLookResponse;

          // Ensure the response has a looks array
          if (!ctlData.looks || !Array.isArray(ctlData.looks)) {
            console.error(
              '[FindMineClient] Warning: API returned response without looks array:',
              ctlData
            );
            ctlData.looks = [];
          }

          // Process each look to normalize structure
          ctlData.looks = ctlData.looks.map((look: RawLook): RawLook => {
            const normalizedLook: RawLook = { ...look };

            // Ensure a valid look ID
            if (!normalizedLook.look_id && normalizedLook.id) {
              normalizedLook.look_id = normalizedLook.id;
            }

            // Check if we have items but no products
            if (!normalizedLook.products && normalizedLook.items) {
              // Try to extract product data
              if (Array.isArray(normalizedLook.items)) {
                // Some API versions return items as an array of products
                normalizedLook.products = normalizedLook.items;
              } else if (typeof normalizedLook.items === 'object') {
                // Some API versions return items as a mapping of id -> product
                normalizedLook.products = Object.values(normalizedLook.items);
              }
            }

            return normalizedLook;
          });

          return ctlData as T;
        }

        return data as T;
      } catch (error) {
        lastError = error as Error;

        if (process.env.FINDMINE_DEBUG === 'true') {
          console.error(
            `[FindMineClient] Request failed: ${error instanceof Error ? error.message : String(error)}`
          );
        }

        // Don't wait on the last attempt
        if (attempt < retryCount) {
          const delayMs = this.config.retryDelayMs ?? 1000;
          await new Promise((resolve) => setTimeout(resolve, delayMs));
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
    const apiVersion = options.apiVersion ?? this.config.apiVersion ?? 'v3';
    // Create request parameters, only including gender if explicitly provided
    const params: CompleteTheLookRequest = {
      ...this.createBaseRequest(sessionId, options.customerId),
      product_id: productId,
      product_color_id: options.colorId,
      product_in_stock: inStock,
      product_on_sale: onSale,
      return_pdp_item: options.returnPdpItem,
    };

    // Only add gender param if explicitly provided
    if (options.gender !== undefined) {
      params.customer_gender = options.gender;
    }

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
    const apiVersion = options.apiVersion ?? this.config.apiVersion ?? 'v3';
    // Create request parameters, only including gender if explicitly provided
    const params: VisuallySimilarRequest = {
      ...this.createBaseRequest(sessionId, options.customerId),
      product_id: productId,
      product_color_id: options.colorId,
      limit: options.limit,
      offset: options.offset,
    };

    // Only add gender param if explicitly provided
    if (options.gender !== undefined) {
      params.customer_gender = options.gender;
    }

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
    const apiVersion = options.apiVersion ?? this.config.apiVersion ?? 'v3';
    const params: ItemDetailsUpdateRequest = {
      ...this.createBaseRequest(sessionId, options.customerId),
      items: items.map((item) => ({
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
    const apiVersion = options.apiVersion ?? this.config.apiVersion ?? 'v3';
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

    return this.makeRequest<AnalyticsResponse>(`/api/${apiVersion}/analytics`, 'POST', params);
  }
}
