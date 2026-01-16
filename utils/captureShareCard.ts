import * as htmlToImage from 'html-to-image';

/**
 * Captures the element with the provided id and downloads as PNG.
 * Ensures exact 1080x1350 export by setting width/height options.
 */
export async function downloadShareCardPNG(elementId = 'share-career-card', filename = 'career-card.png') {
  const node = document.getElementById(elementId);
  if (!node) throw new Error(`Element with id '${elementId}' not found`);

  const dataUrl = await htmlToImage.toPng(node, {
    width: 1080,
    height: 1350,
    canvasWidth: 1080,
    canvasHeight: 1350,
    pixelRatio: 1,
    style: {
      // Ensure consistent capture styling
      transform: 'none',
      opacity: '1',
    },
    skipAutoScale: true,
    cacheBust: true,
    backgroundColor: '#0f172a',
  });

  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

/**
 * Captures as JPEG with quality control.
 */
export async function downloadShareCardJPEG(elementId = 'share-career-card', filename = 'career-card.jpg', quality = 0.92) {
  const node = document.getElementById(elementId);
  if (!node) throw new Error(`Element with id '${elementId}' not found`);

  const dataUrl = await htmlToImage.toJpeg(node, {
    width: 1080,
    height: 1350,
    canvasWidth: 1080,
    canvasHeight: 1350,
    pixelRatio: 1,
    quality,
    style: {
      transform: 'none',
      opacity: '1',
    },
    skipAutoScale: true,
    cacheBust: true,
    backgroundColor: '#0f172a',
  });

  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}
