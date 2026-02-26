'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { CompetitorRankData } from '@/types/competitor-rank'

const STORAGE_KEY = 'analysisPayload'

type HourKey = Extract<keyof CompetitorRankData, `hour_${string}`>

const HOUR_KEYS = Array.from(
  { length: 24 },
  (_, i) => `hour_${String(i).padStart(2, '0')}` as HourKey,
)

const DAYS = ['월', '화', '수', '목', '금', '토', '일'] as const

const CHART_COLORS = [
  '#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
  '#f97316', '#06b6d4', '#84cc16', '#ec4899', '#64748b',
]

const MODAL_PAGE_SIZE = 5

function getDefaultDates() {
  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  return { start: fmt(startOfMonth), end: fmt(yesterday) }
}

export default function Page2() {
  const router = useRouter()
  const [rawData, setRawData] = useState<CompetitorRankData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 검색 조건
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([])
  const [adAreaPc, setAdAreaPc] = useState(true)
  const [adAreaMobile, setAdAreaMobile] = useState(true)
  const [startDate, setStartDate] = useState(() => getDefaultDates().start)
  const [endDate, setEndDate] = useState(() => getDefaultDates().end)
  const [selectedDays, setSelectedDays] = useState<string[]>([...DAYS])

  // 키워드 모달
  const [isKeywordModalOpen, setIsKeywordModalOpen] = useState(false)
  const [keywordSearchText, setKeywordSearchText] = useState('')
  const [tempSelectedKeywords, setTempSelectedKeywords] = useState<string[]>([])
  const [modalPage, setModalPage] = useState(1)

  // 검색 결과
  const [hasSearched, setHasSearched] = useState(false)
  const [chartTab, setChartTab] = useState<'PC' | 'Mobile'>('PC')
  const [checkedRows, setCheckedRows] = useState<Set<string>>(new Set())

  useEffect(() => {
    try {
      const stored = typeof window !== 'undefined' ? sessionStorage.getItem(STORAGE_KEY) : null
      if (!stored) { router.replace('/page1'); return }
      const parsed = JSON.parse(stored) as { rawData: CompetitorRankData[] }
      if (!parsed.rawData?.length) { router.replace('/page1'); return }
      setRawData(parsed.rawData)
    } catch {
      router.replace('/page1')
    } finally {
      setIsLoading(false)
    }
  }, [router])

  const allKeywords = useMemo(
    () => Array.from(new Set(rawData.map(d => d.keyword))),
    [rawData],
  )

  const filteredModalKeywords = useMemo(() => {
    if (!keywordSearchText.trim()) return allKeywords
    return allKeywords.filter(k =>
      k.toLowerCase().includes(keywordSearchText.toLowerCase()),
    )
  }, [allKeywords, keywordSearchText])

  const modalTotalPages = Math.max(1, Math.ceil(filteredModalKeywords.length / MODAL_PAGE_SIZE))

  const pagedModalKeywords = useMemo(() => {
    const start = (modalPage - 1) * MODAL_PAGE_SIZE
    return filteredModalKeywords.slice(start, start + MODAL_PAGE_SIZE)
  }, [filteredModalKeywords, modalPage])

  const searchedData = useMemo(() => {
    if (!hasSearched) return []
    return rawData.filter(row => {
      const matchKeyword =
        selectedKeywords.length === 0 || selectedKeywords.includes(row.keyword)
      const matchArea =
        (adAreaPc && row.ad_area === 'PC') ||
        (adAreaMobile && row.ad_area === 'Mobile')
      return matchKeyword && matchArea
    })
  }, [hasSearched, rawData, selectedKeywords, adAreaPc, adAreaMobile])

  const chartData = useMemo(
    () => searchedData.filter(r => r.ad_area === chartTab),
    [searchedData, chartTab],
  )

  const handleOpenModal = () => {
    setTempSelectedKeywords([...selectedKeywords])
    setKeywordSearchText('')
    setModalPage(1)
    setIsKeywordModalOpen(true)
  }

  const handleKeywordToggle = (kw: string) => {
    setTempSelectedKeywords(prev =>
      prev.includes(kw) ? prev.filter(k => k !== kw) : [...prev, kw],
    )
  }

  const handleKeywordConfirm = () => {
    setSelectedKeywords(tempSelectedKeywords)
    setIsKeywordModalOpen(false)
  }

  const handleRemoveKeyword = (kw: string) => {
    setSelectedKeywords(prev => prev.filter(k => k !== kw))
  }

  const handleDayToggle = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day],
    )
  }

  const handleStartDateChange = (value: string) => {
    setStartDate(value)
    if (endDate) {
      const diff =
        (new Date(endDate).getTime() - new Date(value).getTime()) / 86_400_000
      if (diff > 90) {
        const newEnd = new Date(new Date(value).getTime() + 90 * 86_400_000)
        setEndDate(newEnd.toISOString().split('T')[0])
      }
    }
  }

  const handleEndDateChange = (value: string) => {
    if (startDate) {
      const diff =
        (new Date(value).getTime() - new Date(startDate).getTime()) / 86_400_000
      if (diff > 90) return
    }
    setEndDate(value)
  }

  const handleSearch = () => {
    if (!adAreaPc && !adAreaMobile) return
    setHasSearched(true)
    setCheckedRows(new Set())
  }

  const handleAllCheck = () => {
    if (checkedRows.size === searchedData.length && searchedData.length > 0) {
      setCheckedRows(new Set())
    } else {
      setCheckedRows(new Set(searchedData.map((_, i) => String(i))))
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-65px)] flex items-center justify-center">
        <p className="text-gray-500">데이터를 불러오는 중입니다...</p>
      </div>
    )
  }

  if (!rawData.length) {
    return (
      <div className="min-h-[calc(100vh-65px)] flex flex-col items-center justify-center gap-4">
        <p className="text-lg text-gray-700">데이터가 없습니다. 다시 업로드 해주세요.</p>
        <Button asChild>
          <Link href="/page1">업로드 페이지로 이동</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-65px)] px-6 py-8 bg-[#f5f5f7]">
      <div className="flex flex-col gap-6">

        {/* ── 검색 영역 ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex flex-col gap-5">

            {/* 키워드 */}
            <div className="flex items-start gap-4">
              <span className="w-20 shrink-0 pt-1 text-sm font-semibold text-gray-700">
                키워드
              </span>
              <div className="flex flex-wrap items-center gap-2 flex-1">
                {selectedKeywords.map(kw => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
                  >
                    {kw}
                    <button
                      onClick={() => handleRemoveKeyword(kw)}
                      className="text-blue-400 hover:text-blue-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <button
                  onClick={handleOpenModal}
                  className="inline-flex items-center gap-1 rounded-full border border-blue-300 px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <span className="text-base leading-none">+</span> 추가
                </button>
              </div>
            </div>

            {/* 광고 영역 */}
            <div className="flex items-center gap-4">
              <span className="w-20 shrink-0 text-sm font-semibold text-gray-700">
                광고 영역
              </span>
              <div className="flex items-center gap-5">
                <label className="flex cursor-pointer items-center gap-2">
                  <Checkbox
                    checked={adAreaPc}
                    onCheckedChange={v => setAdAreaPc(!!v)}
                  />
                  <span className="text-sm text-gray-700">PC</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <Checkbox
                    checked={adAreaMobile}
                    onCheckedChange={v => setAdAreaMobile(!!v)}
                  />
                  <span className="text-sm text-gray-700">Mobile</span>
                </label>
              </div>
            </div>

            {/* 기간 */}
            <div className="flex items-center gap-4">
              <span className="w-20 shrink-0 text-sm font-semibold text-gray-700">
                기간
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={e => handleStartDateChange(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <span className="text-sm text-gray-400">~</span>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={e => handleEndDateChange(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <span className="ml-1 text-xs text-gray-400">(최대 90일)</span>
              </div>
            </div>

            {/* 요일 설정 */}
            <div className="flex items-center gap-4">
              <span className="w-20 shrink-0 text-sm font-semibold text-gray-700">
                요일 설정
              </span>
              <div className="flex flex-wrap items-center gap-4">
                {DAYS.map(day => (
                  <label key={day} className="flex cursor-pointer items-center gap-1.5">
                    <Checkbox
                      checked={selectedDays.includes(day)}
                      onCheckedChange={() => handleDayToggle(day)}
                    />
                    <span className="text-sm text-gray-700">{day}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 flex justify-end border-t border-gray-100 pt-4">
            <Button
              onClick={handleSearch}
              disabled={!adAreaPc && !adAreaMobile}
              className="bg-blue-600 px-8 text-white hover:bg-blue-700"
            >
              검색
            </Button>
          </div>
        </div>

        {/* ── 검색 결과 ── */}
        {hasSearched && (
          <>
            {/* 꺾은선 그래프 */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="mb-5 flex items-center gap-2">
                {(['PC', 'Mobile'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setChartTab(tab)}
                    className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-all ${
                      chartTab === tab
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-500 hover:bg-gray-100'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <LineChart data={chartData} adArea={chartTab} />
            </div>

            {/* RAW 테이블 */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-5 py-3.5">
                <h3 className="text-sm font-semibold text-gray-700">데이터 원본</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr className="text-gray-600">
                      <th className="px-3 py-3 text-center">
                        <Checkbox
                          checked={
                            searchedData.length > 0 &&
                            checkedRows.size === searchedData.length
                          }
                          onCheckedChange={handleAllCheck}
                        />
                      </th>
                      <th className="whitespace-nowrap px-3 py-3 text-left font-semibold">
                        키워드
                      </th>
                      <th className="whitespace-nowrap px-3 py-3 text-left font-semibold">
                        광고 영역
                      </th>
                      <th className="whitespace-nowrap px-3 py-3 text-left font-semibold">
                        광고주
                      </th>
                      <th className="whitespace-nowrap px-3 py-3 text-right font-semibold">
                        평균
                      </th>
                      {HOUR_KEYS.map(h => (
                        <th
                          key={h}
                          className="whitespace-nowrap px-2 py-3 text-right font-semibold"
                        >
                          {h.replace('hour_', '')}시
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {searchedData.map((row, idx) => {
                      const key = String(idx)
                      return (
                        <tr
                          key={key}
                          className={`transition-colors hover:bg-gray-50 ${
                            checkedRows.has(key) ? 'bg-blue-50' : ''
                          }`}
                        >
                          <td className="px-3 py-2.5 text-center">
                            <Checkbox
                              checked={checkedRows.has(key)}
                              onCheckedChange={() =>
                                setCheckedRows(prev => {
                                  const next = new Set(prev)
                                  if (next.has(key)) { next.delete(key) } else { next.add(key) }
                                  return next
                                })
                              }
                            />
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-gray-700">
                            {row.keyword}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-gray-700">
                            {row.ad_area}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-gray-700">
                            {row.advertiser}
                          </td>
                          <td className="px-3 py-2.5 text-right text-gray-700">
                            {row.average > 0 ? row.average.toFixed(2) : '-'}
                          </td>
                          {HOUR_KEYS.map(h => (
                            <td
                              key={h}
                              className="px-2 py-2.5 text-right text-gray-700"
                            >
                              {row[h] > 0 ? row[h].toFixed(1) : '-'}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                    {searchedData.length === 0 && (
                      <tr>
                        <td
                          colSpan={5 + HOUR_KEYS.length}
                          className="px-4 py-8 text-center text-gray-400"
                        >
                          검색 결과가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── 키워드 선택 모달 ── */}
      <Dialog open={isKeywordModalOpen} onOpenChange={setIsKeywordModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>키워드 선택</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Input
              placeholder="키워드 검색..."
              value={keywordSearchText}
              onChange={e => {
                setKeywordSearchText(e.target.value)
                setModalPage(1)
              }}
            />
            <div className="max-h-60 overflow-y-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                      선택
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                      키워드
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredModalKeywords.length === 0 ? (
                    <tr>
                      <td
                        colSpan={2}
                        className="px-4 py-6 text-center text-xs text-gray-400"
                      >
                        검색 결과가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    pagedModalKeywords.map(kw => (
                      <tr
                        key={kw}
                        className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                          tempSelectedKeywords.includes(kw) ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => handleKeywordToggle(kw)}
                      >
                        <td className="px-4 py-2.5">
                          <Checkbox
                            checked={tempSelectedKeywords.includes(kw)}
                            onCheckedChange={() => handleKeywordToggle(kw)}
                          />
                        </td>
                        <td className="px-4 py-2.5 text-gray-700">{kw}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* 페이지네이션 */}
            {modalTotalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                <span className="text-xs text-gray-400">
                  {filteredModalKeywords.length}개 중{' '}
                  {(modalPage - 1) * MODAL_PAGE_SIZE + 1}–
                  {Math.min(modalPage * MODAL_PAGE_SIZE, filteredModalKeywords.length)}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setModalPage(p => Math.max(1, p - 1))}
                    disabled={modalPage === 1}
                    className="rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                  >
                    ‹
                  </button>
                  <span className="min-w-[56px] text-center text-xs text-gray-600">
                    {modalPage} / {modalTotalPages}
                  </span>
                  <button
                    onClick={() => setModalPage(p => Math.min(modalTotalPages, p + 1))}
                    disabled={modalPage === modalTotalPages}
                    className="rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                  >
                    ›
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-gray-500">
                {tempSelectedKeywords.length}개 선택됨
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsKeywordModalOpen(false)}
                >
                  취소
                </Button>
                <Button
                  size="sm"
                  onClick={handleKeywordConfirm}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  선택 완료
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── LineChart ────────────────────────────────────────────────

interface TooltipState {
  x: number
  y: number
  advertiser: string
  rank: number
  hour: number
}

function LineChart({
  data,
  adArea,
}: {
  data: CompetitorRankData[]
  adArea: 'PC' | 'Mobile'
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(800)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [highlightedIdx, setHighlightedIdx] = useState<number | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width)
    })
    obs.observe(el)
    setContainerWidth(el.clientWidth)
    return () => obs.disconnect()
  }, [])

  // 데이터 변경 시 하이라이트 초기화
  useEffect(() => {
    setHighlightedIdx(null)
  }, [data])

  const margin = { top: 20, right: 24, bottom: 44, left: 48 }
  const svgHeight = 340
  const cw = Math.max(containerWidth - margin.left - margin.right, 100)
  const ch = svgHeight - margin.top - margin.bottom
  const hours = Array.from({ length: 24 }, (_, i) => i)

  // PC: 1~10, Mobile: 1~5 고정
  const maxRank = adArea === 'PC' ? 10 : 5
  const yTicks = Array.from({ length: maxRank }, (_, i) => i + 1)

  const series = data.map((row, idx) => ({
    row,
    color: CHART_COLORS[idx % CHART_COLORS.length],
    points: hours
      .map(h => {
        const key = `hour_${String(h).padStart(2, '0')}` as HourKey
        const rank = row[key]
        return rank > 0 ? { h, rank } : null
      })
      .filter((p): p is { h: number; rank: number } => p !== null),
  }))

  const xScale = (h: number) => (h / 23) * cw
  // rank 1 = 상단 (y=0), maxRank = 하단 (y=ch)
  const yScale = (rank: number) => ((rank - 1) / (maxRank - 1)) * ch

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-400">
        표시할 데이터가 없습니다.
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative w-full select-none">
      <svg width={containerWidth} height={svgHeight}>
        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* 수평 그리드 + Y 눈금 (전체 정수 표시) */}
          {yTicks.map(tick => (
            <g key={tick}>
              <line
                x1={0} y1={yScale(tick)}
                x2={cw} y2={yScale(tick)}
                stroke="#e5e7eb" strokeWidth={1}
              />
              <text
                x={-8} y={yScale(tick) + 4}
                textAnchor="end" fontSize={11} fill="#6b7280"
              >
                {tick}
              </text>
            </g>
          ))}

          {/* 수직 그리드 (6시간 간격) */}
          {[0, 6, 12, 18, 23].map(h => (
            <line
              key={h}
              x1={xScale(h)} y1={0}
              x2={xScale(h)} y2={ch}
              stroke="#e5e7eb" strokeWidth={1}
            />
          ))}

          {/* 축 */}
          <line x1={0} y1={ch} x2={cw} y2={ch} stroke="#d1d5db" />
          <line x1={0} y1={0} x2={0} y2={ch} stroke="#d1d5db" />

          {/* X 축 레이블 */}
          {hours.map(h => (
            <text
              key={h}
              x={xScale(h)} y={ch + 18}
              textAnchor="middle" fontSize={10} fill="#6b7280"
            >
              {String(h).padStart(2, '0')}
            </text>
          ))}
          <text
            x={cw / 2} y={ch + 38}
            textAnchor="middle" fontSize={11} fill="#9ca3af"
          >
            시간대
          </text>

          {/* Y 축 레이블 */}
          <text
            transform="rotate(-90)"
            x={-ch / 2} y={-36}
            textAnchor="middle" fontSize={11} fill="#9ca3af"
          >
            순위
          </text>

          {/* 시리즈 라인 + 마커 */}
          {series.map(({ row, color, points }, idx) => {
            if (points.length < 2) return null
            const isHighlighted = highlightedIdx === idx
            const isDimmed = highlightedIdx !== null && !isHighlighted
            const d = points.reduce(
              (acc, p, i) =>
                acc +
                (i === 0
                  ? `M ${xScale(p.h)} ${yScale(p.rank)}`
                  : ` L ${xScale(p.h)} ${yScale(p.rank)}`),
              '',
            )
            return (
              <g
                key={`series-${idx}`}
                style={{ opacity: isDimmed ? 0.2 : 1, transition: 'opacity 0.15s' }}
              >
                <path
                  d={d}
                  fill="none"
                  stroke={color}
                  strokeWidth={isHighlighted ? 3 : 2}
                />
                {points.map((p, pi) => (
                  <circle
                    key={pi}
                    cx={xScale(p.h)}
                    cy={yScale(p.rank)}
                    r={isHighlighted ? 5.5 : 4}
                    fill={color}
                    stroke="#fff"
                    strokeWidth={1.5}
                    style={{ cursor: 'crosshair' }}
                    onMouseEnter={e => {
                      const rect = containerRef.current?.getBoundingClientRect()
                      if (!rect) return
                      setTooltip({
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                        advertiser: row.advertiser,
                        rank: p.rank,
                        hour: p.h,
                      })
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ))}
              </g>
            )
          })}
        </g>
      </svg>

      {/* 범례 (클릭으로 강조) */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 px-2">
        {series.map(({ row, color }, idx) => {
          const isHighlighted = highlightedIdx === idx
          const isDimmed = highlightedIdx !== null && !isHighlighted
          return (
            <button
              key={idx}
              onClick={() =>
                setHighlightedIdx(prev => (prev === idx ? null : idx))
              }
              className="flex items-center gap-1.5 text-xs transition-opacity"
              style={{ opacity: isDimmed ? 0.35 : 1 }}
            >
              <span
                className="inline-block h-3 w-3 shrink-0 rounded-full"
                style={{
                  backgroundColor: color,
                  boxShadow: isHighlighted ? `0 0 0 2px ${color}40` : undefined,
                }}
              />
              <span
                className={
                  isHighlighted
                    ? 'font-semibold text-gray-800'
                    : 'text-gray-600'
                }
              >
                {row.advertiser}
              </span>
            </button>
          )
        })}
      </div>

      {/* 툴팁 */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 min-w-[130px] rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg"
          style={{ left: tooltip.x + 14, top: tooltip.y - 12 }}
        >
          <p className="font-semibold leading-tight">{tooltip.advertiser}</p>
          <p className="mt-0.5 text-slate-300">
            {String(tooltip.hour).padStart(2, '0')}시 · 순위{' '}
            {tooltip.rank.toFixed(1)}
          </p>
        </div>
      )}
    </div>
  )
}
