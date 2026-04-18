import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { ListTodo, Home } from "lucide-react";
import Link from "next/link";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "待办清单 - Todo List",
  description: "高效管理每一天，从一件小事开始",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${geistSans.className} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/[0.06] bg-slate-950/60 backdrop-blur-xl">
            <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
              <Link
                href="/"
                className="group flex items-center gap-2.5 transition-opacity hover:opacity-80"
              >
                <div className="rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 p-1.5 shadow-md shadow-purple-500/20">
                  <ListTodo className="h-4 w-4 text-white" />
                </div>
                <span className="bg-gradient-to-r from-white to-purple-200 bg-clip-text text-sm font-semibold text-transparent">
                  待办清单
                </span>
              </Link>
              <Link
                href="/"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-slate-400 transition-all hover:bg-white/5 hover:text-white"
              >
                <Home className="h-3.5 w-3.5" />
                首页
              </Link>
            </div>
          </header>
          <div className="pt-14">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}
