"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { RotateCw, Sun, Contrast, Droplets, Crop, Maximize2, Check, X } from "lucide-react";

interface ImageEditorProps {
  file: File;
  onSave: (editedFile: File) => void;
  onCancel: () => void;
}

const SIZE_PRESETS: { label: string; value: string }[] = [
  { label: "Original", value: "original" },
  { label: "Passport 35×45", value: "passport" },
  { label: "Square", value: "square" },
  { label: "16:9", value: "16:9" },
  { label: "4:3", value: "4:3" },
];

export default function ImageEditor({ file, onSave, onCancel }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Adjustments
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [sizePreset, setSizePreset] = useState("original");

  // Crop state
  const [isCropping, setIsCropping] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const [cropEnd, setCropEnd] = useState<{ x: number; y: number } | null>(null);
  const [appliedCrop, setAppliedCrop] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      sourceRef.current = img;
      setImageLoaded(true);
    };
    img.src = URL.createObjectURL(file);
    return () => URL.revokeObjectURL(img.src);
  }, [file]);

  // Render canvas with all adjustments
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = sourceRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sx = appliedCrop?.x ?? 0;
    const sy = appliedCrop?.y ?? 0;
    const sw = appliedCrop?.w ?? img.naturalWidth;
    const sh = appliedCrop?.h ?? img.naturalHeight;

    const isRotated90 = rotation === 90 || rotation === 270;
    const scale = Math.min(640 / sw, 640 / sh, 1);
    const w = Math.round(sw * scale);
    const h = Math.round(sh * scale);

    canvas.width = isRotated90 ? h : w;
    canvas.height = isRotated90 ? w : h;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.filter = `brightness(${100 + brightness}%) contrast(${100 + contrast}%) saturate(${
      100 + saturation
    }%)`;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(img, sx, sy, sw, sh, -w / 2, -h / 2, w, h);
    ctx.restore();
  }, [brightness, contrast, saturation, rotation, appliedCrop]);

  useEffect(() => {
    if (imageLoaded) renderCanvas();
  }, [imageLoaded, renderCanvas]);

  /* ── Crop handlers ─────────────────────────────────── */
  const handleCropMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isCropping) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    setCropStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setCropEnd(null);
    setIsDragging(true);
  };
  const handleCropMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isCropping || !isDragging || !cropStart) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    setCropEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  const handleCropMouseUp = () => {
    setIsDragging(false);
  };

  const getCropRect = (
    start: { x: number; y: number },
    end: { x: number; y: number }
  ) => {
    if (!canvasRef.current || !sourceRef.current) return null;
    const canvas = canvasRef.current;
    const img = sourceRef.current;
    const rect = canvas.getBoundingClientRect();

    const getOriginalCoords = (cx_css: number, cy_css: number) => {
      const cx = cx_css * (canvas.width / rect.width);
      const cy = cy_css * (canvas.height / rect.height);

      const sx = appliedCrop?.x ?? 0;
      const sy = appliedCrop?.y ?? 0;
      const sw = appliedCrop?.w ?? img.naturalWidth;
      const sh = appliedCrop?.h ?? img.naturalHeight;

      const isRotated90 = rotation === 90 || rotation === 270;
      const cw = canvas.width;
      const ch = canvas.height;
      const w = isRotated90 ? ch : cw;
      const h = isRotated90 ? cw : ch;

      const dx = cx - cw / 2;
      const dy = cy - ch / 2;
      const theta = (-rotation * Math.PI) / 180;
      const rx = dx * Math.cos(theta) - dy * Math.sin(theta);
      const ry = dx * Math.sin(theta) + dy * Math.cos(theta);
      const px = rx + w / 2;
      const py = ry + h / 2;

      const ix = sx + px * (sw / w);
      const iy = sy + py * (sh / h);
      return { x: ix, y: iy };
    };

    const p1 = getOriginalCoords(start.x, start.y);
    const p2 = getOriginalCoords(end.x, start.y);
    const p3 = getOriginalCoords(end.x, end.y);
    const p4 = getOriginalCoords(start.x, end.y);

    const minX = Math.min(p1.x, p2.x, p3.x, p4.x);
    const maxX = Math.max(p1.x, p2.x, p3.x, p4.x);
    const minY = Math.min(p1.y, p2.y, p3.y, p4.y);
    const maxY = Math.max(p1.y, p2.y, p3.y, p4.y);

    const newX = Math.max(0, Math.min(minX, img.naturalWidth));
    const newY = Math.max(0, Math.min(minY, img.naturalHeight));
    const newW = Math.min(maxX - newX, img.naturalWidth - newX);
    const newH = Math.min(maxY - newY, img.naturalHeight - newY);

    return {
      x: Math.round(newX),
      y: Math.round(newY),
      w: Math.round(newW),
      h: Math.round(newH),
    };
  };

  const applyCrop = () => {
    if (!cropStart || !cropEnd) return;
    const rect = getCropRect(cropStart, cropEnd);
    if (rect && rect.w > 10 && rect.h > 10) {
      setAppliedCrop(rect);
    }
    setIsCropping(false);
    setCropStart(null);
    setCropEnd(null);
  };

  const applySizePreset = (preset: string) => {
    setSizePreset(preset);
    if (!sourceRef.current) return;
    const img = sourceRef.current;
    const iw = img.naturalWidth,
      ih = img.naturalHeight;

    if (preset === "original") {
      setAppliedCrop(null);
      return;
    }

    let targetRatio = 1;
    if (preset === "passport") targetRatio = 35 / 45;
    else if (preset === "square") targetRatio = 1;
    else if (preset === "16:9") targetRatio = 16 / 9;
    else if (preset === "4:3") targetRatio = 4 / 3;

    const isRotated90 = rotation === 90 || rotation === 270;
    const imageRatio = isRotated90 ? 1 / targetRatio : targetRatio;

    let cw: number, ch: number;
    if (iw / ih > imageRatio) {
      ch = ih;
      cw = Math.round(ch * imageRatio);
    } else {
      cw = iw;
      ch = Math.round(cw / imageRatio);
    }
    const cx = Math.round((iw - cw) / 2);
    const cy = Math.round((ih - ch) / 2);
    setAppliedCrop({ x: cx, y: cy, w: cw, h: ch });
  };

  const handleSave = () => {
    if (!sourceRef.current) return;
    const img = sourceRef.current;

    let finalCrop = appliedCrop;
    if (isCropping && cropStart && cropEnd) {
      const rect = getCropRect(cropStart, cropEnd);
      if (rect && rect.w > 10 && rect.h > 10) {
        finalCrop = rect;
      }
    }

    const saveCanvas = document.createElement("canvas");
    const sx = finalCrop?.x ?? 0;
    const sy = finalCrop?.y ?? 0;
    const sw = finalCrop?.w ?? img.naturalWidth;
    const sh = finalCrop?.h ?? img.naturalHeight;

    const isRotated90 = rotation === 90 || rotation === 270;
    saveCanvas.width = isRotated90 ? sh : sw;
    saveCanvas.height = isRotated90 ? sw : sh;

    const sctx = saveCanvas.getContext("2d");
    if (!sctx) return;

    sctx.save();
    sctx.filter = `brightness(${100 + brightness}%) contrast(${100 + contrast}%) saturate(${
      100 + saturation
    }%)`;
    sctx.translate(saveCanvas.width / 2, saveCanvas.height / 2);
    sctx.rotate((rotation * Math.PI) / 180);
    sctx.drawImage(img, sx, sy, sw, sh, -sw / 2, -sh / 2, sw, sh);
    sctx.restore();

    saveCanvas.toBlob(
      (blob) => {
        if (blob) {
          const newFile = new File([blob], file.name, { type: "image/png" });
          onSave(newFile);
        }
      },
      "image/png",
      0.95
    );
  };

  const getCropStyle = (): React.CSSProperties | null => {
    if (!cropStart || !cropEnd) return null;
    const x = Math.min(cropStart.x, cropEnd.x);
    const y = Math.min(cropStart.y, cropEnd.y);
    const w = Math.abs(cropEnd.x - cropStart.x);
    const h = Math.abs(cropEnd.y - cropStart.y);
    return { left: x, top: y, width: w, height: h };
  };

  /* ── Render ────────────────────────────────────────── */
  return (
    <div
      className="user-portal fixed inset-0 z-[60] flex flex-col"
      style={{
        background: "var(--up-bg)",
        animation: "up-page-enter 0.3s var(--up-ease)",
      }}
    >
      {/* Header */}
      <header
        className="up-topbar flex items-center justify-between px-4 sm:px-6"
        style={{ height: 56 }}
      >
        <button onClick={onCancel} className="up-btn-text" style={{ fontSize: "1em" }}>
          Cancel
        </button>
        <div
          style={{
            fontSize: "1.16em",
            fontWeight: 600,
            color: "var(--up-text)",
          }}
        >
          Edit Image
        </div>
        <button
          onClick={handleSave}
          className="up-btn-primary"
          style={{
            padding: "8px 18px",
            minHeight: 36,
            fontSize: "1em",
          }}
        >
          <Check size={14} strokeWidth={1.8} />
          Apply
        </button>
      </header>

      {/* Canvas area */}
      <div
        className="flex-1 flex items-center justify-center"
        style={{ padding: 24, overflow: "hidden" }}
      >
        <div
          className="relative inline-block"
          style={{ maxWidth: "100%", maxHeight: "100%" }}
        >
          <canvas
            ref={canvasRef}
            className={isCropping ? "cursor-crosshair" : ""}
            style={{
              maxWidth: "100%",
              maxHeight: "60vh",
              borderRadius: 12,
              boxShadow:
                "0 10px 40px rgba(0,0,0,0.10), 0 0 0 0.5px rgba(0,0,0,0.06)",
              background: "#fff",
              display: "block",
            }}
            onMouseDown={handleCropMouseDown}
            onMouseMove={handleCropMouseMove}
            onMouseUp={handleCropMouseUp}
            onMouseLeave={handleCropMouseUp}
          />

          {/* Crop overlay */}
          {isCropping && cropStart && cropEnd && (
            <div
              className="absolute"
              style={{
                ...getCropStyle()!,
                border: "1.5px solid var(--up-accent)",
                background: "rgba(0,113,227,0.08)",
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
                pointerEvents: "none",
              }}
            >
              {(["tl", "tr", "bl", "br"] as const).map((c) => {
                const s: React.CSSProperties = {
                  position: "absolute",
                  width: 10,
                  height: 10,
                  background: "#fff",
                  border: "1.5px solid var(--up-accent)",
                  borderRadius: 2,
                };
                if (c === "tl") return <div key={c} style={{ ...s, top: -5, left: -5 }} />;
                if (c === "tr") return <div key={c} style={{ ...s, top: -5, right: -5 }} />;
                if (c === "bl") return <div key={c} style={{ ...s, bottom: -5, left: -5 }} />;
                return <div key={c} style={{ ...s, bottom: -5, right: -5 }} />;
              })}
            </div>
          )}

          {isCropping && !cropStart && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{ borderRadius: 12 }}
            >
              <div
                className="up-chip"
                style={{
                  background: "rgba(255,255,255,0.92)",
                  color: "var(--up-accent)",
                  fontSize: "0.95em",
                  boxShadow: "var(--up-shadow-rest)",
                }}
              >
                Click and drag to select an area
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom controls */}
      <div
        style={{
          borderTop: "0.5px solid var(--up-divider)",
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          padding: "12px 0",
        }}
      >
        <div
          className="flex items-stretch gap-3 overflow-x-auto up-no-scrollbar px-4 sm:px-6"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {/* Size */}
          <div
            className="up-card shrink-0"
            style={{ padding: 12, scrollSnapAlign: "start", minWidth: 220 }}
          >
            <div
              className="flex items-center gap-2"
              style={{ marginBottom: 8 }}
            >
              <Maximize2
                size={12}
                strokeWidth={1.8}
                style={{ color: "var(--up-accent)" }}
              />
              <span className="up-section-label">Size</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SIZE_PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => applySizePreset(p.value)}
                  type="button"
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    border:
                      sizePreset === p.value
                        ? "0.5px solid var(--up-accent)"
                        : "0.5px solid var(--up-border-strong)",
                    background:
                      sizePreset === p.value ? "var(--up-accent)" : "transparent",
                    color: sizePreset === p.value ? "#fff" : "var(--up-text)",
                    fontSize: "0.95em",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.2s var(--up-ease)",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Crop */}
          <div
            className="up-card shrink-0"
            style={{ padding: 12, scrollSnapAlign: "start", minWidth: 180 }}
          >
            <div
              className="flex items-center gap-2"
              style={{ marginBottom: 8 }}
            >
              <Crop
                size={12}
                strokeWidth={1.8}
                style={{ color: "var(--up-accent)" }}
              />
              <span className="up-section-label">Crop</span>
            </div>
            {isCropping ? (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsCropping(false);
                    setCropStart(null);
                    setCropEnd(null);
                    setIsDragging(false);
                  }}
                  className="up-btn-ghost"
                  style={{ padding: "6px 12px", fontSize: "0.95em", minHeight: 32 }}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  onClick={applyCrop}
                  className="up-btn-primary"
                  style={{ padding: "6px 16px", fontSize: "0.95em", minHeight: 32 }}
                  type="button"
                >
                  Apply crop
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsCropping(true)}
                className="up-btn-ghost w-full"
                style={{ padding: "6px 12px", fontSize: "0.95em", minHeight: 32 }}
                type="button"
              >
                Start crop
              </button>
            )}
          </div>

          {/* Adjust */}
          <div
            className="up-card shrink-0"
            style={{ padding: 12, scrollSnapAlign: "start", minWidth: 280 }}
          >
            <div
              className="flex items-center gap-2"
              style={{ marginBottom: 8 }}
            >
              <Sun
                size={12}
                strokeWidth={1.8}
                style={{ color: "var(--up-accent)" }}
              />
              <span className="up-section-label">Adjust</span>
            </div>
            <div className="space-y-2">
              {[
                {
                  label: "Brightness",
                  icon: Sun,
                  value: brightness,
                  set: setBrightness,
                },
                {
                  label: "Contrast",
                  icon: Contrast,
                  value: contrast,
                  set: setContrast,
                },
                {
                  label: "Saturation",
                  icon: Droplets,
                  value: saturation,
                  set: setSaturation,
                },
              ].map(({ label, value, set }) => {
                const pct = ((value + 100) / 200) * 100;
                return (
                  <div key={label}>
                    <div
                      className="flex items-center justify-between"
                      style={{ marginBottom: 4 }}
                    >
                      <span
                        style={{
                          fontSize: "0.95em",
                          color: "var(--up-text-2)",
                        }}
                      >
                        {label}
                      </span>
                      <span
                        className="up-mono"
                        style={{
                          fontSize: "0.92em",
                          color: "var(--up-text-2)",
                        }}
                      >
                        {value > 0 ? `+${value}` : value}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-100}
                      max={100}
                      value={value}
                      onChange={(e) => set(Number(e.target.value))}
                      className="up-range"
                      style={{ backgroundSize: `${pct}% 100%` }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rotate */}
          <div
            className="up-card shrink-0"
            style={{ padding: 12, scrollSnapAlign: "start", minWidth: 180 }}
          >
            <div
              className="flex items-center gap-2"
              style={{ marginBottom: 8 }}
            >
              <RotateCw
                size={12}
                strokeWidth={1.8}
                style={{ color: "var(--up-accent)" }}
              />
              <span className="up-section-label">Rotate</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[0, 90, 180, 270].map((deg) => (
                <button
                  key={deg}
                  onClick={() => setRotation(deg)}
                  type="button"
                  style={{
                    padding: "6px 0",
                    borderRadius: 8,
                    border: "none",
                    background:
                      rotation === deg ? "var(--up-accent)" : "rgba(0,0,0,0.04)",
                    color: rotation === deg ? "#fff" : "var(--up-text)",
                    fontSize: "0.95em",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.2s var(--up-ease)",
                  }}
                >
                  {deg}°
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
