import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

export const metadata: Metadata = {
  title: "SmartPrint — Secure Document Printing",
  description:
    "Print your documents securely. No login, no WhatsApp sharing, auto-deleted in 100 seconds. Privacy-first printing for everyone.",
  keywords: ["print", "secure", "document", "privacy", "printing"],
};

// Inline script that sets the html class BEFORE hydration, so there is no
// flash of the wrong theme on reload.
const themeBoot = `
try {
  var saved = localStorage.getItem('sp_theme');
  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  var theme = saved === 'dark' || saved === 'light' ? saved : (prefersDark ? 'dark' : 'light');
  document.documentElement.classList.add(theme);
  document.documentElement.style.colorScheme = theme;
} catch (e) {}
`;

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
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body className="min-h-full flex flex-col bg-page text-[#1A1A1A] dark:text-[#F5F5F7]">
        <ThemeProvider>
          <SessionProvider>
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                duration: 4000,
                className: "sp-toast",
                style: {
                  background: "rgba(255, 255, 255, 0.85)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(0, 0, 0, 0.06)",
                  color: "#1A1A1A",
                  borderRadius: "14px",
                  padding: "12px 18px",
                  fontSize: "14px",
                  fontWeight: 500,
                  boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
                },
              }}
            />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
