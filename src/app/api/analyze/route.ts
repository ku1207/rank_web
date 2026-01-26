import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { CompetitorRankData, ClaudeInsight } from '@/types/competitor-rank'

const ANALYSIS_PROMPT = `## 역할
당신은 상위 1% 성과를 내는 시니어 퍼포먼스 마케팅 전략가입니다. 광고 순위 데이터를 단순 현황판이 아닌, 경쟁사의 '예산 한계점'과 '입찰 전략의 허점'을 파악하는 전략 지도로 해석합니다.

## 목적
제공된 데이터를 바탕으로 시장 전체의 경쟁 지형을 분석하고, 실무자가 즉시 투입되어 성과를 낼 수 있는 전략 보고서를 JSON 형식으로 생성하세요.

## 입력 데이터
{DATA}

## 분석 가이드라인
- 데이터 내 특정 주체를 가정하지 말고, 시장 참여자 전체의 '공격성'과 '방어력'을 비교 분석하세요.
- 모든 인사이트는 "현상 -> 마케팅적 해석 -> 전략적 제안"의 흐름을 한 문장에 담으세요.
- 전문 용어(포화도, 시간대별 노출 공백, 입찰 변동성 등)를 적절히 활용하여 전문성을 높이되, 수치적 근거를 반드시 포함하세요.

## 결과 요구사항
1. overall_health: 전체 키워드/매체의 노출 포화도와 시간대별 노출 공백 진단.
2. media_asymmetry: PC와 Mobile 간 경쟁 강도 격차가 가장 큰 지점과 그로 인한 입찰 효율의 불균형 분석.
3. competitor_dynamics: 특정 시간대/매체에 입찰을 집중하는 '공격형' 그룹과 예산 조기 소진으로 이탈하는 '취약형' 그룹의 패턴 식별.
4. golden_time: 경쟁자들의 예산 소진 혹은 입찰가 하향이 감지되어, 최소 CPC로 상위권을 점유할 수 있는 '전략적 빈집' 구간 도출.
5. action_items: 데이터 근거 기반의 즉시 실행 가능한 운영 우선순위 5가지.

## 제약사항
- 반드시 JSON 형식으로만 출력하세요. (기타 설명 텍스트 금지)
- 각 분석 항목은 단일 문장을 여러 개로 나눠서 작성해야 하며, 구체적인 예시(광고주명, 시간대, 순위 변동폭 등)를 최소 2개 이상 포함하세요.
- 입력 데이터의 명칭을 그대로 기입하지 마세요. (ex. hour_00 -> '오전 0시'으로 변경)

## 출력 형식 (Strictly JSON)
{
  "overall_health": ["..."],
  "media_asymmetry": ["..."],
  "competitor_dynamics": ["..."],
  "golden_time": ["..."],
  "action_items": [
    "1순위(High Impact): ...",
    "2순위(Efficiency): ...",
    "3순위: ...",
    "4순위: ...",
    "5순위: ..."
  ]
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

    const insight: ClaudeInsight = JSON.parse(jsonMatch[0])

    return NextResponse.json({ insight })
  } catch (error) {
    console.error('분석 API 오류:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
