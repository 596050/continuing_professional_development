import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SessionProvider } from "@/components/SessionProvider";
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
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
