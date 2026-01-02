export interface ThumbnailConfig {
  text: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  fontSize: number;
  fontWeight: string;
  lineHeight: number;
  borderWidth: number;
}

/**
 * 신한은행 스타일 고임팩트 썸네일 렌더러
 * 
 * ✅ 대형 굵은 글씨 (가독성 최우선)
 * ✅ 두꺼운 단일 보더 (심플하고 강렬)
 * ✅ 고대비 블루/화이트 테마
 * ✅ 3줄 최대, 넉넉한 여백
 */
export const renderThumbnailToBase64 = async (config: ThumbnailConfig): Promise<string> => {
  const canvas = document.createElement('canvas');
  canvas.width = 500;
  canvas.height = 500;
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error("Canvas context is not available");

  await document.fonts.ready;

  const { text, bgColor, textColor, borderColor, borderWidth } = config;

  // ═══════════════════════════════════════════════════════════
  // 1. 배경 채우기 (흰색 권장)
  // ═══════════════════════════════════════════════════════════
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // ═══════════════════════════════════════════════════════════
  // 2. 두꺼운 단일 테두리 (신한은행 스타일)
  // ═══════════════════════════════════════════════════════════
  const actualBorderWidth = borderWidth || 20; // 기본 20px
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = actualBorderWidth;
  ctx.strokeRect(
    actualBorderWidth / 2,
    actualBorderWidth / 2,
    canvas.width - actualBorderWidth,
    canvas.height - actualBorderWidth
  );

  // ═══════════════════════════════════════════════════════════
  // 3. 큰 글씨로 자동 줄바꿈 (최대 3줄)
  // ═══════════════════════════════════════════════════════════
  const padding = 80; // 넉넉한 여백
  const maxWidth = canvas.width - (padding * 2);

  // 기본 폰트 크기를 크게 시작 (90px)
  let fontSize = 90;
  const fontWeight = 'bold'; // 무조건 굵게!
  ctx.font = `${fontWeight} ${fontSize}px 'NanumSquareNeo', 'Pretendard', sans-serif`;

  // 한글 줄바꿈 함수 (단어 단위가 아닌 글자 단위)
  const wrapText = (text: string, maxWidth: number): string[] => {
    const lines: string[] = [];
    let currentLine = '';

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

    return lines;
  };

  // 3줄 이하로 맞추기 위한 폰트 크기 자동 조절
  let lines = wrapText(text, maxWidth);

  while (lines.length > 3 && fontSize > 50) {
    fontSize -= 5;
    ctx.font = `${fontWeight} ${fontSize}px 'NanumSquareNeo', 'Pretendard', sans-serif`;
    lines = wrapText(text, maxWidth);
  }

  // 강제로 3줄 제한
  if (lines.length > 3) {
    lines = lines.slice(0, 3);
  }

  // ═══════════════════════════════════════════════════════════
  // 4. 수직 중앙 정렬
  // ═══════════════════════════════════════════════════════════
  const lineHeight = fontSize * 1.3; // 줄간격
  const totalHeight = lines.length * lineHeight;
  let currentY = (canvas.height - totalHeight) / 2 + (lineHeight * 0.35);

  // ═══════════════════════════════════════════════════════════
  // 5. 텍스트 렌더링 (그림자 제거 - 심플하게)
  // ═══════════════════════════════════════════════════════════
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  
  // 그림자 없음 (신한은행처럼 깔끔하게)
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  lines.forEach((line) => {
    ctx.fillText(line, canvas.width / 2, currentY);
    currentY += lineHeight;
  });

  // ═══════════════════════════════════════════════════════════
  // 6. WebP 고품질 변환
  // ═══════════════════════════════════════════════════════════
  return canvas.toDataURL('image/webp', 0.95).split(',')[1];
};
