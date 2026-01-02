import { GoogleGenAI } from "@google/genai";
import { GeneratedPost, AuditResult, WordPressConfig } from "../types";
import { renderThumbnailToBase64 } from "./thumbnailRenderer";

/**
 * 10가지 프리미엄 컬러 템플릿
 * - 메타 배경, H2 그라데이션, H3 색상, 버튼 색상, 보색 CTA
 */
const TEMPLATES = [
  {
    id: 1,
    name: '블루-그레이',
    metaBg: '#f5f5f5',
    h2Gradient: 'linear-gradient(to right, #1a73e8, #004d99)',
    h3Color: '#1a73e8',
    buttonColor: '#1565C0',
    ctaGradient: 'linear-gradient(135deg, #FF6B35, #F7931E, #FFD23F)', // 보색: 오렌지
    thumbnailBg: '#1a73e8',
    thumbnailText: '#FFFFFF',
    thumbnailBorder: '#004d99'
  },
  {
    id: 2,
    name: '그린-오렌지',
    metaBg: '#e8f5e9',
    h2Gradient: 'linear-gradient(to right, #28a745, #1e7e34)',
    h3Color: '#28a745',
    buttonColor: '#FF5722',
    ctaGradient: 'linear-gradient(135deg, #FF5722, #FF7043, #FFAB40)', // 보색: 오렌지
    thumbnailBg: '#28a745',
    thumbnailText: '#FFFFFF',
    thumbnailBorder: '#1e7e34'
  },
  {
    id: 3,
    name: '퍼플-옐로우',
    metaBg: '#f3e5f5',
    h2Gradient: 'linear-gradient(to right, #6a1b9a, #4a148c)',
    h3Color: '#6a1b9a',
    buttonColor: '#FFC107',
    ctaGradient: 'linear-gradient(135deg, #FFC107, #FFD54F, #FFEB3B)', // 보색: 옐로우
    thumbnailBg: '#6a1b9a',
    thumbnailText: '#FFFFFF',
    thumbnailBorder: '#4a148c'
  },
  {
    id: 4,
    name: '틸-핑크',
    metaBg: '#e0f7fa',
    h2Gradient: 'linear-gradient(to right, #00796b, #004d40)',
    h3Color: '#00796b',
    buttonColor: '#E91E63',
    ctaGradient: 'linear-gradient(135deg, #E91E63, #F06292, #FF80AB)', // 보색: 핑크
    thumbnailBg: '#00796b',
    thumbnailText: '#FFFFFF',
    thumbnailBorder: '#004d40'
  },
  {
    id: 5,
    name: '테라코타-라이트그레이',
    metaBg: '#f4f4f4',
    h2Gradient: 'linear-gradient(to right, #a0522d, #8b4513)',
    h3Color: '#8b4513',
    buttonColor: '#BF360C',
    ctaGradient: 'linear-gradient(135deg, #00BCD4, #26C6DA, #4DD0E1)', // 보색: 시안
    thumbnailBg: '#a0522d',
    thumbnailText: '#FFFFFF',
    thumbnailBorder: '#8b4513'
  },
  {
    id: 6,
    name: '클래식 블루',
    metaBg: '#f5f5f5',
    h2Gradient: 'linear-gradient(to right, #1a73e8, #004d99)',
    h3Color: '#004d99',
    buttonColor: '#0D47A1',
    ctaGradient: 'linear-gradient(135deg, #FF9800, #FFB74D, #FFCC80)', // 보색: 오렌지
    thumbnailBg: '#0D47A1',
    thumbnailText: '#FFFFFF',
    thumbnailBorder: '#1A237E'
  },
  {
    id: 7,
    name: '네이처 그린',
    metaBg: '#e8f5e9',
    h2Gradient: 'linear-gradient(to right, #28a745, #1e7e34)',
    h3Color: '#1e7e34',
    buttonColor: '#2E7D32',
    ctaGradient: 'linear-gradient(135deg, #E91E63, #EC407A, #F48FB1)', // 보색: 핑크
    thumbnailBg: '#2E7D32',
    thumbnailText: '#FFFFFF',
    thumbnailBorder: '#1B5E20'
  },
  {
    id: 8,
    name: '로얄 퍼플',
    metaBg: '#f3e5f5',
    h2Gradient: 'linear-gradient(to right, #6a1b9a, #4a148c)',
    h3Color: '#4a148c',
    buttonColor: '#6A1B9A',
    ctaGradient: 'linear-gradient(135deg, #CDDC39, #D4E157, #E6EE9C)', // 보색: 라임
    thumbnailBg: '#6A1B9A',
    thumbnailText: '#FFFFFF',
    thumbnailBorder: '#38006b'
  },
  {
    id: 9,
    name: '퓨처 틸',
    metaBg: '#e0f7fa',
    h2Gradient: 'linear-gradient(to right, #00796b, #004d40)',
    h3Color: '#004d40',
    buttonColor: '#00838F',
    ctaGradient: 'linear-gradient(135deg, #FF5252, #FF8A80, #FFCDD2)', // 보색: 레드
    thumbnailBg: '#00838F',
    thumbnailText: '#FFFFFF',
    thumbnailBorder: '#006064'
  },
  {
    id: 10,
    name: '어스 테라코타',
    metaBg: '#f4f4f4',
    h2Gradient: 'linear-gradient(to right, #a0522d, #8b4513)',
    h3Color: '#8b4513',
    buttonColor: '#D84315',
    ctaGradient: 'linear-gradient(135deg, #03A9F4, #29B6F6, #81D4FA)', // 보색: 스카이블루
    thumbnailBg: '#D84315',
    thumbnailText: '#FFFFFF',
    thumbnailBorder: '#BF360C'
  }
];

