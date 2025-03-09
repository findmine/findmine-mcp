/**
 * Mock data for testing and development
 */

import { FindMineProduct, FindMineLook, CompleteTheLookResponse } from '../types/findmine-api.js';

/**
 * Sample products
 */
export const sampleProducts: FindMineProduct[] = [
  {
    product_id: 'P12345',
    name: 'Classic Oxford Shirt',
    description: 'A timeless Oxford shirt in crisp cotton',
    brand: 'FindMine Essentials',
    price: 7999,
    sale_price: 5999,
    url: 'https://example.com/products/oxford-shirt',
    image_url: 'https://example.com/images/oxford-shirt.jpg',
    in_stock: true,
    on_sale: true,
    category: 'Shirts',
    attributes: {
      color: 'Blue',
      material: 'Cotton',
      pattern: 'Solid'
    }
  },
  {
    product_id: 'P12346',
    name: 'Slim Fit Chinos',
    description: 'Comfortable slim fit chinos for any occasion',
    brand: 'FindMine Essentials',
    price: 6999,
    url: 'https://example.com/products/slim-chinos',
    image_url: 'https://example.com/images/slim-chinos.jpg',
    in_stock: true,
    on_sale: false,
    category: 'Pants',
    attributes: {
      color: 'Khaki',
      material: 'Cotton',
      fit: 'Slim'
    }
  },
  {
    product_id: 'P12347',
    name: 'Leather Derby Shoes',
    description: 'Classic leather derby shoes with comfort insole',
    brand: 'FindMine Footwear',
    price: 12999,
    url: 'https://example.com/products/derby-shoes',
    image_url: 'https://example.com/images/derby-shoes.jpg',
    in_stock: true,
    on_sale: false,
    category: 'Shoes',
    attributes: {
      color: 'Brown',
      material: 'Leather',
      style: 'Derby'
    }
  },
  {
    product_id: 'P12348',
    name: 'Woven Leather Belt',
    description: 'Handcrafted woven leather belt',
    brand: 'FindMine Accessories',
    price: 4999,
    sale_price: 3999,
    url: 'https://example.com/products/woven-belt',
    image_url: 'https://example.com/images/woven-belt.jpg',
    in_stock: true,
    on_sale: true,
    category: 'Accessories',
    attributes: {
      color: 'Brown',
      material: 'Leather',
      width: '1.5 inches'
    }
  },
  {
    product_id: 'P12349',
    name: 'Cotton Crew Neck Sweater',
    description: 'Soft cotton crew neck sweater for layering',
    brand: 'FindMine Essentials',
    price: 8999,
    url: 'https://example.com/products/crew-sweater',
    image_url: 'https://example.com/images/crew-sweater.jpg',
    in_stock: false,
    on_sale: false,
    category: 'Sweaters',
    attributes: {
      color: 'Navy',
      material: 'Cotton',
      style: 'Crew Neck'
    }
  }
];

/**
 * Sample looks
 */
export const sampleLooks: FindMineLook[] = [
  {
    look_id: 'L1001',
    title: 'Business Casual Look',
    description: 'Perfect for the office or a casual meeting',
    image_url: 'https://example.com/images/look-business-casual.jpg',
    products: [sampleProducts[0], sampleProducts[1], sampleProducts[2], sampleProducts[3]],
    attributes: {
      occasion: ['Office', 'Business Casual'],
      season: ['Spring', 'Fall']
    }
  },
  {
    look_id: 'L1002',
    title: 'Weekend Brunch Outfit',
    description: 'Relaxed yet put-together look for weekend gatherings',
    image_url: 'https://example.com/images/look-weekend-brunch.jpg',
    products: [sampleProducts[0], sampleProducts[1], sampleProducts[3]],
    attributes: {
      occasion: ['Casual', 'Brunch'],
      season: ['Spring', 'Summer']
    }
  },
  {
    look_id: 'L1003',
    title: 'Smart Casual Ensemble',
    description: 'Sophisticated yet comfortable outfit for various occasions',
    image_url: 'https://example.com/images/look-smart-casual.jpg',
    products: [sampleProducts[4], sampleProducts[1], sampleProducts[2], sampleProducts[3]],
    attributes: {
      occasion: ['Smart Casual', 'Dinner'],
      season: ['Fall', 'Winter']
    }
  }
];

/**
 * Sample Complete The Look response
 */
export const sampleCompleteTheLookResponse: CompleteTheLookResponse = {
  pdp_item: sampleProducts[0],
  looks: sampleLooks
};