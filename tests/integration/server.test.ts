/**
 * Drives the real server factory in-process through the v2 Client, over the SDK's
 * `createMcpHandler` entry, on both protocol eras. The FindMine API is replaced at the
 * `deps` boundary by an in-memory fake; nothing touches the network.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { Client, ProtocolError, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { loadConfig } from '../../src/config.js';
import { createFindMineDeps, createFindMineServer } from '../../src/server.js';
import type { CreateFindMineServerOptions, FindMineDeps } from '../../src/server.js';
import {
  type FakeFindMineClient,
  type FakeResponses,
  createFakeFindMineClient,
  shirt,
} from '../fakes/fake-findmine-client.js';

type Era = 'legacy' | 'modern';

const READ_TOOLS = ['get_complete_the_look', 'get_style_guide', 'get_visually_similar'];
const WRITE_TOOLS = ['track_interaction', 'update_item_details'];

const closers: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (closers.length > 0) {
    await closers.pop()?.();
  }
});

function makeDeps(
  options: { flags?: boolean; responses?: FakeResponses } = {}
): FindMineDeps & { client: FakeFindMineClient } {
  const client = createFakeFindMineClient(options.responses);
  const config = loadConfig(
    options.flags ? { FINDMINE_ENABLE_TRACKING: 'true', FINDMINE_ENABLE_ITEM_UPDATES: 'true' } : {}
  );
  return { ...createFindMineDeps({ config, client }), client };
}

async function connect(
  deps: FindMineDeps,
  era: Era,
  serverOptions?: CreateFindMineServerOptions
): Promise<Client> {
  const handler = createMcpHandler(() => createFindMineServer(deps, serverOptions));
  const transport = new StreamableHTTPClientTransport(new URL('http://test.local/mcp'), {
    fetch: (url, init) => handler.fetch(new Request(url, init)),
  });
  const client = new Client(
    { name: 'findmine-test', version: '1.0.0' },
    era === 'modern' ? { versionNegotiation: { mode: { pin: '2026-07-28' } } } : {}
  );
  await client.connect(transport);
  closers.push(async () => {
    await client.close();
    await handler.close();
  });
  expect(client.getProtocolEra()).toBe(era);
  return client;
}

async function expectProtocolError(promise: Promise<unknown>, code: number): Promise<void> {
  const error: unknown = await promise.then(
    () => undefined,
    (rejection: unknown) => rejection
  );
  expect(error).toBeInstanceOf(ProtocolError);
  expect((error as ProtocolError).code).toBe(code);
}

describe.each<Era>(['legacy', 'modern'])('FindMine MCP server (%s era)', (era) => {
  it('lists only the read tools when write tools are disabled', async () => {
    const client = await connect(makeDeps(), era);
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name).sort()).toEqual(READ_TOOLS);
  });

  it('lists the write tools when their feature flags are enabled', async () => {
    const client = await connect(makeDeps({ flags: true }), era);
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name).sort()).toEqual([...READ_TOOLS, ...WRITE_TOOLS].sort());
  });

  it('returns complete-the-look structuredContent with resource URIs', async () => {
    const deps = makeDeps();
    const client = await connect(deps, era);

    const result = await client.callTool({
      name: 'get_complete_the_look',
      arguments: { product_id: 'P100', product_color_id: 'BLU' },
    });

    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toEqual({
      product: expect.objectContaining({
        product_id: 'P100',
        product_color_id: 'BLU',
        title: 'Oxford Shirt',
        formatted_price: '$79.99',
        uri: 'product:///P100?color=BLU',
      }),
      looks: [
        {
          look_id: 'L1',
          uri: 'look:///L1',
          items: [
            expect.objectContaining({ product_id: 'P100', uri: 'product:///P100?color=BLU' }),
            expect.objectContaining({ product_id: 'P200', uri: 'product:///P200' }),
          ],
        },
      ],
      total_looks: 1,
    });

    // Input defaults reach the API layer: (productId, inStock, onSale, sessionId, options)
    expect(deps.client.calls).toHaveLength(1);
    expect(deps.client.calls[0].args.slice(0, 3)).toEqual(['P100', true, false]);
    expect(deps.client.calls[0].args[4]).toMatchObject({ colorId: 'BLU', returnPdpItem: true });
  });

  it('serves the URIs returned by a tool call as readable resources', async () => {
    const client = await connect(makeDeps(), era);
    const result = await client.callTool({
      name: 'get_complete_the_look',
      arguments: { product_id: 'P100' },
    });
    const output = result.structuredContent as {
      product: { uri: string };
      looks: Array<{ uri: string }>;
    };

    const look = await client.readResource({ uri: output.looks[0].uri });
    expect(look.contents[0].uri).toBe('look:///L1');
    expect(JSON.parse((look.contents[0] as { text: string }).text)).toMatchObject({
      id: 'L1',
      productIds: ['P100', 'P200'],
    });

    const product = await client.readResource({ uri: output.product.uri });
    expect(JSON.parse((product.contents[0] as { text: string }).text)).toMatchObject({
      id: 'P100',
      name: shirt.name,
    });

    const { resources } = await client.listResources();
    expect(resources.map((resource) => resource.uri).sort()).toEqual([
      'look:///L1',
      'product:///P100?color=BLU',
      'product:///P200',
    ]);
  });

  it('round-trips product IDs containing reserved characters', async () => {
    const odd = { ...shirt, product_id: 'SKU 12/34', product_color_id: undefined };
    const client = await connect(
      makeDeps({ responses: { completeTheLook: { pdp_item: odd, looks: [] } } }),
      era
    );
    const result = await client.callTool({
      name: 'get_complete_the_look',
      arguments: { product_id: 'SKU 12/34' },
    });
    const uri = (result.structuredContent as { product: { uri: string } }).product.uri;

    expect(uri).toBe('product:///SKU%2012%2F34');
    const read = await client.readResource({ uri });
    expect(JSON.parse((read.contents[0] as { text: string }).text)).toMatchObject({
      id: 'SKU 12/34',
    });
  });

  it('rejects unknown resource URIs with the resource-not-found protocol error', async () => {
    const client = await connect(makeDeps(), era);
    await expectProtocolError(client.readResource({ uri: 'product:///NEVER-SEEN' }), -32602);
    await expectProtocolError(client.readResource({ uri: 'look:///NEVER-SEEN' }), -32602);
    await expectProtocolError(client.readResource({ uri: 'catalog:///P100' }), -32602);
  });

  it('reports upstream failures as isError results without structuredContent', async () => {
    const client = await connect(
      makeDeps({ responses: { completeTheLook: new Error('FindMine API error: boom') } }),
      era
    );
    const result = await client.callTool({
      name: 'get_complete_the_look',
      arguments: { product_id: 'P100' },
    });
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toBeUndefined();
    expect(JSON.stringify(result.content)).toContain('FindMine API error: boom');
  });

  it('honors outfit_completion prompt arguments', async () => {
    const client = await connect(makeDeps(), era);
    const prompt = await client.getPrompt({
      name: 'outfit_completion',
      arguments: { product_id: 'P777', occasion: 'date_night' },
    });
    const text = JSON.stringify(prompt.messages);
    expect(text).toContain('P777');
    expect(text).toContain('date night');

    await expectProtocolError(
      client.getPrompt({ name: 'outfit_completion', arguments: {} }),
      -32602
    );
  });

  it('honors styling_guide prompt arguments and rejects unknown categories', async () => {
    const client = await connect(makeDeps(), era);

    const general = JSON.stringify((await client.getPrompt({ name: 'styling_guide' })).messages);
    expect(general).not.toContain('reference guide');

    const focused = JSON.stringify(
      (
        await client.getPrompt({
          name: 'styling_guide',
          arguments: { category: 'formal_outfits', occasion: 'wedding' },
        })
      ).messages
    );
    expect(focused).toContain('focused on category: formal outfits; occasion: wedding');
    expect(focused).toContain('# Formal Outfit Style Guide');
    expect(focused).toContain('## Wedding Specific Advice');

    await expectProtocolError(
      client.getPrompt({ name: 'styling_guide', arguments: { category: 'streetwear' } }),
      -32602
    );
  });

  it('documents feature-flagged tools in findmine_help only when they are enabled', async () => {
    const off = await connect(makeDeps(), era);
    const offText = JSON.stringify((await off.getPrompt({ name: 'findmine_help' })).messages);
    expect(offText).toContain('get_complete_the_look');
    expect(offText).not.toContain('track_interaction');

    const on = await connect(makeDeps({ flags: true }), era);
    const onText = JSON.stringify((await on.getPrompt({ name: 'findmine_help' })).messages);
    expect(onText).toContain('track_interaction');
    expect(onText).toContain('update_item_details');
  });
});

describe('createFindMineServer extend hook', () => {
  it('lets downstream builds register additional capabilities per instance', async () => {
    const deps = makeDeps();
    const client = await connect(deps, 'legacy', {
      extend: (server, extendedDeps) => {
        expect(extendedDeps).toBe(deps);
        server.registerTool('downstream_ping', { description: 'test-only tool' }, () => ({
          content: [{ type: 'text', text: 'pong' }],
        }));
      },
    });
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name)).toContain('downstream_ping');
  });
});
