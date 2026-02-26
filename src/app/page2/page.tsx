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
import type { AiRankInsight, CompetitorRankData } from '@/types/competitor-rank'

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

// 비딩 스케줄 색상 팔레트
const SCHEDULE_COLORS = ['#5c6bc0', '#aed581', '#4dd0e1', '#d4e157', '#7986cb'] as const
const SCHEDULE_HOURS = Array.from({ length: 24 }, (_, i) => i)

type ScheduleItem = {
  adOn: boolean
  targetRank: string
  maxCpc: string
  minCpc: string
}

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

  // AI 추천 순위
  const [isAiPopupOpen, setIsAiPopupOpen] = useState(false)
  const [aiExcludeAdvertiser, setAiExcludeAdvertiser] = useState('없음')
  const [aiTargetRanks, setAiTargetRanks] = useState<number[] | null>(null)
  const [aiReason, setAiReason] = useState<string[] | null>(null)
  const [isAiLoading, setIsAiLoading] = useState(false)

  // 비딩 스케줄 등록
  const [isBiddingOpen, setIsBiddingOpen] = useState(false)
  const [biddingTitle, setBiddingTitle] = useState('')
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>(
    SCHEDULE_COLORS.map(() => ({ adOn: true, targetRank: '5', maxCpc: '', minCpc: '' })),
  )
  const [activeColorIdx, setActiveColorIdx] = useState(0)
  const [isDeleteMode, setIsDeleteMode] = useState(false)
  const [scheduleGrid, setScheduleGrid] = useState<Record<string, number>>({})
  const [isDragging, setIsDragging] = useState(false)

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

  const advertiserList = useMemo(
    () => Array.from(new Set(chartData.map(r => r.advertiser))),
    [chartData],
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
    setAiTargetRanks(null)
    setAiReason(null)
  }

  const handleAiConfirm = async () => {
    setIsAiPopupOpen(false)
    setIsAiLoading(true)
    setAiTargetRanks(null)
    setAiReason(null)
    try {
      const payload = searchedData.filter(r => {
        if (r.ad_area !== chartTab) return false
        if (aiExcludeAdvertiser !== '없음' && r.advertiser === aiExcludeAdvertiser) return false
        return true
      })
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: payload }),
      })
      const json = await res.json() as { insight?: AiRankInsight; error?: string }
      if (json.insight) {
        const schedule = json.insight.optimalRankSchedule
        const ranks = Array.from({ length: 24 }, (_, h) => {
          const key = `hour${String(h).padStart(2, '0')}`
          return parseInt(schedule[key] ?? '1', 10) || 1
        })
        setAiTargetRanks(ranks)
        setAiReason(json.insight.optimalRankScheduleReason ?? null)
      }
    } catch (e) {
      console.error('AI 추천 순위 오류:', e)
    } finally {
      setIsAiLoading(false)
    }
  }

  // 탭 전환 시 AI 추천 순위 초기화
  useEffect(() => {
    setAiTargetRanks(null)
    setAiReason(null)
  }, [chartTab])

  const handleDownload = () => {
    const headers = [
      '키워드', '광고 영역', '광고주', '평균',
      ...HOUR_KEYS.map(h => h.replace('hour_', '') + '시'),
    ]
    const rows = searchedData.map(row => [
      row.keyword, row.ad_area, row.advertiser,
      row.average > 0 ? row.average.toFixed(2) : '-',
      ...HOUR_KEYS.map(h => row[h] > 0 ? row[h].toFixed(1) : '-'),
    ])
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${String(v)}"`).join(','))
      .join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rank_data_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCellInteract = (dayIdx: number, hour: number) => {
    const cellKey = `${dayIdx}-${hour}`
    setScheduleGrid(prev => {
      const next = { ...prev }
      if (isDeleteMode) {
        delete next[cellKey]
      } else {
        next[cellKey] = activeColorIdx
      }
      return next
    })
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
          <h2 className="mb-5 text-base font-bold text-gray-900">경쟁사 순위 조회</h2>
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
              <LineChart
                data={chartData}
                adArea={chartTab}
                aiTargetRanks={aiTargetRanks}
                onRemoveAiTargetRanks={() => { setAiTargetRanks(null); setAiReason(null) }}
              />

              {/* 하단 버튼 */}
              <div className="mt-5 flex items-center justify-center gap-3 border-t border-gray-100 pt-4">
                <button
                  onClick={() => {
                    setAiExcludeAdvertiser('없음')
                    setIsAiPopupOpen(true)
                  }}
                  disabled={isAiLoading}
                  className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-5 py-2 text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isAiLoading ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      분석 중...
                    </>
                  ) : 'AI 추천 순위'}
                </button>
                <button
                  onClick={() => {
                    setScheduleGrid({})
                    setActiveColorIdx(0)
                    setIsDeleteMode(false)
                    setIsBiddingOpen(true)
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                >
                  비딩 스케줄 등록
                </button>
              </div>

              {/* AI 분석 근거 */}
              {aiReason && aiReason.length > 0 && (
                <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50 px-5 py-4">
                  <p className="mb-2.5 text-xs font-semibold text-violet-700">AI 분석 근거</p>
                  <ul className="flex flex-col gap-1.5">
                    {aiReason.map((r, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs leading-relaxed text-violet-900">
                        <span className="mt-0.5 shrink-0 text-violet-400">•</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* RAW 테이블 */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
                <h3 className="text-sm font-semibold text-gray-700">데이터 원본</h3>
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  다운로드
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr className="text-gray-600">
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
                    {searchedData.map((row, idx) => (
                        <tr
                          key={idx}
                          className="transition-colors hover:bg-gray-50"
                        >
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
                    ))}
                    {searchedData.length === 0 && (
                      <tr>
                        <td
                          colSpan={4 + HOUR_KEYS.length}
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

      {/* ── 비딩 스케줄 등록 팝업 ── */}
      <Dialog open={isBiddingOpen} onOpenChange={setIsBiddingOpen}>
        <DialogContent className="max-w-5xl overflow-hidden p-0">
          <DialogHeader className="border-b border-gray-100 px-6 py-4">
            <DialogTitle>스케줄 설정</DialogTitle>
          </DialogHeader>
          <div className="flex max-h-[80vh] flex-col gap-5 overflow-y-auto px-6 py-5">

            {/* 제목 */}
            <div className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-sm font-semibold text-gray-700">제목</span>
              <Input
                placeholder="스케줄 제목 입력"
                value={biddingTitle}
                onChange={e => setBiddingTitle(e.target.value)}
                className="max-w-xs"
              />
            </div>

            {/* 스케줄 항목 (5개 색상별 설정) */}
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-gray-700">스케줄 항목</p>
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr className="text-gray-600">
                      <th className="px-3 py-2 text-center font-semibold">색상</th>
                      <th className="px-3 py-2 text-center font-semibold">광고 ON/OFF</th>
                      <th className="px-3 py-2 text-center font-semibold">목표 순위</th>
                      <th className="px-3 py-2 text-center font-semibold">최대 CPC</th>
                      <th className="px-3 py-2 text-center font-semibold">최소 CPC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {SCHEDULE_COLORS.map((color, i) => (
                      <tr key={i} className={activeColorIdx === i && !isDeleteMode ? 'bg-blue-50' : ''}>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => { setActiveColorIdx(i); setIsDeleteMode(false) }}
                            className="inline-block h-5 w-5 rounded-full transition-all"
                            style={{
                              backgroundColor: color,
                              boxShadow: activeColorIdx === i && !isDeleteMode ? `0 0 0 2px #1d4ed8` : `0 0 0 2px transparent`,
                              outline: activeColorIdx === i && !isDeleteMode ? '2px solid #1d4ed8' : '2px solid transparent',
                              outlineOffset: '2px',
                            }}
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => setScheduleItems(prev => {
                              const next = [...prev]
                              next[i] = { ...next[i], adOn: !next[i].adOn }
                              return next
                            })}
                            className={`rounded-full px-3 py-0.5 text-xs font-semibold transition-colors ${
                              scheduleItems[i].adOn
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {scheduleItems[i].adOn ? 'ON' : 'OFF'}
                          </button>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={scheduleItems[i].targetRank}
                            onChange={e => setScheduleItems(prev => {
                              const next = [...prev]
                              next[i] = { ...next[i], targetRank: e.target.value }
                              return next
                            })}
                            className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
                          >
                            {Array.from({ length: 10 }, (_, r) => (
                              <option key={r + 1} value={String(r + 1)}>{r + 1}위</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            placeholder="최대 CPC"
                            value={scheduleItems[i].maxCpc}
                            onChange={e => setScheduleItems(prev => {
                              const next = [...prev]
                              next[i] = { ...next[i], maxCpc: e.target.value }
                              return next
                            })}
                            className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            placeholder="최소 CPC"
                            value={scheduleItems[i].minCpc}
                            onChange={e => setScheduleItems(prev => {
                              const next = [...prev]
                              next[i] = { ...next[i], minCpc: e.target.value }
                              return next
                            })}
                            className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 색상 선택 + 삭제 모드 버튼 */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-700">페인트</span>
              <div className="flex items-center gap-2">
                {SCHEDULE_COLORS.map((color, i) => (
                  <button
                    key={i}
                    onClick={() => { setActiveColorIdx(i); setIsDeleteMode(false) }}
                    className="h-6 w-6 rounded-full transition-all"
                    style={{
                      backgroundColor: color,
                      outline: activeColorIdx === i && !isDeleteMode ? '2px solid #1d4ed8' : '2px solid transparent',
                      outlineOffset: '2px',
                    }}
                  />
                ))}
                <button
                  onClick={() => setIsDeleteMode(d => !d)}
                  className={`ml-2 rounded-lg border px-3 py-1 text-xs font-semibold transition-colors ${
                    isDeleteMode
                      ? 'border-red-300 bg-red-50 text-red-600'
                      : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  삭제
                </button>
              </div>
            </div>

            {/* 7×24 스케줄 그리드 */}
            <div
              className="overflow-x-auto rounded-lg border border-gray-200"
              onMouseLeave={() => setIsDragging(false)}
            >
              <div
                className="select-none"
                onMouseUp={() => setIsDragging(false)}
                style={{ cursor: isDeleteMode ? 'cell' : 'crosshair' }}
              >
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-10 w-10 bg-gray-50 px-2 py-1.5 text-center text-xs font-medium text-gray-500">
                        요일
                      </th>
                      {SCHEDULE_HOURS.map(h => (
                        <th
                          key={h}
                          className="min-w-[28px] bg-gray-50 px-1 py-1.5 text-center text-xs font-medium text-gray-500"
                        >
                          {String(h).padStart(2, '0')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS.map((day, dayIdx) => (
                      <tr key={dayIdx}>
                        <td className="sticky left-0 z-10 border-r border-gray-200 bg-gray-50 px-2 py-1 text-center text-xs font-medium text-gray-600">
                          {day}
                        </td>
                        {SCHEDULE_HOURS.map(hour => {
                          const cellKey = `${dayIdx}-${hour}`
                          const colorIdx = scheduleGrid[cellKey]
                          const cellColor = colorIdx !== undefined ? SCHEDULE_COLORS[colorIdx] : undefined
                          return (
                            <td
                              key={hour}
                              className="border border-gray-100 p-0"
                              style={{ backgroundColor: cellColor ?? undefined }}
                              onMouseDown={() => {
                                setIsDragging(true)
                                handleCellInteract(dayIdx, hour)
                              }}
                              onMouseEnter={() => {
                                if (isDragging) handleCellInteract(dayIdx, hour)
                              }}
                            >
                              <div className="h-7 w-full" />
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 저장 / 취소 */}
            <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
              <Button variant="outline" size="sm" onClick={() => setIsBiddingOpen(false)}>
                취소
              </Button>
              <Button
                size="sm"
                className="bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => setIsBiddingOpen(false)}
              >
                저장
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── AI 추천 순위 팝업 ── */}
      <Dialog open={isAiPopupOpen} onOpenChange={setIsAiPopupOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>AI 추천 순위</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-600">
              최적 순위를 도출하고자 하는 광고주를 선택해주세요.
            </p>
            <select
              value={aiExcludeAdvertiser}
              onChange={e => setAiExcludeAdvertiser(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-300"
            >
              <option value="없음">없음</option>
              {advertiserList.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400">
              * 선택한 광고주를 제외한 경쟁 데이터 기반으로 최적 순위를 산출합니다.
              &apos;없음&apos; 선택 시 전체 광고주 데이터를 활용합니다.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAiPopupOpen(false)}
              >
                취소
              </Button>
              <Button
                size="sm"
                onClick={handleAiConfirm}
                className="bg-violet-600 text-white hover:bg-violet-700"
              >
                확인
              </Button>
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
  aiTargetRanks,
  onRemoveAiTargetRanks,
}: {
  data: CompetitorRankData[]
  adArea: 'PC' | 'Mobile'
  aiTargetRanks?: number[] | null
  onRemoveAiTargetRanks?: () => void
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

          {/* AI 추천 순위 오버레이 라인 */}
          {aiTargetRanks && (() => {
            const d = hours.reduce(
              (acc, h, i) =>
                acc +
                (i === 0
                  ? `M ${xScale(h)} ${yScale(Math.min(aiTargetRanks[h], maxRank))}`
                  : ` L ${xScale(h)} ${yScale(Math.min(aiTargetRanks[h], maxRank))}`),
              '',
            )
            return (
              <g>
                <path
                  d={d}
                  fill="none"
                  stroke="#18181b"
                  strokeWidth={2.5}
                  strokeDasharray="8 4"
                />
                {hours.map(h => (
                  <circle
                    key={h}
                    cx={xScale(h)}
                    cy={yScale(Math.min(aiTargetRanks[h], maxRank))}
                    r={3.5}
                    fill="#18181b"
                    stroke="#fff"
                    strokeWidth={1.5}
                    style={{ cursor: 'crosshair' }}
                    onMouseEnter={e => {
                      const rect = containerRef.current?.getBoundingClientRect()
                      if (!rect) return
                      setTooltip({
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                        advertiser: 'AI 추천 순위',
                        rank: aiTargetRanks[h],
                        hour: h,
                      })
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ))}
              </g>
            )
          })()}
        </g>
      </svg>

      {/* 범례 (클릭으로 강조) */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-2">
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

        {/* AI 추천 순위 범례 */}
        {aiTargetRanks && (
          <div className="ml-2 flex items-center gap-1.5 border-l border-gray-200 pl-4 text-xs">
            <svg width="24" height="12" className="shrink-0">
              <line
                x1="0" y1="6" x2="24" y2="6"
                stroke="#18181b" strokeWidth="2.5" strokeDasharray="7 3"
              />
              <circle cx="12" cy="6" r="3" fill="#18181b" />
            </svg>
            <span className="font-semibold text-gray-800">AI 추천 순위</span>
            {onRemoveAiTargetRanks && (
              <button
                onClick={onRemoveAiTargetRanks}
                className="ml-1 text-base leading-none text-gray-400 hover:text-gray-700"
                title="AI 추천 순위 제거"
              >
                ×
              </button>
            )}
          </div>
        )}
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
