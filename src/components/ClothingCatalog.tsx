import type { CategoryId, Garment } from "../types";
import { formatPrice } from "../data/catalog";
import GarmentArt from "./GarmentArt";

interface ClothingCatalogProps {
  category: CategoryId;
  garments: Garment[];
  selectedId: string;
  onCategoryChange: (category: CategoryId) => void;
  onSelect: (garment: Garment) => void;
}

export default function ClothingCatalog({
  category,
  garments,
  selectedId,
  onCategoryChange,
  onSelect,
}: ClothingCatalogProps) {
  const categories = [
    { id: "all", label: "All" },
    ...Array.from(
      new Map(
        garments.map((item) => [
          item.category,
          { id: item.category, label: item.category },
        ]),
      ).values(),
    ),
  ];

  return (
    <>
      <nav className="cats" aria-label="Clothing categories">
        {categories.map((item) => (
          <button
            key={item.id}
            type="button"
            className="chip"
            data-c={item.id}
            aria-pressed={category === item.id}
            onClick={() => onCategoryChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sub">
        <h3>Clothing</h3>
        <span className="fine">{garments.length} items</span>
      </div>

      <div className="carousel" role="group" aria-label="Clothing items">
        {garments.map((garment) => (
          <button
            key={garment.id}
            type="button"
            className={`card pcard garment-card ${
              selectedId === garment.id ? "selected" : ""
            }`}
            onClick={() => onSelect(garment)}
            aria-pressed={selectedId === garment.id}
          >
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
                <GarmentArt garment={garment} />
              )}
            </div>

            <div className="pname">{garment.name}</div>

            <div className="row">
              <span className="pprice">{formatPrice(garment.price)}</span>
              <span className="fine">
                {selectedId === garment.id ? "Selected" : "Select"}
              </span>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
