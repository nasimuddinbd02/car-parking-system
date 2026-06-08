import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Self-hosted via next/font (no render-blocking external request, no layout shift).
// Exposed as the --font-jakarta CSS variable, consumed by --font-sans in globals.css.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const APP_NAME = "ParkEasy SaaS";
const APP_DESCRIPTION =
  "Multi-tenant car parking management platform with real-time slot tracking, EV pricing rules, attendant gate consoles, and consolidated financial reporting.";

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — Smart Parking Management`,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  keywords: [
    "parking management",
    "smart parking",
    "multi-tenant SaaS",
    "EV charging",
    "parking reservations",
    "garage management",
  ],
  authors: [{ name: "ParkEasy" }],
  openGraph: {
    title: `${APP_NAME} — Smart Parking Management`,
    description: APP_DESCRIPTION,
    siteName: APP_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} — Smart Parking Management`,
    description: APP_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#090d16" },
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
  ],
};

// Runs before first paint to set the theme, eliminating the dark→light flash (FOUC).
const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var theme = stored || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${jakarta.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
