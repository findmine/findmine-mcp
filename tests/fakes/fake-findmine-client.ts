/**
 * In-memory stand-in for the FindMine API, injected at the `deps` boundary.
 * Records every call so tests can assert what reached the API layer.
 */

import type { FindMineApi } from '../../src/api/findmine-client.js';
import type {
  AnalyticsResponse,
  CompleteTheLookResponse,
  FindMineProduct,
  ItemDetailsUpdateResponse,
  VisuallySimilarResponse,
} from '../../src/types/findmine-api.js';

export const shirt: FindMineProduct = {
  product_id: 'P100',
  product_color_id: 'BLU',
  name: 'Oxford Shirt',
  url: 'https://shop.example/p100',
  image_url: 'https://shop.example/p100.jpg',
  price: 7999,
  in_stock: true,
  on_sale: false,
};

export const chinos: FindMineProduct = {
  product_id: 'P200',
  name: 'Slim Chinos',
  url: 'https://shop.example/p200',
  image_url: 'https://shop.example/p200.jpg',
  price: 6999,
  sale_price: 4999,
  in_stock: true,
  on_sale: true,
  category: 'Pants',
};

export interface RecordedCall {
  method: keyof FindMineApi;
  args: unknown[];
}

export interface FakeFindMineClient extends FindMineApi {
  calls: RecordedCall[];
}

export interface FakeResponses {
  completeTheLook?: CompleteTheLookResponse | Error;
  visuallySimilar?: VisuallySimilarResponse | Error;
  analytics?: AnalyticsResponse | Error;
  itemDetails?: ItemDetailsUpdateResponse | Error;
}

const defaultResponses: Required<FakeResponses> = {
  completeTheLook: {
    pdp_item: shirt,
    looks: [
      {
        look_id: 'L1',
        title: 'Office Ready',
        description: 'Sharp but relaxed for the office',
        image_url: 'https://shop.example/looks/l1.jpg',
        products: [shirt, chinos],
      },
    ],
  },
  visuallySimilar: { products: [chinos], total: 1 },
  analytics: { success: true, event_id: 'E1' },
  itemDetails: { success: true, updated_count: 1, failed_count: 0 },
};

function settle<T>(response: T | Error): Promise<T> {
  return response instanceof Error ? Promise.reject(response) : Promise.resolve(response);
}

export function createFakeFindMineClient(overrides: FakeResponses = {}): FakeFindMineClient {
  const responses = { ...defaultResponses, ...overrides };
  const calls: RecordedCall[] = [];
  return {
    calls,
    getCompleteTheLook: (...args) => {
      calls.push({ method: 'getCompleteTheLook', args });
      return settle(responses.completeTheLook);
    },
    getVisuallySimilar: (...args) => {
      calls.push({ method: 'getVisuallySimilar', args });
      return settle(responses.visuallySimilar);
    },
    trackEvent: (...args) => {
      calls.push({ method: 'trackEvent', args });
      return settle(responses.analytics);
    },
    updateItemDetails: (...args) => {
      calls.push({ method: 'updateItemDetails', args });
      return settle(responses.itemDetails);
    },
  };
}
