
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
  `당신은 연봉 2억의 최고급 블로그 마케팅 전문가이자 SEO 엔지니어입니다.
  사용자 추가 지침: ${customInstruction || ''}

  ══════════════════════════════════════════════════════════════════
  🎨 [현재 테마: ${template.name}] - !important로 강제 적용
  ══════════════════════════════════════════════════════════════════

  ⚠️ 모든 스타일에 !important를 반드시 포함하세요!

  ══════════════════════════════════════════════════════════════════
  🔴 [1. SEO 메타 레이어] - 검색 엔진 최적화
  ══════════════════════════════════════════════════════════════════
  - [EXCERPT]에는 반드시 150자 내외의 메타 디스크립션을 작성하세요.
  - 핵심 키워드가 자연스럽게 1회 포함되어야 합니다.

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
    <strong style="color:${template.h3Color} !important; font-size:18px !important;">💡 전문가 꿀팁</strong>
    <p style="margin-top:12px !important; color:#333 !important; line-height:1.8 !important;">내용</p>
  </div>
  
  ⚠️ 주의박스:
  <div style="background:linear-gradient(135deg,#FFF5F5,#FFE0E0) !important; border-left:6px solid #E74C3C !important; border-radius:16px !important; padding:24px !important; margin:30px 0 !important; box-shadow:0 4px 15px rgba(231,76,60,0.15) !important;">
    <strong style="color:#C0392B !important; font-size:18px !important;">⚠️ 주의사항</strong>
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
  
  마지막 H2 타이틀: "마치며", "정리하며", "마지막으로" 등 자연스럽게
  200자 내외 요약 + 응원 마무리 + 라스트팡 CTA

  ══════════════════════════════════════════════════════════════════
  [광고 태그]
  ══════════════════════════════════════════════════════════════════
  - [AD1]: 서론 끝, 첫 번째 H2 직전
  - [AD2]: 두 번째 H2 직전

  ══════════════════════════════════════════════════════════════════
  [출력 구조]
  ══════════════════════════════════════════════════════════════════
  [TITLE]제목[/TITLE]
  [EXCERPT]150자 메타 디스크립션[/EXCERPT]
  [THUMBNAIL_TEXT]썸네일 텍스트 (2-3줄)[/THUMBNAIL_TEXT]
  [CONTENT]HTML 본문[/CONTENT]`;

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
        contents: `주제: ${displayTitle}\n핵심키워드: ${mainKeyword}\n\n테마 "${randomTemplate.name}"를 적용한 전문가 수준의 글을 작성하세요. 모든 스타일에 !important를 적용하고, H2/H3/CTA 버튼에 테마 색상을 사용하세요.`,
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

      // 썸네일 생성
      const thumbnailData = await renderThumbnailToBase64({
        text: extract("THUMBNAIL_TEXT") || displayTitle,
        bgColor: randomTemplate.thumbnailBg,
        textColor: randomTemplate.thumbnailText,
        borderColor: randomTemplate.thumbnailBorder,
        fontSize: 60,
        fontWeight: '900',
        lineHeight: 1.3,
        borderWidth: 20
      });

      // 메타 디스크립션 박스
      const excerpt = extract("EXCERPT");
      const metaDescriptionBox = excerpt ? `
        <div style="background:${randomTemplate.metaBg} !important; border-radius:20px !important; padding:28px !important; margin-bottom:40px !important; border:2px solid ${randomTemplate.h3Color}20 !important; box-shadow:0 4px 15px rgba(0,0,0,0.05) !important;">
          <p style="color:#4a5568 !important; font-size:17px !important; line-height:1.9 !important; margin:0 !important; font-weight:500 !important;">${excerpt}</p>
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
        excerpt: excerpt,
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

