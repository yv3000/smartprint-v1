import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { SessionProvider } from "next-auth/react";

export const metadata: Metadata = {
  title: "SmartPrint — Secure Document Printing",
  description:
    "Print your documents securely. No login, no WhatsApp sharing, auto-deleted in 100 seconds. Privacy-first printing for everyone.",
  keywords: ["print", "secure", "document", "privacy", "printing"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col bg-[#F8F7F4] text-[#1A1A1A]">
        <SessionProvider>
          {children}
          <Toaster 
            position="bottom-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "rgba(255, 255, 255, 0.8)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255, 255, 255, 0.5)",
                color: "#1A1A1A",
                borderRadius: "16px",
                padding: "12px 20px",
                fontSize: "14px",
                fontWeight: 500,
                boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
              },
            }}
          />
        </SessionProvider>
      </body>
    </html>
  );
}
