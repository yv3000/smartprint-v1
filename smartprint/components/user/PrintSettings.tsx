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

  const renderModeA = () => {
    return (
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
                <input type="number" step="0.1" value={settings.customMarginTopBottom ?? 1} onChange={e => update({ customMarginTopBottom: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1 border border-border rounded text-sm" />
              </div>
              <div>
                <label className="text-xs text-secondary mb-1 block">Left/Right (in)</label>
                <input type="number" step="0.1" value={settings.customMarginLeftRight ?? 1} onChange={e => update({ customMarginLeftRight: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1 border border-border rounded text-sm" />
              </div>
            </div>
          )}
        </div>

        {/* SECTION 7: Advanced Colour Management */}
        <div className="p-4 rounded-xl border border-border bg-white overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col">
              <label className="text-sm font-semibold">Advanced Colour Management</label>
              <span className="text-[10px] text-secondary font-medium uppercase tracking-tight">Mixed color/B&W printing</span>
            </div>
            <div
              className={`w-12 h-7 rounded-full cursor-pointer transition-all relative ${settings.enableAdvancedColor ? 'bg-[#4F46E5]' : 'bg-gray-200'}`}
              onClick={() => update({ enableAdvancedColor: !settings.enableAdvancedColor })}
            >
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${settings.enableAdvancedColor ? 'left-6' : 'left-1 shadow-sm'}`} />
            </div>
          </div>

          {settings.enableAdvancedColor && (
            <div className="space-y-5 animate-in fade-in slide-in-from-top-2 pt-4 border-t border-gray-50">
              {/* Color Pages Selection */}
              <div className={`space-y-3 p-3 rounded-2xl transition-all ${settings.enableColorRange ? 'bg-indigo-50/30 ring-1 ring-indigo-100' : 'bg-transparent'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${settings.enableColorRange ? 'bg-indigo-500 animate-pulse' : 'bg-gray-300'}`} />
                    <span className={`text-xs font-bold uppercase ${settings.enableColorRange ? 'text-indigo-600' : 'text-secondary'}`}>Specific Color Pages</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase ${settings.enableColorRange ? 'text-indigo-600' : 'text-gray-400'}`}>
                      {settings.enableColorRange ? 'Active' : 'Off'}
                    </span>
                    <div 
                      className={`w-10 h-5 rounded-full transition-all relative cursor-pointer ${settings.enableColorRange ? 'bg-indigo-500' : 'bg-gray-200'}`} 
                      onClick={() => update({ enableColorRange: !settings.enableColorRange })}
                    >
                       <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${settings.enableColorRange ? 'left-5.5' : 'left-0.5'}`} />
                    </div>
                  </div>
                </div>
                {settings.enableColorRange && (
                  <input
                    type="text"
                    placeholder="e.g. 1, 3, 5-10"
                    value={settings.colorPagesRange || ""}
                    onChange={(e) => update({ colorPagesRange: e.target.value.replace(/[^0-9,\-\s]/g, '') })}
                    className="w-full px-3 py-2.5 border border-indigo-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white shadow-sm animate-in zoom-in-95 duration-200"
                  />
                )}
              </div>

              {/* B&W Pages Selection */}
              <div className={`space-y-3 p-3 rounded-2xl transition-all ${settings.enableBWRange ? 'bg-gray-50 ring-1 ring-gray-200' : 'bg-transparent'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${settings.enableBWRange ? 'bg-gray-600 animate-pulse' : 'bg-gray-300'}`} />
                    <span className={`text-xs font-bold uppercase ${settings.enableBWRange ? 'text-gray-700' : 'text-secondary'}`}>Specific B&W Pages</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className={`text-[10px] font-bold uppercase ${settings.enableBWRange ? 'text-gray-600' : 'text-gray-400'}`}>
                      {settings.enableBWRange ? 'Active' : 'Off'}
                     </span>
                     <div 
                      className={`w-10 h-5 rounded-full transition-all relative cursor-pointer ${settings.enableBWRange ? 'bg-gray-600' : 'bg-gray-200'}`} 
                      onClick={() => update({ enableBWRange: !settings.enableBWRange })}
                    >
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${settings.enableBWRange ? 'left-5.5' : 'left-0.5'}`} />
                     </div>
                  </div>
                </div>
                {settings.enableBWRange && (
                  <input
                    type="text"
                    placeholder="e.g. 2, 4, 11-15"
                    value={settings.bwPagesRange || ""}
                    onChange={(e) => update({ bwPagesRange: e.target.value.replace(/[^0-9,\-\s]/g, '') })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-500/20 focus:border-gray-500 transition-all bg-white shadow-sm animate-in zoom-in-95 duration-200"
                  />
                )}
              </div>

              {/* Mixed Mode Info */}
              {(settings.enableColorRange || settings.enableBWRange) && (
                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 animate-in fade-in zoom-in-95">
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 mt-0.5 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-indigo-600">i</span>
                    </div>
                    <p className="text-[11px] text-indigo-900 leading-relaxed font-medium">
                      {settings.enableColorRange && !settings.enableBWRange && (
                        <>Only pages <span className="text-indigo-600 font-bold">[{settings.colorPagesRange || "..."}]</span> will be Color. All others will be B&W.</>
                      )}
                      {!settings.enableColorRange && settings.enableBWRange && (
                        <>Only pages <span className="text-gray-700 font-bold">[{settings.bwPagesRange || "..."}]</span> will be B&W. All others will be Color.</>
                      )}
                      {settings.enableColorRange && settings.enableBWRange && (
                        <>Page-specific overrides applied. Color: <span className="text-indigo-600 font-bold">[{settings.colorPagesRange || "none"}]</span>, B&W: <span className="text-gray-700 font-bold">[{settings.bwPagesRange || "none"}]</span>.</>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* How it works section */}
              <div className="pt-2">
                <details className="group">
                  <summary className="list-none flex items-center gap-2 cursor-pointer text-[#4F46E5] text-[11px] font-bold uppercase tracking-wider hover:underline">
                    How it works?
                    <span className="group-open:rotate-180 transition-transform">↓</span>
                  </summary>
                  <div className="mt-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-bold text-gray-700 uppercase">Single Pages</p>
                      <p className="text-[11px] text-gray-500 leading-relaxed">Use commas to separate specific pages.</p>
                      <code className="block p-2 bg-white border border-gray-100 rounded-lg text-xs text-indigo-600 font-mono">1, 3, 4, 7, 11, 23</code>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-bold text-gray-700 uppercase">Page Ranges</p>
                      <p className="text-[11px] text-gray-500 leading-relaxed">Use a hyphen for continuous sequences.</p>
                      <code className="block p-2 bg-white border border-gray-100 rounded-lg text-xs text-indigo-600 font-mono">1-10, 23-28, 40-49</code>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-bold text-gray-700 uppercase">Mixed Example</p>
                      <p className="text-[11px] text-gray-500 leading-relaxed">Combine both for complex needs.</p>
                      <code className="block p-2 bg-white border border-gray-100 rounded-lg text-[10px] text-indigo-600 font-mono">1, 2, 5, 9-15, 17, 18-23, 25</code>
                    </div>
                  </div>
                </details>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderModeB = () => {
    return (
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
                <input type="number" value={settings.customWidthDimensions ?? 100} onChange={e => update({ customWidthDimensions: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1 border border-border rounded text-sm" />
              </div>
              <div>
                <label className="text-xs text-secondary mb-1 block">Height</label>
                <input type="number" value={settings.customHeightDimensions ?? 100} onChange={e => update({ customHeightDimensions: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1 border border-border rounded text-sm" />
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
            <div className="mt-3 space-y-3">
              <div className="p-3 bg-surface rounded-lg text-xs text-secondary leading-relaxed">
                Crop mode is active. You can now use the <span className="font-bold text-[#4F46E5]">Edit/Crop</span> button at the top of the preview to adjust your image.
              </div>
            </div>
          )}
        </div>

        {/* SECTION 5: Adjustments */}
        <div className="p-4 rounded-xl border border-border bg-white space-y-4">
          <label className="block text-sm font-semibold mb-3">Adjustments</label>
          <div>
            <div className="flex justify-between text-xs mb-1"><span>Exposure (Saturate)</span><span>{settings.exposure}</span></div>
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
          <div>
            <div className="flex justify-between text-xs mb-1"><span>Saturation</span><span>{settings.saturation}</span></div>
            <input type="range" min="-100" max="100" value={settings.saturation} onChange={e => update({ saturation: parseInt(e.target.value) })} className="w-full accent-[#4F46E5]" />
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
                <input type="number" step="0.1" value={settings.customMarginTopBottom ?? 1} onChange={e => update({ customMarginTopBottom: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1 border border-border rounded text-sm" />
              </div>
              <div>
                <label className="text-xs text-secondary mb-1 block">Left/Right (in)</label>
                <input type="number" step="0.1" value={settings.customMarginLeftRight ?? 1} onChange={e => update({ customMarginLeftRight: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1 border border-border rounded text-sm" />
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
                className={`p-3 rounded-lg border text-center cursor-pointer transition-all ${settings.photosPerPage === l.value ? "border-[#4F46E5] bg-[#4F46E5]/5 shadow-sm" : "border-border hover:bg-surface"}`}
              >
                <div className="text-sm font-semibold">{l.label}</div>
                <div className="text-xs text-secondary">{l.desc}</div>
              </div>
            ))}
            <div className={`p-3 rounded-lg border text-center transition-all ${![1, 2, 4, 9, 35].includes(settings.photosPerPage) ? "border-[#4F46E5] bg-[#4F46E5]/5 shadow-sm" : "border-border hover:bg-surface"}`}>
              <div className="text-sm font-semibold mb-1">Custom</div>
              <input 
                type="number" 
                min="1" 
                max="100" 
                value={settings.photosPerPage} 
                onChange={(e) => update({ photosPerPage: parseInt(e.target.value) || 1 })} 
                className="w-full px-2 py-1 border border-border bg-white rounded text-xs text-center focus:outline-none focus:border-[#4F46E5]" 
              />
            </div>
          </div>
          {settings.photosPerPage > 1 && (
            <div className="p-3 bg-indigo-50/50 rounded-lg text-xs text-[#4F46E5] font-medium border border-[#4F46E5]/10 flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-[#4F46E5] rounded-full animate-pulse" />
              Your image will be tiled {settings.photosPerPage} times on one page.
            </div>
          )}
        </div>
      </div>
    );
  };

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
