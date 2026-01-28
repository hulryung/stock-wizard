export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-4">
          <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-medium mb-2">투자 유의사항</p>
            <ul className="space-y-1 text-amber-700">
              <li>• 본 서비스는 투자 권유가 아닌 정보 제공 목적입니다.</li>
              <li>• 투자 결정은 본인의 판단과 책임 하에 이루어져야 합니다.</li>
              <li>• 과거 성과가 미래 수익을 보장하지 않습니다.</li>
            </ul>
          </div>

          <div className="flex flex-col items-center justify-between gap-4 pt-4 sm:flex-row">
            <p className="text-sm text-gray-500">
              © {currentYear} Stock Wizard. All rights reserved.
            </p>
            <p className="text-xs text-gray-400">
              AI가 발견한 숨겨진 연결고리로 역발상 투자 아이디어를 제공합니다.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
