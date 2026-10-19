import type { Garment, GarmentShape } from "../types";

interface ShapeDefinition {
  path: string;
  detail?: string;
  hood?: string;
}

const SHAPES: Record<GarmentShape, ShapeDefinition> = {
  tee: {
    path: "M30 0Q50 9 70 0L94 12L100 40L84 44L84 110L16 110L16 44L0 40L6 12Z",
  },
  shirt: {
    path: "M30 0Q50 9 70 0L94 12L100 40L84 44L84 110L16 110L16 44L0 40L6 12Z",
    detail: "M50 17V110M30 0L50 17L70 0",
  },
  hoodie: {
    path: "M30 6L70 6L94 14L100 44L84 48L84 110L16 110L16 48L0 44L6 14Z",
    detail: "M50 24V110",
    hood: "M26 8Q50 -26 74 8Q70 24 50 24Q30 24 26 8Z",
  },
  jacket: {
    path: "M22 0L78 0L94 14L100 56L84 58L84 110L16 110L16 58L0 56L6 14Z",
    detail: "M50 0V110M22 0L40 34L50 14L60 34L78 0",
  },
  pants: { path: "M18 0L82 0L88 110L56 110L50 42L44 110L12 110Z" },
  dress: { path: "M34 0L66 0L70 18Q84 40 98 110L2 110Q16 40 30 18Z" },
  acc: { path: "M18 36H82V104H18Z", detail: "M36 36Q36 12 50 12Q64 12 64 36" },
};

interface GarmentArtProps {
  garment: Pick<Garment, "shape" | "color">;
  className?: string;
}

export function GarmentPaths({ garment }: GarmentArtProps) {
  const shape = SHAPES[garment.shape];
  return (
    <>
      {shape.hood && (
        <path
          d={shape.hood}
          fill={garment.color}
          stroke="#000"
          strokeOpacity=".3"
          vectorEffect="non-scaling-stroke"
        />
      )}
      <path
        d={shape.path}
        fill={garment.color}
        stroke="#000"
        strokeOpacity=".3"
        vectorEffect="non-scaling-stroke"
      />
      {shape.detail && (
        <path
          d={shape.detail}
          fill="none"
          stroke="#000"
          strokeOpacity=".28"
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </>
  );
}

export default function GarmentArt({ garment, className }: GarmentArtProps) {
  return (
    <svg className={className} viewBox="-4 -30 108 144" aria-hidden="true">
      <GarmentPaths garment={garment} />
    </svg>
  );
}
