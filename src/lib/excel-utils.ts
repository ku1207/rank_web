import * as XLSX from 'xlsx'
import type { CompetitorRankData, AnalysisResult, ClaudeInsight } from '@/types/competitor-rank'

/**
 * 엑셀 파일을 JSON 형태로 변환
 */
export async function excelToJson(file: File): Promise<CompetitorRankData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]

        // 엑셀 데이터를 JSON으로 변환
        const rawData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[]

        // 데이터 매핑
        const mappedData: CompetitorRankData[] = rawData.map((row) => ({
          keyword: String(row['키워드'] || ''),
          ad_area: (row['광고영역'] || 'PC') as 'PC' | 'Mobile',
          advertiser: String(row['광고주'] || ''),
          url: String(row['URL'] || ''),
          average: Number(row['평균']) || 0,
          hour_00: Number(row['00시']) || 0,
          hour_01: Number(row['01시']) || 0,
          hour_02: Number(row['02시']) || 0,
          hour_03: Number(row['03시']) || 0,
          hour_04: Number(row['04시']) || 0,
          hour_05: Number(row['05시']) || 0,
          hour_06: Number(row['06시']) || 0,
          hour_07: Number(row['07시']) || 0,
          hour_08: Number(row['08시']) || 0,
          hour_09: Number(row['09시']) || 0,
          hour_10: Number(row['10시']) || 0,
          hour_11: Number(row['11시']) || 0,
          hour_12: Number(row['12시']) || 0,
          hour_13: Number(row['13시']) || 0,
          hour_14: Number(row['14시']) || 0,
          hour_15: Number(row['15시']) || 0,
          hour_16: Number(row['16시']) || 0,
          hour_17: Number(row['17시']) || 0,
          hour_18: Number(row['18시']) || 0,
          hour_19: Number(row['19시']) || 0,
          hour_20: Number(row['20시']) || 0,
          hour_21: Number(row['21시']) || 0,
          hour_22: Number(row['22시']) || 0,
          hour_23: Number(row['23시']) || 0,
        }))

        resolve(mappedData)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = (error) => {
      reject(error)
    }

    reader.readAsBinaryString(file)
  })
}

/**
 * 데이터 분석 함수
 */
export function analyzeData(data: CompetitorRankData[]): AnalysisResult[] {
  return data.map((item) => {
    // 시간대별 데이터 추출
    const hourlyData = [
      { hour: '00시', value: item.hour_00 },
      { hour: '01시', value: item.hour_01 },
      { hour: '02시', value: item.hour_02 },
      { hour: '03시', value: item.hour_03 },
      { hour: '04시', value: item.hour_04 },
      { hour: '05시', value: item.hour_05 },
      { hour: '06시', value: item.hour_06 },
      { hour: '07시', value: item.hour_07 },
      { hour: '08시', value: item.hour_08 },
      { hour: '09시', value: item.hour_09 },
      { hour: '10시', value: item.hour_10 },
      { hour: '11시', value: item.hour_11 },
      { hour: '12시', value: item.hour_12 },
      { hour: '13시', value: item.hour_13 },
      { hour: '14시', value: item.hour_14 },
      { hour: '15시', value: item.hour_15 },
      { hour: '16시', value: item.hour_16 },
      { hour: '17시', value: item.hour_17 },
      { hour: '18시', value: item.hour_18 },
      { hour: '19시', value: item.hour_19 },
      { hour: '20시', value: item.hour_20 },
      { hour: '21시', value: item.hour_21 },
      { hour: '22시', value: item.hour_22 },
      { hour: '23시', value: item.hour_23 },
    ]

    // 0이 아닌 값들만 필터링
    const nonZeroData = hourlyData.filter((d) => d.value !== 0)

    // 최고 시간대
    const peakHour = nonZeroData.reduce((max, current) =>
      current.value > max.value ? current : max
    , nonZeroData[0] || { hour: '-', value: 0 })

    // 최저 시간대
    const lowestHour = nonZeroData.reduce((min, current) =>
      current.value < min.value ? current : min
    , nonZeroData[0] || { hour: '-', value: 0 })

    // 분산 계산
    const values = nonZeroData.map((d) => d.value)
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length

    return {
      keyword: item.keyword,
      ad_area: item.ad_area,
      advertiser: item.advertiser,
      url: item.url,
      average: item.average,
      peak_hour: peakHour.hour,
      lowest_hour: lowestHour.hour,
      variance: Number(variance.toFixed(2)),
    }
  })
}

/**
 * 시간대별 평균 계산 (0 제외)
 */
function calculateNonZeroAverage(data: CompetitorRankData[]): number {
  const allHourValues: number[] = []

  data.forEach(item => {
    for (let i = 0; i < 24; i++) {
      const hourKey = `hour_${String(i).padStart(2, '0')}` as keyof CompetitorRankData
      const value = item[hourKey] as number
      if (value > 0) {
        allHourValues.push(value)
      }
    }
  })

  if (allHourValues.length === 0) return 0
  return allHourValues.reduce((sum, val) => sum + val, 0) / allHourValues.length
}

/**
 * 광고주별 평균 계산 (0 제외)
 */
