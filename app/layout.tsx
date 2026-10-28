import type { Metadata } from "next";
import "./globals.css";
import SiteHeader from "./components/SiteHeader";

export const metadata: Metadata = {
  title: "마진/정산 계산기 | Codivo Studio",
  description:
    "네이버 스마트스토어 정산내역과 상품별 원가표를 업로드하면, 상품별 순이익과 마진율을 자동으로 계산해 드립니다.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
