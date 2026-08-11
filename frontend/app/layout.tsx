import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/toast-provider";
import { FloatingThemeToggle } from "@/components/floating-theme-toggle";
import { CookieConsent } from "@/components/cookie-consent";

export const metadata: Metadata = {
  title: "Total Pousada | Gerenciamento interno",
  description: "Gerenciamento de Reservas e dados internos da pousada.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className="light" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var e=document.documentElement;var t=localStorage.getItem('theme');var n=t==='dark'||t==='light'?t:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');e.classList.remove('light','dark');e.classList.add(n);e.style.colorScheme=n;}catch(_){}})();`,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <ToastProvider>
          <FloatingThemeToggle />
          {children}
          <CookieConsent />
        </ToastProvider>
      </body>
    </html>
  );
}
