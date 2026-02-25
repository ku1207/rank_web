'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import type { ClaudeInsight, CompetitorRankData } from '@/types/competitor-rank'

const STORAGE_KEY = 'analysisPayload'

type TabKey = 'insight' | 'advertiser' | 'pc' | 'mobile'

const navLabels: Record<TabKey, string> = {
  insight: '핵심 발견 사항',
  advertiser: '광고주별 평균 순위',
  pc: 'PC 순위 RAW',
  mobile: 'Mobile 순위 RAW',
}

type AdvertiserComparisonRow = {
  advertiser: string
  url: string
  pcAvg: number
  mobileAvg: number
  diff: number
}

type NormalizedInsight = {
  overall: string[]
  media: string[]
  competitor: { label: string; items: string[] }[]
  golden: { label: string; value: string }[]
  actions: string[]
}

type HourKey = Extract<keyof CompetitorRankData, `hour_${string}`>

function buildAdvertiserComparison(rawData: CompetitorRankData[]): AdvertiserComparisonRow[] {
  const byAdvertiser = new Map<string, { pc: CompetitorRankData[]; mobile: CompetitorRankData[] }>()

  rawData.forEach((item) => {
    if (!byAdvertiser.has(item.advertiser)) {
      byAdvertiser.set(item.advertiser, { pc: [], mobile: [] })
    }
    const bucket = byAdvertiser.get(item.advertiser)!
    if (item.ad_area === 'PC') bucket.pc.push(item)
    else bucket.mobile.push(item)
  })

  return Array.from(byAdvertiser.entries()).map(([advertiser, data]) => {
    const pcAvg = data.pc.length ? calculateAdvertiserAverage(data.pc) : 0
    const mobileAvg = data.mobile.length ? calculateAdvertiserAverage(data.mobile) : 0
    const url = data.pc[0]?.url || data.mobile[0]?.url || ''
    return {
      advertiser,
      url,
      pcAvg: Number(pcAvg.toFixed(2)),
      mobileAvg: Number(mobileAvg.toFixed(2)),
      diff: Number(Math.abs(pcAvg - mobileAvg).toFixed(2)),
    }
  })
}

function calculateAdvertiserAverage(items: CompetitorRankData[]): number {
  const rowAverages = items.map((item) => {
    const values: number[] = []
    for (let i = 0; i < 24; i++) {
      const key = `hour_${String(i).padStart(2, '0')}` as HourKey
      const v = item[key]
      if (v > 0) values.push(v)
    }
    if (!values.length) return 0
    return values.reduce((s, v) => s + v, 0) / values.length
  })

  if (!rowAverages.length) return 0
  return rowAverages.reduce((s, v) => s + v, 0) / rowAverages.length
}

