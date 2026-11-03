"use client";

import { useState } from "react";
import type { PrintSettings as PrintSettingsType } from "@/lib/types";
import {
  Lock,
  Unlock,
  ChevronDown,
  Minus,
  Plus,
  ImageIcon as ImageLucide,
  FileText,
} from "lucide-react";

interface PrintSettingsProps {
  settings: PrintSettingsType;
  onSettingsChange: (settings: PrintSettingsType) => void;
  isEncrypted: boolean;
  onEncryptedChange: (encrypted: boolean) => void;
  hasImageFiles: boolean;
  hasDocxFiles?: boolean;
}

/* ── Tiny inline UI primitives ───────────────────────────── */
function Card({
  title,
  children,
  rightSlot,
}: {
  title?: string;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="up-card" style={{ padding: 0 }}>
      {title && (
        <div
          className="flex items-center justify-between"
          style={{
            padding: "16px 20px 12px",
          }}
        >
          <div className="up-section-label">{title}</div>
          {rightSlot}
        </div>
      )}
      <div style={{ padding: "0 8px 8px" }}>{children}</div>
    </div>
  );
}

function Row({
  label,
  hint,
  control,
  noBorder,
}: {
  label: string;
  hint?: string;
  control: React.ReactNode;
  noBorder?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between gap-3"
      style={{
        padding: "14px 12px",
        borderTop: noBorder ? "none" : "0.5px solid var(--up-divider)",
      }}
    >
      <div className="min-w-0 flex-1">
        <div
          style={{
            fontSize: "1.08em",
            fontWeight: 500,
            color: "var(--up-text)",
          }}
        >
          {label}
        </div>
        {hint && (
          <div
            style={{
              fontSize: "0.92em",
              color: "var(--up-text-2)",
              marginTop: 2,
            }}
          >
            {hint}
          </div>
        )}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { v: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="up-segmented">
      {options.map((o) => (
        <button
          key={o.v}
          data-active={value === o.v}
          onClick={() => onChange(o.v)}
          type="button"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({
  on,
  onChange,
  size = "md",
  tone = "success",
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  size?: "sm" | "md";
  tone?: "success" | "accent";
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      data-on={on || undefined}
      data-tone={tone}
      onClick={() => onChange(!on)}
      className={size === "sm" ? "up-toggle up-toggle-sm" : "up-toggle"}
    >
      <span className="up-toggle-knob" />
    </button>
  );
}

function Stepper({
  value,
  min = 1,
  max = 99,
  onChange,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="up-stepper">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label="Decrement"
      >
        <Minus size={12} strokeWidth={1.8} />
      </button>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || min)))}
      />
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-label="Increment"
      >
        <Plus size={12} strokeWidth={1.8} />
      </button>
    </div>
  );
}

/* ── Component ───────────────────────────────────────────── */
export default function PrintSettings({
  settings,
  onSettingsChange,
  isEncrypted,
  onEncryptedChange,
  hasImageFiles,
  hasDocxFiles = false,
}: PrintSettingsProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [advColorOpen, setAdvColorOpen] = useState(false);

  const update = (partial: Partial<PrintSettingsType>) => {
    onSettingsChange({ ...settings, ...partial });
  };

  const isImageMode = hasImageFiles;
  const isDocxMode = !hasImageFiles && hasDocxFiles;

  const modeLabel = isImageMode
    ? "Photo mode"
    : isDocxMode
    ? "Document mode · DOCX"
    : "Document mode · PDF";

  const paperSizes = isImageMode
    ? [
        "A2",
        "A3",
        "A4",
        "A5",
        "A6",
        "Letter",
        "Legal",
        "Tabloid",
        "Executive",
        "B4",
        "B5",
        "4×6 in",
        "5×7 in",
        "10×15 cm",
        "13×18 cm",
        "20×25 cm",
      ]
    : ["A2", "A3", "A4", "A5", "A6", "Letter", "Legal", "Tabloid", "Executive", "B4", "B5"];

  return (
    <div className="space-y-5">
      {/* ── Mode label ────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="up-section-label">{modeLabel}</div>
      </div>

      {/* ── Basic settings card ───────────────────────── */}
      <Card>
        <Row
          noBorder
          label="Pages"
          control={
            <select
              value={settings.pageSelection}
              onChange={(e) => update({ pageSelection: e.target.value as any })}
              className="up-select-soft"
              style={{ minWidth: 110 }}
            >
              {["All", "Current", "Odd", "Even", "Custom"].map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          }
        />
        {settings.pageSelection === "Custom" && (
          <div style={{ padding: "0 12px 12px" }}>
            <input
              type="text"
              placeholder="e.g. 1, 3, 5-10"
              value={settings.customPageRange || ""}
              onChange={(e) =>
                update({ customPageRange: e.target.value.replace(/[^0-9,\-\s]/g, "") })
              }
              className="up-input"
            />
          </div>
        )}

        <Row
          label="Paper size"
          control={
            <select
              value={settings.paperSize}
              onChange={(e) => update({ paperSize: e.target.value })}
              className="up-select-soft"
              style={{ minWidth: 110 }}
            >
              {paperSizes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          }
        />

        <Row
          label="Orientation"
          control={
            <Segmented
              value={settings.orientation}
              options={[
                { v: "Portrait" as const, label: "Portrait" },
                { v: "Landscape" as const, label: "Landscape" },
              ]}
              onChange={(v) => update({ orientation: v })}
            />
          }
        />

        <Row
          label="Color"
          control={
            <Segmented
              value={settings.colorMode}
              options={[
                { v: "Color" as const, label: "Color" },
                { v: "Black & White" as const, label: "B & W" },
              ]}
              onChange={(v) => update({ colorMode: v })}
            />
          }
        />

        <Row
          label="Copies"
          control={
            <Stepper
              value={settings.copies}
              onChange={(n) => update({ copies: n })}
              min={1}
              max={99}
            />
          }
        />
      </Card>

      {/* ── More Settings (expandable) ───────────────── */}
      <Card>
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          className="flex items-center justify-between w-full"
          style={{
            padding: "14px 12px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span
            style={{
              fontSize: "1.08em",
              fontWeight: 500,
              color: "var(--up-text)",
            }}
          >
            More settings
          </span>
          <ChevronDown
            size={14}
            strokeWidth={1.8}
            style={{
              color: "var(--up-text-2)",
              transition: "transform 0.3s var(--up-ease)",
              transform: moreOpen ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </button>

        <div
          style={{
            display: "grid",
            gridTemplateRows: moreOpen ? "1fr" : "0fr",
            transition: "grid-template-rows 0.3s var(--up-ease)",
          }}
        >
          <div style={{ overflow: "hidden" }}>
            {/* Pages per sheet — only docs */}
            {!isImageMode && (
              <>
                <Row
                  label="Pages per sheet"
                  control={
                    <div className="flex items-center gap-1">
                      {[1, 2, 4, 6, 9, 16].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => update({ pagesPerSheet: n })}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            border: "none",
                            background:
                              settings.pagesPerSheet === n
                                ? "var(--up-accent)"
                                : "var(--up-hover)",
                            color:
                              settings.pagesPerSheet === n
                                ? "#fff"
                                : "var(--up-text)",
                            fontSize: "0.95em",
                            fontWeight: 500,
                            cursor: "pointer",
                            transition: "all 0.2s var(--up-ease)",
                          }}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  }
                />
                {settings.pagesPerSheet > 1 && (
                  <Row
                    label="Empty cells"
                    hint="Show source page only on first cell, or repeat it"
                    control={
                      <Segmented
                        value={settings.pagesPerSheetFill}
                        options={[
                          { v: "blank" as const, label: "Blank" },
                          { v: "repeat" as const, label: "Repeat" },
                        ]}
                        onChange={(v) => update({ pagesPerSheetFill: v })}
                      />
                    }
                  />
                )}
              </>
            )}

            {/* Margins */}
            <Row
              label="Margins"
              control={
                <select
                  value={settings.margins}
                  onChange={(e) => update({ margins: e.target.value as any })}
                  className="up-select-soft"
                  style={{ minWidth: 110 }}
                >
                  {["Default", "None", "Narrow", "Normal", "Wide", "Custom"].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              }
            />
            {settings.margins === "Custom" && (
              <div
                className="grid grid-cols-2 gap-3"
                style={{ padding: "0 12px 12px" }}
              >
                <div>
                  <label
                    style={{
                      fontSize: "0.92em",
                      color: "var(--up-text-2)",
                      marginBottom: 4,
                      display: "block",
                    }}
                  >
                    Top / Bottom (in)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={settings.customMarginTopBottom ?? 1}
                    onChange={(e) =>
                      update({ customMarginTopBottom: parseFloat(e.target.value) || 0 })
                    }
                    className="up-input"
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: "0.92em",
                      color: "var(--up-text-2)",
                      marginBottom: 4,
                      display: "block",
                    }}
                  >
                    Left / Right (in)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={settings.customMarginLeftRight ?? 1}
                    onChange={(e) =>
                      update({ customMarginLeftRight: parseFloat(e.target.value) || 0 })
                    }
                    className="up-input"
                  />
                </div>
              </div>
            )}

            {/* Scale — for documents */}
            {!isImageMode && (
              <>
                <Row
                  label="Scale"
                  control={
                    <Segmented
                      value={settings.scaleMode}
                      options={[
                        { v: "Fit to Page Width" as const, label: "Fit width" },
                        { v: "Custom Scale" as const, label: "Custom" },
                      ]}
                      onChange={(v) => update({ scaleMode: v })}
                    />
                  }
                />
                {settings.scaleMode === "Custom Scale" && (
                  <div style={{ padding: "0 12px 12px" }}>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={settings.customScalePercentage || 100}
                        onChange={(e) =>
                          update({ customScalePercentage: parseInt(e.target.value) || 100 })
                        }
                        className="up-input"
                        style={{ width: 100 }}
                      />
                      <span style={{ color: "var(--up-text-2)", fontSize: "1em" }}>
                        %
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── Image-only settings ─────────────────── */}
            {isImageMode && (
              <>
                <Row
                  label="Aspect ratio"
                  control={
                    <select
                      value={settings.aspectRatio}
                      onChange={(e) => update({ aspectRatio: e.target.value })}
                      className="up-select-soft"
                      style={{ minWidth: 110 }}
                    >
                      {[
                        "Original",
                        "Full Page",
                        "1:1 Square",
                        "3:4",
                        "4:3",
                        "2:3",
                        "3:2",
                        "5:7",
                        "7:5",
                        "9:16",
                        "16:9",
                        "Custom",
                      ].map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  }
                />
                {settings.aspectRatio === "Custom" && (
                  <div
                    className="grid grid-cols-2 gap-3"
                    style={{ padding: "0 12px 12px" }}
                  >
                    <div>
                      <label
                        style={{
                          fontSize: "0.92em",
                          color: "var(--up-text-2)",
                          marginBottom: 4,
                          display: "block",
                        }}
                      >
                        Width
                      </label>
                      <input
                        type="number"
                        value={settings.customWidthDimensions ?? 100}
                        onChange={(e) =>
                          update({
                            customWidthDimensions: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="up-input"
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: "0.92em",
                          color: "var(--up-text-2)",
                          marginBottom: 4,
                          display: "block",
                        }}
                      >
                        Height
                      </label>
                      <input
                        type="number"
                        value={settings.customHeightDimensions ?? 100}
                        onChange={(e) =>
                          update({
                            customHeightDimensions: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="up-input"
                      />
                    </div>
                  </div>
                )}

                {/* Photos per page */}
                <Row
                  label="Photos per page"
                  control={
                    <select
                      value={settings.photosPerPage}
                      onChange={(e) =>
                        update({ photosPerPage: parseInt(e.target.value) || 1 })
                      }
                      className="up-select-soft"
                      style={{ minWidth: 110 }}
                    >
                      {[1, 2, 4, 9, 35].map((n) => (
                        <option key={n} value={n}>
                          {n === 1
                            ? "Full page"
                            : n === 35
                            ? "Contact sheet"
                            : `${n} photos`}
                        </option>
                      ))}
                    </select>
                  }
                />
                {settings.photosPerPage > 1 && (
                  <Row
                    label="Tile mode"
                    control={
                      <Segmented
                        value={settings.pagesPerSheetFill}
                        options={[
                          { v: "blank" as const, label: "Blank" },
                          { v: "repeat" as const, label: "Repeat" },
                        ]}
                        onChange={(v) => update({ pagesPerSheetFill: v })}
                      />
                    }
                  />
                )}

                {/* Crop toggle */}
                <Row
                  label="Crop image"
                  hint={settings.enableCrop ? "Use Edit button on the preview" : undefined}
                  control={
                    <Toggle
                      on={settings.enableCrop}
                      onChange={(v) => update({ enableCrop: v })}
                      tone="accent"
                    />
                  }
                />

                {/* Adjustments */}
                <div
                  style={{
                    padding: "12px",
                    borderTop: "0.5px solid var(--up-divider)",
                  }}
                >
                  <div
                    className="up-section-label"
                    style={{ marginBottom: 12, paddingLeft: 0 }}
                  >
                    Adjustments
                  </div>
                  <div className="space-y-3">
                    {[
                      { key: "brightness", label: "Brightness" },
                      { key: "contrast", label: "Contrast" },
                      { key: "saturation", label: "Saturation" },
                      { key: "exposure", label: "Exposure" },
                    ].map((it) => {
                      const v = (settings as any)[it.key] as number;
                      const pct = ((v + 100) / 200) * 100;
                      return (
                        <div key={it.key}>
                          <div
                            className="flex items-center justify-between"
                            style={{ marginBottom: 6 }}
                          >
                            <span
                              style={{
                                fontSize: "1em",
                                color: "var(--up-text)",
                              }}
                            >
                              {it.label}
                            </span>
                            <span
                              className="up-mono"
                              style={{
                                fontSize: "0.95em",
                                color: "var(--up-text-2)",
                              }}
                            >
                              {v > 0 ? `+${v}` : v}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={-100}
                            max={100}
                            value={v}
                            onChange={(e) =>
                              update({ [it.key]: parseInt(e.target.value) } as any)
                            }
                            className="up-range"
                            style={{
                              backgroundSize: `${pct}% 100%`,
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* ── Advanced color management (PDF only) ───────── */}
      {!isImageMode && !isDocxMode && (
        <Card>
          <button
            type="button"
            onClick={() => setAdvColorOpen((v) => !v)}
            className="flex items-center justify-between w-full"
            style={{
              padding: "14px 12px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div className="min-w-0">
              <div
                style={{
                  fontSize: "1.08em",
                  fontWeight: 500,
                  color: "var(--up-text)",
                }}
              >
                Mixed color / B&W
              </div>
              <div
                style={{
                  fontSize: "0.92em",
                  color: "var(--up-text-2)",
                  marginTop: 2,
                }}
              >
                Print specific pages in color and the rest in B&W
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Toggle
                on={settings.enableAdvancedColor}
                onChange={(v) => {
                  update({ enableAdvancedColor: v });
                  if (v) setAdvColorOpen(true);
                }}
                tone="accent"
              />
              <ChevronDown
                size={14}
                strokeWidth={1.8}
                style={{
                  color: "var(--up-text-2)",
                  transition: "transform 0.3s var(--up-ease)",
                  transform: advColorOpen ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </div>
          </button>

          <div
            style={{
              display: "grid",
              gridTemplateRows: advColorOpen && settings.enableAdvancedColor ? "1fr" : "0fr",
              transition: "grid-template-rows 0.3s var(--up-ease)",
            }}
          >
            <div style={{ overflow: "hidden" }}>
              <Row
                label="Color pages"
                control={
                  <Toggle
                    on={settings.enableColorRange}
                    onChange={(v) => update({ enableColorRange: v })}
                    size="sm"
                    tone="accent"
                  />
                }
              />
              {settings.enableColorRange && (
                <div style={{ padding: "0 12px 12px" }}>
                  <input
                    type="text"
                    placeholder="e.g. 1, 3, 5-10"
                    value={settings.colorPagesRange || ""}
                    onChange={(e) =>
                      update({
                        colorPagesRange: e.target.value.replace(/[^0-9,\-\s]/g, ""),
                      })
                    }
                    className="up-input"
                  />
                </div>
              )}

              <Row
                label="B & W pages"
                control={
                  <Toggle
                    on={settings.enableBWRange}
                    onChange={(v) => update({ enableBWRange: v })}
                    size="sm"
                    tone="accent"
                  />
                }
              />
              {settings.enableBWRange && (
                <div style={{ padding: "0 12px 12px" }}>
                  <input
                    type="text"
                    placeholder="e.g. 2, 4, 11-15"
                    value={settings.bwPagesRange || ""}
                    onChange={(e) =>
                      update({
                        bwPagesRange: e.target.value.replace(/[^0-9,\-\s]/g, ""),
                      })
                    }
                    className="up-input"
                  />
                </div>
              )}

              {(settings.enableColorRange || settings.enableBWRange) && (
                <div
                  style={{
                    margin: "0 12px 12px",
                    padding: 12,
                    background: "rgba(0,113,227,0.06)",
                    borderRadius: 10,
                    fontSize: "0.95em",
                    color: "var(--up-accent)",
                    lineHeight: 1.5,
                  }}
                >
                  {settings.enableColorRange && !settings.enableBWRange && (
                    <>
                      Pages <strong>{settings.colorPagesRange || "…"}</strong> will be color.
                      The rest will be B&W.
                    </>
                  )}
                  {!settings.enableColorRange && settings.enableBWRange && (
                    <>
                      Pages <strong>{settings.bwPagesRange || "…"}</strong> will be B&W.
                      The rest will be color.
                    </>
                  )}
                  {settings.enableColorRange && settings.enableBWRange && (
                    <>
                      Color <strong>{settings.colorPagesRange || "none"}</strong>, B&W{" "}
                      <strong>{settings.bwPagesRange || "none"}</strong>.
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* ── Secure It (prominent) ─────────────────────── */}
      <button
        type="button"
        onClick={() => onEncryptedChange(!isEncrypted)}
        className="up-card w-full text-left"
        style={{
          padding: 20,
          background: isEncrypted ? "rgba(0,113,227,0.04)" : "var(--up-surface)",
          border: isEncrypted
            ? "0.5px solid rgba(0,113,227,0.20)"
            : "0.5px solid var(--up-border)",
          cursor: "pointer",
          transition: "all 0.25s var(--up-ease)",
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex items-center justify-center"
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                flex: "none",
                background: isEncrypted ? "var(--up-accent)" : "var(--up-hover)",
                color: isEncrypted ? "#fff" : "var(--up-text-2)",
                transition: "all 0.25s var(--up-ease)",
              }}
            >
              {isEncrypted ? (
                <Lock size={16} strokeWidth={1.5} />
              ) : (
                <Unlock size={16} strokeWidth={1.5} />
              )}
            </div>
            <div className="min-w-0">
              <div
                style={{
                  fontSize: "1.16em",
                  fontWeight: 500,
                  color: "var(--up-text)",
                }}
              >
                Secure It
              </div>
              <div
                style={{
                  fontSize: "0.95em",
                  color: "var(--up-text-2)",
                  marginTop: 2,
                }}
              >
                Files encrypted before leaving your device
              </div>
            </div>
          </div>
          <Toggle on={isEncrypted} onChange={onEncryptedChange} />
        </div>
      </button>
    </div>
  );
}
