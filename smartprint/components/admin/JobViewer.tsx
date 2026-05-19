"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import CountdownTimer from "./CountdownTimer";
import type { JobResponse, PrintSettings } from "@/lib/types";
import toast from "react-hot-toast";
import { getMarginMm } from "@/lib/printLayout";

const PDFPreview = dynamic(() => import("@/components/user/PDFPreview"), { ssr: false });
const FilePreview = dynamic(() => import("@/components/user/FilePreview"), { ssr: false });

interface JobViewerProps {
  job: JobResponse;
  adminSecret: string;
  onClose: () => void;
  onJobUpdate: () => void;
}

export default function JobViewer({
  job,
  adminSecret,
  onClose,
  onJobUpdate,
}: JobViewerProps) {
  const [jobData, setJobData] = useState<JobResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printingIndex, setPrintingIndex] = useState<number | null>(null);
  const [printProgress, setPrintProgress] = useState("");
  const [hasPrinted, setHasPrinted] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  const fetchJobDetails = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${job.id}`, { credentials: "include" });
      if (res.status === 410) {
        setIsExpired(true);
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch job");
      const data: JobResponse = await res.json();
      setJobData(data);
      const urls = data.fileUrls || [];
      setPreviewUrls(urls);
      if (data.status === "printed") setHasPrinted(true);
    } catch (error) {
      console.error("Failed to fetch job details:", error);
    } finally {
      setIsLoading(false);
    }
  }, [job.id]);

  useEffect(() => {
    fetchJobDetails();
  }, [fetchJobDetails]);

  const handleMarkPrinted = useCallback(async () => {
    try {
      await fetch(`/api/jobs/${job.id}/print`, { method: "POST", credentials: "include" });
      setHasPrinted(true);
      onJobUpdate();
    } catch (error) {
      console.error("Failed to mark as printed:", error);
    }
  }, [job.id, onJobUpdate]);

  const getFileType = (name: string): string => {
    const ext = name.split(".").pop()?.toLowerCase();
    if (ext === "enc") {
      const parts = name.split(".");
      if (parts.length > 2) return parts[parts.length - 2].toLowerCase();
    }
    return ext || "";
  };

  const isImageFile = (name: string) => ["jpg", "jpeg", "png", "gif", "webp"].includes(getFileType(name));
  const isPdfFile = (name: string) => getFileType(name) === "pdf";
  const isDocxFile = (name: string) => getFileType(name) === "docx";

  const getFileIcon = (name: string) => {
    if (isImageFile(name)) return "🖼️";
    if (isPdfFile(name)) return "📕";
    if (isDocxFile(name)) return "📘";
    return "📄";
  };

  // Check if running in Electron
  const isElectron = typeof window !== 'undefined' && 
    window.navigator.userAgent.toLowerCase().includes('electron');

  // ELECTRON PRINT — no preview, direct to printer
  const printViaElectron = async (fileBlob: Blob, settings: any) => {
    if (!isElectron) {
      return;
    }
    
    const electron = (window as any).electron;
    if (!electron) {
      toast.error('Electron bridge not found. Please restart the app.');
      return;
    }
    
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        
        electron.send('smartprint-print', {
          data: dataUrl,
          color: settings.colorMode !== 'Black & White',
          landscape: settings.orientation === 'Landscape',
          pageSize: settings.paperSize || 'A4',
          scale: settings.scale || 100,
          copies: settings.copies || 1,
          printerName: selectedPrinterName,
        });
        
        electron.once('print-result', (result: any) => {
          if (result.success) {
            toast.success('Printing complete');
            handleMarkPrinted();
            resolve();
          } else {
            toast.error('Printing failed: ' + result.reason);
            reject(new Error(result.reason));
          }
        });
      };
      
      reader.onerror = () => {
        toast.error('Failed to read file for printing');
        reject(new Error('File read failed'));
      };
      
      reader.readAsDataURL(fileBlob);
    });
  };

  // BROWSER PRINT — standard approach for non-secure files
  const printViaBrowser = (fileBlob: Blob, settings: any, fileType: string) => {
    const blobUrl = URL.createObjectURL(fileBlob);
    
    const printWindow = window.open('', '_blank', 'width=1,height=1');
    if (!printWindow) {
      toast.error('Popup blocked. Please allow popups for printing.');
      return;
    }
    
    // Build CSS based on settings
    const orientation = settings.orientation === 'Landscape' ? 'landscape' : 'portrait';
    const paperSizeMap: Record<string, string> = {
      'A4': 'A4', 'A3': 'A3', 'A5': 'A5', 'A2': 'A2',
      'A6': 'A6', 'Letter': 'letter', 'Legal': 'legal',
      'Tabloid': 'tabloid', 'B4': 'B4', 'B5': 'B5',
      '4×6 in': '4in 6in',
      '5×7 in': '5in 7in',
      '10×15 cm': '100mm 150mm',
      '13×18 cm': '130mm 180mm',
      '20×25 cm': '200mm 250mm',
    };
    const cssSize = paperSizeMap[settings.paperSize] || 'A4';
    const isGrayscale = settings.colorMode === 'Black & White';
    const marginMm = getMarginMm({
      margins: settings.margins || "Default",
      customMarginTopBottom: settings.customMarginTopBottom,
      customMarginLeftRight: settings.customMarginLeftRight,
    });
    
    const printCSS = `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      @page { 
        size: ${cssSize} ${orientation}; 
        margin: ${marginMm.top}mm ${marginMm.right}mm ${marginMm.bottom}mm ${marginMm.left}mm;
      }
      html { 
        -webkit-print-color-adjust: exact; 
        print-color-adjust: exact; 
      }
      body { 
        margin: 0; 
        padding: 0;
        background: white;
        ${isGrayscale ? 'filter: grayscale(100%);' : ''}
      }
      @media print {
        @page { margin: ${marginMm.top}mm ${marginMm.right}mm ${marginMm.bottom}mm ${marginMm.left}mm; }
        body { margin: 0; }
      }
    `;
    
    if (fileType === 'application/pdf' || fileType?.includes('pdf')) {
      // PDF: load in iframe
      printWindow.document.write(`<!DOCTYPE html>
      <html>
      <head>
        <title></title>
        <style>${printCSS}
          iframe { 
            width: 100vw; 
            height: 100vh; 
            border: none; 
          }
        </style>
      </head>
      <body>
        <iframe src="${blobUrl}" id="pdfFrame"></iframe>
        <script>
          document.getElementById('pdfFrame').onload = function() {
            setTimeout(function() {
              this.contentWindow.print()
            }.bind(document.getElementById('pdfFrame')), 500)
          }
          window.onafterprint = function() {
            window.close()
          }
        </script>
      </body>
      </html>`);
    } else if (fileType?.startsWith('image/')) {
      // Image: display and print
      printWindow.document.write(`<!DOCTYPE html>
      <html>
      <head>
        <title></title>
        <style>${printCSS}
          body { 
            display: flex; 
            align-items: center; 
            justify-content: center;
          }
          img { 
            max-width: 100%; 
            max-height: 100vh;
            width: auto;
            height: auto;
            object-fit: contain;
            display: block;
          }
        </style>
      </head>
      <body>
        <img src="${blobUrl}" 
          onload="setTimeout(function(){window.print()},300)"
          onerror="console.error('Image load failed')" />
        <script>
          window.onafterprint = function() {
            window.close()
          }
        </script>
      </body>
      </html>`);
    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileType?.includes('wordprocessingml') ||
      fileType?.includes('officedocument')
    ) {
      // DOCX: render with docx-preview here in the main window so we
      // have full DOM access (for fonts/styles + post-render pagination
      // split). Then transplant the rendered HTML + extracted styles
      // into the print window. We avoid loading any third-party CDN.

      // Sync: write a loading placeholder so the outer document.close()
      // call below has a valid document to finalise.
      printWindow.document.write(`<!DOCTYPE html>
