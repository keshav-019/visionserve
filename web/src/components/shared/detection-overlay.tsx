import { useMemo } from "react";
import type { BoundingBox, Detection, OcrRegion } from "@/lib/types";
import { chartColors } from "./charts";
import { cn } from "@/lib/utils";

interface OverlayBox {
  box: BoundingBox;
  label: string;
  confidence: number;
  color: string;
}

/**
 * Renders an image with resolution-independent bounding-box overlays.
 * Boxes are given in pixels relative to imageWidth × imageHeight.
 */
export function DetectionOverlay({
  src,
  imageWidth,
  imageHeight,
  detections,
  ocrRegions,
  showBoxes = true,
  showLabels = true,
  minConfidence = 0,
  selectedBox,
  onSelectBox,
  alt,
  className,
}: {
  src: string;
  imageWidth: number;
  imageHeight: number;
  detections?: Detection[];
  ocrRegions?: OcrRegion[];
  showBoxes?: boolean;
  showLabels?: boolean;
  minConfidence?: number;
  selectedBox?: number | null;
  onSelectBox?: (index: number | null) => void;
  alt: string;
  className?: string;
}) {
  const boxes = useMemo<OverlayBox[]>(() => {
    const dets = (detections ?? [])
      .filter((d) => d.confidence >= minConfidence)
      .map((d) => ({
        box: d.box,
        label: `${d.label} ${(d.confidence * 100).toFixed(0)}%`,
        confidence: d.confidence,
        color: chartColors[d.classId % chartColors.length],
      }));
    const ocrs = (ocrRegions ?? [])
      .filter((r) => r.confidence >= minConfidence)
      .map((r) => ({
        box: r.box,
        label: r.text,
        confidence: r.confidence,
        color: "var(--chart-2)",
      }));
    return [...dets, ...ocrs];
  }, [detections, ocrRegions, minConfidence]);

  return (
    <div
      className={cn(
        "bg-checkerboard relative w-full overflow-hidden rounded-lg border select-none",
        className,
      )}
    >
      <img
        src={src}
        alt={alt}
        width={imageWidth}
        height={imageHeight}
        loading="lazy"
        className="block h-auto w-full"
        draggable={false}
      />
      {showBoxes && (
        <svg
          viewBox={`0 0 ${imageWidth} ${imageHeight}`}
          className="absolute inset-0 size-full"
          preserveAspectRatio="none"
          aria-hidden
        >
          {boxes.map((b, i) => (
            <rect
              key={i}
              x={b.box.x}
              y={b.box.y}
              width={b.box.width}
              height={b.box.height}
              fill={selectedBox === i ? b.color : "transparent"}
              fillOpacity={selectedBox === i ? 0.15 : 0}
              stroke={b.color}
              strokeWidth={selectedBox === i ? 3 : 2}
              vectorEffect="non-scaling-stroke"
              rx={2}
            />
          ))}
        </svg>
      )}
      {showBoxes &&
        showLabels &&
        boxes.map((b, i) => (
          <button
            key={`label-${i}`}
            type="button"
            onClick={() => onSelectBox?.(selectedBox === i ? null : i)}
            className="absolute max-w-40 truncate rounded-sm px-1 py-px font-mono text-[10px] leading-tight font-medium text-white shadow-sm transition-transform hover:scale-105"
            style={{
              left: `${(b.box.x / imageWidth) * 100}%`,
              top: `${Math.max(0, (b.box.y - 18) / imageHeight) * 100}%`,
              backgroundColor: b.color,
            }}
            title={b.label}
          >
            {b.label}
          </button>
        ))}
    </div>
  );
}
