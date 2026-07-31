import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { FileImage, Link2, Loader2, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface UploadedImage {
  file?: File;
  url: string;
  name: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  format: string;
}

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/tiff"];
const MAX_BYTES = 8 * 1024 * 1024;

export function UploadZone({
  value,
  onChange,
  exampleGallery,
  compact,
}: {
  value: UploadedImage | null;
  onChange: (img: UploadedImage | null) => void;
  exampleGallery?: ReactNode;
  compact?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrl, setShowUrl] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [loadingUrl, setLoadingUrl] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = useCallback(
    (file: File) => {
      setError(null);
      if (!ACCEPTED.includes(file.type)) {
        setError(
          `UNSUPPORTED_IMAGE_FORMAT — ${file.type || "unknown"} is not supported. Use JPEG, PNG, WebP, or TIFF.`,
        );
        return;
      }
      if (file.size > MAX_BYTES) {
        setError(`IMAGE_TOO_LARGE — ${formatBytes(file.size)} exceeds the 8 MB per-image limit.`);
        return;
      }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        if (img.naturalWidth * img.naturalHeight > 25_000_000) {
          setError("PIXEL_LIMIT_EXCEEDED — decoded image exceeds the 25 MP workspace limit.");
          URL.revokeObjectURL(url);
          return;
        }
        onChange({
          file,
          url,
          name: file.name,
          sizeBytes: file.size,
          width: img.naturalWidth,
          height: img.naturalHeight,
          format: file.type.split("/")[1].toUpperCase(),
        });
      };
      img.onerror = () => {
        setError("INVALID_IMAGE — the file could not be decoded. It may be corrupted.");
        URL.revokeObjectURL(url);
      };
      img.src = url;
    },
    [onChange],
  );

  // Paste from clipboard
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) =>
        i.type.startsWith("image/"),
      );
      const file = item?.getAsFile();
      if (file) accept(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [accept]);

  const loadFromUrl = () => {
    if (!urlInput.trim()) return;
    setLoadingUrl(true);
    setError(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      onChange({
        url: urlInput,
        name: urlInput.split("/").pop() ?? "remote-image",
        width: img.naturalWidth,
        height: img.naturalHeight,
        format: "JPEG",
      });
      setShowUrl(false);
      setUrlInput("");
      setLoadingUrl(false);
    };
    img.onerror = () => {
      setError(
        "INVALID_IMAGE — could not fetch or decode the image at this URL (CORS or network error).",
      );
      setLoadingUrl(false);
    };
    img.src = urlInput;
  };

  if (value) {
    return (
      <div className="space-y-2">
        <div className="bg-checkerboard overflow-hidden rounded-lg border">
          <img src={value.url} alt={value.name} className="mx-auto block max-h-72 object-contain" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 text-xs">
          <div className="flex min-w-0 items-center gap-2">
            <FileImage className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate font-medium">{value.name}</span>
            <span className="font-mono whitespace-nowrap text-muted-foreground">
              {[
                value.sizeBytes ? formatBytes(value.sizeBytes) : null,
                value.width && value.height ? `${value.width} × ${value.height}` : null,
                value.format,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
              Replace
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive"
              onClick={() => onChange(null)}
              aria-label="Remove image"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          className="hidden"
          onChange={(e) => e.target.files?.[0] && accept(e.target.files[0])}
          aria-hidden
          tabIndex={-1}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) accept(f);
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 text-center transition-colors",
          compact ? "py-6" : "py-10",
          dragging
            ? "border-primary bg-primary/5"
            : "border-input hover:border-muted-foreground/40 hover:bg-muted/40",
        )}
        aria-label="Upload an image: drag and drop, paste, or click to browse"
      >
        <UploadCloud className="size-6 text-muted-foreground" aria-hidden />
        <p className="mt-2 text-sm font-medium">
          Drop an image, paste from clipboard, or click to browse
        </p>
        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
          JPEG · PNG · WebP · TIFF — up to 8 MB, 25 MP
        </p>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => e.target.files?.[0] && accept(e.target.files[0])}
        aria-hidden
        tabIndex={-1}
      />
      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 font-mono text-xs text-destructive"
        >
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setShowUrl((v) => !v)}>
          <Link2 className="size-3.5" /> From URL
        </Button>
        {exampleGallery}
      </div>
      {showUrl && (
        <div className="flex gap-2">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="font-mono text-xs"
            onKeyDown={(e) => e.key === "Enter" && loadFromUrl()}
            aria-label="Image URL"
          />
          <Button size="sm" onClick={loadFromUrl} disabled={loadingUrl}>
            {loadingUrl && <Loader2 className="size-3.5 animate-spin" />}
            Load
          </Button>
        </div>
      )}
    </div>
  );
}
