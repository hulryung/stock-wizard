import type { Metadata, Viewport } from 'next';
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
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Stock Wizard',
  },
  icons: {
    icon: [
      { url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
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
