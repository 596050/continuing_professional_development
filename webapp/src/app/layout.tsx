import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SessionProvider } from "@/components/SessionProvider";
import { PWAInstall } from "@/components/ui/PWAInstall";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CPD/CE Compliance, Done-For-You | AuditReadyCPD",
  description:
    "CPD and CE compliance planned and audit-ready in 24 hours. No spreadsheets. No portals. No guesswork. For financial advisers, CFPs, IARs, and RIAs.",
  keywords: [
    "CPD",
    "CE",
    "continuing professional development",
    "continuing education",
    "financial adviser CPD",
    "CFP CE requirements",
    "IAR CE",
    "audit ready",
    "CPD tracking",
    "CE compliance",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1B2A4A" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.svg" />
        {/* Dark mode: apply class before paint to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;var t=localStorage.getItem('theme');if(t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme:dark)').matches)){d.classList.add('dark')}else{d.classList.remove('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className={`${inter.className} antialiased bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100`}>
        <SessionProvider>{children}</SessionProvider>
        <PWAInstall />
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})});}`,
          }}
        />
      </body>
    </html>
  );
}
