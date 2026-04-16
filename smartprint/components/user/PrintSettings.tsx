"use client";

import { useState } from "react";
import type { PrintSettings as PrintSettingsType } from "@/lib/types";
import { Shield } from "lucide-react";
import Cropper from "react-cropper";
// import "cropperjs/dist/cropper.css";

interface PrintSettingsProps {
  settings: PrintSettingsType;
  onSettingsChange: (settings: PrintSettingsType) => void;
  isEncrypted: boolean;
  onEncryptedChange: (encrypted: boolean) => void;
  hasImageFiles: boolean;
}

export default function PrintSettings({
  settings,
  onSettingsChange,
  isEncrypted,
  onEncryptedChange,
  hasImageFiles,
}: PrintSettingsProps) {
  const update = (partial: Partial<PrintSettingsType>) => {
    onSettingsChange({ ...settings, ...partial });
  };

  const renderModeA = () => (
    <div className="space-y-6 animate-fade-in text-[#111827]">
      {/* SECTION 1 & 2: Orientation & Color */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-border bg-white">
          <label className="block text-sm font-semibold mb-3">Orientation</label>
          <div className="flex gap-2">
            {["Portrait", "Landscape"].map(opt => (
              <button
                key={opt}
                onClick={() => update({ orientation: opt as "Portrait" | "Landscape" })}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${settings.orientation === opt ? "bg-[#111827] text-white" : "bg-surface hover:bg-gray-200"}`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
        <div className="p-4 rounded-xl border border-border bg-white">
          <label className="block text-sm font-semibold mb-3">Color Mode</label>
          <div className="flex gap-2">
            {["Color", "Black & White"].map(opt => (
              <button
                key={opt}
                onClick={() => update({ colorMode: opt as "Color" | "Black & White" })}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${settings.colorMode === opt ? "bg-[#111827] text-white" : "bg-surface hover:bg-gray-200"}`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 3 & 5: Paper Size & Pages per sheet */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-border bg-white">
          <label className="block text-sm font-semibold mb-3">Paper Size</label>
          <select
            value={settings.paperSize}
            onChange={e => update({ paperSize: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none"
          >
            {["A2", "A3", "A4", "A5", "A6", "Letter", "Legal", "Tabloid", "Executive", "B4", "B5", "4×6 in", "5×7 in", "10×15 cm", "13×18 cm", "20×25 cm"].map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>

        <div className="p-4 rounded-xl border border-border bg-white">
          <label className="block text-sm font-semibold mb-3">Pages per Sheet</label>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 4, 6, 9, 16].map(num => (
              <button
                key={num}
                onClick={() => update({ pagesPerSheet: num })}
                className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${settings.pagesPerSheet === num ? "bg-[#4F46E5] text-white" : "bg-surface hover:bg-gray-200"}`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 4: Scale */}
      <div className="p-4 rounded-xl border border-border bg-white">
        <label className="block text-sm font-semibold mb-3">Scale</label>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="scale"
              checked={settings.scaleMode === "Fit to Page Width"}
              onChange={() => update({ scaleMode: "Fit to Page Width" })}
              className="w-4 h-4 text-[#4F46E5]"
            />
            <span className="text-sm">Fit to Page Width</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="scale"
              checked={settings.scaleMode === "Custom Scale"}
              onChange={() => update({ scaleMode: "Custom Scale" })}
              className="w-4 h-4 text-[#4F46E5]"
            />
            <span className="text-sm">Custom Scale</span>
          </label>
          {settings.scaleMode === "Custom Scale" && (
            <div className="pl-7 flex items-center gap-2">
              <input
                type="number"
                value={settings.customScalePercentage || 100}
                onChange={e => update({ customScalePercentage: parseInt(e.target.value) || 100 })}
                className="w-20 px-2 py-1 border border-border rounded text-sm"
              />
              <span className="text-sm text-secondary">%</span>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 6: Margins */}
      <div className="p-4 rounded-xl border border-border bg-white">
        <label className="block text-sm font-semibold mb-3">Margins</label>
        <select
          value={settings.margins}
          onChange={e => update({ margins: e.target.value as any })}
          className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm mb-3 focus:outline-none"
        >
          {["Default", "None", "Narrow", "Normal", "Wide", "Custom"].map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        {settings.margins === "Custom" && (
          <div className="flex gap-4">
            <div>
              <label className="text-xs text-secondary mb-1 block">Top/Bottom (in)</label>
              <input type="number" step="0.1" value={settings.customMarginTopBottom || 1} onChange={e => update({ customMarginTopBottom: parseFloat(e.target.value) })} className="w-full px-2 py-1 border border-border rounded text-sm" />
            </div>
            <div>
              <label className="text-xs text-secondary mb-1 block">Left/Right (in)</label>
              <input type="number" step="0.1" value={settings.customMarginLeftRight || 1} onChange={e => update({ customMarginLeftRight: parseFloat(e.target.value) })} className="w-full px-2 py-1 border border-border rounded text-sm" />
            </div>
          </div>
        )}
      </div>

      {/* SECTION 7: Colour Pages */}
      {settings.colorMode === "Color" && (
        <div className="p-4 rounded-xl border border-border bg-white">
          <label className="block text-sm font-semibold mb-3">Colour Pages</label>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm">All pages color</span>
            <div
              className={`w-10 h-6 rounded-full cursor-pointer transition-colors relative ${settings.allPagesColor ? 'bg-[#4F46E5]' : 'bg-gray-300'}`}
              onClick={() => update({ allPagesColor: !settings.allPagesColor })}
            >
              <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.allPagesColor ? 'translate-x-4' : ''}`} />
            </div>
          </div>
          {!settings.allPagesColor && (
            <div className="mt-2">
              <label className="text-xs text-secondary mb-1 block">Color pages (e.g. 1,3,5-8)</label>
              <input
                type="text"
                value={settings.colorPagesRange || ""}
                onChange={(e) => update({ colorPagesRange: e.target.value.replace(/[^0-9,-]/g, '') })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderModeB = () => (
    <div className="space-y-6 animate-fade-in text-[#111827]">
      {/* SECTION 1 & 2: Orientation & Color */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-border bg-white">
          <label className="block text-sm font-semibold mb-3">Orientation</label>
          <div className="flex gap-2">
            {["Portrait", "Landscape"].map(opt => (
              <button
                key={opt}
                onClick={() => update({ orientation: opt as "Portrait" | "Landscape" })}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${settings.orientation === opt ? "bg-[#111827] text-white" : "bg-surface hover:bg-gray-200"}`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
        <div className="p-4 rounded-xl border border-border bg-white">
          <label className="block text-sm font-semibold mb-3">Color Mode</label>
          <div className="flex gap-2">
            {["Color", "Black & White"].map(opt => (
              <button
                key={opt}
                onClick={() => update({ colorMode: opt as "Color" | "Black & White" })}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${settings.colorMode === opt ? "bg-[#111827] text-white" : "bg-surface hover:bg-gray-200"}`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 3: Aspect Ratio */}
      <div className="p-4 rounded-xl border border-border bg-white">
        <label className="block text-sm font-semibold mb-3">Size / Aspect Ratio</label>
        <select
          value={settings.aspectRatio}
          onChange={e => update({ aspectRatio: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm mb-3 focus:outline-none"
        >
          {["Original", "Full Page", "1:1 Square", "3:4", "4:3", "2:3", "3:2", "5:7", "7:5", "9:16", "16:9", "Custom"].map(ratio => (
            <option key={ratio} value={ratio}>{ratio}</option>
          ))}
        </select>
        {settings.aspectRatio === "Custom" && (
          <div className="flex gap-4">
            <div>
              <label className="text-xs text-secondary mb-1 block">Width</label>
              <input type="number" value={settings.customWidthDimensions || 100} onChange={e => update({ customWidthDimensions: parseFloat(e.target.value) })} className="w-full px-2 py-1 border border-border rounded text-sm" />
            </div>
            <div>
              <label className="text-xs text-secondary mb-1 block">Height</label>
              <input type="number" value={settings.customHeightDimensions || 100} onChange={e => update({ customHeightDimensions: parseFloat(e.target.value) })} className="w-full px-2 py-1 border border-border rounded text-sm" />
            </div>
          </div>
        )}
      </div>

      {/* SECTION 4: Crop */}
      <div className="p-4 rounded-xl border border-border bg-white">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold">Enable Crop</label>
          <div
            className={`w-10 h-6 rounded-full cursor-pointer transition-colors relative ${settings.enableCrop ? 'bg-[#4F46E5]' : 'bg-gray-300'}`}
            onClick={() => update({ enableCrop: !settings.enableCrop })}
          >
            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.enableCrop ? 'translate-x-4' : ''}`} />
          </div>
        </div>
        {settings.enableCrop && (
          <div className="mt-3 p-3 bg-surface rounded-lg text-xs text-secondary">
            A simple crop tool can be activated for each individual file during viewing by clicking on the crop icon.
          </div>
        )}
      </div>

      {/* SECTION 5: Adjustments */}
      <div className="p-4 rounded-xl border border-border bg-white space-y-4">
        <label className="block text-sm font-semibold mb-3">Adjustments</label>
        <div>
          <div className="flex justify-between text-xs mb-1"><span>Exposure</span><span>{settings.exposure}</span></div>
          <input type="range" min="-100" max="100" value={settings.exposure} onChange={e => update({ exposure: parseInt(e.target.value) })} className="w-full accent-[#4F46E5]" />
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1"><span>Brightness</span><span>{settings.brightness}</span></div>
          <input type="range" min="-100" max="100" value={settings.brightness} onChange={e => update({ brightness: parseInt(e.target.value) })} className="w-full accent-[#4F46E5]" />
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1"><span>Contrast</span><span>{settings.contrast}</span></div>
          <input type="range" min="-100" max="100" value={settings.contrast} onChange={e => update({ contrast: parseInt(e.target.value) })} className="w-full accent-[#4F46E5]" />
        </div>
      </div>

      {/* SECTION 6: Margins */}
      <div className="p-4 rounded-xl border border-border bg-white">
        <label className="block text-sm font-semibold mb-3">Margins</label>
        <select
          value={settings.margins}
          onChange={e => update({ margins: e.target.value as any })}
          className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm mb-3 focus:outline-none"
        >
          {["Default", "None", "Narrow", "Normal", "Wide", "Custom"].map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        {settings.margins === "Custom" && (
          <div className="flex gap-4">
            <div>
              <label className="text-xs text-secondary mb-1 block">Top/Bottom (in)</label>
              <input type="number" step="0.1" value={settings.customMarginTopBottom || 1} onChange={e => update({ customMarginTopBottom: parseFloat(e.target.value) })} className="w-full px-2 py-1 border border-border rounded text-sm" />
            </div>
            <div>
              <label className="text-xs text-secondary mb-1 block">Left/Right (in)</label>
              <input type="number" step="0.1" value={settings.customMarginLeftRight || 1} onChange={e => update({ customMarginLeftRight: parseFloat(e.target.value) })} className="w-full px-2 py-1 border border-border rounded text-sm" />
            </div>
          </div>
        )}
      </div>

      {/* SECTION 7: Photos Per Page (Layout Layout) */}
      <div className="p-4 rounded-xl border border-border bg-white">
        <label className="block text-sm font-semibold mb-3">Layout — Photos per Page</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
          {[
            { value: 1, label: "Full Page", desc: "1 photo" },
            { value: 2, label: "2 Photos", desc: "13×18cm layout" },
            { value: 4, label: "4 Photos", desc: "10×15cm grid" },
            { value: 9, label: "9 Photos", desc: "Wallet size" },
            { value: 35, label: "Contact Sheet", desc: "5×7 grid" },
          ].map(l => (
            <div
              key={l.value}
              onClick={() => update({ photosPerPage: l.value })}
              className={`p-3 rounded-lg border text-center cursor-pointer transition-all ${settings.photosPerPage === l.value ? "border-[#4F46E5] bg-[#4F46E5]/5" : "border-border hover:bg-surface"}`}
            >
              <div className="text-sm font-semibold">{l.label}</div>
              <div className="text-xs text-secondary">{l.desc}</div>
            </div>
          ))}
          <div
            className={`p-3 rounded-lg border cursor-pointer transition-all ${![1, 2, 4, 9, 35].includes(settings.photosPerPage) ? "border-[#4F46E5] bg-[#4F46E5]/5" : "border-border hover:bg-surface"}`}
          >
            <div className="text-sm font-semibold mb-1">Custom</div>
            <input type="number" min="1" max="100" value={![1, 2, 4, 9, 35].includes(settings.photosPerPage) ? settings.photosPerPage : ""} placeholder="e.g. 6" onChange={(e) => update({ photosPerPage: parseInt(e.target.value) || 1 })} className="w-full px-2 py-1 border border-border bg-white rounded text-xs text-center focus:outline-none" />
          </div>
        </div>
        {settings.photosPerPage > 1 && (
          <div className="p-3 bg-surface rounded-lg text-sm text-[#4F46E5] font-medium border border-[#4F46E5]/20">
            Your image will be tiled {settings.photosPerPage} times on one page.
          </div>
        )}
      </div>

    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-1 bg-surface border border-border rounded-xl">
        <div className={`flex-1 py-2 text-center text-sm font-semibold rounded-lg transition-all ${!hasImageFiles ? "bg-white shadow-sm text-[#111827]" : "text-secondary cursor-not-allowed opacity-50"}`}>
          Document Mode
        </div>
        <div className={`flex-1 py-2 text-center text-sm font-semibold rounded-lg transition-all ${hasImageFiles ? "bg-white shadow-sm text-[#111827]" : "text-secondary cursor-not-allowed opacity-50"}`}>
          Photo Mode
        </div>
      </div>

      {!hasImageFiles ? renderModeA() : renderModeB()}

      {/* ── Copies ─────────────────────────────────── */}
      <div className="p-4 rounded-xl border border-border bg-white flex items-center justify-between">
        <label className="text-sm font-semibold">Total Copies</label>
        <div className="flex items-center gap-0 border border-border rounded-xl overflow-hidden">
          <button
            onClick={() => update({ copies: Math.max(1, settings.copies - 1) })}
            className="w-10 h-10 hover:bg-surface transition-colors text-lg font-light border-r border-border flex items-center justify-center bg-white"
          >
            −
          </button>
          <input
            type="number"
            value={settings.copies}
            onChange={(e) => update({ copies: Math.max(1, parseInt(e.target.value) || 1) })}
            className="w-12 h-10 text-center text-sm font-medium focus:outline-none border-none"
          />
          <button
            onClick={() => update({ copies: Math.min(99, settings.copies + 1) })}
            className="w-10 h-10 hover:bg-surface transition-colors text-lg font-light border-l border-border flex items-center justify-center bg-white"
          >
            +
          </button>
        </div>
      </div>

      {/* Security Toggle */}
      <div
        className={`p-5 rounded-2xl border transition-all cursor-pointer ${isEncrypted
            ? "border-accent bg-[#4F46E5]/5"
            : "border-border bg-white"
          }`}
        onClick={() => onEncryptedChange(!isEncrypted)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isEncrypted ? "bg-[#4F46E5] text-white" : "bg-surface border border-border"
              }`}>
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[15px] font-medium">Secure Delivery</div>
              <div className="text-xs text-secondary mt-0.5">
                {isEncrypted ? "Files encrypted locally" : "Standard security"}
              </div>
            </div>
          </div>
          <div
            className="w-12 h-7 rounded-full transition-all relative shrink-0"
            style={{ background: isEncrypted ? "#4F46E5" : "#D1D5DB" }}
          >
            <div
              className="absolute top-[3px] w-[22px] h-[22px] rounded-full bg-white shadow-md transition-all"
              style={{ left: isEncrypted ? "22px" : "3px" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
