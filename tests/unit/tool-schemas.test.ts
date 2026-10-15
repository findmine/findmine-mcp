import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import { loadConfig } from '../../src/config.js';
import { STYLE_GUIDE_CATEGORIES } from '../../src/content/style-guides.js';
import { StylingGuideArgsSchema } from '../../src/prompts/styling-guide.js';
import { createFindMineDeps, createFindMineServer } from '../../src/server.js';
import { toCompleteTheLookOutput } from '../../src/tools/get-complete-the-look.js';
import { toVisuallySimilarOutput } from '../../src/tools/get-visually-similar.js';
import {
  GetCompleteTheLookInputSchema,
  GetCompleteTheLookOutputSchema,
  GetStyleGuideInputSchema,
  GetStyleGuideOutputSchema,
  GetVisuallySimilarInputSchema,
  GetVisuallySimilarOutputSchema,
  TrackInteractionInputSchema,
  TrackInteractionOutputSchema,
  UpdateItemDetailsInputSchema,
  UpdateItemDetailsOutputSchema,
} from '../../src/tools/schemas.js';
import { toTrackInteractionOutput } from '../../src/tools/track-interaction.js';
import { toUpdateItemDetailsOutput } from '../../src/tools/update-item-details.js';
import type { ProductResource } from '../../src/types/mcp.js';
import { createFakeFindMineClient } from '../fakes/fake-findmine-client.js';

const OUTPUT_SCHEMAS = {
  get_style_guide: GetStyleGuideOutputSchema,
  get_complete_the_look: GetCompleteTheLookOutputSchema,
  get_visually_similar: GetVisuallySimilarOutputSchema,
  track_interaction: TrackInteractionOutputSchema,
  update_item_details: UpdateItemDetailsOutputSchema,
} as const;

const SAMPLE_ARGUMENTS: Record<keyof typeof OUTPUT_SCHEMAS, Record<string, unknown>> = {
  get_style_guide: { category: 'formal_outfits', occasion: 'wedding' },
  get_complete_the_look: { product_id: 'P100' },
  get_visually_similar: { product_id: 'P100' },
  track_interaction: { event_type: 'click', product_id: 'P100' },
  update_item_details: { items: [{ product_id: 'P100', in_stock: false, on_sale: true }] },
};

/** Connect a client to a server with every feature flag enabled. */
async function connectAllTools(): Promise<{ client: Client; close: () => Promise<void> }> {
  const deps = createFindMineDeps({
    config: loadConfig({ FINDMINE_ENABLE_TRACKING: 'true', FINDMINE_ENABLE_ITEM_UPDATES: 'true' }),
    client: createFakeFindMineClient(),
  });
  const server = createFindMineServer(deps);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'schema-test', version: '1.0.0' });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return {
    client,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}

function product(overrides: Partial<Record<keyof ProductResource, unknown>>): ProductResource {
  return {
    id: 'P1',
    name: 'Product',
    url: 'https://shop.example/p1',
    imageUrl: 'https://shop.example/p1.jpg',
    inStock: true,
    onSale: false,
    ...overrides,
  } as ProductResource;
}

describe('tool input schemas', () => {
  it('rejects a style guide category outside the shared enum, in the tool and the prompt', () => {
    expect(GetStyleGuideInputSchema.safeParse({ category: 'streetwear' }).success).toBe(false);
    expect(StylingGuideArgsSchema.safeParse({ category: 'streetwear' }).success).toBe(false);
    for (const category of STYLE_GUIDE_CATEGORIES) {
      expect(GetStyleGuideInputSchema.parse({ category }).category).toBe(category);
    }
  });

  it('applies defaults for omitted optional inputs', () => {
    expect(GetStyleGuideInputSchema.parse({})).toEqual({ category: 'general' });
    expect(GetCompleteTheLookInputSchema.parse({ product_id: 'P1' })).toEqual({
      product_id: 'P1',
      in_stock: true,
      on_sale: false,
      return_pdp_item: true,
    });
    expect(GetVisuallySimilarInputSchema.parse({ product_id: 'P1' })).toEqual({
      product_id: 'P1',
      limit: 10,
      offset: 0,
    });
    expect(
      TrackInteractionInputSchema.parse({ event_type: 'view', product_id: 'P1' }).quantity
    ).toBe(1);
  });

  it('rejects empty product IDs and empty item lists', () => {
    expect(GetCompleteTheLookInputSchema.safeParse({ product_id: '' }).success).toBe(false);
    expect(UpdateItemDetailsInputSchema.safeParse({ items: [] }).success).toBe(false);
  });
});

