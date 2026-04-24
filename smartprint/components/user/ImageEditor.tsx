"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { RotateCw, Sun, Contrast, Droplets, Crop, Maximize2, X, Check } from "lucide-react";

interface ImageEditorProps {
  file: File;
  onSave: (editedFile: File) => void;
  onCancel: () => void;
}

const SIZE_PRESETS = [
  { label: "Original", value: "original" },
  { label: "Passport 35×45", value: "passport" },
  { label: "Square 1:1", value: "square" },
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
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const [cropEnd, setCropEnd] = useState<{ x: number; y: number } | null>(null);
  const [appliedCrop, setAppliedCrop] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

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

    // Determine source region (with crop)
    const sx = appliedCrop?.x ?? 0;
    const sy = appliedCrop?.y ?? 0;
    const sw = appliedCrop?.w ?? img.naturalWidth;
    const sh = appliedCrop?.h ?? img.naturalHeight;

    // Handle rotation
    const isRotated90 = rotation === 90 || rotation === 270;
    const displayW = isRotated90 ? Math.min(sh, 500) : Math.min(sw, 500);
    const displayH = isRotated90 ? Math.min(sw, 500) : Math.min(sh, 500);
    const scale = Math.min(500 / sw, 500 / sh, 1);
    const w = Math.round(sw * scale);
    const h = Math.round(sh * scale);

    canvas.width = isRotated90 ? h : w;
    canvas.height = isRotated90 ? w : h;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    // Apply filter
    ctx.filter = `brightness(${100 + brightness}%) contrast(${100 + contrast}%) saturate(${100 + saturation}%)`;

    // Apply rotation
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(img, sx, sy, sw, sh, -w / 2, -h / 2, w, h);

    ctx.restore();
  }, [brightness, contrast, saturation, rotation, appliedCrop]);

  useEffect(() => {
    if (imageLoaded) renderCanvas();
  }, [imageLoaded, renderCanvas]);

  // Crop mouse handlers
  const handleCropMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isCropping) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    setCropStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setCropEnd(null);
  };

  const handleCropMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isCropping || !cropStart) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    setCropEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleCropMouseUp = () => {
    // Crop selection complete, keep it visible
  };

  const applyCrop = () => {
    if (!cropStart || !cropEnd || !canvasRef.current || !sourceRef.current) return;
    const canvas = canvasRef.current;
    const img = sourceRef.current;

    const scaleX = img.naturalWidth / canvas.width;
    const scaleY = img.naturalHeight / canvas.height;

    const x = Math.min(cropStart.x, cropEnd.x) * scaleX;
    const y = Math.min(cropStart.y, cropEnd.y) * scaleY;
    const w = Math.abs(cropEnd.x - cropStart.x) * scaleX;
    const h = Math.abs(cropEnd.y - cropStart.y) * scaleY;

    if (w > 10 && h > 10) {
      setAppliedCrop({ x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) });
    }
    setIsCropping(false);
    setCropStart(null);
    setCropEnd(null);
  };

  // Apply size preset as crop
  const applySizePreset = (preset: string) => {
    setSizePreset(preset);
    if (!sourceRef.current) return;
    const img = sourceRef.current;
    const iw = img.naturalWidth, ih = img.naturalHeight;

    if (preset === "original") {
      setAppliedCrop(null);
      return;
    }

    let ratio = 1;
    if (preset === "passport") ratio = 35 / 45;
    else if (preset === "square") ratio = 1;
    else if (preset === "16:9") ratio = 16 / 9;
    else if (preset === "4:3") ratio = 4 / 3;

    let cw: number, ch: number;
    if (iw / ih > ratio) {
      ch = ih;
      cw = Math.round(ch * ratio);
    } else {
      cw = iw;
      ch = Math.round(cw / ratio);
    }
    const cx = Math.round((iw - cw) / 2);
    const cy = Math.round((ih - ch) / 2);
    setAppliedCrop({ x: cx, y: cy, w: cw, h: ch });
  };

  // Save edited image
  const handleSave = () => {
    renderCanvas();
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.toBlob((blob) => {
        if (blob) {
          const newFile = new File([blob], file.name, { type: file.type || "image/png" });
          onSave(newFile);
        }
      }, file.type || "image/png", 0.95);
    }, 100);
  };

  // Crop overlay rendering
  const getCropStyle = (): React.CSSProperties | null => {
    if (!cropStart || !cropEnd) return null;
    const x = Math.min(cropStart.x, cropEnd.x);
    const y = Math.min(cropStart.y, cropEnd.y);
    const w = Math.abs(cropEnd.x - cropStart.x);
    const h = Math.abs(cropEnd.y - cropStart.y);
    return { left: x, top: y, width: w, height: h };
  };

  return (
    <div className="bg-white rounded-[32px] border border-[#E5E7EB] p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Edit Image</h3>
        <div className="flex gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-[#1A1A1A]/50 hover:text-[#1A1A1A] transition-colors flex items-center gap-1">
            <X className="w-4 h-4" /> Cancel
          </button>
          <button onClick={handleSave} className="px-5 py-2 bg-[#4F46E5] text-white text-sm font-bold rounded-xl hover:bg-[#4338CA] active:scale-[0.98] transition-all flex items-center gap-1">
            <Check className="w-4 h-4" /> Apply
          </button>
        </div>
      </div>

      {/* Canvas Preview */}
      <div className="flex justify-center bg-[#F9FAFB] rounded-2xl p-8 border border-[#E5E7EB] min-h-[300px]">
        <div className="relative inline-block h-fit w-fit">
          <canvas
            ref={canvasRef}
            className={`max-w-full max-h-[400px] rounded-lg shadow-md ${isCropping ? "cursor-crosshair" : ""}`}
            onMouseDown={handleCropMouseDown}
            onMouseMove={handleCropMouseMove}
            onMouseUp={handleCropMouseUp}
          />
          {/* Crop overlay */}
          {isCropping && cropStart && cropEnd && (
            <div 
              className="absolute border-2 border-[#4F46E5] bg-[#4F46E5]/10 pointer-events-none" 
              style={{
                ...getCropStyle()!,
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4)'
              }} 
            >
              <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-[#4F46E5] rounded-full ring-2 ring-white" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#4F46E5] rounded-full ring-2 ring-white" />
              <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-[#4F46E5] rounded-full ring-2 ring-white" />
              <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-[#4F46E5] rounded-full ring-2 ring-white" />
            </div>
          )}
          {isCropping && !cropStart && (
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none rounded-lg">
              <p className="bg-white px-4 py-2 rounded-full text-xs font-bold text-[#4F46E5] shadow-xl animate-bounce">
                Click and drag to select area
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Controls in horizontal row */}
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2">
        {/* Size Presets */}
        <div className="min-w-[200px] p-4 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <Maximize2 className="w-4 h-4 text-[#4F46E5]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]/50">Size</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SIZE_PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => applySizePreset(p.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  sizePreset === p.value
                    ? "bg-[#4F46E5] text-white"
                    : "bg-white border border-[#E5E7EB] text-[#1A1A1A] hover:border-[#4F46E5]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Manual Crop */}
        <div className="min-w-[140px] p-4 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <Crop className="w-4 h-4 text-[#4F46E5]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]/50">Crop</span>
          </div>
          {isCropping ? (
            <div className="flex gap-2">
              <button onClick={applyCrop} className="px-3 py-2 text-xs font-bold bg-[#4F46E5] text-white rounded-lg hover:bg-[#4338CA]">Apply</button>
              <button onClick={() => { setIsCropping(false); setCropStart(null); setCropEnd(null); }} className="px-3 py-2 text-xs font-bold bg-white border border-[#E5E7EB] rounded-lg">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setIsCropping(true)} className="w-full px-3 py-2 text-xs font-bold bg-white border border-[#E5E7EB] rounded-lg hover:border-[#4F46E5] transition-all">
              Start Crop
            </button>
          )}
        </div>

        {/* Adjustments */}
        <div className="min-w-[240px] p-4 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <Sun className="w-4 h-4 text-[#4F46E5]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]/50">Adjust</span>
          </div>
          <div className="space-y-3">
            {[
              { label: "Brightness", icon: <Sun className="w-3 h-3" />, value: brightness, set: setBrightness },
              { label: "Contrast", icon: <Contrast className="w-3 h-3" />, value: contrast, set: setContrast },
              { label: "Saturation", icon: <Droplets className="w-3 h-3" />, value: saturation, set: setSaturation },
            ].map(({ label, value, set }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-[#1A1A1A]/40 w-16 shrink-0">{label}</span>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  value={value}
                  onChange={(e) => set(Number(e.target.value))}
                  className="flex-1 h-1.5 accent-[#4F46E5]"
                />
                <span className="text-[10px] font-mono w-8 text-right text-[#1A1A1A]/40">{value > 0 ? `+${value}` : value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rotation */}
        <div className="min-w-[140px] p-4 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <RotateCw className="w-4 h-4 text-[#4F46E5]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]/50">Rotate</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {[0, 90, 180, 270].map((deg) => (
              <button
                key={deg}
                onClick={() => setRotation(deg)}
                className={`px-2 py-2 text-xs font-medium rounded-lg transition-all ${
                  rotation === deg
                    ? "bg-[#4F46E5] text-white"
                    : "bg-white border border-[#E5E7EB] text-[#1A1A1A] hover:border-[#4F46E5]"
                }`}
              >
                {deg}°
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
