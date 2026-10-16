/**
 * HTTP client for the FindMine API v3.
 *
 * Requests follow the public OpenAPI document: identity is the `application` parameter
 * (there is no auth header), complete-the-look, visually-similar, and analytics are GET
 * requests, and item-details is a POST of a single item.
 *
 * Retry policy: network errors, 5xx, and 429 are retried with exponential backoff, and
 * 429/5xx honor `Retry-After`. Other 4xx responses and timeouts are not retried.
 */

import type { z } from 'zod';
import { logger } from '../utils/logger.js';
import {
  CompleteTheLookResponseSchema,
  VisuallySimilarResponseSchema,
  describeErrorBody,
  reportedFailure,
} from './schemas.js';
import type { CompleteTheLook, VisuallySimilar } from './schemas.js';
import type {
  AnalyticsEvent,
  AnalyticsResult,
  CompleteTheLookParams,
  FindMineApi,
  ItemDetailsResult,
  ItemDetailsUpdate,
  VisuallySimilarParams,
} from './types.js';

export interface FindMineClientConfig {
  apiBaseUrl: string;
  applicationId: string;
  /** Path segment in `/api/{version}/...`. Default `v3`. */
  apiVersion?: string;
  defaultRegion?: string;
  defaultLanguage?: string;
  /** Per-attempt timeout covering the response body. Default 10000. */
  timeoutMs?: number;
  /** Retries after the first attempt. Default 2. */
  retryCount?: number;
  /** Backoff base: attempt n waits retryDelayMs * 2^n. Default 500. */
  retryDelayMs?: number;
  /** A `Retry-After` longer than this fails the request instead of waiting. Default 30000. */
  maxRetryDelayMs?: number;
}

/** A FindMine request that failed. `status` is set when the API responded. */
export class FindMineApiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'FindMineApiError';
    this.status = status;
  }
}

type QueryValue = string | number | boolean | undefined;

interface RequestSpec {
  /** Endpoint name, e.g. `complete-the-look`. */
  endpoint: string;
  method: 'GET' | 'POST';
  query?: Record<string, QueryValue>;
  body?: Record<string, unknown>;
}

interface ApiResponse {
  status: number;
  /** Parsed JSON, or undefined for an empty body (e.g. 204). */
  body: unknown;
}

const REDACTED = '[REDACTED]';

export class FindMineClient implements FindMineApi {
  private readonly config: Required<
    Omit<FindMineClientConfig, 'defaultRegion' | 'defaultLanguage'>
  > &
    Pick<FindMineClientConfig, 'defaultRegion' | 'defaultLanguage'>;

  constructor(config: FindMineClientConfig) {
    this.config = {
      ...config,
      apiVersion: config.apiVersion ?? 'v3',
      timeoutMs: config.timeoutMs ?? 10_000,
      retryCount: config.retryCount ?? 2,
      retryDelayMs: config.retryDelayMs ?? 500,
      maxRetryDelayMs: config.maxRetryDelayMs ?? 30_000,
    };
  }

  async getCompleteTheLook(params: CompleteTheLookParams): Promise<CompleteTheLook> {
    const response = await this.request({
      endpoint: 'complete-the-look',
      method: 'GET',
      query: {
        application: this.config.applicationId,
        product_id: params.productId,
        product_color_id: params.colorId,
        product_in_stock: params.inStock,
        product_on_sale: params.onSale,
        return_pdp_item: params.returnPdpItem,
        customer_session_id: params.sessionId,
        customer_id: params.customerId,
        customer_gender: params.customerGender,
        region: params.region ?? this.config.defaultRegion,
        language: params.language ?? this.config.defaultLanguage,
      },
    });
    return parseBody('complete-the-look', CompleteTheLookResponseSchema, response.body);
  }

  async getVisuallySimilar(params: VisuallySimilarParams): Promise<VisuallySimilar> {
    const response = await this.request({
      endpoint: 'visually-similar',
      method: 'GET',
      query: {
        application: this.config.applicationId,
        product_id: params.productId,
        product_color_id: params.colorId,
        region: params.region ?? this.config.defaultRegion,
        language: params.language ?? this.config.defaultLanguage,
        return_details: params.returnDetails,
      },
    });
    return parseBody('visually-similar', VisuallySimilarResponseSchema, response.body);
  }

  /**
   * The endpoint takes one item per request, so each item gets its own POST and its own
   * observed result. Items are sent one at a time; a failed item does not stop the rest.
   */
  async updateItemDetails(items: ItemDetailsUpdate[]): Promise<ItemDetailsResult[]> {
    const results: ItemDetailsResult[] = [];
    for (const item of items) {
      results.push(await this.updateItem(item));
    }
    return results;
  }

  async trackEvent(event: AnalyticsEvent): Promise<AnalyticsResult> {
    const products = event.products;
    const listPrices = products?.map((product) => product.listPrice);
    const response = await this.request({
      endpoint: 'analytics',
      method: 'GET',
      query: {
        application: this.config.applicationId,
        session_id: event.sessionId,
        event_type: event.eventType,
        interaction: event.interaction,
        customer_id: event.customerId,
        country: this.config.defaultRegion,
        language: this.config.defaultLanguage,
        item_id: event.itemId,
        set_id: event.setId,
        transaction_id: event.transactionId,
        total_price: event.totalPrice,
        total_discount: event.totalDiscount,
        currency: event.currency,
        product_ids: joinList(products?.map((product) => product.productId)),
        product_quantities: joinList(products?.map((product) => product.quantity)),
        product_prices: joinList(products?.map((product) => product.price)),
        product_list_prices: listPrices?.every((price) => price !== undefined)
          ? joinList(listPrices)
          : undefined,
      },
    });
    return { accepted: reportedFailure(response.body) === undefined };
  }