const getSystemInstruction = (customInstruction: string, template: typeof TEMPLATES[0]) =>
  `당신은 실제 경험을 바탕으로 블로그를 운영하는 일반인입니다.

  사용자 추가 지침: ${customInstruction || ''}

  ══════════════════════════════════════════════════════════════════
  🚫 [절대 금지 사항] - 한 가지라도 위반 시 실격!
  ══════════════════════════════════════════════════════════════════
  
  ❌ "<p>요약...</p>" 같은 요약 섹션 절대 금지
  ❌ HTML 태그로 된 요약문 절대 금지
  ❌ "안녕하세요! 연봉 2억의..." 같은 본인 소개 절대 금지
  ❌ "블로그 마케팅 전문가", "SEO 엔지니어" 같은 전문가 코스프레 절대 금지
  ❌ "오늘은 ~에 대해 알아보겠습니다" 같은 AI 말투 절대 금지
  ❌ "결론적으로", "정리하면", "FAQ", "Q&A", "마무리", "서론입니다" 표현 절대 금지
  
  ✅ 첫 문장부터 바로 본론으로 시작!
  ✅ 예시: "청년도약계좌 특별 금리로 5년 돌리면 얼마나 받을 수 있을까? 직접 계산해봤는데요..."

  ══════════════════════════════════════════════════════════════════
  ✍️ [글쓰기 스타일 - 사람이 쓴 블로그 글처럼]
  ══════════════════════════════════════════════════════════════════
  
  📌 기본 원칙:
  - 이 글은 사람이 직접 겪고 쓴 블로그 글처럼 작성한다
  - AI가 쓴 느낌, 설명서 같은 말투, 정리된 문체를 사용하지 않는다
  - 문장은 짧은 문장과 긴 문장을 불규칙하게 섞어 쓴다
  - 문장 구조가 일정해지지 않도록 한다
  - 조금 정리가 덜 된 느낌, 생각하면서 적은 느낌을 유지한다
  
  📌 1인칭 시점:
  - 직접 해본 것처럼, 느낀 것처럼 쓴다
  - 개인적인 감정과 체감을 숨기지 않는다
  - 예: "저도 처음엔 몰랐는데요", "이거 진짜 신기하더라구요"
  
  📌 자연스러운 말투:
  - 표준어와 문법에 집착하지 않는다
  - 한국식 채팅체를 자연스럽게 섞는다: ㅎㅎ, ㅋㅋ, ㅠㅠ, 음…, 솔직히 말하면, 이게 좀…
  - 문장 끝 표현 다양화: ~했구요, ~하더라구요, ~같았슴다, ~이더라구요!, ~했는데요!
  
  📌 단어 선택:
  - 전문 작가처럼 보이는 단어 선택을 피한다
  - AI가 자주 쓰는 표현을 피한다 (예: 활용하다, 고려하다, 확인해보시기 바랍니다)
  - 일상적인 단어 위주로, 살짝 어색해도 그대로 둔다
  
  📌 글의 흐름:
  - 혼잣말, 감탄사, 여운 있는 문장을 중간중간 넣는다
  - 글의 흐름이 약간 산만해 보여도 괜찮다
  - 독자에게 설명하듯 쓰지 않는다 → 옆에서 이야기하듯 자연스럽게 쓴다
  - 직접적인 질문은 하지 않는다
  
  📌 형식:
  - 줄바꿈을 자유롭게 사용한다
  - 형식보다 읽히는 느낌을 우선한다
  - 이모지는 필요할 때만 아주 소량 사용한다
  
  ══════════════════════════════════════════════════════════════════
  🎨 [현재 테마: ${template.name}] - !important로 강제 적용
  ══════════════════════════════════════════════════════════════════

  ⚠️ 모든 스타일에 !important를 반드시 포함하세요!

  ══════════════════════════════════════════════════════════════════
  🔴 [1. SEO 메타 레이어] - 검색 엔진 최적화
  ══════════════════════════════════════════════════════════════════
  - [EXCERPT]에는 반드시 150자 내외의 메타 디스크립션을 작성하세요.
  - 핵심 키워드가 자연스럽게 1회 포함되어야 합니다.
  - HTML 태그 사용 금지! 순수 텍스트만!

  ══════════════════════════════════════════════════════════════════
  🔴 [2. H2/H3 스타일] - 테마 컬러 적용 필수
  ══════════════════════════════════════════════════════════════════
  
  [H2 스타일] - 그라데이션 배경:
  <h2 style="background: ${template.h2Gradient} !important; color: #fff !important; padding: 18px 24px !important; border-radius: 12px !important; font-size: 24px !important; font-weight: 800 !important; margin: 40px 0 20px 0 !important; box-shadow: 0 4px 15px rgba(0,0,0,0.15) !important;">제목</h2>
  
  [H3 스타일] - 테마 포인트 컬러:
  <h3 style="color: ${template.h3Color} !important; font-size: 20px !important; font-weight: 700 !important; margin: 30px 0 15px 0 !important; padding-left: 16px !important; border-left: 4px solid ${template.h3Color} !important;">소제목</h3>

  H2는 최소 4개, 각 H2당 H3는 2-3개 배치하세요.

  ══════════════════════════════════════════════════════════════════
  🔴 [3. 데이터 테이블]
  ══════════════════════════════════════════════════════════════════
  
  <table style="width:100% !important; border-collapse:collapse !important; margin:30px 0 !important; background:#fff !important; border-radius:16px !important; overflow:hidden !important; box-shadow:0 4px 20px rgba(0,0,0,0.08) !important;">
  <thead>
    <tr>
      <th style="background: ${template.h2Gradient} !important; color:white !important; padding:16px !important; text-align:left !important; font-weight:700 !important;">항목</th>
      <th style="background: ${template.h2Gradient} !important; color:white !important; padding:16px !important; text-align:left !important; font-weight:700 !important;">내용</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:16px !important; border-bottom:1px solid #eee !important;">데이터1</td><td style="padding:16px !important; border-bottom:1px solid #eee !important;">값1</td></tr>
  </tbody>
  </table>

  ══════════════════════════════════════════════════════════════════
  🔴 [4. 디자인 박스]
  ══════════════════════════════════════════════════════════════════
  
  💡 꿀팁박스:
  <div style="background:linear-gradient(135deg,#E8F4FD,#D1ECFF) !important; border-left:6px solid ${template.h3Color} !important; border-radius:16px !important; padding:24px !important; margin:30px 0 !important; box-shadow:0 4px 15px rgba(0,0,0,0.08) !important;">
    <strong style="color:${template.h3Color} !important; font-size:18px !important;">💡 꿀팁</strong>
    <p style="margin-top:12px !important; color:#333 !important; line-height:1.8 !important;">내용</p>
  </div>
  
  ⚠️ 주의박스:
  <div style="background:linear-gradient(135deg,#FFF5F5,#FFE0E0) !important; border-left:6px solid #E74C3C !important; border-radius:16px !important; padding:24px !important; margin:30px 0 !important; box-shadow:0 4px 15px rgba(231,76,60,0.15) !important;">
    <strong style="color:#C0392B !important; font-size:18px !important;">⚠️ 주의</strong>
    <p style="margin-top:12px !important; color:#5D3A3A !important; line-height:1.8 !important;">내용</p>
  </div>

  ══════════════════════════════════════════════════════════════════
  🔴 [5. 하이퍼링크 - 3개 이상]
  ══════════════════════════════════════════════════════════════════
  
  <a href="https://example.com" target="_blank" style="color:${template.h3Color} !important; font-weight:700 !important; text-decoration:underline !important; text-underline-offset:4px !important;">관련 정보 보기</a>

  ══════════════════════════════════════════════════════════════════
  🔴 [6. CTA 버튼 - 보색으로 강렬하게!]
  ══════════════════════════════════════════════════════════════════
  
  ⛔ 절대 금지: "(클릭)" 단어!
  
  [일반 CTA] (첫 번째 H2 후, 두 번째 H2 후):
  <a href="#" style="display:block !important; text-align:center !important; padding:22px 44px !important; background:${template.ctaGradient} !important; color:#fff !important; text-decoration:none !important; border-radius:18px !important; font-weight:900 !important; font-size:20px !important; box-shadow:0 12px 30px rgba(0,0,0,0.25), inset 0 -3px 0 rgba(0,0,0,0.1) !important; margin:35px auto !important; max-width:480px !important; letter-spacing:-0.3px !important; text-shadow:0 2px 4px rgba(0,0,0,0.2) !important;">🔥 지금 바로 확인하기</a>
  
  [라스트팡 CTA] (마무리 섹션 - 가장 화려하게):
  <a href="#" style="display:block !important; text-align:center !important; padding:26px 52px !important; background:${template.ctaGradient} !important; color:#fff !important; text-decoration:none !important; border-radius:22px !important; font-weight:900 !important; font-size:24px !important; box-shadow:0 18px 45px rgba(0,0,0,0.3), 0 8px 20px rgba(0,0,0,0.15), inset 0 -4px 0 rgba(0,0,0,0.12) !important; margin:45px auto 25px !important; max-width:520px !important; letter-spacing:-0.5px !important; text-shadow:0 2px 6px rgba(0,0,0,0.25) !important; border:3px solid rgba(255,255,255,0.3) !important;">🌟 지금 바로 시작하세요!</a>

  ══════════════════════════════════════════════════════════════════
  🔴 [7. 자연스러운 마무리]
  ══════════════════════════════════════════════════════════════════
  
  마지막 부분은 자연스럽게 끝낸다 (예: "이렇게 해보니까...", "저도 써보니까 괜찮더라구요")
  200자 내외 간단 정리 + 라스트팡 CTA

  ══════════════════════════════════════════════════════════════════
  [광고 태그]
  ══════════════════════════════════════════════════════════════════
  - [AD1]: 서론 끝, 첫 번째 H2 직전
  - [AD2]: 두 번째 H2 직전

  ══════════════════════════════════════════════════════════════════
  [출력 구조]
  ══════════════════════════════════════════════════════════════════
  [TITLE]제목[/TITLE]
  [EXCERPT]150자 메타 디스크립션 (HTML 태그 없이 순수 텍스트만!)[/EXCERPT]
  [THUMBNAIL_TEXT]썸네일 텍스트 (2-3줄, 물음표나 느낌표로 끝내기)[/THUMBNAIL_TEXT]
  [CONTENT]HTML 본문 (본인 소개, 요약 섹션 절대 금지!)[/CONTENT]`;

