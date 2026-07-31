'use client';

import { useEffect, useState } from 'react';

export default function TransparentBouquet({ src, alt, className }) {
  const [processedSrc, setProcessedSrc] = useState(null);

  useEffect(() => {
    if (!src) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      const width = canvas.width;
      const height = canvas.height;

      // Extract reference background color from top-left corner
      const rBg = data[0];
      const gBg = data[1];
      const bBg = data[2];

      const visited = new Uint8Array(width * height);
      const queue = [];

      // Initialize flood fill queue with all border pixels
      for (let x = 0; x < width; x++) {
        queue.push(x, 0);
        visited[x] = 1;
        queue.push(x, height - 1);
        visited[(height - 1) * width + x] = 1;
      }
      for (let y = 0; y < height; y++) {
        queue.push(0, y);
        visited[y * width] = 1;
        queue.push(width - 1, y);
        visited[y * width + (width - 1)] = 1;
      }

      // Tolerance threshold for color match (accounts for JPEG compression, shadows, or gradients)
      const threshold = 65; 

      let head = 0;
      while (head < queue.length) {
        const cx = queue[head++];
        const cy = queue[head++];

        const idx = (cy * width + cx) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Euclidean distance in RGB color space
        const diff = Math.sqrt(
          (r - rBg) ** 2 +
          (g - gBg) ** 2 +
          (b - bBg) ** 2
        );

        if (diff < threshold) {
          // Set alpha channel of matching pixel to 0 (transparent)
          data[idx + 3] = 0;

          // Check 4-connected neighbors
          const neighbors = [
            [cx + 1, cy],
            [cx - 1, cy],
            [cx, cy + 1],
            [cx, cy - 1]
          ];

          for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nidx = ny * width + nx;
              if (!visited[nidx]) {
                visited[nidx] = 1;
                queue.push(nx, ny);
              }
            }
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);
      setProcessedSrc(canvas.toDataURL());
    };

    img.onerror = () => {
      // Fallback to original image source if canvas processing fails
      setProcessedSrc(src);
    };
  }, [src]);

  if (!processedSrc) {
    return (
      <div className="game-loading" style={{ minHeight: '200px' }}>
        <span>Processing bouquet...</span>
      </div>
    );
  }

  return <img src={processedSrc} alt={alt} className={className} />;
}
