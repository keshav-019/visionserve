import { sampleImages, results, currentUser } from "@/mocks/data";
import { seededRandom } from "@/lib/format";
import type { InferenceResult, Model } from "@/lib/types";
import type { UploadedImage } from "@/components/shared/upload-zone";

export interface PlaygroundSample {
  key: string;
  name: string;
  src: string;
  width: number;
  height: number;
  bestFor: string;
}

export const playgroundSamples: PlaygroundSample[] = [
  {
    key: "street",
    name: "street-intersection.jpg",
    src: sampleImages.street,
    width: 1024,
    height: 768,
    bestFor: "detect",
  },
  {
    key: "warehouse",
    name: "warehouse-aisle.jpg",
    src: sampleImages.warehouse,
    width: 1024,
    height: 768,
    bestFor: "detect",
  },
  {
    key: "document",
    name: "quarterly-report.png",
    src: sampleImages.document,
    width: 1024,
    height: 1280,
    bestFor: "ocr",
  },
  {
    key: "receipt",
    name: "grocery-receipt.jpg",
    src: sampleImages.receipt,
    width: 1024,
    height: 768,
    bestFor: "ocr",
  },
  {
    key: "dog",
    name: "golden-retriever.jpg",
    src: sampleImages.dog,
    width: 1024,
    height: 768,
    bestFor: "classify",
  },
];

/** Known curated results that pair a sample image with the right task. */
const curated: Record<string, string> = {
  "street:detect": "res_01JX8GMQ",
  "warehouse:detect": "res_01JX8KT9",
  "document:ocr": "res_01JX8V07",
  "receipt:ocr": "res_01JX8M2X",
  "dog:classify": "res_01JX8W29",
};

function mkRequestId(rnd: () => number) {
  return `req_${Math.floor(rnd() * 0xffffffff)
    .toString(16)
    .padStart(8, "0")}${Math.floor(rnd() * 0xffff)
    .toString(16)
    .padStart(4, "0")}`;
}

/**
 * Produces a realistic-looking inference result for the playground.
 * Curated samples return their matching canned result; anything else is
 * synthesized deterministically from the image name so repeats are stable.
 */
export function runPlaygroundInference(
  model: Model,
  image: UploadedImage,
  sampleKey?: string,
): InferenceResult {
  const curatedId = sampleKey ? curated[`${sampleKey}:${model.task}`] : undefined;
  if (curatedId) {
    const found = results.find((r) => r.id === curatedId);
    if (found) {
      return {
        ...structuredClone(found),
        id: `res_demo_${Date.now().toString(36)}`,
        requestId: `req_demo${Math.random().toString(16).slice(2, 10)}`,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 3600_000).toISOString(),
        owner: currentUser.email,
        modelId: model.id,
        modelVersion: model.activeVersion,
        jobId: undefined,
      };
    }
  }

  const seedBase = Array.from(image.name).reduce((acc, ch) => acc + ch.charCodeAt(0), 7);
  const rnd = seededRandom(seedBase + image.name.length * 31);
  const w = image.width ?? 1024;
  const h = image.height ?? 768;
  const inferenceMs =
    model.task === "ocr"
      ? 90 + rnd() * 60
      : model.task === "classify"
        ? 18 + rnd() * 12
        : 34 + rnd() * 18;
  const timing = {
    uploadMs: +(8 + rnd() * 10).toFixed(1),
    decodeMs: +(2 + rnd() * 3).toFixed(1),
    preprocessMs: +(3 + rnd() * 4).toFixed(1),
    queueWaitMs: +(4 + rnd() * 8).toFixed(1),
    inferenceMs: +inferenceMs.toFixed(1),
    postprocessMs: +(2 + rnd() * 5).toFixed(1),
    serializationMs: +(1 + rnd() * 2).toFixed(1),
    totalMs: 0,
  };
  timing.totalMs = +(
    timing.uploadMs +
    timing.decodeMs +
    timing.preprocessMs +
    timing.queueWaitMs +
    timing.inferenceMs +
    timing.postprocessMs +
    timing.serializationMs
  ).toFixed(1);

  const base: InferenceResult = {
    id: `res_demo_${Date.now().toString(36)}`,
    requestId: mkRequestId(rnd),
    operation: model.task,
    modelId: model.id,
    modelVersion: model.activeVersion,
    owner: currentUser.email,
    environment: model.environment,
    inputImage: image.url,
    inputWidth: w,
    inputHeight: h,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 3600_000).toISOString(),
    timing,
  };

  if (model.task === "detect" || model.task === "segment") {
    const labels = model.labels.length > 0 ? model.labels : ["object"];
    const count = 3 + Math.floor(rnd() * 5);
    base.detections = Array.from({ length: count }, (_, i) => {
      const bw = Math.round(w * (0.06 + rnd() * 0.24));
      const bh = Math.round(h * (0.08 + rnd() * 0.22));
      const x = Math.round(rnd() * Math.max(1, w - bw));
      const y = Math.round(rnd() * Math.max(1, h - bh));
      const classId = i % labels.length;
      return {
        label: labels[classId],
        classId,
        confidence: +(0.62 + rnd() * 0.36).toFixed(2),
        box: { x, y, width: bw, height: bh },
      };
    }).sort((a, b) => b.confidence - a.confidence);
  } else if (model.task === "ocr") {
    const words = [
      "INVOICE",
      "Total amount due",
      "Reference 2026-0417",
      "Payment terms: net 30",
      "Authorized signature",
    ];
    const used = words.slice(0, 3 + Math.floor(rnd() * 2));
    const regions = used.map((text, i) => ({
      text,
      confidence: +(0.88 + rnd() * 0.1).toFixed(2),
      box: {
        x: Math.round(w * (0.08 + rnd() * 0.1)),
        y: Math.round(h * (0.08 + i * 0.18)),
        width: Math.round(w * (0.3 + rnd() * 0.4)),
        height: Math.round(Math.max(18, h * 0.03)),
      },
    }));
    base.ocrRegions = regions;
    base.ocrText = regions.map((r) => r.text).join("\n\n");
  } else if (model.task === "classify") {
    const labels = model.labels.length > 0 ? model.labels : ["unknown"];
    const top = 0.86 + rnd() * 0.12;
    let rest = 1 - top;
    base.predictions = labels.slice(0, Math.min(5, labels.length)).map((label, i) => {
      const conf = i === 0 ? top : +(rest * (0.2 + rnd() * 0.6)).toFixed(3);
      rest -= i === 0 ? 0 : conf;
      return { label, classId: 100 + i, confidence: +conf.toFixed(3) };
    });
  }

  return base;
}
