import type { Metadata } from "next";
import { Inter, Archivo_Black } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { AdminProvider } from "@/lib/admin-context";

const inter = Inter({ subsets: ["latin"] });
const archivoBlack = Archivo_Black({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-archivo-black",
});

export const metadata: Metadata = {
  title: "MiniScale",
  description: "存储和查询各品牌模型车包装盒尺寸与轮距参数，自动计算收纳盒车轮限位位置",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.className} ${archivoBlack.variable}`}>
        <AdminProvider>
          <Navbar />
          <main className="container mx-auto max-w-6xl px-4 py-8">
            {children}
          </main>
        </AdminProvider>
      </body>
    </html>
  );
}
