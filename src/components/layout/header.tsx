import Link from 'next/link'

export function Header() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-900">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* 로고 영역 */}
        <div className="flex items-center space-x-2">
          <Link href="/" className="text-xl font-bold text-white">
            지피티코리아
          </Link>
        </div>

        {/* 네비게이션 메뉴 */}
        <nav className="flex items-center space-x-6 flex-1 justify-center">
          <Link
            href="/"
            className="text-zinc-400 hover:text-white transition-colors"
          >
            Home
          </Link>
          <Link
            href="/page1"
            className="text-zinc-400 hover:text-white transition-colors"
          >
            업로드
          </Link>
          <Link
            href="/page2"
            className="text-zinc-400 hover:text-white transition-colors"
          >
            결과
          </Link>
          <Link
            href="/page3"
            className="text-zinc-400 hover:text-white transition-colors"
          >
            Page3
          </Link>
        </nav>

        {/* 오른쪽 빈 공간 (균형을 위해) */}
        <div className="w-0"></div>
      </div>
    </header>
  )
}