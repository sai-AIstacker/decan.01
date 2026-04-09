import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";

// ── UI body font — Inter: the gold standard for premium interfaces
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  axes: ["opsz"],           // optical sizing axis for crisp small text
  display: "swap",
});

// ── Display / heading font — Plus Jakarta Sans: modern, premium, expressive
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

// ── Monospace — JetBrains Mono: best-in-class for numbers & data
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Decan School — Portal",
  description: "School management portal with role-based access",
  icons: {
    icon: "/ssvm-logo.png",
    shortcut: "/ssvm-logo.png",
    apple: "/ssvm-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jakarta.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#f5f5f7] text-[#1d1d1f]">
         <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            forcedTheme="light"
            disableTransitionOnChange
         >
            {children}
            <Toaster />
         </ThemeProvider>
      </body>
    </html>
  );
}
