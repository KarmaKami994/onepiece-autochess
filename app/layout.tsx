import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title: {
    default: "Grand Line Auto Chess",
    template: "%s · Grand Line Auto Chess",
  },
  description:
    "A private, local-only auto-battler fan prototype set on the Grand Line.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "Grand Line Auto Chess",
    description: "Build a crew. Rule the seas. A local auto-battler prototype.",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
