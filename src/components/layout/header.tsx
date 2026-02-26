'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'

const DISABLED_ITEMS = ['키워드', '쇼핑', '광고관리', '계정관리', '고객센터']

export function Header() {
  const [statsOpen, setStatsOpen] = useState(false)
  const pathname = usePathname()

  const isStatsActive = pathname?.startsWith('/page2') || pathname?.startsWith('/page1')

  return (
    <header className="border-b border-zinc-800 bg-zinc-900">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* 로고 */}
        <div className="flex items-center">
          <Link href="/" className="text-xl font-bold text-white">
            DMP A-Bidding
          </Link>
        </div>

        {/* 네비게이션 메뉴 */}
        <nav className="flex flex-1 items-center justify-center space-x-8">
          {DISABLED_ITEMS.slice(0, 3).map(label => (
            <span key={label} className="cursor-not-allowed text-sm text-zinc-600 select-none">
              {label}
            </span>
          ))}

          {/* 통계 (활성) */}
          <div className="relative">
            <button
              onClick={() => setStatsOpen(v => !v)}
              onBlur={() => setTimeout(() => setStatsOpen(false), 150)}
              className={`text-sm transition-colors ${
                isStatsActive ? 'font-semibold text-white' : 'text-zinc-300 hover:text-white'
              }`}
            >
              통계
              <span className="ml-1 text-xs">▾</span>
            </button>
            {statsOpen && (
              <div className="absolute left-1/2 top-full z-50 mt-2 w-44 -translate-x-1/2 rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-xl">
                <Link
                  href="/page2"
                  onClick={() => setStatsOpen(false)}
                  className="block px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-700 hover:text-white"
                >
                  경쟁사 순위 조회
                </Link>
              </div>
            )}
          </div>

          {DISABLED_ITEMS.slice(3).map(label => (
            <span key={label} className="cursor-not-allowed text-sm text-zinc-600 select-none">
              {label}
            </span>
          ))}
        </nav>

        <div className="w-0" />
      </div>
    </header>
  )
}
