import type { Metadata } from 'next';
import { Noto_Sans_KR } from 'next/font/google';
import { Header, Footer } from '@/components';
import './globals.css';

const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-noto-sans-kr',
});

export const metadata: Metadata = {
  title: 'Stock Wizard - AI 역발상 주식 추천',
  description: 'AI가 발견한 숨겨진 연결고리로 예상치 못한 주식을 추천합니다. 뉴스 분석 기반 역발상 투자 아이디어.',
  keywords: ['주식', '투자', 'AI', '역발상', '추천', '뉴스 분석'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={notoSansKR.variable}>
      <body className={`${notoSansKR.className} flex min-h-screen flex-col bg-gray-50 text-gray-900 antialiased`}>
        <Header />
        <main className="flex-1 py-8">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
