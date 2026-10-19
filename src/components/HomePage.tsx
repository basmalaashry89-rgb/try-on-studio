import { useEffect, useState } from "react";
import { fashionApi } from "../services/fashionApi";
import type { Category, FashionItem } from "../services/fashionApi";

interface HomePageProps {
  onTryOn: (garmentId?: string) => void;
  onCategorySelect?: (categorySlug: string) => void;
}

const formatPrice = (price: number) => `$${price}`;

export default function HomePage({ onTryOn, onCategorySelect }: HomePageProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<FashionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadHomeData() {
      try {
        setLoading(true);
        setError("");

        const [categoryData, itemData] = await Promise.all([
          fashionApi.getCategories(),
          fashionApi.searchItems(),
        ]);

        if (cancelled) return;

        setCategories(categoryData);
        setFeatured(itemData.slice(0, 6));
      } catch (err) {
        if (cancelled) return;

        setError(
          err instanceof Error ? err.message : "Failed to load products.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadHomeData();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleCategorySelect = (
    event: React.MouseEvent<HTMLAnchorElement>,
    categorySlug?: string,
  ) => {
    event.preventDefault();

    if (!categorySlug) {
      onTryOn();
      return;
    }

    if (onCategorySelect) {
      onCategorySelect(categorySlug);
    } else {
      onTryOn();
    }

    // Close the Categories dropdown after selection.
    const dropdown = event.currentTarget.closest("details");
    dropdown?.removeAttribute("open");
  };

  return (
    <section className="page on">
      <header className="nav">
        <div className="wrap">
          <a
            className="logo"
            href="#/"
            onClick={(event) => {
              event.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <i>T</i> Try On Studio
          </a>

          <nav className="nav-links" aria-label="Main navigation">
            <a
              className="hide-m"
              href="#/"
              onClick={(event) => {
                event.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              Home
            </a>

            <details className="dropdown">
              <summary>Categories</summary>

              <div className="menu">
                <a
                  href="#/try-on"
                  onClick={(event) => handleCategorySelect(event)}
                >
                  All
                </a>

                {categories.map((category) => (
                  <a
                    key={category.id}
                    href={`#/try-on?cat=${encodeURIComponent(category.slug)}`}
                    onClick={(event) =>
                      handleCategorySelect(event, category.slug)
                    }
                  >
                    {category.name}
                  </a>
                ))}
              </div>
            </details>

            <a className="hide-m" href="#how">
              How It Works
            </a>

            <a className="hide-m" href="#about">
              About
            </a>
          </nav>

          <button
            type="button"
            className="btn primary sm"
            onClick={() => onTryOn()}
          >
            Request a Demo
          </button>
        </div>
      </header>

      <div className="wrap hero">
        <div className="hero-content">
          <div className="eyebrow">Virtual try-on · Live camera</div>

          <h1>Your Style. Your Camera. Your Fit.</h1>

          <p className="lede">
            Preview jackets, shirts, hoodies, pants and dresses on yourself.
            Explore different styles and see your selected garment in the
            virtual try-on studio.
          </p>

          <div className="ctas">
            <button
              type="button"
              className="btn primary"
              onClick={() => onTryOn()}
            >
              Try It Live
            </button>

            <button type="button" className="btn" onClick={() => onTryOn()}>
              Request a Demo
            </button>
          </div>
        </div>

        <div className="hero-art" aria-hidden="true">
          <img src="/images/HeroImage.png" alt="" className="hero-image" />
        </div>
      </div>

      <section id="how" className="wrap sec">
        <div className="eyebrow">How it works</div>
        <h2>Three steps to see the fit</h2>

        <div className="steps">
          <article className="card">
            <div className="step-ico">✧</div>
            <h3>1. Choose Your Style</h3>
            <p>Browse the catalog and select a garment to try on.</p>
          </article>

          <article className="card">
            <div className="step-ico">◎</div>
            <h3>2. Activate Your Camera</h3>
            <p>Allow camera access to start your virtual try-on experience.</p>
          </article>

          <article className="card">
            <div className="step-ico">◉</div>
            <h3>3. Preview Your Look</h3>
            <p>
              Explore your selected garment in the studio and compare different
              styles.
            </p>
          </article>
        </div>
      </section>

      <section id="featured" className="wrap sec">
        <div className="eyebrow">Featured</div>
        <h2>Start with a piece</h2>

        <div className="grid6">
          {loading && <p role="status">Loading products...</p>}

          {!loading && error && (
            <div role="alert">
              <p>{error}</p>
              <button
                type="button"
                className="btn sm"
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && featured.length === 0 && (
            <p>No products available right now.</p>
          )}

          {!loading &&
            !error &&
            featured.map((garment) => (
              <article className="card pcard" key={garment.id}>
                <div className="thumb">
                  {garment.thumbnailUrl ? (
                    <img
                      src={garment.thumbnailUrl}
                      alt={garment.name}
                      loading="lazy"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                      }}
                    />
                  ) : (
                    <div className="product-placeholder">
                      No image available
                    </div>
                  )}
                </div>

                <div className="pname">{garment.name}</div>

                <div className="row">
                  <span className="pprice">{formatPrice(garment.price)}</span>

                  <button
                    type="button"
                    className="btn sm primary"
                    onClick={() => onTryOn(String(garment.id))}
                  >
                    Try On
                  </button>
                </div>
              </article>
            ))}
        </div>
      </section>

      <section id="about" className="wrap sec">
        <div className="eyebrow">About</div>
        <h2>Fashion shopping, rehearsed in your own frame.</h2>

        <p className="lede" style={{ marginTop: 16, maxWidth: 640 }}>
          Try On Studio is a virtual fashion prototype that helps users explore
          clothing styles before choosing a product. The final experience
          depends on the camera and virtual try-on implementation.
        </p>
      </section>

      <footer>
        <div className="wrap">
          <span>© 2026 Try On Studio · Prototype</span>

          <nav aria-label="Footer navigation">
            <a href="#/">Home</a>
            <a href="#/try-on">Try-On Studio</a>
            <a href="#how">How It Works</a>
            <a href="#about">About</a>
          </nav>

          <span>Camera permissions are managed by your browser.</span>
        </div>
      </footer>
    </section>
  );
}
