
export type CategoryId = string;

export type GarmentShape =
  | "tee"
  | "shirt"
  | "hoodie"
  | "jacket"
  | "pants"
  | "dress"
  | "acc";

export type GarmentKind = "top" | "bottom" | "dress" | "none";

export interface Category {
  id: CategoryId;
  label: string;
}

export interface ApiCategory {
  id: number;
  name: string;
  slug: string;
  itemCount: number;
}

export interface FashionItem {
  id: number;
  name: string;
  description: string;
  price: number;
  categoryId: number;
  categoryName: string;
  thumbnailUrl: string;
  variantCount: number;
}

export interface FashionVariant {
  id: number;
  colorName: string;
  colorHex: string;
  imageUrl: string;
}

export interface FashionItemDetails extends Omit<
  FashionItem,
  "thumbnailUrl" | "variantCount"
> {
  variants: FashionVariant[];
}

export interface TryOnToken {
  apiKey: string;
  expiresAt: string;
}

export interface Garment {
  id: string;
  category: CategoryId;
  name: string;
  price: number;
  color: string;
  shape: GarmentShape;
  thumbnailUrl?: string;
  categoryApiId?: number;
}

export interface Snapshot {
  id: string;
  url: string;
  name: string;
}