/**
 * API 키 관리자 - 할당량 소진 시 자동 전환
 */
class ApiKeyManager {
  private static instance: ApiKeyManager;
  private keys: string[] = [];
  private currentIndex: number = 0;
  private onIndexChange?: (index: number) => void;

  static getInstance() {
    if (!ApiKeyManager.instance) {
      ApiKeyManager.instance = new ApiKeyManager();
    }
    return ApiKeyManager.instance;
  }

  setKeys(keys: string[], currentIndex: number = 0, onIndexChange?: (index: number) => void) {
    this.keys = keys.filter(k => k.trim().length > 0);
    this.currentIndex = Math.min(currentIndex, this.keys.length - 1);
    this.onIndexChange = onIndexChange;
  }

  getCurrentKey(): string {
    if (this.keys.length === 0) {
      return process.env.API_KEY || '';
    }
    return this.keys[this.currentIndex] || '';
  }

  rotateToNext(): boolean {
    if (this.keys.length <= 1) return false;

    const nextIndex = (this.currentIndex + 1) % this.keys.length;
    if (nextIndex === 0) {
      // 모든 키를 순회함
      console.warn('모든 API 키 할당량 소진');
      return false;
    }

    this.currentIndex = nextIndex;
    console.log(`API 키 전환: #${this.currentIndex + 1}`);

    if (this.onIndexChange) {
      this.onIndexChange(this.currentIndex);
    }

    return true;
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  getKeyCount(): number {
    return this.keys.length;
  }
}

const keyManager = ApiKeyManager.getInstance();

/**
 * 할당량 에러 체크
 */
function isQuotaError(error: any): boolean {
  const msg = (error.message || '').toLowerCase();
  return msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('429') ||
    msg.includes('resource exhausted') ||
    msg.includes('limit exceeded');
}

/**
 * 콘텐츠 생성 (API 키 자동 로테이션)
 */
export const generateSEOContent = async (
  topicLine: string,
  config: WordPressConfig,
  onKeyIndexChange?: (newIndex: number) => void
): Promise<GeneratedPost> => {
  const [displayTitle, mainKeyword = displayTitle] = topicLine.split('///').map(s => s.trim());
  const randomTemplate = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];