<html>
<head><title></title><style>
  body { margin:0; font-family: system-ui, sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; color:#666; }
</style></head>
<body><div>Preparing document for printing…</div></body>
</html>`);

      (async () => {
        try {
          // Offscreen render host inside the main page
          const renderHost = document.createElement('div');
          renderHost.style.position = 'fixed';
          renderHost.style.left = '-99999px';
          renderHost.style.top = '0';
          renderHost.style.visibility = 'hidden';
          renderHost.style.pointerEvents = 'none';
          document.body.appendChild(renderHost);

          const styleContainer = document.createElement('div');
          document.head.appendChild(styleContainer);

          const arrayBuffer = await fileBlob.arrayBuffer();
          const { renderAsync } = await import('docx-preview');
          await renderAsync(arrayBuffer, renderHost, styleContainer, {
            className: 'docx-print',
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            ignoreFonts: false,
            breakPages: true,
            // Force pagination on every <w:sectPr> boundary so docs
            // with section breaks but no lastRenderedPageBreak markers
            // print one section per sheet.
            ignoreLastRenderedPageBreak: true,
            experimental: false,
            trimXmlDeclaration: true,
            useBase64URL: true,
            renderHeaders: true,
            renderFooters: true,
            renderFootnotes: true,
            renderEndnotes: true,
          });

          // Raw docx-preview render — no post-process pagination split or
          // page-border detection (lib/docxPaginate was removed when the
          // preview path moved to Google Drive iframe). Print will use
          // whatever page boundaries docx-preview produces natively.
          const hasPageBorders = false;

          const renderedHtml = renderHost.innerHTML;
          const extractedStyles = styleContainer.innerHTML;
          document.body.removeChild(renderHost);
          document.head.removeChild(styleContainer);

          // Replace the loading placeholder with the real document.
          // We let docx-preview control the page geometry; @page uses
          // size:auto so the browser picks the right sheet.
          const printDoc = printWindow.document;

          const printStyle = printDoc.createElement('style');
          printStyle.textContent = `
            * { box-sizing: border-box; }
            @page { size: auto; margin: 0mm; }
            html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body { margin: 0; padding: 0; background: white; ${isGrayscale ? 'filter: grayscale(100%);' : ''} }

            /* Strip the on-screen wrapper chrome — flow real pages into
               the printer, one per sheet. Do NOT touch section width /
               min-height / padding. */
            .docx-print-wrapper {
              background: white !important;
              padding: 0 !important;
              margin: 0 !important;
              display: block !important;
            }
            .docx-print-wrapper > section.docx-print {
              background: white !important;
              box-shadow: none !important;
              margin: 0 !important;
              page-break-after: always !important;
              break-after: page !important;
            }
            .docx-print-wrapper > section.docx-print:last-child {
              page-break-after: avoid !important;
              break-after: auto !important;
            }
            ${hasPageBorders ? `
            /* Source document defines <w:pgBorders>; draw a matching
               inset border on every printed page. */
            .docx-print-wrapper > section.docx-print {
              box-shadow: inset 0 0 0 1.2pt #000 !important;
            }
            ` : ''}
          `;

          const docxStyle = printDoc.createElement('div');
          docxStyle.innerHTML = extractedStyles;

          printDoc.head.innerHTML = '<title></title>';
          printDoc.head.appendChild(printStyle);
          // Move every <style>/<link> emitted by docx-preview into the
          // print window's <head>.
          Array.from(docxStyle.children).forEach((el) => printDoc.head.appendChild(el));

          printDoc.body.innerHTML = renderedHtml;

          // Trigger print after layout settles.
          const trigger = () => {
            try {
              printWindow.focus();
              printWindow.print();
            } catch (e) {
              console.error('Print trigger failed:', e);
            }
          };
          printWindow.onafterprint = () => printWindow.close();
          setTimeout(trigger, 600);
        } catch (err) {
          console.error('DOCX print render failed:', err);
          try {
            printWindow.document.body.innerHTML =
              '<p style="font-family:system-ui;padding:2rem;">Could not render document for printing.</p>';
          } catch {
            /* ignore */
          }
          toast.error('Failed to prepare DOCX for printing.');
        }
      })();
    } else {
      // Unknown type — best-effort iframe fallback
      printWindow.document.write(`<!DOCTYPE html>
      <html>
      <head>
        <title></title>
        <style>${printCSS}
          iframe { width: 100vw; height: 100vh; border: none; }
        </style>
      </head>
      <body>
        <iframe src="${blobUrl}" id="genericFrame"></iframe>
        <script>
          document.getElementById('genericFrame').onload = function() {
            setTimeout(function() {
              this.contentWindow.print();
            }.bind(document.getElementById('genericFrame')), 500);
          };
          window.onafterprint = function() { window.close(); };
        </script>
      </body>
      </html>`);
    }
    
    printWindow.document.close();
    
    // Cleanup blob URL after delay
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  };

  const handlePrintFile = async (currentJob: JobResponse, fileIndex: number = 0) => {
    try {
      setPrintingIndex(fileIndex);
      setIsPrinting(true);
      
      const filename = currentJob.fileNames?.[fileIndex] || currentJob.fileNames?.[0];
      if (!filename) {
        throw new Error('File not found');
      }
      
      const extractToken = previewUrls[fileIndex]?.split('token=')[1]?.split('&')[0];
      const fetchUrl = `/api/jobs/${currentJob.id}/file?name=${encodeURIComponent(filename)}&token=${extractToken || ''}`;
  
      const response = await fetch(
        fetchUrl,
        { credentials: 'include' }
      );
      
      if (!response.ok) {
        if (response.status === 404) throw new Error('File has been deleted or expired');
        throw new Error('Failed to fetch file from server');
      }
      
      const blob = await response.blob();
      const fileType = response.headers.get('Content-Type') || blob.type;
      
      let printBlob = blob;
      let printType = fileType;
      
      if (currentJob.isEncrypted) {
        try {
          const keys = currentJob.settings?.encryptionKeys?.split(':') || [];
          const keyBase64 = keys[fileIndex];
          if (!keyBase64) throw new Error('No encryption key found');
          
          const fileInfos = currentJob.settings?.fileInfos || [];
          const originalType = fileInfos[fileIndex]?.originalType || 'application/pdf';
          
          const encryptedBuffer = await blob.arrayBuffer();
          const iv = encryptedBuffer.slice(0, 12);
          const data = encryptedBuffer.slice(12);
          
          const binaryString = atob(keyBase64);
          const keyBytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            keyBytes[i] = binaryString.charCodeAt(i);
          }

          const cryptoKey = await crypto.subtle.importKey(
            'raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']
          );
          
          const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: new Uint8Array(iv) },
            cryptoKey,
            data
          );
          
          printBlob = new Blob([decrypted], { type: originalType });
          printType = originalType;
        } catch (decryptErr) {
          console.error('Decryption error:', decryptErr);
          throw new Error('Failed to decrypt file. Key might be invalid.');
        }
      }
      
      if (isElectron) {
        await printViaElectron(printBlob, currentJob.settings || {});
      } else {
        printViaBrowser(printBlob, currentJob.settings || {}, printType);
      }
      
      await fetch(`/api/jobs/${currentJob.id}/print`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (currentJob.isEncrypted) {
        setHasPrinted(true);
        onJobUpdate();
      }
      
    } catch (error: any) {
      console.error('Print error:', error);
      toast.error(error.message || 'Printing failed. Please try again.');
      throw error; // Re-throw to stop handlePrintAll
    } finally {
      setIsPrinting(false);
      setPrintingIndex(null);
    }
  };

  const handlePrintAll = async () => {
    if (!jobData || !previewUrls.length) return;
    const fileCount = jobData.fileCount || 1;
    
    try {
      for (let i = 0; i < fileCount; i++) {
        setPrintProgress(`Printing ${i + 1} of ${fileCount}...`);
        await handlePrintFile(jobData, i);
        if (i < fileCount - 1) {
          await new Promise(resolve => setTimeout(resolve, 2500));
        }
      }
      toast.success(`All ${fileCount} files sent to printer`);
      setPrintProgress("");
      handleMarkPrinted();
    } catch (err) {
      // Error already handled in handlePrintFile
      setPrintProgress("");
    }
  };

  const handleExpired = useCallback(async () => {
    setIsExpired(true);
    // Trigger server-side cleanup when timer expires
    if (job?.id) {
      try {
        await fetch(`/api/jobs/${job.id}/print`, { method: "POST", credentials: "include" });
      } catch (e) {
        console.error("Failed to expire job on server:", e);
      }
      onJobUpdate();
    }
  }, [job?.id, onJobUpdate]);

  const [availablePrinters, setAvailablePrinters] = useState<any[]>([]);
  const [selectedPrinterName, setSelectedPrinterName] = useState<string>("");

  useEffect(() => {
    if (isElectron) {
      (window as any).electron.getPrinters().then((printers: any[]) => {
        setAvailablePrinters(printers);
        const saved = localStorage.getItem('sp_selected_printer');
        if (saved) {
           setSelectedPrinterName(saved);
        } else {
           // Proactively avoid virtual printers for the initial selection
           const virtualKeywords = ['pdf', 'xps', 'onenote', 'fax', 'microsoft print', 'send to'];
           const physicalPrinters = printers.filter(p => !virtualKeywords.some(k => p.name.toLowerCase().includes(k)));
           
           if (physicalPrinters.length > 0) {
             setSelectedPrinterName(physicalPrinters[0].name);
           } else {
             const def = printers.find(p => p.isDefault);
             if (def) setSelectedPrinterName(def.name);
           }
        }
      });
    }
  }, [isElectron]);

  const handlePrinterChange = (name: string) => {
    setSelectedPrinterName(name);
    localStorage.setItem('sp_selected_printer', name);
  };

  const isVirtualSelected = useMemo(() => {
    const virtualKeywords = ['pdf', 'xps', 'onenote', 'fax', 'microsoft print', 'send to'];
    return virtualKeywords.some(k => selectedPrinterName.toLowerCase().includes(k));
  }, [selectedPrinterName]);

  const renderSettings = (s: any) => {
    if (!s) return null;
    const val = (k: string, v: any) => v || "Default";
    return (
      <div className="space-y-5">
        {/* Printer Selection */}
        {isElectron && availablePrinters.length > 0 && (
          <div className="pb-4 border-b border-border">
            <div className="text-[10px] text-secondary uppercase tracking-widest mb-2 font-bold">Target Printer</div>
            <select 
              value={selectedPrinterName}
              onChange={(e) => handlePrinterChange(e.target.value)}
              className={`w-full bg-surface border rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 transition-all ${
                isVirtualSelected ? 'border-amber-400 focus:ring-amber-500' : 'border-border focus:ring-black'
              }`}
            >
              {availablePrinters.map(p => (
                <option key={p.name} value={p.name}>
                  {p.name} {p.isDefault ? '(Default)' : ''}
                </option>
              ))}
            </select>
            {isVirtualSelected ? (
              <p className="text-[10px] text-amber-600 mt-1.5 leading-tight font-medium">
                ⚠️ Virtual printer selected. Windows will ask where to save the file. Use a physical printer for direct printing.
              </p>
            ) : (
              <p className="text-[10px] text-secondary mt-1.5 leading-tight">Physical printer selected. Printing will be silent and direct.</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pb-3 border-b border-border">
          <div><div className="text-[10px] text-secondary uppercase tracking-widest mb-0.5">Paper</div><div className="text-sm font-medium">{val('paper', s.paperSize)}</div></div>
          <div><div className="text-[10px] text-secondary uppercase tracking-widest mb-0.5">Mode</div><div className="text-sm font-medium">{val('color', s.colorMode)}</div></div>
          <div><div className="text-[10px] text-secondary uppercase tracking-widest mb-0.5">Margins</div><div className="text-sm font-medium">{val('margins', s.margins)}</div></div>
          <div><div className="text-[10px] text-secondary uppercase tracking-widest mb-0.5">Copies</div><div className="text-sm font-medium">{s.copies || 1}</div></div>
          <div className="col-span-2"><div className="text-[10px] text-secondary uppercase tracking-widest mb-0.5">Layout</div><div className="text-sm font-medium">{s.photosPerPage > 1 ? `${s.photosPerPage} Photos/Pg` : '1/Page'}</div></div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white">
      <style dangerouslySetInnerHTML={{__html: `
        .job-detail-layout { display: flex; flex-direction: column; gap: 20px; align-items: stretch; }
        @media (min-width: 1024px) {
          .job-detail-layout { display: grid; grid-template-columns: 1fr minmax(260px, 280px); gap: 24px; align-items: start; }
        }
        .files-column { display: flex; flex-direction: column; gap: 16px; min-height: 40vh; }
        .sidebar { position: static; }
        @media (min-width: 1024px) {
          .sidebar { position: sticky; top: 80px; }
        }
      `}} />

        <div className="sticky top-0 z-[110] bg-white/90 backdrop-blur border-b border-border">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
          <button onClick={onClose} className="flex items-center gap-2 text-sm text-secondary hover:text-foreground transition-colors font-medium">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
            Back
          </button>
          
          <div className="flex items-center gap-3">
            {!isExpired && jobData && (
              <>
                <button onClick={handleMarkPrinted} className="px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-surface transition-all no-print">
                  Mark as Printed
                </button>
                <button
                  onClick={handlePrintAll}
                  disabled={isPrinting || (jobData.isEncrypted && hasPrinted)}
                  className={`px-5 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${jobData.isEncrypted && hasPrinted ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-black text-white hover:bg-gray-900 shadow-sm"}`}
                >
                  {isPrinting ? (
                    <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeDasharray="31.4 31.4" strokeLinecap="round"/></svg> {printProgress || "Printing…"}</>
                  ) : jobData.isEncrypted && hasPrinted ? (
                    "Already Printed"
                  ) : (
                    <>🖨️ Print All</>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto" style={{ height: 'calc(100vh - 64px)' }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full" />
          </div>
        ) : isExpired || jobData?.status === "printed" ? (
          <div className="text-center py-24 animate-fade-in">
            <div className="w-24 h-24 rounded-[32px] bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-8 shadow-sm">
              {isExpired ? (
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
              ) : (
                <span className="text-4xl">🔒</span>
              )}
            </div>
            <h2 className="text-2xl font-bold text-[#111827] tracking-tight mb-2">
              {isExpired ? "Job Expired" : "Job Completed"}
            </h2>
            <p className="text-sm text-[#6B7280] max-w-xs mx-auto leading-relaxed">
              {isExpired 
                ? "This print job has automatically expired and the files have been purged from the server." 
                : "This job was marked as printed. For security and privacy, the folder has been locked and files are no longer accessible."}
            </p>
            <button onClick={onClose} className="mt-8 px-6 py-2 bg-[#111827] text-white rounded-xl text-sm font-semibold hover:bg-black transition-all">
              Return to Dashboard
            </button>
          </div>
        ) : jobData ? (
          <div className="animate-fade-in job-detail-layout">
            <div className="files-column" ref={printRef}>
              <div className="mb-2">
                <h1 className="text-2xl font-semibold tracking-tight font-mono">#{jobData.userId}</h1>
                <p className="text-sm text-secondary mt-1">
                  {jobData.fileCount} {jobData.fileCount === 1 ? "file" : "files"}
                  {jobData.isEncrypted && " · Encrypted"}
                </p>
              </div>

              {jobData.isEncrypted ? (
                <div className="p-12 rounded-2xl border border-border bg-surface text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white border border-border flex items-center justify-center mx-auto mb-6"><span className="text-3xl">🔐</span></div>
                  <h3 className="text-lg font-semibold mb-2">Encrypted File</h3>
                  <p className="text-sm text-secondary max-w-sm mx-auto">This file is encrypted. You can only print it — preview is not available.</p>
                  
                  {jobData.fileNames.map((name: string, index: number) => (
                    <div key={name} className="mt-6 flex justify-between items-center p-4 bg-white border border-border rounded-xl">
                      <div className="flex items-center gap-3">
                         <span className="text-xl">🔐</span>
                         <span className="text-sm font-semibold">{name}</span>
                      </div>
                      <button
                        disabled={isPrinting || hasPrinted || printingIndex === index}
                        onClick={() => handlePrintFile(jobData, index)}
                        className={`px-3 py-1.5 border border-border text-xs font-medium rounded-lg ${hasPrinted ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                      >
                        {printingIndex === index ? '🖨️ Printing...' : '🖨️ Print'}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {jobData.fileNames.map((name: string, index: number) => (
                    <div key={name} className="w-full border border-[#E5E7EB] rounded-[12px] bg-white overflow-hidden">
                      <div className="flex justify-between items-center p-[12px_16px] border-b border-[#F3F4F6] bg-[#FAFAFA]">
                        <div className="flex items-center gap-[10px]">
                          <span className="text-lg">{getFileIcon(name)}</span>
                          <span className="text-[15px] font-bold">{name}</span>
                        </div>
                        {jobData.fileNames.length > 1 && (
                          <button
                            onClick={() => handlePrintFile(jobData, index)}
                            disabled={isPrinting}
                            className="px-3 py-1.5 border border-[#E5E7EB] hover:bg-[#F3F4F6] text-xs font-medium rounded transition-colors flex items-center gap-2"
                          >
                            {printingIndex === index ? '🖨️ Printing...' : '🖨️ Print'}
                          </button>
                        )}
                      </div>

                      <div className="w-full bg-[#FaFaFa]">
                        {isImageFile(name) && previewUrls[index] ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={previewUrls[index]}
                            alt={name}
                            style={{
                              width: "100%",
                              height: "auto",
                              display: "block",
                              objectFit: "contain",
                              filter: jobData.settings?.colorMode === "Black & White" ? "grayscale(1) contrast(1.05)" : undefined,
                              transition: "filter 0.25s ease",
                            }}
                            className="bg-surface"
                            onDragStart={(e) => e.preventDefault()}
                          />
                        ) : isPdfFile(name) && previewUrls[index] && jobData.settings ? (
                          <div className="w-full min-h-[min(70vh,720px)] bg-[#323639] rounded-b-lg overflow-hidden">
                            <PDFPreview
                              fileUrl={previewUrls[index]}
                              colorPagesRange=""
                              bwPagesRange=""
                              enableColorRange={false}
                              enableBWRange={false}
                              enableAdvancedColor={false}
                              baseColorMode={jobData.settings.colorMode || "Color"}
                              paperSize={jobData.settings.paperSize || "A4"}
                              margins={jobData.settings.margins || "Default"}
                              customMarginTopBottom={jobData.settings.customMarginTopBottom}
                              customMarginLeftRight={jobData.settings.customMarginLeftRight}
                              orientation={jobData.settings.orientation || "Portrait"}
                              pagesPerSheet={jobData.settings.pagesPerSheet || 1}
                              pagesPerSheetFill={jobData.settings.pagesPerSheetFill || "blank"}
                            />
                          </div>
                        ) : isPdfFile(name) && previewUrls[index] ? (
                          <iframe src={`${previewUrls[index]}#toolbar=0`} style={{ width: '100%', height: '800px', border: 'none' }} title={name} />
                        ) : isDocxFile(name) && previewUrls[index] ? (
                          <div className="w-full h-[80vh] max-h-[900px] bg-[#525659] rounded-b-lg overflow-hidden">
                            <FilePreview fileUrl={previewUrls[index]} fileName={name} />
                          </div>
                        ) : isDocxFile(name) ? (
                          <div className="p-12 text-center text-secondary">
                            Preview unavailable
                          </div>
                        ) : (
                          <div className="p-12 text-center text-secondary">
                             Loading preview...
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className="sidebar space-y-6 no-print">
              <div className="p-6 rounded-2xl border border-border text-center bg-white shadow-sm">
                <CountdownTimer totalSeconds={100} initialRemaining={jobData.remainingSeconds || 100} onExpired={handleExpired} />
              </div>
              {jobData.settings && (
                <div className="p-5 rounded-2xl border border-border bg-white shadow-sm">
                  <h3 className="text-sm font-semibold mb-4">Print Settings</h3>
                  {renderSettings(jobData.settings)}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
