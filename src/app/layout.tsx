import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Agent Taskboard",
  description: "Mobile-first command center for managing AI coding agents",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Agent Taskboard",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme') || 'system';
                  const root = document.documentElement;
                  if (theme === 'dark') {
                    root.classList.add('dark');
                  } else if (theme === 'light') {
                    root.classList.remove('dark');
                  } else {
                    // system theme
                    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                      root.classList.add('dark');
                    }
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <ServiceWorkerRegister />
          <div className="mx-auto min-h-dvh max-w-lg">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}
