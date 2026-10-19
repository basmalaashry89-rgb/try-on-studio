import type { Category, Garment } from '../types';

export const CATEGORIES: Category[] = [
  { id: 'all', label: 'All' },
  { id: 't-shirts', label: 'T-Shirts' },
  { id: 'shirts', label: 'Shirts' },
  { id: 'hoodies', label: 'Hoodies' },
  { id: 'jackets', label: 'Jackets' },
  { id: 'pants', label: 'Pants' },
  { id: 'dresses', label: 'Dresses' },
  { id: 'accessories', label: 'Accessories' },
];

export const GARMENTS: Garment[] = [
  { id: 'tt1', category: 't-shirts', name: 'Essential Tee', price: 45, color: '#ECE9E2', shape: 'tee' },
  { id: 'tt2', category: 't-shirts', name: 'Sand Crew Tee', price: 48, color: '#CDB994', shape: 'tee' },
  { id: 'sh1', category: 'shirts', name: 'Oxford Shirt', price: 95, color: '#DDE1E4', shape: 'shirt' },
  { id: 'sh2', category: 'shirts', name: 'Linen Shirt', price: 110, color: '#C7B69A', shape: 'shirt' },
  { id: 'hd1', category: 'hoodies', name: 'Heavy Hoodie', price: 120, color: '#3A3937', shape: 'hoodie' },
  { id: 'hd2', category: 'hoodies', name: 'Oat Hoodie', price: 115, color: '#BDB5A6', shape: 'hoodie' },
  { id: 'jk1', category: 'jackets', name: 'Puffer Jacket', price: 210, color: '#2A2A2A', shape: 'jacket' },
  { id: 'jk2', category: 'jackets', name: 'Bomber Jacket', price: 175, color: '#CFC3AA', shape: 'jacket' },
  { id: 'pt1', category: 'pants', name: 'Cargo Pants', price: 130, color: '#2B2B2B', shape: 'pants' },
  { id: 'pt2', category: 'pants', name: 'Chino Pants', price: 98, color: '#8C816B', shape: 'pants' },
  { id: 'dr1', category: 'dresses', name: 'Slip Dress', price: 160, color: '#3B3530', shape: 'dress' },
  { id: 'dr2', category: 'dresses', name: 'Wrap Dress', price: 185, color: '#B8A88B', shape: 'dress' },
  { id: 'ac1', category: 'accessories', name: 'Leather Tote', price: 240, color: '#6B5A45', shape: 'acc' },
  { id: 'ac2', category: 'accessories', name: 'Silk Scarf', price: 60, color: '#A99878', shape: 'acc' },
];

export const FEATURED_IDS = ['jk1', 'sh1', 'tt1', 'hd1', 'pt1', 'dr1'];
export const formatPrice = (price: number) => `$${price}`;