export default function Page2() {
  const [isLoading, setIsLoading] = useState(true)
  const [rawData, setRawData] = useState<CompetitorRankData[]>([])
  const [insight, setInsight] = useState<ClaudeInsight | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('insight')
  const [visibleInsightSection, setVisibleInsightSection] = useState<string | null>(null)
  const [pcExpanded, setPcExpanded] = useState(false)
  const [mobileExpanded, setMobileExpanded] = useState(false)
  const router = useRouter()

  useEffect(() => {
    try {
      const stored = typeof window !== 'undefined' ? sessionStorage.getItem(STORAGE_KEY) : null
      if (!stored) {
        router.replace('/page1')
        return
      }
      const parsed = JSON.parse(stored) as {
        rawData: CompetitorRankData[]
        insight: ClaudeInsight
      }

      if (!parsed.rawData?.length || !parsed.insight) {
        router.replace('/page1')
        return
      }

      setRawData(parsed.rawData)
      setInsight(parsed.insight)
    } catch (error) {
      console.error('결과 로드 중 오류:', error)
      router.replace('/page1')
    } finally {
      setIsLoading(false)
    }
  }, [router])

  const summary = useMemo(() => {
    if (!rawData.length) return null
    const pcRows = rawData.filter((d) => d.ad_area === 'PC')
    const mobileRows = rawData.filter((d) => d.ad_area === 'Mobile')

    const pcAdvertiserCount = new Set(pcRows.map((d) => d.advertiser)).size
    const mobileAdvertiserCount = new Set(mobileRows.map((d) => d.advertiser)).size

    const pcAvgRank = pcRows.length
      ? pcRows.reduce((sum, item) => sum + item.average, 0) / pcRows.length
      : 0
    const mobileAvgRank = mobileRows.length
      ? mobileRows.reduce((sum, item) => sum + item.average, 0) / mobileRows.length
      : 0

    return {
      pcAdvertiserCount,
      mobileAdvertiserCount,
      pcAvgRank: Number(pcAvgRank.toFixed(2)),
      mobileAvgRank: Number(mobileAvgRank.toFixed(2)),
    }
  }, [rawData])

  const advertiserRows = useMemo(() => buildAdvertiserComparison(rawData), [rawData])

  const normalizedInsight = useMemo(() => normalizeInsight(insight), [insight])

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-65px)] flex items-center justify-center">
        <p className="text-gray-500">분석 결과를 불러오는 중입니다...</p>
      </div>
    )
  }

  if (!insight || !rawData.length) {
    return (
      <div className="min-h-[calc(100vh-65px)] flex flex-col items-center justify-center space-y-4">
        <p className="text-lg text-gray-700">결과 데이터가 없습니다. 다시 업로드 해주세요.</p>
        <Button asChild>
          <Link href="/page1">업로드 페이지로 이동</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-65px)] px-6 py-10 bg-[#f5f5f7]">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-gray-900">경쟁사 순위 분석 결과</h1>
        </div>

        {summary && (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="PC 광고주 수"
              value={formatCount(summary.pcAdvertiserCount, '개')}
              bgClass="bg-gradient-to-br from-blue-500 via-blue-500/90 to-blue-600"
            />
            <StatCard
              label="Mobile 광고주 수"
              value={formatCount(summary.mobileAdvertiserCount, '개')}
              bgClass="bg-gradient-to-br from-indigo-500 via-violet-500/90 to-purple-600"
            />
            <StatCard
              label="PC 평균 순위"
              value={formatNumber(summary.pcAvgRank)}
              bgClass="bg-gradient-to-br from-amber-400 via-amber-400/90 to-orange-500"
            />
            <StatCard
              label="Mobile 평균 순위"
              value={formatNumber(summary.mobileAvgRank)}
              bgClass="bg-gradient-to-br from-fuchsia-500 via-pink-500/90 to-rose-500"
            />
          </div>
        )}

        {/* 수평 탭 네비게이션 */}
        <div className="flex gap-2 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-200">
          {(['insight', 'advertiser', 'pc', 'mobile'] as TabKey[]).map((key) => (
            <button
              key={key}
              onClick={() => {
                setActiveTab(key)
                setVisibleInsightSection(null)
              }}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === key
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-600 hover:bg-gray-100'
              }`}
            >
              {navLabels[key]}
            </button>
          ))}
        </div>

        {/* 인사이트 세부 필터 */}
        {activeTab === 'insight' && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setVisibleInsightSection(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                visibleInsightSection === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              전체
            </button>
            {insightSubItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setVisibleInsightSection(visibleInsightSection === item.id ? null : item.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  visibleInsightSection === item.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {/* 전체 너비 콘텐츠 영역 */}
        <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="p-6 space-y-4">
            {activeTab === 'insight' && (
              <>
                <ContentHeader label={navLabels.insight} />
                <InsightSection insight={normalizedInsight} visible={visibleInsightSection} />
              </>
            )}
            {activeTab === 'advertiser' && (
              <>
                <ContentHeader label={navLabels.advertiser} />
                <AdvertiserTable rows={advertiserRows} />
              </>
            )}
            {activeTab === 'pc' && (
              <>
                <div className="flex items-center gap-3">
                  <ContentHeader label={navLabels.pc} />
                  <Button variant="outline" size="sm" onClick={() => setPcExpanded((prev) => !prev)} className="text-xs">펼쳐보기</Button>
                </div>
                <DetailTable
                  rows={rawData.filter((r) => r.ad_area === 'PC')}
                  expanded={pcExpanded}
                />
              </>
            )}
            {activeTab === 'mobile' && (
              <>
                <div className="flex items-center gap-3">
                  <ContentHeader label={navLabels.mobile} />
                  <Button variant="outline" size="sm" onClick={() => setMobileExpanded((prev) => !prev)} className="text-xs">펼쳐보기</Button>
                </div>
                <DetailTable
                  rows={rawData.filter((r) => r.ad_area === 'Mobile')}
                  expanded={mobileExpanded}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


function ContentHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-full bg-blue-500" aria-hidden />
      <h3 className="text-lg font-bold text-gray-900">{label}</h3>
    </div>
  )
}

const insightSubItems = [
  { id: 'insight-overall', label: '매체 노출 현황' },
  { id: 'insight-media', label: '디바이스별 운영 현황' },
  { id: 'insight-competitor', label: '광고주 노출 현황' },
  { id: 'insight-golden', label: '입찰 유효 구간 분석' },
  { id: 'insight-actions', label: '최적화 가이드' },
]

function InsightSection({ insight, visible }: { insight: NormalizedInsight; visible: string | null }) {
  const sections = [
    {
      id: 'insight-overall',
      node: <InsightList title="매체 노출 현황" items={insight.overall} tone="blue" fullSpan />,
    },
    {
      id: 'insight-media',
      node: <InsightList title="디바이스별 운영 현황" items={insight.media} tone="violet" />,
    },
    {
      id: 'insight-competitor',
      node: <CompetitorGroupList groups={insight.competitor} />,
    },
    {
      id: 'insight-golden',
      node: <GoldenTimeList items={insight.golden} />,
    },
    {
      id: 'insight-actions',
      node: <InsightList title="최적화 가이드" items={insight.actions} tone="rose" fullSpan />,
    },
  ]

  const visibleSections = visible ? sections.filter((s) => s.id === visible) : sections

  return (
    <div className="space-y-4">
      {visibleSections.map((section) => (
        <div key={section.id} id={section.id}>
          {section.node}
        </div>
      ))}
    </div>
  )
}

function DetailTable({ rows, expanded }: { rows: CompetitorRankData[]; expanded: boolean }) {
  const hourKeys = useMemo(() => {
    const allKeys = Array.from({ length: 24 }, (_, i) => `hour_${String(i).padStart(2, '0')}` as HourKey)
    if (expanded) return allKeys
    return allKeys.slice(9, 19) // 09시 ~ 18시
  }, [expanded])

  const sortedRows = useMemo(
    () => rows.slice().sort((a, b) => a.average - b.average),
    [rows]
  )

  return (
    <div className="space-y-3">
      <div className="overflow-auto">
        <table className="min-w-full text-[0.9em]">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs uppercase tracking-wider text-gray-600">
              <th className="px-4 py-3">광고주</th>
              <th className="px-4 py-3">URL</th>
              <th className="px-4 py-3">평균</th>
              {hourKeys.map((k) => (
                <th key={k} className="px-2 py-3 text-right">{k.replace('hour_', '')}시</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedRows.map((row, idx) => (
              <tr key={`${row.keyword}-${row.advertiser}-${idx}`} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-700 whitespace-nowrap text-[0.9em]">{row.advertiser}</td>
                <td className="px-4 py-3 text-blue-600 underline decoration-dotted text-[0.8em]">
                  <a href={row.url} target="_blank" rel="noreferrer">{row.url || '미입력'}</a>
                </td>
                <td className="px-4 py-3 text-gray-700 text-[0.9em]">{formatNumber(row.average)}</td>
                {hourKeys.map((k) => (
                  <td key={k} className="px-2 py-3 text-right text-gray-700 text-[0.9em]">
                    {formatHour(row[k])}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={27} className="px-4 py-6 text-center text-gray-500">표시할 데이터가 없습니다. PC/Mobile 업로드 데이터를 확인하세요.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

type InsightTone = 'blue' | 'violet' | 'emerald' | 'amber' | 'rose'

interface InsightListProps {
  title: string
  items: string[]
  tone: InsightTone
  fullSpan?: boolean
}

const toneStyles: Record<InsightTone, { border: string; header: string; badge: string; bullet: string; text: string }> = {
  blue: {
    border: 'border-blue-100',
    header: 'from-blue-50 via-white to-blue-50',
    badge: 'bg-blue-100 text-blue-700',
    bullet: 'bg-blue-500',
    text: 'text-blue-900',
  },
  violet: {
    border: 'border-violet-100',
    header: 'from-violet-50 via-white to-violet-50',
    badge: 'bg-violet-100 text-violet-700',
    bullet: 'bg-violet-500',
    text: 'text-violet-900',
  },
  emerald: {
    border: 'border-emerald-100',
    header: 'from-emerald-50 via-white to-emerald-50',
    badge: 'bg-emerald-100 text-emerald-700',
    bullet: 'bg-emerald-500',
    text: 'text-emerald-900',
  },
  amber: {
    border: 'border-amber-100',
    header: 'from-amber-50 via-white to-amber-50',
    badge: 'bg-amber-100 text-amber-700',
    bullet: 'bg-amber-500',
    text: 'text-amber-900',
  },
  rose: {
    border: 'border-rose-100',
    header: 'from-rose-50 via-white to-rose-50',
    badge: 'bg-rose-100 text-rose-700',
    bullet: 'bg-rose-500',
    text: 'text-rose-900',
  },
}

function InsightList({ title, items, tone, fullSpan }: InsightListProps) {
  const toneStyle = toneStyles[tone]
  return (
    <div className={`${fullSpan ? 'sm:col-span-2' : ''} rounded-2xl border ${toneStyle.border} bg-white shadow-sm`}>
      <div className={`flex items-center justify-between rounded-t-2xl border-b border-gray-100 bg-gradient-to-r ${toneStyle.header} px-4 py-3`}>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${toneStyle.bullet}`} aria-hidden />
          <h4 className={`text-sm font-semibold ${toneStyle.text}`}>{title}</h4>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${toneStyle.badge}`}>{items.length}개</span>
      </div>
      <div className="p-4 space-y-2">
        {items.length ? (
          <ul className="space-y-2 text-sm leading-relaxed">
            {items.map((item, index) => (
              <li key={`${title}-${index}`} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2">
                <span className={`mt-1 h-2 w-2 rounded-full ${toneStyle.bullet}`} aria-hidden />
                <span className="flex-1 text-gray-800">{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-gray-500">표시할 내용이 없습니다.</p>
        )}
      </div>
    </div>
  )
}

function CompetitorGroupList({ groups }: { groups: { label: string; items: string[] }[] }) {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-emerald-50 p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-emerald-900">광고주 노출 현황</h4>
        <span className="text-xs font-semibold text-emerald-700">{groups.length}개 그룹</span>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {groups.map((g) => (
          <div key={g.label} className="rounded-xl border border-emerald-100 bg-white/80 p-3 space-y-2 shadow-sm">
            <p className="text-xs font-semibold text-emerald-800">{g.label}</p>
            <ul className="space-y-2 text-sm text-emerald-900">
              {g.items.map((item, idx) => (
                <li key={`${g.label}-${idx}`} className="flex gap-2 rounded-lg bg-emerald-50/70 px-2 py-1.5">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                  <span className="flex-1 leading-relaxed">{item}</span>
                </li>
              ))}
              {g.items.length === 0 && <li className="text-xs text-emerald-700">데이터 없음</li>}
            </ul>
          </div>
        ))}
        {groups.length === 0 && (
          <div className="rounded-xl border border-emerald-100 bg-white/60 p-4 text-xs text-emerald-700 shadow-sm">
            표시할 경쟁 그룹이 없습니다.
          </div>
        )}
      </div>
    </div>
  )
}

function GoldenTimeList({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-amber-50 p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-amber-900">입찰 유효 구간 분석</h4>
        <span className="text-xs font-semibold text-amber-700">{items.length}개 구간</span>
      </div>
      {items.length ? (
        <ol className="relative space-y-3 border-l border-amber-200 pl-4">
          {items.map((item) => (
            <li key={item.label} className="relative rounded-xl border border-amber-100 bg-white/80 px-3 py-2.5 shadow-sm">
              <span className="absolute -left-[9px] top-3 h-3 w-3 rounded-full border-2 border-white bg-amber-400" aria-hidden />
              <p className="text-xs font-semibold text-amber-800">{item.label}</p>
              <p className="mt-1 text-sm text-amber-900 whitespace-pre-line leading-relaxed">{item.value || '-'}</p>
            </li>
          ))}
        </ol>
      ) : (
        <div className="text-xs text-amber-700">표시할 시간이 없습니다.</div>
      )}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string
  bgClass?: string
  subtitle?: string
}

function StatCard({ label, value, bgClass, subtitle }: StatCardProps) {
  return (
    <div className={`rounded-2xl p-4 text-white shadow-lg border border-white/10 ${bgClass ?? 'bg-gradient-to-br from-slate-600 to-slate-800'}`}>
      <p className="text-xs font-semibold text-white/80">{label}</p>
      <p className="mt-2 text-3xl font-bold leading-tight">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-white/80">{subtitle}</p>}
    </div>
  )
}

function formatNumber(value: number): string {
  if (!value || Number.isNaN(value)) return '-'
  return value.toFixed(2)
}

function formatHour(value: number): string {
  if (!value || Number.isNaN(value)) return '-'
  return value.toFixed(1)
}

function formatCount(value: number, unit = ''): string {
  if (!value) return '-'
  return `${value}${unit}`
}

function formatNumberOrDash(value: number): string {
  if (!value) return '-'
  return value.toFixed(2)
}

function AdvertiserTable({ rows }: { rows: AdvertiserComparisonRow[] }) {
  const sorted = rows.slice().sort((a, b) => a.diff - b.diff)
  return (
    <div className="space-y-3">
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs uppercase tracking-wider text-gray-600">
              <th className="px-4 py-3">광고주</th>
              <th className="px-4 py-3">URL</th>
              <th className="px-4 py-3">PC 평균</th>
              <th className="px-4 py-3">Mobile 평균</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((row) => (
              <tr key={row.advertiser} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{row.advertiser}</td>
                <td className="px-4 py-3 text-blue-600 underline decoration-dotted">
                  <a href={row.url} target="_blank" rel="noreferrer">{row.url || '미입력'}</a>
                </td>
                <td className="px-4 py-3 text-gray-700">{formatNumberOrDash(row.pcAvg)}</td>
                <td className="px-4 py-3 text-gray-700">{formatNumberOrDash(row.mobileAvg)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-500">표시할 광고주 데이터가 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function normalizeInsight(insight?: ClaudeInsight | null): NormalizedInsight {
  const empty: NormalizedInsight = { overall: [], media: [], competitor: [], golden: [], actions: [] }
  if (!insight) return empty

  const toArray = (value: unknown): string[] => {
    if (!value) return []
    if (Array.isArray(value)) return value.filter(Boolean).map(String)
    if (typeof value === 'string') return [value]
    return []
  }

  const competitorRaw = insight.competitor_dynamics ?? {}
  const competitorGroups = Object.entries(competitorRaw).map(([label, value]) => ({
    label,
    items: toArray(value),
  }))

  const goldenRaw = insight.golden_time ?? {}
  const goldenList = Object.entries(goldenRaw).map(([label, value]) => ({
    label,
    value: Array.isArray(value) ? value.filter(Boolean).join('\n') : value ? String(value) : '-',
  }))

  return {
    overall: toArray(insight.overall_health),
    media: toArray(insight.media_asymmetry),
    competitor: competitorGroups,
    golden: goldenList,
    actions: toArray(insight.action_items),
  }
}