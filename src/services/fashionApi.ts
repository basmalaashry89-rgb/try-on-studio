
const BASE_URL = "https://clothesai-api.runasp.net";

export interface Category {
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

async function request<T>(
    endpoint: string,
    options?: RequestInit
): Promise<T> {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(
            data?.error || `Request failed: ${response.status}`
        );
    }

    return data as T;
}

export const fashionApi = {
    getCategories: () =>
        request<Category[]>("/api/categories"),

    getCategoryItems: (categoryId: number) =>
        request<FashionItem[]>(
            `/api/categories/${categoryId}/fashion-items`
        ),

    getFashionItem: (id: number) =>
        request<FashionItemDetails>(
            `/api/fashion-items/${id}`
        ),

    getVariants: (id: number) =>
        request<FashionVariant[]>(
            `/api/fashion-items/${id}/variants`
        ),

    searchItems: (filters?: {
        categoryId?: number;
        search?: string;
    }) => {
        const params = new URLSearchParams();

        if (filters?.categoryId !== undefined) {
            params.set("categoryId", String(filters.categoryId));
        }

        if (filters?.search?.trim()) {
            params.set("search", filters.search.trim());
        }

        const query = params.toString();

        return request<FashionItem[]>(
            `/api/fashion-items${query ? `?${query}` : ""}`
        );
    },

    getTryOnToken: () =>
        request<TryOnToken>("/api/tryon/token", {
            method: "POST",
        }),
};
