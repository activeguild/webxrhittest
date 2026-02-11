import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WebXR Hit Test",
  description: "WebXR AR Hit Test で GLB モデルを配置するアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
