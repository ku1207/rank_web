/**
 * 경쟁사 순위 데이터 타입
 */
export interface CompetitorRankData {
  keyword: string
  ad_area: 'PC' | 'Mobile'
  advertiser: string
  url: string
  average: number
  hour_00: number
  hour_01: number
  hour_02: number
  hour_03: number
  hour_04: number
  hour_05: number
  hour_06: number
  hour_07: number
  hour_08: number
  hour_09: number
  hour_10: number
  hour_11: number
  hour_12: number
  hour_13: number
  hour_14: number
  hour_15: number
  hour_16: number
  hour_17: number
  hour_18: number
  hour_19: number
  hour_20: number
  hour_21: number
  hour_22: number
  hour_23: number
}

/**
 * 분석 결과 데이터 타입
 */
export interface AnalysisResult {
  keyword: string
  ad_area: 'PC' | 'Mobile'
  advertiser: string
  url: string
  average: number
  peak_hour: string
  lowest_hour: string
  variance: number
}

/**
 * Claude AI 분석 인사이트 타입 (기존)
 */
export interface ClaudeInsight {
  overall_health: string[]
  media_asymmetry: string[]
  competitor_dynamics: Record<string, string[] | string>
  golden_time: Record<string, string | string[]>
  action_items: string[]
}

/**
 * AI 추천 순위 분석 결과 타입
 */
export interface AiRankInsight {
  optimalRankSchedule: Record<string, string>
  optimalRankScheduleReason: string[]
}
