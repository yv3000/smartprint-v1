"use client";

import { useState } from "react";
import { Trash2, Clock, Shield, AlertCircle, CheckCircle2, Lock } from "lucide-react";

interface SuccessScreenProps {
  userId: string;
  jobId: string;
  userToken?: string;
  isEncrypted: boolean;
  /** Drive preview URL when a .docx was uploaded. Embedded as an
   *  iframe so the user can confirm exactly what the print shop will see. */
  driveViewUrl?: string | null;
}

/* Animated SVG checkmark — circle draws in, then check draws */
function AnimatedCheck({ size = 72 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      style={{ display: "block" }}
    >
      <circle
        cx="40"
        cy="40"
        r="36"
        fill="rgba(52,199,89,0.10)"
      />
      <circle
        cx="40"
        cy="40"
        r="36"
        fill="none"
        stroke="#34C759"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="226"
        style={{
          animation: "up-circle-draw 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        }}
      />
      <path
        d="M26 41 L36 51 L55 31"
        stroke="#34C759"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray="60"
        strokeDashoffset="60"
        style={{
          animation:
            "up-check-draw 0.4s cubic-bezier(0.4, 0, 0.2, 1) 0.45s forwards",
        }}
      />
    </svg>
  );
}

export default function SuccessScreen({
  userId,
  jobId,
  userToken,
  isEncrypted,
  driveViewUrl,
}: SuccessScreenProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  const handleDelete = async () => {
    if (!userToken) return;
    setIsDeleting(true);
    try {
      const res = await fetch(
        `/api/jobs/${jobId}?userToken=${encodeURIComponent(userToken)}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setIsDeleted(true);
        setShowDeleteConfirm(false);
      }
    } catch {
      // silent fail
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="up-page-enter mx-auto text-center"
      style={{
        // Wider when there's a docx preview to show — narrower
        // otherwise so the success card stays compact.
        maxWidth: driveViewUrl && !isEncrypted ? 720 : 520,
        paddingTop: 40,
        paddingBottom: 40,
      }}
    >
      {/* Animated check */}
      <div
        className="flex items-center justify-center"
        style={{ marginBottom: 32 }}
      >
        <AnimatedCheck />
      </div>

      <h1
        style={{
          fontSize: "2.4em",
          fontWeight: 600,
          letterSpacing: "-0.02em",
          marginBottom: 8,
        }}
      >
        Files sent.
      </h1>
      <p
        style={{
          fontSize: "1.16em",
          color: "var(--up-text-2)",
          marginBottom: 32,
        }}
      >
        Tell the shop owner your Print ID to start printing.
      </p>

      {/* Print ID card */}
      <div
        className="up-card"
        style={{
          padding: 24,
          marginBottom: 24,
          textAlign: "center",
        }}
      >
        <div
          className="up-section-label"
          style={{ marginBottom: 12 }}
        >
          Your Print ID
        </div>
        <div
          className="up-mono"
          style={{
            fontSize: "4em",
            fontWeight: 600,
            color: "var(--up-text)",
            lineHeight: 1,
            letterSpacing: "0.08em",
          }}
        >
          {userId}
        </div>
      </div>

      {/* Drive iframe preview — only shown for non-encrypted DOCX jobs.
          Lets the user confirm what the print shop sees. */}
      {driveViewUrl && !isEncrypted && (
        <div
          className="up-card"
          style={{
            padding: 0,
            marginBottom: 24,
            overflow: "hidden",
            background: "#525659",
          }}
        >
          <div
            className="up-section-label"
            style={{
              padding: "12px 16px",
              borderBottom: "0.5px solid var(--up-divider)",
              background: "var(--up-bg)",
              textAlign: "left",
            }}
          >
            Document Preview
          </div>
          <iframe
            src={driveViewUrl}
            title="Document Preview"
            style={{
              width: "100%",
              height: "min(80vh, 720px)",
              border: "none",
              display: "block",
            }}
          />
        </div>
      )}

      {/* Info rows */}
      <div
        className="up-card"
        style={{ padding: 4, marginBottom: 24, textAlign: "left" }}
      >
        <div
          className="flex items-center gap-3"
          style={{ padding: "14px 16px" }}
        >
          <Clock
            size={16}
            strokeWidth={1.5}
            style={{ color: "var(--up-text-2)", flex: "none" }}
          />
          <div>
            <div
              style={{
                fontSize: "1.08em",
                color: "var(--up-text)",
                fontWeight: 500,
              }}
            >
              Auto-deletes in 1 hour
            </div>
            <div
              style={{
                fontSize: "0.95em",
                color: "var(--up-text-2)",
                marginTop: 2,
              }}
            >
              Files are removed automatically after the session.
            </div>
          </div>
        </div>

        <div
          className="flex items-center gap-3"
          style={{
            padding: "14px 16px",
            borderTop: "0.5px solid var(--up-divider)",
          }}
        >
          <Shield
            size={16}
            strokeWidth={1.5}
            style={{ color: "var(--up-text-2)", flex: "none" }}
          />
          <div>
            <div
              style={{
                fontSize: "1.08em",
                color: "var(--up-text)",
                fontWeight: 500,
              }}
            >
              Nothing stored permanently
            </div>
            <div
              style={{
                fontSize: "0.95em",
                color: "var(--up-text-2)",
                marginTop: 2,
              }}
            >
              No accounts, no history. Just this session.
            </div>
          </div>
        </div>

        {isEncrypted && (
          <div
            className="flex items-center gap-3"
            style={{
              padding: "14px 16px",
              borderTop: "0.5px solid var(--up-divider)",
            }}
          >
            <Lock
              size={16}
              strokeWidth={1.5}
              style={{ color: "var(--up-accent)", flex: "none" }}
            />
            <div>
              <div
                style={{
                  fontSize: "1.08em",
                  color: "var(--up-text)",
                  fontWeight: 500,
                }}
              >
                End-to-end encrypted
              </div>
              <div
                style={{
                  fontSize: "0.95em",
                  color: "var(--up-text-2)",
                  marginTop: 2,
                }}
              >
                The shop can print but cannot view your documents.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Primary action */}
      <button
        onClick={() => (window.location.href = "/")}
        className="up-btn-primary w-full"
        style={{ height: 52, fontSize: "1.16em", fontWeight: 600 }}
      >
        Done
      </button>

      {/* Delete option */}
      {userToken && !isDeleted && (
        <div style={{ marginTop: 16 }}>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="up-btn-text"
              style={{
                color: "var(--up-danger)",
                fontSize: "1em",
              }}
            >
              <Trash2 size={12} strokeWidth={1.8} />
              Delete my files
            </button>
          ) : (
            <div
              className="up-card"
              style={{
                padding: 16,
                background: "rgba(255,59,48,0.04)",
                border: "0.5px solid rgba(255,59,48,0.20)",
                textAlign: "left",
              }}
            >
              <div
                className="flex items-center gap-2"
                style={{ marginBottom: 12 }}
              >
                <AlertCircle
                  size={14}
                  strokeWidth={1.8}
                  style={{ color: "var(--up-danger)" }}
                />
                <span
                  style={{
                    fontSize: "1.08em",
                    fontWeight: 500,
                    color: "var(--up-text)",
                  }}
                >
                  Delete files from the print shop?
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="up-btn-ghost flex-1"
                  style={{ height: 40, fontSize: "1em" }}
                >
                  Keep
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="up-btn-primary flex-1"
                  style={{
                    height: 40,
                    fontSize: "1em",
                    background: "var(--up-danger)",
                  }}
                >
                  {isDeleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isDeleted && (
        <div
          className="flex items-center justify-center gap-2"
          style={{
            marginTop: 16,
            padding: "12px 16px",
            borderRadius: 12,
            background: "rgba(52,199,89,0.10)",
            color: "#1A8038",
            fontSize: "1em",
            fontWeight: 500,
          }}
        >
          <CheckCircle2 size={14} strokeWidth={1.8} />
          Files deleted from the print shop
        </div>
      )}
    </div>
  );
}
