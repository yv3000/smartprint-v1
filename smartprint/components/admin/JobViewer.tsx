"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import CountdownTimer from "./CountdownTimer";
import type { JobResponse } from "@/lib/types";
import toast from "react-hot-toast";
import { getMarginMm } from "@/lib/printLayout";
import {
  Printer,
  Lock,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileText,
  Image as ImageIcon,
  Check,
  ShieldCheck,
  Clock,
  Layers,
  Settings2,
} from "lucide-react";

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
    if (isImageFile(name)) return <ImageIcon className="w-4 h-4 text-emerald-500" />;
    if (isPdfFile(name)) return <FileText className="w-4 h-4 text-rose-500" />;
    if (isDocxFile(name)) return <FileText className="w-4 h-4 text-indigo-500" />;
    return <FileText className="w-4 h-4 text-neutral-400" />;
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
      printWindow.document.write(`<!DOCTYPE html>
<html>
<head><title></title><style>
  body { margin:0; font-family: system-ui, sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; color:#666; }
</style></head>
<body><div>Preparing document for printing…</div></body>
</html>`);

      (async () => {
        try {
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
            ignoreLastRenderedPageBreak: true,
            experimental: false,
            trimXmlDeclaration: true,
            useBase64URL: true,
            renderHeaders: true,
            renderFooters: true,
            renderFootnotes: true,
            renderEndnotes: true,
          });

          const hasPageBorders = false;
          const renderedHtml = renderHost.innerHTML;
          const extractedStyles = styleContainer.innerHTML;
          document.body.removeChild(renderHost);
          document.head.removeChild(styleContainer);

          const printDoc = printWindow.document;

          const printStyle = printDoc.createElement('style');
          printStyle.textContent = `
            * { box-sizing: border-box; }
            @page { size: auto; margin: 0mm; }
            html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body { margin: 0; padding: 0; background: white; ${isGrayscale ? 'filter: grayscale(100%);' : ''} }

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
            .docx-print-wrapper > section.docx-print {
              box-shadow: inset 0 0 0 1.2pt #000 !important;
            }
            ` : ''}
          `;

          const docxStyle = printDoc.createElement('div');
          docxStyle.innerHTML = extractedStyles;

          printDoc.head.innerHTML = '<title></title>';
          printDoc.head.appendChild(printStyle);
          Array.from(docxStyle.children).forEach((el) => printDoc.head.appendChild(el));

          printDoc.body.innerHTML = renderedHtml;

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
      throw error;
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
      setPrintProgress("");
    }
  };

  const handleExpired = useCallback(async () => {
    setIsExpired(true);
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
    const val = (v: any) => v || "Default";
    return (
      <div className="space-y-4">
        {/* Printer Selection */}
        {isElectron && availablePrinters.length > 0 && (
          <div className="pb-4 border-b border-neutral-100 dark:border-neutral-800">
            <div className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1.5 font-bold">
              Target Printer
            </div>
            <select 
              value={selectedPrinterName}
              onChange={(e) => handlePrinterChange(e.target.value)}
              className={`w-full bg-neutral-50 dark:bg-neutral-850 border rounded-xl px-3 py-2 text-xs font-semibold text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 transition-all ${
                isVirtualSelected ? 'border-amber-400 focus:ring-amber-500' : 'border-neutral-200 dark:border-neutral-750 focus:ring-neutral-900 dark:focus:ring-white'
              }`}
            >
              {availablePrinters.map(p => (
                <option key={p.name} value={p.name}>
                  {p.name} {p.isDefault ? '(Default)' : ''}
                </option>
              ))}
            </select>
            {isVirtualSelected ? (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1.5 leading-tight font-medium flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                Virtual printer selected. Windows will prompt to save file.
              </p>
            ) : (
              <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1.5 leading-tight">
                Direct silent hardware printing active.
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-100 dark:border-neutral-800">
            <div className="text-[9px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-semibold">Paper</div>
            <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-100 mt-0.5">{val(s.paperSize)}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-100 dark:border-neutral-800">
            <div className="text-[9px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-semibold">Mode</div>
            <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-100 mt-0.5">{val(s.colorMode)}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-100 dark:border-neutral-800">
            <div className="text-[9px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-semibold">Margins</div>
            <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-100 mt-0.5">{val(s.margins)}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-100 dark:border-neutral-800">
            <div className="text-[9px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-semibold">Copies</div>
            <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-100 mt-0.5">{s.copies || 1}</div>
          </div>
          <div className="col-span-2 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-100 dark:border-neutral-800">
            <div className="text-[9px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-semibold">Layout</div>
            <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-100 mt-0.5">
              {s.photosPerPage > 1 ? `${s.photosPerPage} Photos per Page` : '1 Document / Page'}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-neutral-50/95 dark:bg-[#09090b]/98 backdrop-blur-md text-neutral-900 dark:text-neutral-100 flex flex-col">
      <style dangerouslySetInnerHTML={{__html: `
        .job-detail-layout { display: flex; flex-direction: column; gap: 20px; align-items: stretch; }
        @media (min-width: 1024px) {
          .job-detail-layout { display: grid; grid-template-columns: 1fr minmax(280px, 320px); gap: 24px; align-items: start; }
        }
        .files-column { display: flex; flex-direction: column; gap: 16px; min-height: 40vh; }
        .sidebar { position: static; }
        @media (min-width: 1024px) {
          .sidebar { position: sticky; top: 80px; }
        }
      `}} />

      {/* Top Header */}
      <div className="sticky top-0 z-[110] bg-white/90 dark:bg-[#09090b]/90 backdrop-blur-xl border-b border-neutral-200/80 dark:border-neutral-800">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Queue</span>
          </button>
          
          <div className="flex items-center gap-2.5">
            {!isExpired && jobData && (
              <>
                <button
                  onClick={handleMarkPrinted}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all active:scale-95 no-print"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Mark Done</span>
                </button>
                <button
                  onClick={handlePrintAll}
                  disabled={isPrinting || (jobData.isEncrypted && hasPrinted)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm active:scale-95 ${
                    jobData.isEncrypted && hasPrinted
                      ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed"
                      : "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 hover:shadow"
                  }`}
                >
                  {isPrinting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{printProgress || "Printing..."}</span>
                    </>
                  ) : jobData.isEncrypted && hasPrinted ? (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Printed & Purged</span>
                    </>
                  ) : (
                    <>
                      <Printer className="w-4 h-4" />
                      <span>Print All</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto max-w-[1280px] w-full mx-auto px-4 sm:px-6 py-6 custom-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
            <p className="text-xs uppercase font-bold tracking-widest text-neutral-400">Loading Job Packet...</p>
          </div>
        ) : isExpired || jobData?.status === "printed" ? (
          <div className="text-center py-24 animate-fade-in max-w-md mx-auto">
            <div className="w-20 h-20 rounded-3xl bg-neutral-100 dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center mx-auto mb-6 shadow-sm">
              {isExpired ? (
                <Clock className="w-9 h-9 text-rose-500" />
              ) : (
                <ShieldCheck className="w-9 h-9 text-emerald-500" />
              )}
            </div>
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white mb-2">
              {isExpired ? "Job Automatically Expired" : "Print Job Completed & Purged"}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed mb-6">
              {isExpired 
                ? "This print job exceeded the 100-second window and all buffers have been permanently deleted from storage." 
                : "This job was marked as printed. In compliance with the zero-knowledge policy, documents are sealed and deleted."}
            </p>
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-xl text-xs font-bold hover:opacity-90 transition-all active:scale-95"
            >
              Return to Print Queue
            </button>
          </div>
        ) : jobData ? (
          <div className="animate-fade-in job-detail-layout">
            <div className="files-column" ref={printRef}>
              {/* Job Header Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200/80 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold tracking-tight font-mono text-neutral-900 dark:text-white">
                    #{jobData.userId}
                  </span>
                  {jobData.isEncrypted && (
                    <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                      <Lock className="w-3 h-3" />
                      Client-Encrypted (AES-256)
                    </span>
                  )}
                </div>
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                  {jobData.fileCount} {jobData.fileCount === 1 ? "document" : "documents"}
                </span>
              </div>

              {jobData.isEncrypted ? (
                <div className="p-8 sm:p-12 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 text-center shadow-sm">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-5 text-amber-500">
                    <Lock className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-1.5">
                    End-to-End Encrypted File
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md mx-auto leading-relaxed mb-6">
                    This file is encrypted with AES-256 GCM on the user&apos;s device. Zero preview is available on disk or screen. When printed, it decrypts straight into memory.
                  </p>
                  
                  <div className="space-y-3 max-w-lg mx-auto">
                    {jobData.fileNames.map((name: string, index: number) => (
                      <div
                        key={name}
                        className="flex justify-between items-center p-3.5 bg-neutral-50 dark:bg-neutral-850/80 border border-neutral-200/80 dark:border-neutral-800 rounded-xl"
                      >
                        <div className="flex items-center gap-2.5 truncate pr-3">
                          <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                          <span className="text-xs font-semibold truncate text-neutral-800 dark:text-neutral-200">
                            {name}
                          </span>
                        </div>
                        <button
                          disabled={isPrinting || hasPrinted || printingIndex === index}
                          onClick={() => handlePrintFile(jobData, index)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all active:scale-95 shrink-0 ${
                            hasPrinted
                              ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border-neutral-200 dark:border-neutral-700 cursor-not-allowed"
                              : "bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white border-neutral-200 dark:border-neutral-700 shadow-xs"
                          }`}
                        >
                          {printingIndex === index ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Printing...</span>
                            </>
                          ) : (
                            <>
                              <Printer className="w-3.5 h-3.5" />
                              <span>Print</span>
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {jobData.fileNames.map((name: string, index: number) => (
                    <div
                      key={name}
                      className="w-full border border-neutral-200/80 dark:border-neutral-800 rounded-2xl bg-white dark:bg-neutral-900 overflow-hidden shadow-sm"
                    >
                      <div className="flex justify-between items-center px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/90">
                        <div className="flex items-center gap-2.5 truncate pr-3">
                          <span className="shrink-0">{getFileIcon(name)}</span>
                          <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">{name}</span>
                        </div>
                        {jobData.fileNames.length > 1 && (
                          <button
                            onClick={() => handlePrintFile(jobData, index)}
                            disabled={isPrinting}
                            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 transition-all shrink-0 active:scale-95"
                          >
                            {printingIndex === index ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Printing...</span>
                              </>
                            ) : (
                              <>
                                <Printer className="w-3 h-3" />
                                <span>Print</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      <div className="w-full bg-neutral-100/60 dark:bg-neutral-950 flex items-center justify-center">
                        {isImageFile(name) && previewUrls[index] ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={previewUrls[index]}
                            alt={name}
                            style={{
                              width: "100%",
                              maxHeight: "720px",
                              display: "block",
                              objectFit: "contain",
                              filter: jobData.settings?.colorMode === "Black & White" ? "grayscale(1) contrast(1.05)" : undefined,
                              transition: "filter 0.25s ease",
                            }}
                            className="p-4"
                            onDragStart={(e) => e.preventDefault()}
                          />
                        ) : isPdfFile(name) && previewUrls[index] && jobData.settings ? (
                          <div className="w-full min-h-[min(70vh,720px)] bg-[#323639] overflow-hidden">
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
                          <div className="w-full h-[80vh] max-h-[900px] bg-[#525659] overflow-hidden">
                            <FilePreview fileUrl={previewUrls[index]} fileName={name} />
                          </div>
                        ) : isDocxFile(name) ? (
                          <div className="p-12 text-center text-xs text-neutral-400">
                            Preview unavailable
                          </div>
                        ) : (
                          <div className="p-12 text-center text-xs text-neutral-400">
                            Loading document preview...
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Sidebar with Countdown & Settings */}
            <div className="sidebar space-y-4 no-print">
              <div className="p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 text-center bg-white dark:bg-neutral-900/90 shadow-sm">
                <CountdownTimer totalSeconds={100} initialRemaining={jobData.remainingSeconds || 100} onExpired={handleExpired} />
              </div>
              {jobData.settings && (
                <div className="p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900/90 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Settings2 className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                      Print Specifications
                    </h3>
                  </div>
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