  private async updateItem(item: ItemDetailsUpdate): Promise<ItemDetailsResult> {
    const ids = { productId: item.productId, colorId: item.colorId };
    let response: ApiResponse;
    try {
      response = await this.request({
        endpoint: 'item-details',
        method: 'POST',
        body: {
          application: this.config.applicationId,
          product_id: item.productId,
          product_color_id: item.colorId,
          product_in_stock: item.inStock,
          product_on_sale: item.onSale,
        },
      });
    } catch (error) {
      return { ...ids, ok: false, reason: error instanceof Error ? error.message : String(error) };
    }
    const failure = reportedFailure(response.body);
    if (failure) {
      return { ...ids, ok: false, reason: failure.reason };
    }
    const changed = response.status === 201 ? true : response.status === 200 ? false : undefined;
    return { ...ids, ok: true, changed };
  }

  private async request(spec: RequestSpec): Promise<ApiResponse> {
    const url = new URL(`/api/${this.config.apiVersion}/${spec.endpoint}`, this.config.apiBaseUrl);
    for (const [key, value] of Object.entries(spec.query ?? {})) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
    const label = `FindMine ${spec.endpoint}`;
    const init: RequestInit = {
      method: spec.method,
      headers: {
        Accept: 'application/json',
        ...(spec.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: spec.body ? JSON.stringify(spec.body) : undefined,
    };

    for (let attempt = 0; ; attempt++) {
      logger.log(
        `[FindMineClient] ${spec.method} ${this.redact(url.href)} (attempt ${String(attempt + 1)})`
      );

      let status: number;
      let headers: Headers;
      let text: string;
      try {
        const response = await fetch(url, {
          ...init,
          signal: AbortSignal.timeout(this.config.timeoutMs),
        });
        status = response.status;
        headers = response.headers;
        text = await response.text();
      } catch (error) {
        if (isTimeoutError(error)) {
          throw new FindMineApiError(`${label} timed out after ${String(this.config.timeoutMs)}ms`);
        }
        const message = describeNetworkError(error);
        if (attempt < this.config.retryCount) {
          logger.log(`[FindMineClient] ${label} network error, retrying: ${message}`);
          await sleep(this.backoff(attempt));
          continue;
        }
        throw new FindMineApiError(`${label} request failed: ${message}`);
      }

      logger.log(
        `[FindMineClient] ${label} -> ${String(status)} ${this.redact(text.slice(0, 500))}`
      );

      const body = parseJson(text);
      if (status >= 200 && status < 300) {
        if (body === INVALID_JSON) {
          throw new FindMineApiError(`${label} returned a non-JSON body`, status);
        }
        return { status, body };
      }

      if ((status === 429 || status >= 500) && attempt < this.config.retryCount) {
        const delay = retryAfterMs(headers.get('retry-after')) ?? this.backoff(attempt);
        if (delay <= this.config.maxRetryDelayMs) {
          logger.log(
            `[FindMineClient] ${label} HTTP ${String(status)}, retrying in ${String(delay)}ms`
          );
          await sleep(delay);
          continue;
        }
      }

      const detail = body === INVALID_JSON ? text.slice(0, 200) : describeErrorBody(body);
      throw new FindMineApiError(
        `${label} returned HTTP ${String(status)}${detail ? `: ${detail}` : ''}`,
        status
      );
    }
  }

  private backoff(attempt: number): number {
    return this.config.retryDelayMs * 2 ** attempt;
  }

  /** Keep the application ID out of debug logs. */
  private redact(text: string): string {
    const id = this.config.applicationId;
    return id ? text.split(id).join(REDACTED) : text;
  }
}

const INVALID_JSON = Symbol('invalid JSON');

function parseJson(text: string): unknown {
  if (text.trim() === '') {
    return undefined;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return INVALID_JSON;
  }
}

function parseBody<T extends z.ZodType>(endpoint: string, schema: T, body: unknown): z.output<T> {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join('.') || '(body)'}: ${issue.message}`)
      .join('; ');
    throw new FindMineApiError(`FindMine ${endpoint} returned an unexpected body: ${issues}`);
  }
  return parsed.data;
}

/** `Retry-After` as delay-seconds or an HTTP date; undefined when absent or invalid. */
function retryAfterMs(header: string | null): number | undefined {
  if (header === null || header.trim() === '') {
    return undefined;
  }
  const seconds = Number(header);
  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1000);
  }
  const date = Date.parse(header);
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
}

function joinList(values: Array<string | number | undefined> | undefined): string | undefined {
  return values && values.length > 0 ? values.join(',') : undefined;
}

function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  if (error.name === 'TimeoutError' || error.name === 'AbortError') {
    return true;
  }
  if (error.cause instanceof Error) {
    return error.cause.name === 'TimeoutError' || error.cause.name === 'AbortError';
  }
  return false;
}

function describeNetworkError(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }
  const cause = error.cause instanceof Error ? ` (${error.cause.message})` : '';
  return `${error.message}${cause}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
