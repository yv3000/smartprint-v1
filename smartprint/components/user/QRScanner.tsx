"use client";

import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { X, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function QRScanner({
  onScan,
  onClose,
}: {
  onScan: (data: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCamera, setHasCamera] = useState(true);

  useEffect(() => {
    if (!videoRef.current) return;

    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        const url = result.data;
        if (url.includes("/user?shop=")) {
          const token = new URL(url).searchParams.get("shop");
          if (token) {
            onScan(token);
            scanner.stop();
            scanner.destroy();
          }
        } else {
          toast.error("Not a SmartPrint QR code", { id: "qr-error" });
        }
      },
      {
        preferredCamera: "environment",
        highlightScanRegion: false,
        highlightCodeOutline: false,
      }
    );

    scanner.start().catch((err) => {
      console.error(err);
      setHasCamera(false);
    });

    return () => {
      scanner.stop();
      scanner.destroy();
    };
  }, [onScan]);

  /* Bracket — drawn as a corner with two short lines */
  const bracket = (
    pos: "tl" | "tr" | "bl" | "br"
  ): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: "absolute",
      width: 28,
      height: 28,
      borderColor: "#fff",
      borderStyle: "solid",
      borderRadius: 4,
    };
    if (pos === "tl") return { ...base, top: -3, left: -3, borderWidth: "3px 0 0 3px" };
    if (pos === "tr") return { ...base, top: -3, right: -3, borderWidth: "3px 3px 0 0" };
    if (pos === "bl") return { ...base, bottom: -3, left: -3, borderWidth: "0 0 3px 3px" };
    return { ...base, bottom: -3, right: -3, borderWidth: "0 3px 3px 0" };
  };

  return (
    <div
      className="user-portal fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(40px)",
        WebkitBackdropFilter: "blur(40px)",
        animation: "up-page-enter 0.3s var(--up-ease)",
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        aria-label="Close scanner"
        style={{
          position: "absolute",
          top: 24,
          right: 24,
          width: 44,
          height: 44,
          borderRadius: 999,
          background: "rgba(255,255,255,0.12)",
          color: "#fff",
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          backdropFilter: "blur(12px)",
          transition: "background 0.2s var(--up-ease), transform 0.15s var(--up-spring)",
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.20)")
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.12)")
        }
      >
        <X size={20} strokeWidth={1.8} />
      </button>

      {!hasCamera ? (
        <div
          className="text-center"
          style={{ padding: 24, maxWidth: 360, color: "#fff" }}
        >
          <div
            className="mx-auto flex items-center justify-center"
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "rgba(255,59,48,0.18)",
              color: "#FF6B61",
              marginBottom: 16,
            }}
          >
            <AlertCircle size={24} strokeWidth={1.5} />
          </div>
          <h3
            style={{
              fontSize: "1.6em",
              fontWeight: 600,
              letterSpacing: "-0.01em",
              marginBottom: 8,
              color: "#fff",
            }}
          >
            Camera access denied
          </h3>
          <p
            style={{
              fontSize: "1.08em",
              color: "rgba(255,255,255,0.7)",
              lineHeight: 1.5,
              marginBottom: 24,
            }}
          >
            We need camera access to scan the shop QR code. Please enable it in
            your browser settings.
          </p>
          <button
            onClick={onClose}
            className="up-btn-primary w-full"
            style={{
              background: "#fff",
              color: "var(--up-text)",
              height: 44,
            }}
          >
            Go back
          </button>
        </div>
      ) : (
        <div
          className="relative"
          style={{
            width: "min(86vw, 320px)",
            aspectRatio: "1 / 1",
          }}
        >
          {/* Viewfinder */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 24,
              overflow: "hidden",
              background: "#000",
            }}
          >
            <video
              ref={videoRef}
              className="w-full h-full"
              style={{ objectFit: "cover" }}
              playsInline
              muted
            />
          </div>

          {/* Corner brackets only */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 24,
              pointerEvents: "none",
            }}
          >
            <div style={bracket("tl")} />
            <div style={bracket("tr")} />
            <div style={bracket("bl")} />
            <div style={bracket("br")} />
          </div>
        </div>
      )}

      {/* Instruction */}
      {hasCamera && (
        <p
          style={{
            color: "#fff",
            fontSize: "1.16em",
            fontWeight: 500,
            marginTop: 24,
            opacity: 0.9,
            textAlign: "center",
            paddingInline: 16,
          }}
        >
          Align QR code within frame
        </p>
      )}
    </div>
  );
}
