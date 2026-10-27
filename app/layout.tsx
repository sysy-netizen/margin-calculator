import type { Metadata } from "next";
import "./globals.css";

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
        <nav className="cs-program-nav" aria-label="Seller Tools 프로그램">
          <ul>
            <li>
              <a className="cs-program-link" href="/tools/all-tools/">
                전체도구
              </a>
            </li>
            <li>
              <a className="cs-program-link" href="/tools/excel-converter/">
                엑셀변환기
              </a>
            </li>
            <li>
              <a className="cs-program-link cs-program-link--active" href="/tools/margin-calculator/" aria-current="page">
                마진계산기
              </a>
            </li>
          </ul>
        </nav>
        {children}
      </body>
    </html>
  );
}