describe('registered tools', () => {
  it('advertise a title, all four behavior hints, and an output schema — and no operator knobs', async () => {
    const { client, close } = await connectAllTools();
    try {
      const { tools } = await client.listTools();
      expect(tools.map((tool) => tool.name).sort()).toEqual(Object.keys(OUTPUT_SCHEMAS).sort());

      for (const tool of tools) {
        expect(tool.title, tool.name).toMatch(/\S/);
        expect(tool.annotations, tool.name).toEqual({
          readOnlyHint: expect.any(Boolean),
          destructiveHint: expect.any(Boolean),
          idempotentHint: expect.any(Boolean),
          openWorldHint: expect.any(Boolean),
        });
        expect(tool.outputSchema?.type, tool.name).toBe('object');
        const inputProperties = tool.inputSchema.properties ?? {};
        expect(inputProperties, tool.name).not.toHaveProperty('api_version');
        expect(inputProperties, tool.name).not.toHaveProperty('force_enable');
      }
    } finally {
      await close();
    }
  });

  it('return structuredContent that parses against their own output schema', async () => {
    const { client, close } = await connectAllTools();
    try {
      for (const [name, schema] of Object.entries(OUTPUT_SCHEMAS)) {
        const result = await client.callTool({
          name,
          arguments: SAMPLE_ARGUMENTS[name as keyof typeof OUTPUT_SCHEMAS],
        });
        expect(result.isError, name).toBeFalsy();
        expect(schema.safeParse(result.structuredContent).success, name).toBe(true);
      }
    } finally {
      await close();
    }
  });
});

