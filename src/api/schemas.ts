/**
 * Zod schemas for FindMine API v3 response bodies, written against the public OpenAPI
 * document (https://findmine.com/swagger.json, info.version 3.0.0).
 *
 * The raw schemas are loose: fields the document does not list pass through instead of
 * failing the parse. Fields it does list are type-checked, so a body that changes a
 * documented type fails loudly rather than producing silently wrong output. Each schema
 * transforms the raw body into the normalized shape the rest of the server uses:
 *
 * - `uni` ("PID||COLOR") is split into `product_id` and `product_color_id`; a color of
 *   `None` (or no color part) means the product has no color.
 * - Numeric IDs are coerced to strings.
 * - `null` is treated as absent.
 * - A complete-the-look body with `result: "error"` (CompleteTheLookErrorResponse) is a
 *   successful call with no looks and a `reason`, e.g. `excluded-category`.
 */

import { z } from 'zod';

export const CUSTOMER_GENDERS = ['M', 'W', 'U'] as const;

/** `event_type` values accepted by GET /api/v3/analytics. */
export const ANALYTICS_EVENT_TYPES = ['interaction', 'transaction'] as const;

/** `interaction` values accepted by GET /api/v3/analytics. */
export const ANALYTICS_INTERACTIONS = [
  'page_view',
  'page_load_with_fm',
  'fm_module_view',
  'item_click',
  'next_click',
  'previous_click',
  'image_expand_click',
] as const;

/** The `uni` value FindMine uses for a product without a color. */
const NO_COLOR = 'None';

/** A product as returned by FindMine, normalized. */
export interface FindMineItem {
  product_id: string;
  product_color_id?: string;
  /** FindMine's own item ID (used by analytics). */
  item_id?: string;
  title?: string;
  url?: string;
  image_url?: string;
  /** Raw price as returned by FindMine. */
  price?: number;
  /** Visually similar only: similarity rank, lower is more similar. */
  rank?: number;
  /** Visually similar only, with `return_details=true`. */
  category?: string;
  /** Visually similar only, with `return_details=true`. */
  details?: Record<string, unknown>;
}

export interface FindMineLook {
  look_id: string;
  items: FindMineItem[];
}

export interface UniParts {
  product_id: string;
  product_color_id?: string;
}

/**
 * Split a FindMine `uni` ("PID||COLOR") into product and color IDs.
 * Returns undefined when there is no product ID to address.
 */
export function parseUni(uni: string | undefined): UniParts | undefined {
  if (!uni) {
    return undefined;
  }
  const separator = uni.indexOf('||');
  const productId = (separator === -1 ? uni : uni.slice(0, separator)).trim();
  const colorId = separator === -1 ? '' : uni.slice(separator + 2).trim();
  if (!productId) {
    return undefined;
  }
  return colorId && colorId !== NO_COLOR
    ? { product_id: productId, product_color_id: colorId }
    : { product_id: productId };
}

/* ------------------------------------------------------------------ */
/* Field schemas                                                       */
/* ------------------------------------------------------------------ */

/** The document types IDs as strings; numeric IDs are accepted and stringified. */
const IdSchema = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((value) => (value === null || value === undefined ? undefined : String(value)));

/** Optional text: `null` and empty strings become undefined. */
const TextSchema = z
  .string()
  .nullish()
  .transform((value) => value || undefined);

const NumberSchema = z
  .number()
  .nullish()
  .transform((value) => value ?? undefined);

/* ------------------------------------------------------------------ */
/* Items and looks                                                     */
/* ------------------------------------------------------------------ */

/**
 * One product in a response: a look item or `pdp_item` (complete-the-look), or a
 * `similar_items` entry or `pdp_item` (visually-similar). Complete-the-look names the
 * product page `item_url`; visually-similar names it `url`.
 */
const RawItemSchema = z.looseObject({
  item_id: IdSchema,
  uni: IdSchema,
  title: TextSchema,
  item_url: TextSchema,
  url: TextSchema,
  image_url: TextSchema,
  price: NumberSchema,
  rank: z
    .number()
    .int()
    .nullish()
    .transform((value) => value ?? undefined),
  category: TextSchema,
  details: z
    .record(z.string(), z.unknown())
    .nullish()
    .transform((value) => value ?? undefined),
});

