import type { Metadata } from "next";
import localFont from "next/font/local";
import { SITE_ORIGIN } from "@/lib/site";
import "./globals.css";

// The same two faces the card uses, from the same files, at every weight the card uses:
// the preview draws a Tiles symbol in Archivo 700, and a weight the browser has to
// synthesize is a drift on the default style's most prominent glyph. Commit Mono ships
// 400 and 700 only. GOTCHAS 014, 047.
const commitMono = localFont({
  src: [
    { path: "../public/fonts/CommitMono-400-Regular.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/CommitMono-700-Regular.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-commit-mono",
  display: "swap",
});

const archivo = localFont({
  src: [
    { path: "../public/fonts/Archivo-Regular.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/Archivo-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../public/fonts/Archivo-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: "Stackshot",
  description: "A designed PNG of a GitHub repo's tech stack, for your README.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} ${commitMono.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
