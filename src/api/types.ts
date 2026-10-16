/**
 * The FindMine API surface the server depends on. `FindMineClient` implements it over
 * HTTP and `MockFindMineClient` from fixtures; tests and embedders can inject any object
 * with the same shape through `createFindMineDeps({ client })`.
 *
 * Parameter names follow the public OpenAPI document (v3.0.0); see `src/api/schemas.ts`
 * for the response shapes.
 */

import type {
  ANALYTICS_EVENT_TYPES,
  ANALYTICS_INTERACTIONS,
  CUSTOMER_GENDERS,
  CompleteTheLook,
  VisuallySimilar,
} from './schemas.js';

export type CustomerGender = (typeof CUSTOMER_GENDERS)[number];
export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];
export type AnalyticsInteraction = (typeof ANALYTICS_INTERACTIONS)[number];

/** GET /api/v3/complete-the-look */
export interface CompleteTheLookParams {
  productId: string;
  colorId?: string;
  inStock: boolean;
  onSale: boolean;
  /** `customer_session_id`, required by the API. */
  sessionId: string;
  customerId?: string;
  customerGender?: CustomerGender;
  returnPdpItem?: boolean;
  region?: string;
  language?: string;
}

/** GET /api/v3/visually-similar (no session or customer parameters exist). */
export interface VisuallySimilarParams {
  productId: string;
  colorId?: string;
  region?: string;
  language?: string;
  /** Adds `category` and `details` to each similar item. */
  returnDetails?: boolean;
}

/** One POST /api/v3/item-details body. */
export interface ItemDetailsUpdate {
  productId: string;
  colorId?: string;
  inStock: boolean;
  onSale: boolean;
}

/** The observed outcome of one item-details request. */
export interface ItemDetailsResult {
  productId: string;
  colorId?: string;
  /** The request returned 2xx and its body did not report failure. */
  ok: boolean;
  /** 201 = item updated, 200 = no change made; absent when not ok or another 2xx. */
  changed?: boolean;
  reason?: string;
}

export interface AnalyticsProduct {
  productId: string;
  quantity: number;
  /** Price after discount. */
  price: number;
  /** Price before discount. */
  listPrice?: number;
}

/** GET /api/v3/analytics */
export interface AnalyticsEvent {
  sessionId: string;
  eventType: AnalyticsEventType;
  interaction?: AnalyticsInteraction;
  customerId?: string;
  /** FindMine `item_id` of the item interacted with. */
  itemId?: string;
  /** FindMine `set_id` (look ID) of the look interacted with. */
  setId?: string;
  transactionId?: string;
  totalPrice?: number;
  totalDiscount?: number;
  currency?: string;
  /** Sent as the comma-separated `product_ids`, `product_quantities`, ... parameters. */
  products?: AnalyticsProduct[];
}

export interface AnalyticsResult {
  /** The request returned 2xx and its body (usually empty, 204) did not report failure. */
  accepted: boolean;
}

export interface FindMineApi {
  getCompleteTheLook(params: CompleteTheLookParams): Promise<CompleteTheLook>;
  getVisuallySimilar(params: VisuallySimilarParams): Promise<VisuallySimilar>;
  /** One request per item; per-item failures are results, not rejections. */
  updateItemDetails(items: ItemDetailsUpdate[]): Promise<ItemDetailsResult[]>;
  trackEvent(event: AnalyticsEvent): Promise<AnalyticsResult>;
}
