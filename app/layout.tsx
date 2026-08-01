import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pawlour — Book your groom",
  description: "Book your dog's next groom, powered by Pawlour",
};

export const viewport: Viewport = {
  themeColor: "#14261F",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-[#FAF6EF]">{children}</body>
    </html>
  );
}
