import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { LOCALE_COOKIE } from "@/lib/constants";
import { parseLocale } from "@/lib/i18n";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "Lieferway – Essen bestellen in Frankfurt",
    template: "%s · Lieferway",
  },
  description:
    "Lieferway: Essen bestellen in Frankfurt am Main. Lokale Küchen, Lieferung durch das Restaurant.",
  icons: {
    icon: [
      { url: "/icon-pin-fork.svg?v=28", type: "image/svg+xml" },
      { url: "/favicon.svg?v=28", type: "image/svg+xml" },
      { url: "/favicon-32.png?v=28", sizes: "32x32", type: "image/png" },
      { url: "/favicon-64.png?v=28", sizes: "64x64", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png?v=28",
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = parseLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  return (
    <html lang={locale} className={`${inter.variable} ${jakarta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <Providers initialLocale={locale}>
          {children}
          <Toaster richColors position="top-center" />
        </Providers>
      </body>
    </html>
  );
}
