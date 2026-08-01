import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, JetBrains_Mono } from "next/font/google";
import { PostHogUserIdentifier } from "@/components/PostHogUserIdentifier";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Skeem News - Biasly",
  description: "AI-powered news analysis and framing insights",
};

// Blocking pre-paint theme script. Runs synchronously in <head> before first
// paint so the saved (or OS) theme is applied to <html> immediately — no
// light-then-dark flash on fresh load. Reads localStorage only; sets one class.
// Brand default is light: no saved value + no OS-dark preference → light.
const themeInitScript = `
(function () {
  try {
    var key = 'skeem-theme';
    var stored = localStorage.getItem(key);
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored === 'light' || stored === 'dark'
      ? stored
      : (prefersDark ? 'dark' : 'light');
    var root = document.documentElement;
    root.classList.add(theme);
    root.style.colorScheme = theme;
  } catch (_) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
        suppressHydrationWarning
      >
        <head>
          <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        </head>
        <body className="min-h-full flex flex-col">
          <PostHogUserIdentifier />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
