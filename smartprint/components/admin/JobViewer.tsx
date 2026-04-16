"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import CountdownTimer from "./CountdownTimer";
import type { JobResponse, PrintSettings } from "@/lib/types";
import mammoth from "mammoth";
import toast from "react-hot-toast";

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
  const [docxHtmlPreviews, setDocxHtmlPreviews] = useState<Record<number, string[]>>({});
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

      if (!data.isEncrypted && data.fileNames) {
        data.fileNames.forEach(async (name: string, idx: number) => {
          if (getFileType(name) === "docx" && urls[idx]) {
            try {
              const fetchUrlPart = urls[idx].split('token=')[1]?.split('&')[0];
              const docRes = await fetch(`/api/jobs/${job.id}/file?name=${encodeURIComponent(name)}&token=${fetchUrlPart}`, {
                credentials: "include"
              });
              const blob = await docRes.blob();
              const arrayBuffer = await blob.arrayBuffer();
              const mammothOptions = {
                styleMap: ["p[style-name='Page Break'] => div.page-break"],
                convertImage: mammoth.images.imgElement(function (image: any) {
                  return image.read("base64").then(function (imageBuffer: any) {
                    return { src: "data:" + image.contentType + ";base64," + imageBuffer }
                  })
                })
              };
              const result = await mammoth.convertToHtml({ arrayBuffer }, mammothOptions);
              const pages = result.value.split(/<div class="page-break"><\/div>/i).filter(p => p.trim().length > 0);

              setDocxHtmlPreviews(prev => ({ ...prev, [idx]: pages }));
            } catch (e) {
              console.error("Failed to fetch docx for preview", e);
            }
          }
        });
      }
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
    
    // For secure files in Electron: use Electron's print API
    // This sends directly to printer without preview
    const { ipcRenderer } = (window as any).require('electron');
    
    // Convert blob to data URL for electron print
    const reader = new FileReader();
    return new Promise<void>((resolve) => {
      reader.onload = (e) => {
        ipcRenderer.send('smartprint-print', {
          color: settings.colorMode !== 'Black & White',
          landscape: settings.orientation === 'Landscape',
          pageSize: settings.paperSize || 'A4',
          scale: settings.scale || 100,
          copies: settings.copies || 1,
        });
        
        ipcRenderer.once('print-result', (event: any, result: any) => {
          if (result.success) {
            toast.success('Printing complete');
            handleMarkPrinted();
          } else {
            toast.error('Printing failed: ' + result.reason);
          }
          resolve();
        });
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
    };
    const cssSize = paperSizeMap[settings.paperSize] || 'A4';
    const isGrayscale = settings.colorMode === 'Black & White';
    
    const printCSS = `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      @page { 
        size: ${cssSize} ${orientation}; 
        margin: 0mm;
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
        @page { margin: 0mm; }
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
    } else {
      // DOCX and other: use mammoth conversion
      printWindow.document.write(`<!DOCTYPE html>
      <html>
      <head>
        <title></title>
        <style>${printCSS}
          body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 12pt;
            line-height: 1.5;
            padding: 2cm;
            color: black;
          }
          img { max-width: 100%; height: auto; }
          table { border-collapse: collapse; width: 100%; }
          td, th { border: 1px solid #ccc; padding: 6px; }
          @media print {
            @page { margin: 2cm; size: ${cssSize} ${orientation}; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div id="content">Converting document...</div>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js"></script>
        <script>
          fetch("${blobUrl}")
            .then(r => r.arrayBuffer())
            .then(buf => mammoth.convertToHtml({arrayBuffer: buf}))
            .then(result => {
              document.getElementById('content').innerHTML = result.value
              setTimeout(function() { window.print() }, 800)
            })
            .catch(err => {
              document.getElementById('content').innerHTML = 
                '<p>Could not render document. Please check the file.</p>'
            })
          window.onafterprint = function() { window.close() }
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
        toast.error('File not found');
        return;
      }
      
      const extractToken = previewUrls[fileIndex]?.split('token=')[1]?.split('&')[0];
      const fetchUrl = `/api/jobs/${currentJob.id}/file?name=${encodeURIComponent(filename)}&token=${extractToken || ''}`;
  
      const response = await fetch(
        fetchUrl,
        { credentials: 'include' }
      );
      
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('File has been deleted or expired');
        } else {
          toast.error('Failed to fetch file');
        }
        return;
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
          
          const keyBytes = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0));
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
          toast.error('Failed to decrypt file for printing');
          return;
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
      
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Printing failed. Please try again.');
    } finally {
      setIsPrinting(false);
      setPrintingIndex(null);
    }
  };

  const handlePrintAll = async () => {
    if (!jobData || !previewUrls.length) return;
    const fileCount = jobData.fileCount || 1;
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
  };

  const handleExpired = useCallback(() => setIsExpired(true), []);

  const renderSettings = (s: any) => {
    if (!s) return null;
    const val = (k: string, v: any) => v || "Default";
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 pb-3 border-b border-border">
          <div><div className="text-[10px] text-secondary uppercase tracking-widest mb-0.5">Paper</div><div className="text-sm font-medium">{val('paper', s.paperSize)}</div></div>
          <div><div className="text-[10px] text-secondary uppercase tracking-widest mb-0.5">Mode</div><div className="text-sm font-medium">{val('color', s.colorMode)}</div></div>
          <div><div className="text-[10px] text-secondary uppercase tracking-widest mb-0.5">Copies</div><div className="text-sm font-medium">{s.copies || 1}</div></div>
          <div><div className="text-[10px] text-secondary uppercase tracking-widest mb-0.5">Layout</div><div className="text-sm font-medium">{s.photosPerPage > 1 ? `${s.photosPerPage} Photos/Pg` : '1/Page'}</div></div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white">
      <style dangerouslySetInnerHTML={{__html: `
        .job-detail-layout { display: grid; grid-template-columns: 1fr 280px; gap: 24px; align-items: start; }
        .files-column { display: flex; flex-direction: column; gap: 16px; min-height: 50vh; }
        .sidebar { position: sticky; top: 80px; }
      `}} />

      <div className="sticky top-0 z-[110] bg-white/90 backdrop-blur border-b border-border">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
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

      <div className="max-w-[1200px] mx-auto px-6 py-6 overflow-y-auto" style={{ height: 'calc(100vh - 64px)' }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full" />
          </div>
        ) : isExpired ? (
          <div className="text-center py-20 animate-fade-in">
            <div className="w-20 h-20 rounded-3xl bg-danger/10 flex items-center justify-center mx-auto mb-6">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#FF3B30" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
            </div>
            <h2 className="text-2xl font-semibold mb-2">File Expired</h2>
            <p className="text-secondary">This file has been automatically deleted.</p>
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
                          <img src={previewUrls[index]} alt={name} style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain' }} className="bg-surface" onDragStart={(e) => e.preventDefault()} />
                        ) : isPdfFile(name) && previewUrls[index] ? (
                          <iframe src={`${previewUrls[index]}#toolbar=0`} style={{ width: '100%', height: '800px', border: 'none' }} title={name} />
                        ) : isDocxFile(name) && docxHtmlPreviews[index] ? (
                          <div className="bg-[#E5E7EB] py-8 flex flex-col items-center gap-6">
                            {docxHtmlPreviews[index].map((pageHtml, pIdx) => (
                               <div
                                 key={pIdx}
                                 style={{ width: '794px', minHeight: '1123px', padding: '96px', background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', boxSizing: 'border-box', fontFamily: 'Calibri, Arial, sans-serif', fontSize: '12pt', lineHeight: 1.5, color: '#000', overflow: 'hidden' }}
                                 dangerouslySetInnerHTML={{ __html: pageHtml }}
                               />
                            ))}
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
