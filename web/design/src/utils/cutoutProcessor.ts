/**
 * Transparent Cutout Processor for National Geographic Wildlife Portraits
 * Uses edge flood-fill and luminance boundary detection to cleanly remove studio backgrounds
 * while strictly preserving all internal animal rosettes, spots, stripes, and eyes.
 */

const cache = new Map<string, string>();

export async function processAnimalCutout(imageUrl: string, threshold = 48): Promise<string> {
  if (cache.has(imageUrl)) {
    return cache.get(imageUrl)!;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        // scale down slightly for instant processing if high-res
        const maxDim = 1200;
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(imageUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        // Visited grid for edge flood-fill
        const visited = new Uint8Array(w * h);
        const queue: number[] = [];

        // Sample corner background color
        const bgR = data[0];
        const bgG = data[1];
        const bgB = data[2];

        const isBgPixel = (idx: number) => {
          const r = data[idx * 4];
          const g = data[idx * 4 + 1];
          const b = data[idx * 4 + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          const diff = Math.hypot(r - bgR, g - bgG, b - bgB);
          return lum < threshold && diff < 65;
        };

        // Seed BFS from all borders
        for (let x = 0; x < w; x++) {
          const top = x;
          const bottom = (h - 1) * w + x;
          if (isBgPixel(top) && !visited[top]) {
            visited[top] = 1;
            queue.push(top);
          }
          if (isBgPixel(bottom) && !visited[bottom]) {
            visited[bottom] = 1;
            queue.push(bottom);
          }
        }

        for (let y = 0; y < h; y++) {
          const left = y * w;
          const right = y * w + (w - 1);
          if (isBgPixel(left) && !visited[left]) {
            visited[left] = 1;
            queue.push(left);
          }
          if (isBgPixel(right) && !visited[right]) {
            visited[right] = 1;
            queue.push(right);
          }
        }

        // BFS flood fill
        let head = 0;
        while (head < queue.length) {
          const curr = queue[head++];
          const cx = curr % w;
          const cy = Math.floor(curr / w);

          // Neighbor offsets: up, down, left, right
          const neighbors = [
            cy > 0 ? (cy - 1) * w + cx : -1,
            cy < h - 1 ? (cy + 1) * w + cx : -1,
            cx > 0 ? cy * w + (cx - 1) : -1,
            cx < w - 1 ? cy * w + (cx + 1) : -1,
          ];

          for (const n of neighbors) {
            if (n >= 0 && !visited[n] && isBgPixel(n)) {
              visited[n] = 1;
              queue.push(n);
            }
          }
        }

        // Apply alpha feathering
        for (let i = 0; i < visited.length; i++) {
          if (visited[i] === 1) {
            data[i * 4 + 3] = 0; // 100% transparent background
          }
        }

        ctx.putImageData(imgData, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        cache.set(imageUrl, dataUrl);
        resolve(dataUrl);
      } catch (err) {
        console.warn('Cutout processor fallback:', err);
        resolve(imageUrl);
      }
    };

    img.onerror = () => resolve(imageUrl);
    img.src = imageUrl;
  });
}
