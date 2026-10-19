import { useCallback, useEffect, useMemo, useState } from "react";
import HomePage from "./components/HomePage";
import StudioPage from "./components/StudioPage";
import type {
  Category as ApiCategory,
  FashionItem,
} from "./services/fashionApi";
import { fashionApi } from "./services/fashionApi";
import type { CategoryId, Garment } from "./types";

interface RouteState {
  isStudio: boolean;
  category: string;
  requestedItem: string | null;
}

function readRoute(): RouteState {
  const hash = window.location.hash || "#/";
  const [path, query = ""] = hash.slice(1).split("?");
  const params = new URLSearchParams(query);

  return {
    isStudio: path.startsWith("/try-on"),
    category: params.get("cat") || "all",
    requestedItem: params.get("item"),
  };
}

function getShape(categoryName: string): Garment["shape"] {
  const value = categoryName.toLowerCase();

  if (value.includes("pant") || value.includes("trouser")) return "pants";
  if (value.includes("dress")) return "dress";
  if (value.includes("hood")) return "hoodie";
  if (value.includes("jacket")) return "jacket";
  if (value.includes("shirt")) return "shirt";
  if (value.includes("accessor")) return "acc";

  return "tee";
}

function toGarment(item: FashionItem, category: ApiCategory): Garment {
  return {
    id: String(item.id),
    category: category.slug as Garment["category"],
    name: item.name,
    price: item.price,
    color: "#777777",
    shape: getShape(category.name),
    thumbnailUrl: item.thumbnailUrl,
    categoryApiId: item.categoryId,
  };
}

export default function App() {
  const [route, setRoute] = useState<RouteState>(readRoute);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [items, setItems] = useState<Garment[]>([]);
  const [category, setCategory] = useState<CategoryId>("all");
  const [selectedId, setSelectedId] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load categories and products from the API.
  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      try {
        setLoading(true);
        setError("");

        const [apiCategories, apiItems] = await Promise.all([
          fashionApi.getCategories(),
          fashionApi.searchItems(),
        ]);

        if (cancelled) return;

        const categoryMap = new Map(
          apiCategories.map((item) => [item.id, item]),
        );

        const mappedItems = apiItems.flatMap((item) => {
          const apiCategory = categoryMap.get(item.categoryId);
          return apiCategory ? [toGarment(item, apiCategory)] : [];
        });

        setCategories(apiCategories);
        setItems(mappedItems);

        const currentRoute = readRoute();

        const validCategory =
          currentRoute.category === "all" ||
          apiCategories.some((item) => item.slug === currentRoute.category);

        const initialCategory = validCategory ? currentRoute.category : "all";

        const requestedItem = mappedItems.find(
          (item) => item.id === currentRoute.requestedItem,
        );

        const firstInCategory = mappedItems.find(
          (item) =>
            initialCategory === "all" || item.category === initialCategory,
        );

        setCategory(initialCategory as CategoryId);

        const initialItem = requestedItem ?? firstInCategory ?? mappedItems[0];

        if (initialItem) {
          setSelectedId(initialItem.id);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load products from the server.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  // Keep the selected product and category synchronized with the URL.
  useEffect(() => {
    const onHashChange = () => {
      const nextRoute = readRoute();

      setRoute(nextRoute);

      const categoryExists =
        nextRoute.category === "all" ||
        categories.some((item) => item.slug === nextRoute.category);

      if (categoryExists) {
        setCategory(nextRoute.category as CategoryId);
      }

      if (nextRoute.requestedItem) {
        const matchingItem = items.find(
          (item) => item.id === nextRoute.requestedItem,
        );

        if (matchingItem) {
          setSelectedId(matchingItem.id);
        }
      } else if (nextRoute.category) {
        const firstInCategory = items.find(
          (item) =>
            nextRoute.category === "all" ||
            item.category === nextRoute.category,
        );

        if (firstInCategory) {
          setSelectedId(firstInCategory.id);
        }
      }

      window.scrollTo({ top: 0 });
    };

    window.addEventListener("hashchange", onHashChange);

    return () => {
      window.removeEventListener("hashchange", onHashChange);
    };
  }, [categories, items]);

  const visibleGarments = useMemo(
    () =>
      items.filter((item) => category === "all" || item.category === category),
    [items, category],
  );

  const selectedGarment =
    items.find((item) => item.id === selectedId) ??
    visibleGarments[0] ??
    items[0];

  // Open the studio with the selected product.
  const openStudio = useCallback(
    (garmentId?: string) => {
      const selected = garmentId
        ? items.find((item) => item.id === garmentId)
        : undefined;

      const targetCategory = selected?.category;

      const query = new URLSearchParams();

      if (targetCategory) {
        query.set("cat", targetCategory);
      }

      if (selected) {
        query.set("item", selected.id);
      }

      const search = query.toString();

      window.location.hash = `/try-on${search ? `?${search}` : ""}`;
    },
    [items],
  );

  // Open the studio filtered by the selected category.
  const openCategory = useCallback(
    (categorySlug: string) => {
      const query = new URLSearchParams();
      query.set("cat", categorySlug);

      const firstItem = items.find((item) => item.category === categorySlug);

      if (firstItem) {
        query.set("item", firstItem.id);
      }

      window.location.hash = `/try-on?${query.toString()}`;
    },
    [items],
  );

  const goHome = useCallback(() => {
    window.location.hash = "/";
  }, []);

  const changeCategory = (nextCategory: CategoryId) => {
    const nextGarment = items.find(
      (item) => nextCategory === "all" || item.category === nextCategory,
    );

    if (nextGarment) {
      setCategory(nextCategory);
      setSelectedId(nextGarment.id);

      const query = new URLSearchParams();
      query.set("cat", nextCategory);
      query.set("item", nextGarment.id);

      window.location.hash = `/try-on?${query.toString()}`;
    } else if (nextCategory === "all") {
      setCategory("all");
      window.location.hash = "/try-on?cat=all";
    } else {
      setCategory(nextCategory);
    }
  };

  const selectGarment = (garment: Garment) => {
    setSelectedId(garment.id);
    setCategory(garment.category as CategoryId);

    const query = new URLSearchParams();
    query.set("cat", garment.category);
    query.set("item", garment.id);

    window.location.hash = `/try-on?${query.toString()}`;
  };

  if (loading) {
    return (
      <main className="container py-5 text-center">Loading products...</main>
    );
  }

  if (error) {
    return (
      <main className="container py-5 text-center">
        <p role="alert">{error}</p>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </main>
    );
  }

  if (items.length === 0 || !selectedGarment) {
    return (
      <main className="container py-5 text-center">No products found.</main>
    );
  }

  return route.isStudio ? (
    <StudioPage
      garments={visibleGarments}
      selected={selectedGarment}
      category={category}
      onCategoryChange={changeCategory}
      onSelect={selectGarment}
      onHome={goHome}
    />
  ) : (
    <HomePage onTryOn={openStudio} onCategorySelect={openCategory} />
  );
}