describe('output mapping from unvalidated upstream data', () => {
  it('keeps complete-the-look output schema-valid when fields are null or products are missing', () => {
    const stored: Record<string, ProductResource> = {
      P1: product({
        id: 'P1',
        name: null,
        price: null,
        formattedPrice: null,
        salePrice: null,
        formattedSalePrice: null,
        onSale: 'yes',
      }),
    };
    const output = toCompleteTheLookOutput(
      {
        product: product({ id: undefined }),
        looks: [
          {
            id: 'L1',
            title: 'Weekend',
            description: null as unknown as string,
            imageUrl: 'https://shop.example/looks/l1.jpg',
            productIds: ['P1', 'P-UNSEEN', ''],
          },
          { id: '', productIds: ['P1'] },
        ],
      },
      { getProduct: (id) => stored[id] }
    );

    expect(GetCompleteTheLookOutputSchema.safeParse(output).success).toBe(true);
    expect(output.product).toBeUndefined();
    expect(output.total_looks).toBe(1);
    expect(output.looks[0]).toMatchObject({
      title: 'Weekend',
      image_url: 'https://shop.example/looks/l1.jpg',
    });
    expect(output.looks[0].description).toBeUndefined();
    expect(output.looks[0].items).toEqual([
      {
        product_id: 'P1',
        title: 'P1',
        url: expect.any(String),
        image_url: expect.any(String),
        uri: 'product:///P1',
      },
      { product_id: 'P-UNSEEN', title: 'P-UNSEEN', uri: 'product:///P-UNSEEN' },
    ]);
  });

  it('maps sale price fields onto ProductRef', () => {
    const output = toVisuallySimilarOutput('P1', {
      products: [
        product({
          id: 'P2',
          price: 6999,
          formattedPrice: '$69.99',
          salePrice: 4999,
          formattedSalePrice: '$49.99',
          onSale: true,
        }),
      ],
      total: 1,
    });

    expect(GetVisuallySimilarOutputSchema.safeParse(output).success).toBe(true);
    expect(output.products[0]).toMatchObject({
      price: 6999,
      formatted_price: '$69.99',
      sale_price: 4999,
      formatted_sale_price: '$49.99',
      on_sale: true,
    });
  });

  it('drops visually similar products without an ID and falls back to the returned count', () => {
    const output = toVisuallySimilarOutput('P1', {
      products: [product({ id: 'P2', category: 'Shoes' }), product({ id: undefined })],
      total: undefined as unknown as number,
    });

    expect(GetVisuallySimilarOutputSchema.safeParse(output).success).toBe(true);
    expect(output.products).toEqual([
      expect.objectContaining({ product_id: 'P2', category: 'Shoes' }),
    ]);
    expect(output.total).toBe(1);
  });

  it('treats an analytics response as accepted unless it says success: false', () => {
    const args = { event_type: 'purchase', product_id: 'P1' } as const;
    expect(toTrackInteractionOutput(args, {}).accepted).toBe(true);
    expect(toTrackInteractionOutput(args, { success: false }).accepted).toBe(false);
    expect(TrackInteractionOutputSchema.safeParse(toTrackInteractionOutput(args, {})).success).toBe(
      true
    );
  });

  it('reports per-item update results from the failure list', () => {
    const output = toUpdateItemDetailsOutput(
      [
        { product_id: 'P1', in_stock: true, on_sale: false },
        { product_id: 'P2', product_color_id: 'RED', in_stock: false, on_sale: false },
      ],
      { failures: [{ product_id: 'P2', product_color_id: 'RED', reason: 'unknown item' }] }
    );

    expect(UpdateItemDetailsOutputSchema.safeParse(output).success).toBe(true);
    expect(output).toEqual({
      results: [
        { product_id: 'P1', ok: true },
        { product_id: 'P2', product_color_id: 'RED', ok: false, reason: 'unknown item' },
      ],
      updated_count: 1,
      failed_count: 1,
    });
  });

  it('fails every item when the response reports success: false', () => {
    const items = [
      { product_id: 'P1', in_stock: true, on_sale: false },
      { product_id: 'P2', product_color_id: 'RED', in_stock: false, on_sale: false },
    ];

    const bare = toUpdateItemDetailsOutput(items, { success: false });
    expect(UpdateItemDetailsOutputSchema.safeParse(bare).success).toBe(true);
    expect(bare).toEqual({
      results: [
        { product_id: 'P1', ok: false, reason: 'FindMine reported the update failed' },
        {
          product_id: 'P2',
          product_color_id: 'RED',
          ok: false,
          reason: 'FindMine reported the update failed',
        },
      ],
      updated_count: 0,
      failed_count: 2,
    });

    const withMessage = toUpdateItemDetailsOutput(items, {
      success: false,
      message: 'catalog locked',
    });
    expect(withMessage.results.map((result) => result.reason)).toEqual([
      'catalog locked',
      'catalog locked',
    ]);
  });

  it('matches a color-specific failure to an item sent without a color', () => {
    const output = toUpdateItemDetailsOutput(
      [
        { product_id: 'P1', in_stock: true, on_sale: false },
        { product_id: 'P3', product_color_id: 'BLU', in_stock: true, on_sale: false },
      ],
      {
        success: true,
        failures: [
          { product_id: 'P1', product_color_id: 'RED', reason: 'unknown color' },
          { product_id: 'P3', product_color_id: 'RED', reason: 'unknown color' },
        ],
      }
    );

    expect(output.results).toEqual([
      { product_id: 'P1', ok: false, reason: 'unknown color' },
      { product_id: 'P3', product_color_id: 'BLU', ok: true },
    ]);
    expect(output.updated_count).toBe(1);
    expect(output.failed_count).toBe(1);
  });

  it('derives counts from the per-item results, ignoring counts in the body', () => {
    const twoItems = [
      { product_id: 'P1', in_stock: true, on_sale: false },
      { product_id: 'P2', in_stock: true, on_sale: false },
    ];
    const rejected = toUpdateItemDetailsOutput(twoItems, {
      success: false,
      updated_count: 0,
      failed_count: 0,
    });
    expect(rejected.results.every((result) => !result.ok)).toBe(true);
    expect(rejected.updated_count).toBe(0);
    expect(rejected.failed_count).toBe(2);

    const overReported = toUpdateItemDetailsOutput(
      [...twoItems, { product_id: 'P3', in_stock: false, on_sale: false }],
      {
        success: true,
        updated_count: 5,
        failed_count: 0,
        failures: [{ product_id: 'P2', reason: 'unknown item' }],
      }
    );
    expect(UpdateItemDetailsOutputSchema.safeParse(overReported).success).toBe(true);
    expect(overReported.results.map((result) => result.ok)).toEqual([true, false, true]);
    expect(overReported.updated_count).toBe(2);
    expect(overReported.failed_count).toBe(1);
  });
});
