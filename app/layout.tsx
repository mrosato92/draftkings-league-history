import type { Metadata, Viewport } from "next";
import "@fontsource-variable/dm-sans";
import "@fontsource/barlow-condensed/500.css";
import "@fontsource/barlow-condensed/600.css";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "The League Archive | DraftKings League History",
    template: "%s | The League Archive",
  },
  description:
    "Seven seasons of DraftKings fantasy football. Career records, rivalries, schedule luck, and the receipts behind every result. Regular season, 2019–2025.",
  applicationName: "The League Archive",
};
export const viewport: Viewport = {
  themeColor: "#101211",
  colorScheme: "dark",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