/** Normalizes to a `FindMineItem`, or undefined when the item has no usable `uni`. */
const ItemSchema = RawItemSchema.transform((raw): FindMineItem | undefined => {
  const ids = parseUni(raw.uni);
  if (!ids) {
    return undefined;
  }
  return {
    ...ids,
    item_id: raw.item_id,
    title: raw.title,
    url: raw.item_url ?? raw.url,
    image_url: raw.image_url,
    price: raw.price,
    rank: raw.rank,
    category: raw.category,
    details: raw.details,
  };
});

/** A missing or null list is empty; items that cannot be addressed are dropped. */
const ItemListSchema = z
  .array(ItemSchema)
  .nullish()
  .transform((items) => (items ?? []).filter((item) => item !== undefined));

const RawLookSchema = z.looseObject({
  look_id: IdSchema,
  items: ItemListSchema,
});

/** Looks without a `look_id` cannot be addressed by URI and are dropped. */
const LookListSchema = z
  .array(RawLookSchema)
  .nullish()
  .transform((looks) =>
    (looks ?? []).flatMap((look): FindMineLook[] =>
      look.look_id ? [{ look_id: look.look_id, items: look.items }] : []
    )
  );

/* ------------------------------------------------------------------ */
/* Response bodies                                                     */
/* ------------------------------------------------------------------ */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * An error body carries no usable products (`looks` is an untyped array), so only its
 * envelope is kept; the rest is not validated.
 */
function keepEnvelopeOnError(body: unknown): unknown {
  if (isRecord(body) && body.result === 'error') {
    const { result, response_uuid, reason } = body;
    return { result, response_uuid, reason };
  }
  return body;
}

/** Why a body with `result: "error"` returned nothing: its `reason`, else `error`. */
function reasonFor(result: string | undefined, reason: string | undefined): string | undefined {
  return reason ?? (result === 'error' ? 'error' : undefined);
}

/** GET /api/v3/complete-the-look: CompleteTheLookSuccessResponse | CompleteTheLookErrorResponse */
export const CompleteTheLookResponseSchema = z.preprocess(
  keepEnvelopeOnError,
  z
    .looseObject({
      result: TextSchema,
      response_uuid: IdSchema,
      reason: TextSchema,
      pdp_item: ItemSchema.nullish(),
      looks: LookListSchema,
    })
    .transform((body) => ({
      response_uuid: body.response_uuid,
      pdp_item: body.pdp_item ?? undefined,
      looks: body.looks,
      reason: reasonFor(body.result, body.reason),
    }))
);

/**
 * GET /api/v3/visually-similar: VisuallySimilarSuccessResponse. The document defines no
 * error body for this endpoint; `result: "error"` is handled as for complete-the-look.
 */
export const VisuallySimilarResponseSchema = z.preprocess(
  keepEnvelopeOnError,
  z
    .looseObject({
      result: TextSchema,
      response_uuid: IdSchema,
      reason: TextSchema,
      pdp_item: ItemSchema.nullish(),
      similar_items: ItemListSchema,
    })
    .transform((body) => ({
      response_uuid: body.response_uuid,
      pdp_item: body.pdp_item ?? undefined,
      similar_items: body.similar_items,
      reason: reasonFor(body.result, body.reason),
    }))
);

export type CompleteTheLook = z.output<typeof CompleteTheLookResponseSchema>;
export type VisuallySimilar = z.output<typeof VisuallySimilarResponseSchema>;

/* ------------------------------------------------------------------ */
/* Error and status bodies                                             */
/* ------------------------------------------------------------------ */

/**
 * Explain a non-2xx body. ErrorResponse's `message` is an object of field errors
 * (`{"product_id": ["Missing data for required field."]}`); a string `message` or a
 * `reason` is used as-is.
 */
export function describeErrorBody(body: unknown): string | undefined {
  if (!isRecord(body)) {
    return undefined;
  }
  const { message, reason } = body;
  if (typeof message === 'string' && message) {
    return message;
  }
  if (isRecord(message)) {
    const fields = Object.entries(message).map(([field, errors]) => {
      const text = Array.isArray(errors) ? errors.map(String).join(' ') : String(errors);
      return `${field}: ${text}`;
    });
    if (fields.length > 0) {
      return fields.join('; ');
    }
  }
  return typeof reason === 'string' && reason ? reason : undefined;
}

/**
 * Whether a 2xx body nonetheless reports failure (`success: false` or `result: "error"`).
 * Returns the reason when it does.
 */
export function reportedFailure(body: unknown): { reason: string } | undefined {
  if (!isRecord(body) || (body.success !== false && body.result !== 'error')) {
    return undefined;
  }
  return { reason: describeErrorBody(body) ?? 'FindMine reported a failure' };
}
