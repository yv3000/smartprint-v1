"use client";

import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import Cookies from "js-cookie";
import { toast } from "react-hot-toast";
import { PDFDocument } from "pdf-lib";
import {
  Loader2,
  QrCode,
  Printer,
  Crop,
  ChevronRight,
  ChevronLeft,
  FileText,
  Clock,
  Hash,
  ScanLine,
  Pencil,
} from "lucide-react";
import type { PrintSettings as PrintSettingsType } from "@/lib/types";
import { DEFAULT_PRINT_SETTINGS } from "@/lib/types";
import FileUpload from "@/components/user/FileUpload";
import PrintSettings from "@/components/user/PrintSettings";
import SuccessScreen from "@/components/user/SuccessScreen";
import QRScanner from "@/components/user/QRScanner";
import ImageEditor from "@/components/user/ImageEditor";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { getPaperAspectForOrientation, getPaperPortraitMm } from "@/lib/printLayout";

const PDFPreview = dynamic(() => import("@/components/user/PDFPreview"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center p-20 gap-3">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--up-accent)" }} />
      <p className="up-section-label" style={{ fontSize: "0.92em" }}>
        Initializing PDF Engine
      </p>
    </div>
  ),
});

/* ── Helpers ────────────────────────────────────────────── */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function parsePageRange(rangeStr: string): number[] {
  if (!rangeStr) return [];
  const pages = new Set<number>();
  const parts = rangeStr.split(",");
  parts.forEach((part) => {
    const trimmed = part.trim();
    if (trimmed.includes("-")) {
      const [startStr, endStr] = trimmed.split("-");
      const start = parseInt(startStr?.trim());
      const end = parseInt(endStr?.trim());
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end; i++) pages.add(i);
      }
    } else {
      const num = parseInt(trimmed);
      if (!isNaN(num)) pages.add(num);
    }
  });
  return Array.from(pages).sort((a, b) => a - b);
}

function filterPages(
  totalPages: number,
  selection: string,
  range?: string,
  currentPage: number = 1
): number[] {
  const allPages = Array.from({ length: totalPages }, (_, i) => i + 1);
  switch (selection) {
    case "Current":
      return [currentPage];
    case "Odd":
      return allPages.filter((p) => p % 2 !== 0);
    case "Even":
      return allPages.filter((p) => p % 2 === 0);
    case "Custom":
      return parsePageRange(range || "").filter((p) => p >= 1 && p <= totalPages);
    default:
      return allPages;
  }
}

async function splitPdfByColor(
  file: File,
  colorPagesRange: string,
  bwPagesRange: string,
  enableColorRange: boolean,
  enableBWRange: boolean,
  pageSelection: string,
  customPageRange: string,
  baseColorMode: string,
  currentPage: number = 1
): Promise<File[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const totalPages = pdfDoc.getPageCount();

  const selectedPages = filterPages(totalPages, pageSelection, customPageRange, currentPage);
  if (selectedPages.length === 0) return [];

  let colorPageNums: number[] = [];
  let bwPageNums: number[] = [];

  if (enableColorRange && enableBWRange) {
    const colorRequested = parsePageRange(colorPagesRange);
    const bwRequested = parsePageRange(bwPagesRange);
    colorPageNums = selectedPages.filter((p) => colorRequested.includes(p));
    bwPageNums = selectedPages.filter((p) => bwRequested.includes(p));
  } else if (enableColorRange) {
    const colorRequested = parsePageRange(colorPagesRange);
    colorPageNums = selectedPages.filter((p) => colorRequested.includes(p));
    bwPageNums = selectedPages.filter((p) => !colorPageNums.includes(p));
  } else if (enableBWRange) {
    const bwRequested = parsePageRange(bwPagesRange);
    bwPageNums = selectedPages.filter((p) => bwRequested.includes(p));
    colorPageNums = selectedPages.filter((p) => !bwPageNums.includes(p));
  } else {
    if (baseColorMode === "Color") {
      colorPageNums = selectedPages;
    } else {
      bwPageNums = selectedPages;
    }
  }

  const result: File[] = [];
  const baseName = file.name.replace(/\.pdf$/i, "");

  if (colorPageNums.length > 0) {
    const colorDoc = await PDFDocument.create();
    const indices = colorPageNums.map((p) => p - 1);
    const pages = await colorDoc.copyPages(pdfDoc, indices);
    pages.forEach((page) => colorDoc.addPage(page));
    const colorBytes = await colorDoc.save();
    result.push(
      new File([colorBytes.buffer as ArrayBuffer], `${baseName}_COLOR_pages.pdf`, {
        type: "application/pdf",
      })
    );
  }

  if (bwPageNums.length > 0) {
    const bwDoc = await PDFDocument.create();
    const indices = bwPageNums.map((p) => p - 1);
    const pages = await bwDoc.copyPages(pdfDoc, indices);
    pages.forEach((page) => bwDoc.addPage(page));
    const bwBytes = await bwDoc.save();
    result.push(
      new File([bwBytes.buffer as ArrayBuffer], `${baseName}_BW_pages.pdf`, {
        type: "application/pdf",
      })
    );
  }

  return result;
}

function UserPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shopToken = searchParams.get("shop");

  const [shopName, setShopName] = useState<string | null>(null);
  const [shopOnline, setShopOnline] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  // Connection by Shop ID
  const [shopIdInput, setShopIdInput] = useState("");
  const [shopIdError, setShopIdError] = useState("");

  // Discovery tabs — "scan" | "id" | "recent" | null
  const [connectTab, setConnectTab] = useState<"scan" | "id" | "recent">("id");
  const [recentShops, setRecentShops] = useState<any[]>([]);
  const [showConnectPanel, setShowConnectPanel] = useState(false);

  // Job flow
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<any[]>([]);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [settings, setSettings] = useState<PrintSettingsType>(DEFAULT_PRINT_SETTINGS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobResult, setJobResult] = useState<any>(null);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [showEditor, setShowEditor] = useState(false);
  const [currentPreviewPage, setCurrentPreviewPage] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 50, y: 50 });
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  // ── Live DOCX preview via Google Drive (Option B in round 16) ──
  // Per-File preview state. We eagerly POST each .docx the user selects
  // to /api/preview/docx, store the resulting Drive previewUrl, and
  // render it as an iframe in the step-2 preview slot. On file swap,
  // encryption toggle, or unmount we DELETE any orphan Drive copies.
  // On submit we forward the already-uploaded Drive ids to /api/jobs/create
  // so the server reuses them instead of double-uploading.
  type DocxPreviewStatus = "idle" | "uploading" | "ready" | "error";
  interface DocxPreviewEntry {
    status: DocxPreviewStatus;
    fileId?: string;
    previewUrl?: string;
    error?: string;
    abortController?: AbortController;
  }
  // Ref so effects can read the current map without dep loops; bump
  // `previewTick` whenever we mutate, to force a re-render.
  const docxPreviewsRef = useRef<Map<File, DocxPreviewEntry>>(new Map());
  const [, setPreviewTick] = useState(0);
  const bumpPreviewTick = () => setPreviewTick((n) => n + 1);

  const setDocxPreview = (file: File, partial: Partial<DocxPreviewEntry>) => {
    const cur = docxPreviewsRef.current.get(file) ?? { status: "idle" as const };
    docxPreviewsRef.current.set(file, { ...cur, ...partial });
    bumpPreviewTick();
  };
  const removeDocxPreview = (file: File) => {
    docxPreviewsRef.current.delete(file);
    bumpPreviewTick();
  };
  const getDocxPreview = (file: File | undefined): DocxPreviewEntry | undefined =>
    file ? docxPreviewsRef.current.get(file) : undefined;

  /** Best-effort DELETE of an orphan Drive copy. `keepalive` lets the
   *  request survive page unmount / navigation. */
  const deleteDocxPreviewRemote = (fileId: string) => {
    fetch(`/api/preview/docx?id=${encodeURIComponent(fileId)}`, {
      method: "DELETE",
      keepalive: true,
    }).catch(() => { /* ignore — best effort */ });
  };

  const cleanupDocxPreview = (file: File) => {
    const entry = docxPreviewsRef.current.get(file);
    if (!entry) return;
    if (entry.abortController) entry.abortController.abort();
    if (entry.fileId) deleteDocxPreviewRemote(entry.fileId);
    removeDocxPreview(file);
  };

  const uploadDocxPreview = async (file: File) => {
    const ctrl = new AbortController();
    setDocxPreview(file, { status: "uploading", abortController: ctrl, error: undefined });
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/preview/docx", {
        method: "POST",
        body: fd,
        signal: ctrl.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      // If the user already swapped/removed this file while we were
      // uploading, the entry was wiped — abort path will have hit;
      // double-check anyway.
      if (!docxPreviewsRef.current.has(file)) {
        if (data?.fileId) deleteDocxPreviewRemote(data.fileId);
        return;
      }
      setDocxPreview(file, {
        status: "ready",
        fileId: data.fileId,
        previewUrl: data.previewUrl,
        abortController: undefined,
        error: undefined,
      });
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      setDocxPreview(file, {
        status: "error",
        error: err?.message || "Preview upload failed",
        abortController: undefined,
      });
    }
  };

  // Load recent shops
  useEffect(() => {
    const recent = Cookies.get("sp_recent");
    if (recent) setRecentShops(JSON.parse(recent));
  }, []);

  // ── Orchestrate Drive previews for the current `files` list ──
  // - Encrypt ON  → cleanup all previews (we never upload ciphertext).
  // - Otherwise  → upload any docx file that doesn't already have an
  //                entry; delete entries whose File is no longer in the
  //                list (user removed/swapped it).
  useEffect(() => {
    if (isEncrypted) {
      Array.from(docxPreviewsRef.current.keys()).forEach(cleanupDocxPreview);
      return;
    }
    const docxFiles = files
      .map((e: any) => e?.file)
      .filter((f: any): f is File =>
        !!f && typeof f.name === "string" && f.name.toLowerCase().endsWith(".docx"),
      );
    // 1. Cleanup orphans (file no longer present).
    const live = new Set(docxFiles);
    Array.from(docxPreviewsRef.current.keys()).forEach((prev) => {
      if (!live.has(prev)) cleanupDocxPreview(prev);
    });
    // 2. Start uploads for new docx files.
    for (const f of docxFiles) {
      if (!docxPreviewsRef.current.has(f)) {
        uploadDocxPreview(f);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, isEncrypted]);

  // ── Best-effort cleanup on component unmount ──
  // Page navigated away / user closed tab. Fire DELETEs with keepalive
  // so they survive teardown. Also cancel any in-flight uploads.
  useEffect(() => {
    return () => {
      Array.from(docxPreviewsRef.current.entries()).forEach(([, entry]) => {
        if (entry.abortController) entry.abortController.abort();
        if (entry.fileId) deleteDocxPreviewRemote(entry.fileId);
      });
      docxPreviewsRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Verify shop token
  useEffect(() => {
    if (shopToken) {
      setIsVerifying(true);
      fetch(`/api/shops/${shopToken}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.shopName && data.isOnline) {
            setShopName(data.shopName);
            setShopOnline(true);
            const existing = Cookies.get("sp_recent");
            let recent = existing ? JSON.parse(existing) : [];
            recent = recent.filter((s: any) => s.qrToken !== shopToken);
            recent.unshift({
              shopName: data.shopName,
              qrToken: shopToken,
              lastVisited: new Date().toISOString(),
            });
            Cookies.set("sp_recent", JSON.stringify(recent.slice(0, 3)), { expires: 90 });
            setRecentShops(recent.slice(0, 3));
            setShowConnectPanel(false);
          } else {
            setShopName(null);
            setShopOnline(false);
            toast.error(data?.shopName ? "Shop is offline right now" : "Invalid Shop QR Code");
          }
        })
        .finally(() => setIsVerifying(false));
    }
  }, [shopToken]);

  const handleScan = (token: string) => {
    setShowQRModal(false);
    router.push(`/user?shop=${token}`);
  };

  const handleShopIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 6);
    setShopIdInput(val);
    setShopIdError("");
  };

  const connectByShopId = async () => {
    if (shopIdInput.length !== 6) {
      setShopIdError("Shop ID must be exactly 6 characters");
      return;
    }
    try {
      const res = await fetch(`/api/shops/by-id/${shopIdInput}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setShopIdError(data?.error || "Shop not found. Check the ID and try again.");
        return;
      }
      const existing = Cookies.get("sp_recent");
      let recent = existing ? JSON.parse(existing) : [];
      recent = recent.filter((s: any) => s.qrToken !== data.shop.qrCode);
      recent.unshift({
        shopName: data.shop.shopName,
        qrToken: data.shop.qrCode,
        lastVisited: new Date().toISOString(),
      });
      Cookies.set("sp_recent", JSON.stringify(recent.slice(0, 3)), { expires: 90 });
      setRecentShops(recent.slice(0, 3));
      toast.success(`Connected to ${data.shop.shopName}`);
      router.push(`/user?shop=${data.shop.qrCode}`);
      setShopIdInput("");
    } catch {
      setShopIdError("Connection failed. Please try again.");
    }
  };

  const handleSettingsChange = (newSettings: PrintSettingsType) => {
    const cropEnabledNow = !settings.enableCrop && newSettings.enableCrop;
    setSettings(newSettings);
    setFiles((prev) =>
      prev.map((f, i) =>
        i === selectedFileIndex ? { ...f, adjustments: { ...newSettings } } : f
      )
    );
    if (cropEnabledNow && files[selectedFileIndex]?.file.type.startsWith("image/")) {
      setShowEditor(true);
    }
  };

  const handleEditorSave = (editedFile: File) => {
    const previewUrl = URL.createObjectURL(editedFile);
    setFiles((prev) =>
      prev.map((f, i) =>
        i === selectedFileIndex
          ? { ...f, file: editedFile, preview: previewUrl }
          : f
      )
    );
    setShowEditor(false);
  };

  const selectedFile = files[selectedFileIndex];
  const canRepositionImage =
    !!selectedFile?.file?.type?.startsWith("image/") &&
    (settings.aspectRatio !== "Original" || settings.photosPerPage > 1);

  useEffect(() => {
    setImagePosition({ x: 50, y: 50 });
  }, [selectedFileIndex, settings.aspectRatio, settings.photosPerPage]);

  useEffect(() => {
    if (!isDraggingImage) return;

    const move = (clientX: number, clientY: number) => {
      if (!dragStartRef.current) return;
      const dx = clientX - dragStartRef.current.x;
      const dy = clientY - dragStartRef.current.y;
      dragStartRef.current = { x: clientX, y: clientY };
      setImagePosition((prev) => ({
        x: Math.max(0, Math.min(100, prev.x - dx * 0.18)),
        y: Math.max(0, Math.min(100, prev.y - dy * 0.18)),
      }));
    };

    const onMouseMove = (e: MouseEvent) => move(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) move(touch.clientX, touch.clientY);
    };
    const stop = () => {
      setIsDraggingImage(false);
      dragStartRef.current = null;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", stop);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", stop);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", stop);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", stop);
    };
  }, [isDraggingImage]);

  const beginImageDrag = (clientX: number, clientY: number) => {
    if (!canRepositionImage) return;
    dragStartRef.current = { x: clientX, y: clientY };
    setIsDraggingImage(true);
  };

  const handleSubmit = async () => {
    if (!files.length) return;
    if (!shopToken) {
      toast.error("Please connect to a shop first");
      return;
    }
    if (!shopOnline) {
      toast.error("Shop is offline right now");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      const updatedSettings = { ...settings };
      const encryptionKeys: string[] = [];
      const fileInfos: any[] = [];

      const needsFiltering = settings.pageSelection !== "All";
      const needsColorSplit =
        settings.enableAdvancedColor &&
        (settings.enableColorRange || settings.enableBWRange) &&
        (settings.colorPagesRange || settings.bwPagesRange);

      const needsProcessing = needsFiltering || needsColorSplit;

      let finalFiles: File[] = [];

      if (needsProcessing) {
        for (const f of files) {
          const isPDF =
            f.file.type === "application/pdf" ||
            f.file.name.toLowerCase().endsWith(".pdf");
          if (isPDF) {
            try {
              toast.loading("Splitting PDF pages...", { id: "split" });
              const splitFiles = await splitPdfByColor(
                f.file,
                settings.colorPagesRange || "",
                settings.bwPagesRange || "",
                settings.enableColorRange,
                settings.enableBWRange,
                settings.pageSelection,
                settings.customPageRange || "",
                settings.colorMode,
                currentPreviewPage
              );
              finalFiles.push(...splitFiles);
              toast.dismiss("split");
              toast.success(`PDF split into ${splitFiles.length} file${splitFiles.length > 1 ? "s" : ""}`);
            } catch (splitErr) {
              console.error("PDF split failed:", splitErr);
              toast.dismiss("split");
              toast.error("PDF split failed. Sending original file instead.");
              finalFiles.push(f.file);
            }
          } else {
            finalFiles.push(f.file);
          }
        }
      } else {
        finalFiles = files.map((f) => f.file);
      }

      if (isEncrypted) {
        const encryptedFiles = await Promise.all(
          finalFiles.map(async (file) => {
            const key = crypto.getRandomValues(new Uint8Array(32));
            const keyBase64 = btoa(String.fromCharCode(...key));
            encryptionKeys.push(keyBase64);

            const iv = crypto.getRandomValues(new Uint8Array(12));
            const cryptoKey = await crypto.subtle.importKey(
              "raw",
              key,
              { name: "AES-GCM" },
              false,
              ["encrypt"]
            );

            const fileBuffer = await file.arrayBuffer();
            const encrypted = await crypto.subtle.encrypt(
              { name: "AES-GCM", iv },
              cryptoKey,
              fileBuffer
            );

            const combined = new Uint8Array(iv.length + encrypted.byteLength);
            combined.set(iv);
            combined.set(new Uint8Array(encrypted), iv.length);

            fileInfos.push({
              originalName: file.name,
              originalType: file.type,
              size: combined.length,
            });

            return new File([combined], `${file.name}.enc`, {
              type: "application/octet-stream",
            });
          })
        );

        encryptedFiles.forEach((f) => formData.append("files", f));
        updatedSettings.encryptionKeys = encryptionKeys.join(":");
        updatedSettings.fileInfos = fileInfos;
      } else {
        finalFiles.forEach((f) => formData.append("files", f));
        // Forward already-uploaded Drive ids so /api/jobs/create reuses
        // them instead of double-uploading. Indices align with `finalFiles`.
        finalFiles.forEach((f, i) => {
          const preview = getDocxPreview(f);
          if (preview?.status === "ready" && preview.fileId && preview.previewUrl) {
            formData.append(`existingDriveFileId_${i}`, preview.fileId);
            formData.append(`existingDriveViewUrl_${i}`, preview.previewUrl);
          }
        });
      }

      formData.append("shopToken", shopToken);
      formData.append("isEncrypted", String(isEncrypted));
      formData.append("settings", JSON.stringify(updatedSettings));

      const res = await fetch("/api/jobs/create", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        let errorMessage = "Upload failed";
        try {
          const text = await res.text();
          try {
            const errorData = JSON.parse(text);
            errorMessage = errorData.error || errorMessage;
          } catch {
            if (res.status === 413) {
              errorMessage = "File too large. Please reduce file size and try again.";
            } else if (res.status === 504) {
              errorMessage = "Server timeout. Please try again with a smaller file.";
            } else {
              errorMessage = `Server error (${res.status}). Please try again.`;
            }
          }
        } catch {
          errorMessage = `Server error (${res.status}). Please try again.`;
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      setJobResult(data);
      // Drive previews have now been transferred to the job (via
      // existingDriveFileId_*) — clear our ref so the unmount cleanup
      // doesn't DELETE files that the job now owns.
      docxPreviewsRef.current.clear();
      setStep(3);
      toast.success("Files sent successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to send files. Please try again.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ────────────────────────────────────────────────────────────
     Render
     ──────────────────────────────────────────────────────────── */
  const isConnected = !!(shopToken && shopName && shopOnline);

  return (
    <div className="user-portal min-h-screen flex flex-col">
      {/* ── Topbar ─────────────────────────────────────────── */}
      <header className="up-topbar">
        <div
          className="mx-auto h-full flex items-center justify-between px-4 sm:px-6"
          style={{ maxWidth: 1280 }}
        >
          {/* Logo */}
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2"
            style={{ fontWeight: 600 }}
          >
            <div
              className="w-7 h-7 rounded-[8px] flex items-center justify-center"
              style={{ background: "var(--up-text)", color: "var(--up-bg)" }}
            >
              <Printer size={14} strokeWidth={2} />
            </div>
            <span style={{ fontSize: "1.17em" }}>SmartPrint</span>
          </button>

          {/* Right cluster: theme toggle + connection status */}
          <div className="flex items-center gap-3">
            <ThemeToggle size="sm" />
            <button
              onClick={() => setShowConnectPanel((v) => !v)}
              className={`up-chip ${
                isConnected ? "up-chip-success" : ""
              }`}
              style={{
                background: isConnected ? "rgba(52,199,89,0.10)" : "rgba(0,0,0,0.04)",
                color: isConnected ? "#1A8038" : "var(--up-text-2)",
                fontSize: "1em",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {isVerifying ? (
                <>
                  <Loader2 size={10} className="animate-spin" />
                  <span>Verifying…</span>
                </>
              ) : isConnected ? (
                <>
                  <span className="up-dot up-dot-online" />
                  <span style={{ maxWidth: 140 }} className="truncate">
                    {shopName}
                  </span>
                  <ChevronRight
                    size={12}
                    strokeWidth={1.8}
                    style={{ opacity: 0.6 }}
                  />
                </>
              ) : (
                <>
                  <span className="up-dot up-dot-offline" />
                  <span>Not Connected</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── Page body ──────────────────────────────────────── */}
      <div
        className="flex-1 mx-auto w-full px-4 sm:px-6"
        style={{
          maxWidth: step === 2 ? 1280 : 680,
          paddingTop: 24,
          paddingBottom: 96,
        }}
      >
        {/* ── Connection panel ────────────────────────────── */}
        <AnimatePresence initial={false}>
          {(!isConnected || showConnectPanel) && step !== 3 && (
            <motion.div
              key="connect"
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
              style={{ marginBottom: 24 }}
            >
              <div className="up-card" style={{ padding: 20 }}>
                <div
                  className="flex items-center justify-between"
                  style={{ marginBottom: 16 }}
                >
                  <div className="up-section-label">Connect to a shop</div>
                  {isConnected && (
                    <button
                      onClick={() => setShowConnectPanel(false)}
                      className="up-btn-text"
                      style={{ fontSize: "0.95em" }}
                    >
                      Done
                    </button>
                  )}
                </div>

                {/* Segmented tabs */}
                <div className="up-segmented" style={{ width: "100%" }}>
                  <button
                    data-active={connectTab === "scan"}
                    onClick={() => setConnectTab("scan")}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <ScanLine size={12} strokeWidth={1.8} /> QR Scan
                    </span>
                  </button>
                  <button
                    data-active={connectTab === "id"}
                    onClick={() => setConnectTab("id")}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Hash size={12} strokeWidth={1.8} /> Enter ID
                    </span>
                  </button>
                  <button
                    data-active={connectTab === "recent"}
                    onClick={() => setConnectTab("recent")}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={12} strokeWidth={1.8} /> Recent
                    </span>
                  </button>
                </div>

                <div style={{ marginTop: 20 }}>
                  {connectTab === "scan" && (
                    <div className="text-center" style={{ paddingBlock: 8 }}>
                      <p
                        style={{
                          fontSize: "1.08em",
                          color: "var(--up-text-2)",
                          marginBottom: 16,
                        }}
                      >
                        Scan the QR code displayed at the shop counter.
                      </p>
                      <button
                        onClick={() => setShowQRModal(true)}
                        className="up-btn-primary"
                        style={{ minHeight: 44 }}
                      >
                        <QrCode size={14} strokeWidth={1.8} />
                        Open camera
                      </button>
                    </div>
                  )}

                  {connectTab === "id" && (
                    <div>
                      <label
                        className="up-section-label"
                        style={{ marginBottom: 8, display: "block" }}
                      >
                        Shop ID
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={shopIdInput}
                            onChange={handleShopIdChange}
                            placeholder="e.g. k7m2x9"
                            className="up-input"
                            style={{
                              fontFamily:
                                "'SF Mono', ui-monospace, 'Courier New', monospace",
                              letterSpacing: "0.06em",
                              textTransform: "uppercase",
                            }}
                            maxLength={6}
                          />
                          <span
                            style={{
                              position: "absolute",
                              right: 12,
                              top: "50%",
                              transform: "translateY(-50%)",
                              fontSize: "0.92em",
                              color: "var(--up-text-3)",
                            }}
                          >
                            {shopIdInput.length}/6
                          </span>
                        </div>
                        <button
                          onClick={connectByShopId}
                          disabled={shopIdInput.length !== 6}
                          className="up-btn-primary"
                          style={{ minHeight: 44 }}
                        >
                          Connect
                        </button>
                      </div>
                      {shopIdError && (
                        <p
                          style={{
                            color: "var(--up-danger)",
                            fontSize: "0.95em",
                            marginTop: 8,
                          }}
                        >
                          {shopIdError}
                        </p>
                      )}
                    </div>
                  )}

                  {connectTab === "recent" && (
                    <div>
                      {recentShops.length === 0 ? (
                        <div
                          className="text-center"
                          style={{
                            paddingBlock: 24,
                            color: "var(--up-text-2)",
                            fontSize: "1em",
                          }}
                        >
                          <Clock
                            size={20}
                            strokeWidth={1.5}
                            style={{ margin: "0 auto 8px", opacity: 0.5 }}
                          />
                          No recent shops yet.
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {recentShops.slice(0, 3).map((s: any, i: number) => (
                            <button
                              key={i}
                              onClick={() =>
                                router.push(`/user?shop=${s.qrToken}`)
                              }
                              className="flex items-center justify-between"
                              style={{
                                padding: "12px 4px",
                                borderBottom:
                                  i < Math.min(2, recentShops.length - 1)
                                    ? "0.5px solid var(--up-divider)"
                                    : "none",
                                textAlign: "left",
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                              }}
                            >
                              <div className="min-w-0">
                                <div
                                  style={{
                                    fontSize: "1.08em",
                                    fontWeight: 500,
                                    marginBottom: 2,
                                  }}
                                  className="truncate"
                                >
                                  {s.shopName}
                                </div>
                                <div
                                  style={{
                                    fontSize: "0.95em",
                                    color: "var(--up-text-2)",
                                  }}
                                >
                                  {timeAgo(s.lastVisited)}
                                </div>
                              </div>
                              <ChevronRight
                                size={14}
                                strokeWidth={1.8}
                                style={{ color: "var(--up-text-3)" }}
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Stepper indicator (subtle) ───────────────────── */}
        {step !== 3 && (
          <div
            className="flex items-center gap-3"
            style={{ marginBottom: 20 }}
          >
            {[
              { n: 1, label: "Files" },
              { n: 2, label: "Settings" },
              { n: 3, label: "Send" },
            ].map((s, i, arr) => {
              const active = step === s.n;
              const past = step > s.n;
              return (
                <div key={s.n} className="flex items-center gap-3 flex-1">
                  <div className="flex items-center gap-2">
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 999,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: active
                          ? "var(--up-accent)"
                          : past
                          ? "rgba(0,113,227,0.12)"
                          : "rgba(0,0,0,0.06)",
                        color: active ? "#fff" : past ? "var(--up-accent)" : "var(--up-text-2)",
                        fontSize: "0.92em",
                        fontWeight: 600,
                        transition: "all 0.25s var(--up-ease)",
                      }}
                    >
                      {s.n}
                    </div>
                    <span
                      style={{
                        fontSize: "1em",
                        color: active ? "var(--up-text)" : "var(--up-text-2)",
                        fontWeight: active ? 500 : 400,
                      }}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < arr.length - 1 && (
                    <div
                      style={{
                        flex: 1,
                        height: 0.5,
                        background: "var(--up-divider)",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Steps ───────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              className="space-y-6"
            >
              <FileUpload
                files={files}
                onFilesAdded={(newFiles) =>
                  setFiles((prev) => [
                    ...prev,
                    ...newFiles.map((f) => ({
                      file: f,
                      id: Math.random().toString(),
                      progress: 100,
                      preview:
                        f.type.startsWith("image/") ||
                        f.type === "application/pdf" ||
                        f.name.toLowerCase().endsWith(".pdf") ||
                        f.name.toLowerCase().endsWith(".jpg") ||
                        f.name.toLowerCase().endsWith(".jpeg") ||
                        f.name.toLowerCase().endsWith(".png") ||
                        f.name.toLowerCase().endsWith(".docx") ||
                        f.name.toLowerCase().endsWith(".pptx")
                          ? URL.createObjectURL(f)
                          : "preview-active",
                      adjustments: { ...DEFAULT_PRINT_SETTINGS },
                    })),
                  ])
                }
                onRemoveFile={(id) =>
                  setFiles((prev) => {
                    const filtered = prev.filter((f) => f.id !== id);
                    const removed = prev.find((f) => f.id === id);
                    if (removed?.preview) URL.revokeObjectURL(removed.preview);
                    return filtered;
                  })
                }
              />

              {files.length > 0 && (
                <button
                  onClick={() => setStep(2)}
                  className="up-btn-primary w-full"
                  style={{ height: 52, fontSize: "1.16em", fontWeight: 600 }}
                >
                  Continue
                  <ChevronRight size={16} strokeWidth={1.8} />
                </button>
              )}
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="up-btn-text"
                  style={{ fontSize: "1em" }}
                >
                  <ChevronLeft size={14} strokeWidth={1.8} /> Files
                </button>
                <div className="up-section-label">Print Settings</div>
                <div style={{ width: 60 }} />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
                {/* ── Right: settings sidebar (sticky on xl) ─ */}
                <div className="space-y-6 order-2 xl:order-2 xl:sticky xl:top-[68px]">
                  {/* File selector for editing */}
                  {files.length > 1 && (
                    <div className="up-card" style={{ padding: 16 }}>
                      <div
                        className="up-section-label"
                        style={{ marginBottom: 12 }}
                      >
                        Select file to edit
                      </div>
                      <div
                        className="flex gap-2 overflow-x-auto up-no-scrollbar"
                        style={{ paddingBottom: 4 }}
                      >
                        {files.map((f, i) => (
                          <button
                            key={f.id}
                            onClick={() => {
                              setSelectedFileIndex(i);
                              setSettings(f.adjustments || DEFAULT_PRINT_SETTINGS);
                            }}
                            className="relative shrink-0"
                            style={{
                              width: 56,
                              height: 56,
                              borderRadius: 10,
                              overflow: "hidden",
                              border:
                                selectedFileIndex === i
                                  ? "2px solid var(--up-accent)"
                                  : "0.5px solid var(--up-border)",
                              opacity: selectedFileIndex === i ? 1 : 0.7,
                              transition: "all 0.2s var(--up-ease)",
                            }}
                          >
                            {f.preview && f.preview !== "preview-active" ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={f.preview}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div
                                className="w-full h-full flex items-center justify-center"
                                style={{
                                  background: "rgba(0,0,0,0.04)",
                                  color: "var(--up-text-2)",
                                  fontSize: "0.92em",
                                  fontWeight: 600,
                                }}
                              >
                                DOC
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <PrintSettings
                    settings={settings}
                    onSettingsChange={handleSettingsChange}
                    isEncrypted={isEncrypted}
                    onEncryptedChange={setIsEncrypted}
                    hasImageFiles={files.some((f) => f.file.type.startsWith("image/"))}
                    hasDocxFiles={files.some(
                      (f) =>
                        f.file.name.toLowerCase().endsWith(".docx") ||
                        f.file.type ===
                          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    )}
                  />

                  <button
                    disabled={isSubmitting}
                    onClick={handleSubmit}
                    className="up-btn-primary w-full"
                    style={{ height: 52, fontSize: "1.16em", fontWeight: 600 }}
                  >
                    {isSubmitting ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : shopToken ? (
                      "Send to print shop"
                    ) : (
                      "Connect a shop to send"
                    )}
                  </button>
                </div>

                {/* ── Left: preview (big, scroll-natural) ── */}
                <div className="order-1 xl:order-1 space-y-3">
                  <div className="up-card" style={{ padding: 16 }}>
                    <div
                      className="flex items-center justify-between"
                      style={{ marginBottom: 12 }}
                    >
                      <div className="up-section-label">Preview</div>
                      {settings.enableCrop &&
                        files[selectedFileIndex]?.file.type.startsWith("image/") && (
                          <button
                            onClick={() => setShowEditor(true)}
                            className="up-btn-ghost"
                            style={{
                              padding: "4px 10px",
                              fontSize: "0.95em",
                              minHeight: 28,
                            }}
                          >
                            <Pencil size={12} strokeWidth={1.8} /> Edit
                          </button>
                        )}
                    </div>

                    <motion.div
                      layout
                      className="relative flex items-center justify-center"
                      style={{
                        background: "rgba(0,0,0,0.04)",
                        borderRadius: 12,
                        minHeight: "clamp(380px, 70vh, 760px)",
                        overflow: "hidden",
                      }}
                      transition={{
                        duration: 0.3,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      {files[selectedFileIndex]?.preview
                        ? (() => {
                            const currentFile = files[selectedFileIndex];
                            const isImage = currentFile.file.type.startsWith("image/");
                            const isPDF =
                              currentFile.file.type === "application/pdf" ||
                              currentFile.file.name.toLowerCase().endsWith(".pdf");
                            const isDocx =
                              currentFile.file.name.toLowerCase().endsWith(".docx") ||
                              currentFile.file.type ===
                                "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                            const isPptx =
                              currentFile.file.name.toLowerCase().endsWith(".pptx") ||
                              currentFile.file.name.toLowerCase().endsWith(".ppt") ||
                              currentFile.file.type ===
                                "application/vnd.openxmlformats-officedocument.presentationml.presentation";

                            if (isPDF) {
                              return (
                                <PDFPreview
                                  fileUrl={currentFile.preview!}
                                  colorPagesRange={settings.colorPagesRange || ""}
                                  bwPagesRange={settings.bwPagesRange || ""}
                                  enableColorRange={settings.enableColorRange}
                                  enableBWRange={settings.enableBWRange}
                                  enableAdvancedColor={settings.enableAdvancedColor}
                                  baseColorMode={settings.colorMode}
                                  onPageChange={setCurrentPreviewPage}
                                  currentPage={currentPreviewPage}
                                  paperSize={settings.paperSize}
                                  margins={settings.margins}
                                  customMarginTopBottom={settings.customMarginTopBottom}
                                  customMarginLeftRight={settings.customMarginLeftRight}
                                  orientation={settings.orientation}
                                  pagesPerSheet={settings.pagesPerSheet}
                                  pagesPerSheetFill={settings.pagesPerSheetFill}
                                  pageSelection={settings.pageSelection}
                                  customPageRange={settings.customPageRange || ""}
                                />
                              );
                            }

                            if (isDocx) {
                              const docxFile: File = currentFile.file;
                              const preview = getDocxPreview(docxFile);
                              const status = preview?.status ?? "idle";

                              if (status === "ready" && preview?.previewUrl) {
                                return (
                                  <div
                                    className="w-full h-full flex flex-col"
                                    style={{ background: "#525659", minHeight: 600 }}
                                  >
                                    <iframe
                                      src={preview.previewUrl}
                                      title="Document Preview"
                                      style={{
                                        width: "100%",
                                        flex: 1,
                                        minHeight: 600,
                                        border: "none",
                                        display: "block",
                                      }}
                                    />
                                  </div>
                                );
                              }

                              if (status === "error") {
                                return (
                                  <div className="flex flex-col items-center justify-center p-20 gap-3 text-center">
                                    <p className="up-section-label" style={{ fontSize: "0.92em" }}>
                                      Preview unavailable
                                    </p>
                                    <p className="text-xs text-gray-500 max-w-xs leading-relaxed break-words">
                                      {preview?.error || "Failed to upload preview"}
                                    </p>
                                    <p className="text-[10px] text-gray-500/70 max-w-xs leading-relaxed">
                                      Your file will still be sent to the shop.
                                    </p>
                                  </div>
                                );
                              }

                              return (
                                <div className="flex flex-col items-center justify-center p-20 gap-3 text-center">
                                  <Loader2
                                    className="w-6 h-6 animate-spin"
                                    style={{ color: "var(--up-accent)" }}
                                  />
                                  <p className="up-section-label" style={{ fontSize: "0.92em" }}>
                                    {isEncrypted ? "Encrypted — preview disabled" : "Preparing preview…"}
                                  </p>
                                  <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
                                    {isEncrypted
                                      ? "Encrypted files are sent directly without preview."
                                      : "Uploading your document for preview via Google Drive."}
                                  </p>
                                </div>
                              );
                            }

                            if (isPptx) {
                              const pptAspect = getPaperAspectForOrientation(
                                settings.paperSize,
                                settings.orientation
                              );
                              const pptCols =
                                settings.pagesPerSheet >= 16
                                  ? 4
                                  : settings.pagesPerSheet >= 9
                                  ? 3
                                  : settings.pagesPerSheet >= 4
                                  ? 2
                                  : settings.pagesPerSheet >= 2
                                  ? 2
                                  : 1;
                              return (
                                <div className="w-full h-full flex items-center justify-center p-4">
                                  <div
                                    className="w-full"
                                    style={{
                                      maxWidth: 520,
                                      background: "#fff",
                                      borderRadius: 8,
                                      boxShadow:
                                        "0 10px 40px rgba(0,0,0,0.10), 0 0 0 0.5px rgba(0,0,0,0.06)",
                                      padding: 12,
                                      aspectRatio: `${pptAspect.w} / ${pptAspect.h}`,
                                    }}
                                  >
                                    <div
                                      className="w-full h-full grid gap-1.5"
                                      style={{
                                        gridTemplateColumns: `repeat(${pptCols}, minmax(0, 1fr))`,
                                      }}
                                    >
                                      {Array.from({
                                        length: Math.max(1, settings.pagesPerSheet),
                                      }).map((_, idx) => {
                                        const showSlide =
                                          settings.pagesPerSheetFill === "repeat" || idx === 0;
                                        return (
                                          <div
                                            key={idx}
                                            className="rounded flex items-center justify-center"
                                            style={{
                                              border: "0.5px solid rgba(0,0,0,0.06)",
                                              background: "rgba(0,0,0,0.02)",
                                              minHeight: 0,
                                            }}
                                          >
                                            {showSlide ? (
                                              <FileText
                                                size={14}
                                                strokeWidth={1.5}
                                                style={{ color: "#FF9F0A" }}
                                              />
                                            ) : (
                                              <div
                                                style={{
                                                  width: "70%",
                                                  height: "70%",
                                                  border: "0.5px dashed rgba(0,0,0,0.10)",
                                                  borderRadius: 2,
                                                }}
                                              />
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            if (!isImage) {
                              return (
                                <div
                                  className="text-center"
                                  style={{
                                    padding: 32,
                                    color: "var(--up-text-2)",
                                  }}
                                >
                                  <div
                                    className="mx-auto flex items-center justify-center"
                                    style={{
                                      width: 56,
                                      height: 56,
                                      borderRadius: 14,
                                      background: "var(--up-surface)",
                                      boxShadow: "var(--up-shadow-rest)",
                                      marginBottom: 16,
                                    }}
                                  >
                                    <FileText size={20} strokeWidth={1.5} />
                                  </div>
                                  <p
                                    style={{
                                      fontSize: "1.08em",
                                      color: "var(--up-text)",
                                      fontWeight: 500,
                                      marginBottom: 4,
                                    }}
                                  >
                                    {currentFile.file.name}
                                  </p>
                                  <p style={{ fontSize: "0.95em" }}>
                                    {(currentFile.file.size / 1024).toFixed(1)} KB —
                                    Preview unavailable
                                  </p>
                                </div>
                              );
                            }

                            // Image preview with all the layout / margins / aspect-ratio logic
                            const parseAspectRatioValue = (ratio: string): number | null => {
                              if (!ratio || ratio === "Original") return null;
                              if (ratio === "1:1 Square") return 1;
                              if (ratio === "Full Page") {
                                return settings.orientation === "Portrait"
                                  ? 210 / 297
                                  : 297 / 210;
                              }
                              if (ratio === "Custom") {
                                const w = settings.customWidthDimensions || 0;
                                const h = settings.customHeightDimensions || 0;
                                return w > 0 && h > 0 ? w / h : null;
                              }
                              const [w, h] = ratio.split(":").map(Number);
                              if (!w || !h) return null;
                              return w / h;
                            };

                            const ratioValue = parseAspectRatioValue(settings.aspectRatio);
                            const marginY =
                              settings.margins === "None"
                                ? 0
                                : settings.margins === "Narrow"
                                ? 8
                                : settings.margins === "Normal"
                                ? 16
                                : settings.margins === "Wide"
                                ? 32
                                : settings.margins === "Custom"
                                ? Math.max(0, (settings.customMarginTopBottom ?? 1) * 18)
                                : 16;
                            const marginX =
                              settings.margins === "None"
                                ? 0
                                : settings.margins === "Narrow"
                                ? 8
                                : settings.margins === "Normal"
                                ? 16
                                : settings.margins === "Wide"
                                ? 32
                                : settings.margins === "Custom"
                                ? Math.max(0, (settings.customMarginLeftRight ?? 1) * 18)
                                : 16;

                            const cols =
                              settings.photosPerPage >= 35
                                ? 7
                                : settings.photosPerPage >= 16
                                ? 4
                                : settings.photosPerPage >= 9
                                ? 3
                                : settings.photosPerPage >= 4
                                ? 2
                                : settings.photosPerPage >= 2
                                ? 2
                                : 1;

                            const rows = Math.ceil((settings.photosPerPage || 1) / cols);

                            const imgFilter = `
                              brightness(${100 + (settings.brightness || 0)}%)
                              contrast(${100 + (settings.contrast || 0)}%)
                              saturate(${100 + (settings.saturation || 0)}%)
                              grayscale(${
                                settings.colorMode === "Black & White" ? "100%" : "0%"
                              })
                            `;

                            const getFrameDimensions = (
                              cellWidth: number,
                              cellHeight: number
                            ) => {
                              if (!ratioValue) return { width: cellWidth, height: cellHeight };
                              const byWidthHeight = cellWidth / ratioValue;
                              if (byWidthHeight <= cellHeight) {
                                return { width: cellWidth, height: byWidthHeight };
                              }
                              return {
                                width: cellHeight * ratioValue,
                                height: cellHeight,
                              };
                            };

                            const paper = getPaperAspectForOrientation(
                              settings.paperSize,
                              settings.orientation
                            );
                            const paperMm = getPaperPortraitMm(settings.paperSize);
                            const areaScale = Math.max(
                              0.55,
                              Math.min(1.45, Math.sqrt((paperMm.w * paperMm.h) / (210 * 297)))
                            );

                            return (
                              <div
                                style={{
                                  width: `${Math.round(
                                    (settings.orientation === "Landscape" ? 620 : 440) *
                                      areaScale
                                  )}px`,
                                  maxWidth: "100%",
                                  aspectRatio: `${paper.w} / ${paper.h}`,
                                  background: "#fff",
                                  boxShadow:
                                    "0 10px 30px rgba(0,0,0,0.08), 0 0 0 0.5px rgba(0,0,0,0.06)",
                                  padding: `${marginY}px ${marginX}px`,
                                  display: "flex",
                                  flexDirection: "column",
                                  transition: "all 0.3s var(--up-ease)",
                                }}
                              >
                                <div
                                  style={{
                                    flex: 1,
                                    display: "grid",
                                    gridTemplateColumns: `repeat(${cols}, 1fr)`,
                                    gridTemplateRows: `repeat(${rows}, 1fr)`,
                                    gap: settings.photosPerPage > 1 ? 4 : 0,
                                    overflow: "hidden",
                                    placeContent: "center",
                                    outline: "1px dashed rgba(0,113,227,0.20)",
                                    outlineOffset: "-1px",
                                  }}
                                >
                                  {Array.from({ length: settings.photosPerPage || 1 }).map(
                                    (_, idx) =>
                                      (() => {
                                        const pageWidth =
                                          settings.orientation === "Landscape" ? 440 : 320;
                                        const pageHeight =
                                          settings.orientation === "Landscape" ? 320 : 440;
                                        const contentWidth = Math.max(
                                          40,
                                          pageWidth - marginX * 2
                                        );
                                        const contentHeight = Math.max(
                                          40,
                                          pageHeight -
                                            marginY * 2 -
                                            (settings.photosPerPage > 1 ? 20 : 0)
                                        );
                                        const cellWidth = contentWidth / cols;
                                        const cellHeight = contentHeight / rows;
                                        const frame = getFrameDimensions(cellWidth, cellHeight);
                                        const showImage =
                                          settings.pagesPerSheetFill === "repeat" || idx === 0;

                                        return (
                                          <div
                                            key={idx}
                                            className="flex items-center justify-center overflow-hidden"
                                            style={{
                                              width: "100%",
                                              height: "100%",
                                              minHeight: 0,
                                              minWidth: 0,
                                            }}
                                          >
                                            <div
                                              style={{
                                                position: "relative",
                                                overflow: "hidden",
                                                width: ratioValue
                                                  ? `${Math.round(frame.width)}px`
                                                  : "100%",
                                                height: ratioValue
                                                  ? `${Math.round(frame.height)}px`
                                                  : "100%",
                                                backgroundColor: "rgba(0,0,0,0.03)",
                                                border: ratioValue
                                                  ? "0.5px solid rgba(0,113,227,0.30)"
                                                  : "none",
                                                cursor:
                                                  showImage && canRepositionImage
                                                    ? isDraggingImage
                                                      ? "grabbing"
                                                      : "grab"
                                                    : "default",
                                              }}
                                              onMouseDown={(e) =>
                                                showImage && beginImageDrag(e.clientX, e.clientY)
                                              }
                                              onTouchStart={(e) => {
                                                const touch = e.touches[0];
                                                if (showImage && touch)
                                                  beginImageDrag(touch.clientX, touch.clientY);
                                              }}
                                            >
                                              {showImage ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                  src={currentFile.preview}
                                                  alt="Preview"
                                                  style={{
                                                    width: "100%",
                                                    height: "100%",
                                                    objectFit:
                                                      ratioValue || settings.photosPerPage > 1
                                                        ? "cover"
                                                        : "contain",
                                                    objectPosition: `${imagePosition.x}% ${imagePosition.y}%`,
                                                    filter: imgFilter,
                                                    transition: "filter 0.25s var(--up-ease)",
                                                  }}
                                                />
                                              ) : (
                                                <div
                                                  style={{
                                                    width: "100%",
                                                    height: "100%",
                                                    background: "rgba(0,0,0,0.02)",
                                                    border: "0.5px dashed rgba(0,0,0,0.08)",
                                                    borderRadius: 4,
                                                  }}
                                                />
                                              )}
                                              {showImage && settings.enableCrop && (
                                                <div
                                                  className="absolute inset-0 pointer-events-none"
                                                  style={{
                                                    border: "1.5px dashed rgba(0,113,227,0.55)",
                                                  }}
                                                />
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })()
                                  )}
                                </div>
                              </div>
                            );
                          })()
                        : (
                          <div
                            className="text-center"
                            style={{
                              padding: 32,
                              color: "var(--up-text-2)",
                            }}
                          >
                            <div
                              className="mx-auto flex items-center justify-center"
                              style={{
                                width: 56,
                                height: 56,
                                borderRadius: 14,
                                background: "var(--up-surface)",
                                boxShadow: "var(--up-shadow-rest)",
                                marginBottom: 16,
                              }}
                            >
                              <FileText size={20} strokeWidth={1.5} />
                            </div>
                            <p
                              style={{
                                fontSize: "1.08em",
                                color: "var(--up-text)",
                                fontWeight: 500,
                              }}
                            >
                              No file selected
                            </p>
                          </div>
                        )}
                    </motion.div>

                    <div
                      className="flex items-center justify-between"
                      style={{
                        marginTop: 12,
                        fontSize: "0.95em",
                        color: "var(--up-text-2)",
                      }}
                    >
                      <span>Margins · {settings.margins}</span>
                      <span>
                        {settings.aspectRatio !== "Original"
                          ? `Ratio · ${settings.aspectRatio}`
                          : "Original"}
                        {settings.aspectRatio === "Custom"
                          ? ` (${settings.customWidthDimensions}×${settings.customHeightDimensions})`
                          : ""}
                      </span>
                    </div>

                    {canRepositionImage && (
                      <p
                        style={{
                          fontSize: "0.92em",
                          color: "var(--up-accent)",
                          marginTop: 6,
                        }}
                      >
                        Drag the photo to reposition.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && jobResult && (
            <SuccessScreen
              userId={jobResult.userId}
              jobId={jobResult.jobId}
              userToken={jobResult.userToken}
              isEncrypted={isEncrypted}
            />
          )}
        </AnimatePresence>
      </div>

      {/* QR Scanner */}
      {showQRModal && (
        <QRScanner onScan={handleScan} onClose={() => setShowQRModal(false)} />
      )}

      {/* Image Editor */}
      <AnimatePresence>
        {showEditor && files[selectedFileIndex] && (
          <motion.div
            key="image-editor"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ImageEditor
              file={files[selectedFileIndex].file}
              onSave={handleEditorSave}
              onCancel={() => setShowEditor(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function UserPage() {
  return (
    <Suspense
      fallback={
        <div
          className="user-portal min-h-screen flex items-center justify-center"
          style={{ background: "var(--up-bg)" }}
        >
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--up-accent)" }} />
        </div>
      }
    >
      <UserPageContent />
    </Suspense>
  );
}
