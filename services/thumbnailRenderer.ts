export interface ThumbnailConfig {
  text: string;
  bgColor?: string;      // 선택사항으로 변경
  textColor?: string;    // 선택사항으로 변경
  borderColor?: string;  // 선택사항으로 변경
  fontSize?: number;
  fontWeight?: string;
  lineHeight?: number;
  borderWidth?: number;
}

/**
 * 🎨 고대비 컬러 테마 (보색 대비)
 */
const HIGH_CONTRAST_THEMES = [
  // 파랑/흰색 (신한은행 스타일)
  { bg: '#FFFFFF', text: '#0066FF', border: '#0066FF' },
  
  // 노랑/검정 (강렬함)
  { bg: '#FFD700', text: '#000000', border: '#000000' },
  
  // 초록/흰색 (신선함)
  { bg: '#FFFFFF', text: '#00A86B', border: '#00A86B' },
  
  // 빨강/흰색 (긴급감)
  { bg: '#FFFFFF', text: '#DC143C', border: '#DC143C' },
  
  // 보라/흰색 (고급스러움)
  { bg: '#FFFFFF', text: '#6B3FA0', border: '#6B3FA0' },
  
  // 검정/노랑 (경고)
  { bg: '#000000', text: '#FFD700', border: '#FFD700' },
  
  // 네이비/흰색 (신뢰감)
  { bg: '#FFFFFF', text: '#003366', border: '#003366' },
  
  // 주황/흰색 (활력)
  { bg: '#FFFFFF', text: '#FF6B35', border: '#FF6B35' },
];

/**
 * 🎲 랜덤 고대비 테마 선택
 */
function getRandomTheme() {
  const randomIndex = Math.floor(Math.random() * HIGH_CONTRAST_THEMES.length);
  return HIGH_CONTRAST_THEMES[randomIndex];
}

/**
 * 신한은행 스타일 고임팩트 썸네일 렌더러
 * 
 * ✅ 대형 굵은 글씨 (가독성 최우선)
 * ✅ 두꺼운 단일 보더 (심플하고 강렬)
 * ✅ 랜덤 고대비 보색 테마
 * ✅ 중앙 정렬 (수평/수직)
 * ✅ 자연스러운 줄바꿈 (구두점 기준)
 * ✅ HTML 태그 자동 제거
 */
export const renderThumbnailToBase64 = async (config: ThumbnailConfig): Promise<string> => {
  const canvas = document.createElement('canvas');
  canvas.width = 500;
  canvas.height = 500;
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error("Canvas context is not available");

  await document.fonts.ready;

  // ═══════════════════════════════════════════════════════════
  // 0. HTML 태그 제거 및 컬러 테마 자동 선택
  // ═══════════════════════════════════════════════════════════
  const cleanText = config.text.replace(/<[^>]*>/g, '').trim();
  
  // 컬러가 지정되지 않았으면 랜덤 테마 선택
  const theme = (config.bgColor && config.textColor && config.borderColor) 
    ? { bg: config.bgColor, text: config.textColor, border: config.borderColor }
    : getRandomTheme();

  const bgColor = theme.bg;
  const textColor = theme.text;
  const borderColor = theme.border;
  const borderWidth = config.borderWidth || 20;
  const fontWeight = config.fontWeight || 'bold';

  // ═══════════════════════════════════════════════════════════
  // 1. 배경 채우기
  // ═══════════════════════════════════════════════════════════
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // ═══════════════════════════════════════════════════════════
  // 2. 두꺼운 단일 테두리
  // ═══════════════════════════════════════════════════════════
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = borderWidth;
  ctx.strokeRect(
    borderWidth / 2,
    borderWidth / 2,
    canvas.width - borderWidth,
    canvas.height - borderWidth
  );

  // ═══════════════════════════════════════════════════════════
  // 3. 자연스러운 줄바꿈 (구두점 기준 우선)
  // ═══════════════════════════════════════════════════════════
  const padding = 80;
  const maxWidth = canvas.width - (padding * 2);

  let fontSize = 90;
  ctx.font = `${fontWeight} ${fontSize}px 'NanumSquareNeo', 'Pretendard', sans-serif`;

  /**
   * 한글 줄바꿈 로직:
   * 1. 구두점(,?!.) 기준으로 자연스럽게 분리 시도
   * 2. 여전히 길면 글자 단위로 강제 분리
   */
  const wrapText = (text: string, maxWidth: number): string[] => {
    const lines: string[] = [];
    
    // 구두점 기준 분리 (쉼표, 물음표, 느낌표, 마침표)
    const segments = text.split(/([,?!.])/);
    let currentLine = '';

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (!segment) continue;
      
      const testLine = currentLine + segment;
      const metrics = ctx.measureText(testLine);

      // 너비 초과 시 줄바꿈
      if (metrics.width > maxWidth && currentLine !== '') {
        lines.push(currentLine.trim());
        currentLine = segment;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }

    // 구두점 분리로도 안 되면 글자 단위 강제 분리
    const needsCharSplit = lines.some(line => ctx.measureText(line).width > maxWidth);
    
    if (needsCharSplit || lines.length === 0) {
      lines.length = 0;
      currentLine = '';
      
      for (const char of text) {
        const testLine = currentLine + char;
        const metrics = ctx.measureText(testLine);

        if (metrics.width > maxWidth && currentLine !== '') {
          lines.push(currentLine);
          currentLine = char;
        } else {
          currentLine = testLine;
        }
      }
      
      if (currentLine) {
        lines.push(currentLine);
      }
    }

    return lines;
  };

  // 3줄 이하로 맞추기 위한 폰트 크기 자동 조절
  let lines = wrapText(cleanText, maxWidth);

  while (lines.length > 3 && fontSize > 50) {
    fontSize -= 5;
    ctx.font = `${fontWeight} ${fontSize}px 'NanumSquareNeo', 'Pretendard', sans-serif`;
    lines = wrapText(cleanText, maxWidth);
  }

  // 강제로 3줄 제한
  if (lines.length > 3) {
    lines = lines.slice(0, 3);
    lines[2] = lines[2].slice(0, -3) + '...';
  }

  // ═══════════════════════════════════════════════════════════
  // 4. 중앙 정렬 (수직 + 수평)
  // ═══════════════════════════════════════════════════════════
  const lineHeight = fontSize * 1.3;
  const totalHeight = lines.length * lineHeight;
  let currentY = (canvas.height - totalHeight) / 2 + (lineHeight * 0.35);

  // ═══════════════════════════════════════════════════════════
  // 5. 텍스트 렌더링 (심플하게, 그림자 없음)
  // ═══════════════════════════════════════════════════════════
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';          // 수평 중앙
  ctx.textBaseline = 'top';
  
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  lines.forEach((line) => {
    ctx.fillText(line, canvas.width / 2, currentY);  // 중앙 정렬
    currentY += lineHeight;
  });

  // ═══════════════════════════════════════════════════════════
  // 6. WebP 고품질 변환
  // ═══════════════════════════════════════════════════════════
  return canvas.toDataURL('image/webp', 0.95).split(',')[1];
};