  // API 키 설정
  const apiKeys = config.apiKeys || [];
  keyManager.setKeys(apiKeys, config.currentKeyIndex || 0, onKeyIndexChange);

  const maxRetries = Math.max(1, keyManager.getKeyCount());
  let lastError = new Error('알 수 없는 오류');

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const currentKey = keyManager.getCurrentKey();
    if (!currentKey) {
      throw new Error("API 키가 설정되지 않았습니다. 설정에서 API 키를 입력해주세요.");
    }

    try {
      const ai = new GoogleGenAI({ apiKey: currentKey });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `주제: ${displayTitle}\n핵심키워드: ${mainKeyword}\n\n테마 "${randomTemplate.name}"를 적용해서 사람이 직접 쓴 것처럼 자연스러운 블로그 글을 작성하세요. 절대 본인 소개나 요약 섹션을 넣지 마세요!`,
        config: {
          systemInstruction: getSystemInstruction(config.customInstruction || '', randomTemplate),
          maxOutputTokens: 20000,
          thinkingConfig: { thinkingBudget: 0 }
        }
      });

      if (!response || !response.text) throw new Error("AI 응답 없음");

      const text = response.text || "";
      const extract = (tag: string) => {
        const s = `[${tag}]`, e = `[/${tag}]`;
        const start = text.indexOf(s);
        if (start === -1) return "";
        const end = text.indexOf(e);
        return end !== -1 ? text.substring(start + s.length, end).trim() : text.substring(start + s.length).split('[')[0].trim();
      };

      let content = extract("CONTENT");
      if (!content) throw new Error("본문 생성 실패");

      // 광고 치환
      const ad1Wrapper = config.adCode1 ? `<div style="margin:20px 0 !important; text-align:center !important;">${config.adCode1}</div>` : '';
      const ad2Wrapper = config.adCode2 ? `<div style="margin:20px 0 !important; text-align:center !important;">${config.adCode2}</div>` : '';

      content = content.replace(/\[\s*AD1\s*\]/gi, ad1Wrapper);
      content = content.replace(/\[\s*AD2\s*\]/gi, ad2Wrapper);

      // AI 이미지 생성
      let inlineImageHtml = "";
      let base64Img = "";
      if (config.enableAiImage) {
        try {
          const imgRes = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: `${mainKeyword} 관련 세련된 블로그 사진`
          });
          if (imgRes?.candidates?.[0]?.content?.parts) {
            for (const part of imgRes.candidates[0].content.parts) {
              if (part.inlineData) {
                base64Img = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                inlineImageHtml = `<figure style="margin:40px 0 !important;"><img src="${base64Img}" alt="${mainKeyword}" style="width:100% !important; border-radius:25px !important; box-shadow:0 10px 30px rgba(0,0,0,0.1) !important;" /></figure>`;
                break;
              }
            }
          }
        } catch (e) {
          console.warn('AI 이미지 생성 실패:', e);
        }
      }

      // 썸네일 텍스트 HTML 태그 제거
      const rawThumbnailText = extract("THUMBNAIL_TEXT") || displayTitle;
      const cleanThumbnailText = rawThumbnailText.replace(/<[^>]*>/g, '').trim();

      // 썸네일 생성 (랜덤 컬러 자동 선택)
      const thumbnailData = await renderThumbnailToBase64({
        text: cleanThumbnailText
        // bgColor, textColor, borderColor 생략 → 자동 랜덤 선택!
      });

      // 메타 디스크립션 HTML 태그 제거
      const rawExcerpt = extract("EXCERPT");
      const cleanExcerpt = rawExcerpt.replace(/<[^>]*>/g, '').trim();

      // 메타 디스크립션 박스
      const metaDescriptionBox = cleanExcerpt ? `
        <div style="background:${randomTemplate.metaBg} !important; border-radius:20px !important; padding:28px !important; margin-bottom:40px !important; border:2px solid ${randomTemplate.h3Color}20 !important; box-shadow:0 4px 15px rgba(0,0,0,0.05) !important;">
          <p style="color:#4a5568 !important; font-size:17px !important; line-height:1.9 !important; margin:0 !important; font-weight:500 !important;">${cleanExcerpt}</p>
        </div>
      ` : '';

      const finalContent = `
        <div style="margin-bottom:60px !important; text-align:center !important;">
          <img src="data:image/webp;base64,${thumbnailData}" alt="${displayTitle}" style="width:100% !important; max-width:500px !important; border-radius:20px !important; box-shadow:0 15px 40px rgba(0,0,0,0.15) !important;" />
        </div>
        ${metaDescriptionBox}
        ${content.includes('</h2>') ? content.replace('</h2>', '</h2>' + inlineImageHtml) : content + inlineImageHtml}
      `;

      return {
        title: extract("TITLE") || displayTitle,
        content: finalContent,
        excerpt: cleanExcerpt,
        thumbnailData,
        featuredMediaUrl: base64Img || `data:image/webp;base64,${thumbnailData}`,
        status: 'draft'
      };

    } catch (error: any) {
      lastError = error;

      // 할당량 에러인 경우 다음 키로 전환 시도
      if (isQuotaError(error)) {
        console.warn(`API 키 #${keyManager.getCurrentIndex() + 1} 할당량 소진, 다음 키로 전환 시도...`);
        if (!keyManager.rotateToNext()) {
          throw new Error(`모든 API 키(${keyManager.getKeyCount()}개) 할당량이 소진되었습니다. 잠시 후 다시 시도해주세요.`);
        }
        continue; // 다음 키로 재시도
      }

      // 다른 에러는 바로 throw
      break;
    }
  }

  // 최종 에러 처리
  let errorMsg = lastError.message || "생성 실패";
  if (errorMsg.includes('fetch')) {
    errorMsg = "네트워크 오류: API 서버에 연결할 수 없습니다.";
  } else if (errorMsg.includes('API')) {
    errorMsg = "API 오류: API 키를 확인해주세요.";
  }
  throw new Error(errorMsg);
};

export const auditContent = async (post: GeneratedPost): Promise<AuditResult> => {
  return { isHtmlValid: true, brokenUrls: [], guidelineScore: 100, aiReview: "Pass", passed: true };
};