function calculateAdvertiserAverage(items: CompetitorRankData[]): number {
  const allValues: number[] = []

  items.forEach(item => {
    for (let i = 0; i < 24; i++) {
      const hourKey = `hour_${String(i).padStart(2, '0')}` as keyof CompetitorRankData
      const value = item[hourKey] as number
      if (value > 0) {
        allValues.push(value)
      }
    }
  })

  if (allValues.length === 0) return 0
  return allValues.reduce((sum, val) => sum + val, 0) / allValues.length
}

/**
 * 경쟁 강도 계산 (1~5)
 */
function calculateCompetitionIntensity(data: CompetitorRankData[]): number {
  // 광고주 수와 순위 변동성을 기반으로 경쟁 강도 계산
  const advertiserCount = new Set(data.map(d => d.advertiser)).size
  const avgRank = calculateNonZeroAverage(data)

  // 간단한 휴리스틱: 광고주 수가 많고 평균 순위가 낮을수록 경쟁이 치열
  let intensity = 1
  if (advertiserCount >= 10) intensity++
  if (advertiserCount >= 20) intensity++
  if (avgRank <= 5) intensity++
  if (avgRank <= 3) intensity++

  return Math.min(intensity, 5)
}

function normalizeCompetitorDynamics(raw: ClaudeInsight['competitor_dynamics']): { label: string; items: string[] }[] {
  if (!raw) return []
  if (Array.isArray(raw)) return [{ label: '경쟁 그룹', items: raw.filter(Boolean) }]
  if (typeof raw === 'object') {
    return Object.entries(raw).map(([label, value]) => ({
      label,
      items: Array.isArray(value)
        ? value.filter(Boolean)
        : typeof value === 'string'
        ? [value]
        : [],
    }))
  }
  return []
}

function normalizeGoldenTime(raw: ClaudeInsight['golden_time']): { label: string; value: string }[] {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw.map((value, idx) => ({
      label: `구간 ${idx + 1}`,
      value: Array.isArray(value) ? value.filter(Boolean).join('\n') : String(value),
    }))
  }
  if (typeof raw === 'object') {
    return Object.entries(raw).map(([label, value]) => ({
      label,
      value: Array.isArray(value) ? value.filter(Boolean).join('\n') : (value as string) || '-',
    }))
  }
  if (typeof raw === 'string') return [{ label: '구간', value: raw }]
  return []
}

/**
 * Dashboard & Insight 시트 생성
 */
function createDashboardSheet(
  rawData: CompetitorRankData[],
  insight: ClaudeInsight
): XLSX.WorkSheet {
  const pcData = rawData.filter(d => d.ad_area === 'PC')
  const mobileData = rawData.filter(d => d.ad_area === 'Mobile')

  // 매체 비교 데이터
  const pcAdvertiserCount = new Set(pcData.map(d => d.advertiser)).size
  const mobileAdvertiserCount = new Set(mobileData.map(d => d.advertiser)).size
  const pcAvgRank = calculateNonZeroAverage(pcData)
  const mobileAvgRank = calculateNonZeroAverage(mobileData)
  const pcIntensity = calculateCompetitionIntensity(pcData)
  const mobileIntensity = calculateCompetitionIntensity(mobileData)

  // 광고주 비교 데이터
  const advertiserMap = new Map<string, { pc: CompetitorRankData[], mobile: CompetitorRankData[] }>()

  rawData.forEach(item => {
    if (!advertiserMap.has(item.advertiser)) {
      advertiserMap.set(item.advertiser, { pc: [], mobile: [] })
    }
    const entry = advertiserMap.get(item.advertiser)!
    if (item.ad_area === 'PC') {
      entry.pc.push(item)
    } else {
      entry.mobile.push(item)
    }
  })

  const advertiserComparison = Array.from(advertiserMap.entries()).map(([advertiser, data]) => {
    const pcAvg = data.pc.length > 0 ? calculateAdvertiserAverage(data.pc) : 0
    const mobileAvg = data.mobile.length > 0 ? calculateAdvertiserAverage(data.mobile) : 0
    // 광고주의 URL 가져오기 (PC 우선, 없으면 Mobile)
    const url = (data.pc.length > 0 ? data.pc[0].url : data.mobile.length > 0 ? data.mobile[0].url : '')
    return {
      advertiser,
      url,
      pcAvg: Number(pcAvg.toFixed(1)),
      mobileAvg: Number(mobileAvg.toFixed(1)),
      diff: Number(Math.abs(pcAvg - mobileAvg).toFixed(1))
    }
  })

  // 워크시트 데이터 배열 생성
  const sheetData: unknown[][] = []

  // 첫 번째 테이블: 매체 비교
  sheetData.push(['매체 비교'])
  sheetData.push(['구분', 'PC', 'Mobile', '차이(절댓값)'])
  sheetData.push(['전체 광고주 수', pcAdvertiserCount, mobileAdvertiserCount, Math.abs(pcAdvertiserCount - mobileAdvertiserCount)])
  sheetData.push(['평균 순위', Number(pcAvgRank.toFixed(1)), Number(mobileAvgRank.toFixed(1)), Number(Math.abs(pcAvgRank - mobileAvgRank).toFixed(1))])
  sheetData.push(['경쟁 강도(1~5)', pcIntensity, mobileIntensity, Math.abs(pcIntensity - mobileIntensity)])

  // 빈 줄
  sheetData.push([])

  // 두 번째 테이블: 광고주 비교
  sheetData.push(['광고주 비교'])
  sheetData.push(['광고주', 'URL', 'PC 평균 순위', 'Mobile 평균 순위', '차이(절댓값)'])
  advertiserComparison.forEach(row => {
    sheetData.push([row.advertiser, row.url, row.pcAvg, row.mobileAvg, row.diff])
  })

  // 빈 줄
  sheetData.push([])

  // 인사이트 영역
  sheetData.push(['전체 분석'])
  // overall_health가 배열이므로 각 항목을 개별 행으로 추가
  insight.overall_health.forEach(item => {
    sheetData.push([item])
  })
  sheetData.push([])

  sheetData.push(['매체 비대칭'])
  // media_asymmetry가 배열이므로 각 항목을 개별 행으로 추가
  insight.media_asymmetry.forEach(item => {
    sheetData.push([item])
  })
  sheetData.push([])

  sheetData.push(['순위 변동'])
  const competitorEntries = normalizeCompetitorDynamics(insight.competitor_dynamics)
  competitorEntries.forEach(group => {
    sheetData.push([group.label])
    if (group.items.length) {
      group.items.forEach(item => sheetData.push([`- ${item}`]))
    } else {
      sheetData.push(['-'])
    }
  })
  sheetData.push([])

  sheetData.push(['최적 입찰시간대'])
  const goldenEntries = normalizeGoldenTime(insight.golden_time)
  goldenEntries.forEach(item => {
    sheetData.push([`${item.label}: ${item.value || '-'}`])
  })
  sheetData.push([])

  sheetData.push(['입찰 전략'])
  // action_items가 배열이므로 각 항목을 개별 행으로 추가
  insight.action_items.forEach(item => {
    sheetData.push([item])
  })

  // 워크시트 생성
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData)

  // 눈금선 제거
  if (!worksheet['!gridlines']) {
    worksheet['!gridlines'] = false
  }

  return worksheet
}

