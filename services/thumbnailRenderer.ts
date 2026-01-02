
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
 * 수익형 블로그를 위한 고가독성 썸네일 렌더러 (Premium Edition)
 * 
 * ✅ 자동 줄바꿈 (Word Wrap): 긴 제목도 2~3줄로 자동 분리
 * ✅ 입체 이중 보더: 메인 테두리 + 안쪽 하이라이트 선
 * ✅ 고대비 테마: 블루/화이트, 옐로우/블랙, 그린/화이트
 * ✅ 가독성 섀도우: 텍스트 뒤 부드러운 그림자
 * ✅ 나눔스퀘어 네오: 한국어 최적화 폰트
 */
export const renderThumbnailToBase64 = async (config: ThumbnailConfig): Promise<string> => {
  const canvas = document.createElement('canvas');
  canvas.width = 500;
  canvas.height = 500;
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error("Canvas context is not available");

  await document.fonts.ready;

  const { text, bgColor, textColor, borderColor, fontWeight, lineHeight, borderWidth } = config;

  // ═══════════════════════════════════════════════════════════
  // 1. 배경 채우기
  // ═══════════════════════════════════════════════════════════
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // ═══════════════════════════════════════════════════════════
  // 2. 입체 이중 보더 (메인 테두리 + 안쪽 하이라이트)
  // ═══════════════════════════════════════════════════════════
  if (borderWidth > 0) {
    // 메인 외곽 테두리 (두꺼움)
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth * 2;
    ctx.strokeRect(borderWidth, borderWidth, canvas.width - borderWidth * 2, canvas.height - borderWidth * 2);

    // 안쪽 하이라이트 선 (얇고 밝음 - 입체감)
    const highlightColor = adjustBrightness(borderColor, 40);
    ctx.strokeStyle = highlightColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(borderWidth * 2 + 8, borderWidth * 2 + 8,
      canvas.width - (borderWidth * 4) - 16,
      canvas.height - (borderWidth * 4) - 16);
  }

  // ═══════════════════════════════════════════════════════════
  // 3. 자동 줄바꿈 (Word Wrap) - 긴 제목도 2~3줄로 분리
  // ═══════════════════════════════════════════════════════════
  const padding = 60 + (borderWidth * 3);
  const maxWidth = canvas.width - padding;

  // 초기 폰트 크기
  let fontSize = 60;
  ctx.font = `${fontWeight} ${fontSize}px 'NanumSquareNeo', sans-serif`;

  // 텍스트를 단어 단위로 분리하여 줄바꿈 계산
  const wrapText = (text: string, maxWidth: number): string[] => {
    // 먼저 줄바꿈 문자로 나누기
    const paragraphs = text.split('\n').map(l => l.trim()).filter(l => l !== '');
    const result: string[] = [];

    paragraphs.forEach(paragraph => {
      // 한글은 글자 단위, 영어는 단어 단위로 분리
      const chars = paragraph.split('');
      let currentLine = '';

      chars.forEach(char => {
        const testLine = currentLine + char;
        const metrics = ctx.measureText(testLine);

        if (metrics.width > maxWidth && currentLine !== '') {
          result.push(currentLine.trim());
          currentLine = char;
        } else {
          currentLine = testLine;
        }
      });

      if (currentLine.trim()) {
        result.push(currentLine.trim());
      }
    });

    return result;
  };

  // 줄 수에 따라 폰트 크기 자동 조절
  let lines = wrapText(text, maxWidth);

  while (lines.length > 4 && fontSize > 30) {
    fontSize -= 4;
    ctx.font = `${fontWeight} ${fontSize}px 'NanumSquareNeo', sans-serif`;
    lines = wrapText(text, maxWidth);
  }

  // 최대 4줄로 제한
  if (lines.length > 4) {
    lines = lines.slice(0, 4);
    lines[3] = lines[3].slice(0, -3) + '...';
  }

  // ═══════════════════════════════════════════════════════════
  // 4. 수직 중앙 정렬 계산
  // ═══════════════════════════════════════════════════════════
  const totalLineHeight = fontSize * lineHeight;
  const totalBlockHeight = lines.length * totalLineHeight;
  let currentY = (canvas.height - totalBlockHeight) / 2 + (totalLineHeight / 2);

  // ═══════════════════════════════════════════════════════════
  // 5. 가독성 섀도우 + 텍스트 드로잉
  // ═══════════════════════════════════════════════════════════
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 강화된 그림자 (더 부드럽고 깊게)
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 15;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 4;

  lines.forEach((line) => {
    ctx.fillText(line, canvas.width / 2, currentY);
    currentY += totalLineHeight;
  });

  // ═══════════════════════════════════════════════════════════
  // 6. WebP 고품질 변환
  // ═══════════════════════════════════════════════════════════
  return canvas.toDataURL('image/webp', 0.92).split(',')[1];
};

/**
 * 색상 밝기 조절 헬퍼 함수
 */
function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}
