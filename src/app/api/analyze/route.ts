import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { CompetitorRankData, AiRankInsight } from '@/types/competitor-rank'

const ANALYSIS_PROMPT = `## 역할
당신은 상위 1% 성과를 내는 시니어 퍼포먼스 마케팅 전략가입니다. 광고 순위 데이터를 통해 경쟁사의 '예산 한계점'과 '입찰 허점'을 분석하여 최적의 효율 순위를 도출합니다.

## 목적
제공된 데이터를 바탕으로 경쟁 강도를 분석하고, 최소 비용으로 최대 노출 효율을 낼 수 있는 '시간대별 최적 목표 순위'가 포함된 전략 보고서를 생성하세요.

## 입력 데이터
{DATA}

## 분석 및 산출 가이드라인 (중요)
1. 경쟁 밀도 분석: 특정 시간대 노출되는 광고주 수가 많을수록 경쟁 강도가 높다고 판단함.
2. 변동성 분석: 경쟁사들의 순위 변화가 심할수록(표준편차가 클수록) 입찰 전략이 불안정한 '공격 적기'로 판단함.
3. 최적 순위(Optimal Rank) 도출 로직:
   - 경쟁 밀도 높음 + 변동성 낮음(안정적) = 보수적 운영
   - 경쟁 밀도 낮음 + 변동성 높음(불안정) = 공격적 운영
   - 경쟁사 이탈 구간(공백) = 최저가 상위 점유 기회로 판단.

## 결과 요구사항
1. optimalRankSchedule: 로직을 바탕으로 산출한 '시간대별 추천 목표 순위'.
2. optimalRankScheduleReason: 데이터 근거 위주의 목표 순위 산정 이유.

## 제약사항
- 반드시 JSON 형식으로만 출력.
- 분석 문장은 "현상 -> 마케팅적 해석 -> 전략적 제안"의 흐름을 한 문장으로 구성하며 개조식으로 구성.
- 특정 시간 언급 시 '오전 0시', '오후 2시' 등 사람이 읽기 편한 직관적인 용어 사용.
- 구체적인 수치(순위 변동폭, 업체 수 등)를 반드시 포함하여 근거 제시.

## 출력 형식 (Strictly JSON)
{
  "optimalRankSchedule": {
    "hour00": "목표 순위(정수만 기입)",
    "hour01": "목표 순위(정수만 기입)",
    "hour02": "목표 순위(정수만 기입)",
    "hour03": "목표 순위(정수만 기입)",
    "hour04": "목표 순위(정수만 기입)",
    "hour05": "목표 순위(정수만 기입)",
    "hour06": "목표 순위(정수만 기입)",
    "hour07": "목표 순위(정수만 기입)",
    "hour08": "목표 순위(정수만 기입)",
    "hour09": "목표 순위(정수만 기입)",
    "hour10": "목표 순위(정수만 기입)",
    "hour11": "목표 순위(정수만 기입)",
    "hour12": "목표 순위(정수만 기입)",
    "hour13": "목표 순위(정수만 기입)",
    "hour14": "목표 순위(정수만 기입)",
    "hour15": "목표 순위(정수만 기입)",
    "hour16": "목표 순위(정수만 기입)",
    "hour17": "목표 순위(정수만 기입)",
    "hour18": "목표 순위(정수만 기입)",
    "hour19": "목표 순위(정수만 기입)",
    "hour20": "목표 순위(정수만 기입)",
    "hour21": "목표 순위(정수만 기입)",
    "hour22": "목표 순위(정수만 기입)",
    "hour23": "목표 순위(정수만 기입)"
  },
  "optimalRankScheduleReason": ["...", "...", "..."]
}`

export async function POST(request: NextRequest) {
  try {
    const { data } = await request.json() as { data: CompetitorRankData[] }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: '분석할 데이터가 없습니다.' },
        { status: 400 }
      )
    }

    // API 키 확인
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey || apiKey === 'your_api_key_here') {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY가 설정되지 않았습니다. .env.local 파일을 확인하세요.' },
        { status: 500 }
      )
    }

    // Anthropic 클라이언트 생성
    const anthropic = new Anthropic({
      apiKey,
    })

    // 데이터를 프롬프트에 삽입
    const dataString = JSON.stringify(data, null, 2)
    const prompt = ANALYSIS_PROMPT.replace('{DATA}', dataString)

    // Claude API 호출
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5-20251101',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    // 응답 파싱
    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    // JSON 추출 (코드 블록이나 다른 텍스트가 있을 수 있음)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Claude 응답에서 JSON을 찾을 수 없습니다.')
    }

    const insight: AiRankInsight = JSON.parse(jsonMatch[0])

    return NextResponse.json({ insight })
  } catch (error) {
    console.error('분석 API 오류:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