/**
 * Detail Log 시트 생성 (PC 또는 Mobile)
 */
function createDetailLogSheet(
  data: CompetitorRankData[],
  adArea: 'PC' | 'Mobile'
): XLSX.WorkSheet {
  // 해당 매체 데이터만 필터링
  const filteredData = data.filter(d => d.ad_area === adArea)

  // 평균 순위로 정렬 (오름차순)
  const sortedData = filteredData.sort((a, b) => {
    const aAvg = calculateAdvertiserAverage([a])
    const bAvg = calculateAdvertiserAverage([b])
    return aAvg - bAvg
  })

  // 워크시트 데이터 배열 생성
  const sheetData: unknown[][] = []

  // 테이블 제목
  sheetData.push(['원본 데이터'])

  // 열 제목
  const headers = ['순위', '광고주', 'URL', '평균 순위']
  for (let i = 0; i < 24; i++) {
    headers.push(`${String(i).padStart(2, '0')}시`)
  }
  sheetData.push(headers)

  // 데이터 행
  sortedData.forEach((item, index) => {
    const avgRank = calculateAdvertiserAverage([item])
    const row: unknown[] = [
      index + 1, // 순위
      item.advertiser,
      item.url,
      Number(avgRank.toFixed(1))
    ]

    // 시간대별 데이터
    for (let i = 0; i < 24; i++) {
      const hourKey = `hour_${String(i).padStart(2, '0')}` as keyof CompetitorRankData
      const value = item[hourKey] as number
      row.push(Number(value.toFixed(1)))
    }

    sheetData.push(row)
  })

  // 워크시트 생성
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData)

  // 눈금선 제거
  if (!worksheet['!gridlines']) {
    worksheet['!gridlines'] = false
  }

  return worksheet
}

/**
 * 분석 결과를 3개 시트의 엑셀 파일로 변환
 */
export function jsonToExcel(
  rawData: CompetitorRankData[],
  insight: ClaudeInsight
): Blob {
  // 워크북 생성
  const workbook = XLSX.utils.book_new()

  // 1. Dashboard & Insight 시트
  const dashboardSheet = createDashboardSheet(rawData, insight)
  XLSX.utils.book_append_sheet(workbook, dashboardSheet, '01_Dashboard_&_Insight')

  // 2. PC Detail Log 시트
  const pcSheet = createDetailLogSheet(rawData, 'PC')
  XLSX.utils.book_append_sheet(workbook, pcSheet, '02_PC_Detail_Log')

  // 3. Mobile Detail Log 시트
  const mobileSheet = createDetailLogSheet(rawData, 'Mobile')
  XLSX.utils.book_append_sheet(workbook, mobileSheet, '03_Mobile_Detail_Log')

  // 바이너리 데이터 생성
  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
    cellStyles: true
  })

  // Blob 생성
  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
}

/**
 * 파일 다운로드
 */
export function downloadFile(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}
