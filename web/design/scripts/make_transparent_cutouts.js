import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const outDir = './src/assets/images/cutouts';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const images = [
  {
    input: './src/assets/images/snow_leopard_profile_left_1792083454278.jpg',
    output: './src/assets/images/cutouts/snow_leopard_cutout.png',
    threshold: 40,
  },
  {
    input: './src/assets/images/bengal_tiger_left_hero_1792083452552.jpg',
    output: './src/assets/images/cutouts/bengal_tiger_cutout.png',
    threshold: 35,
  },
  {
    input: './src/assets/images/giant_panda_left_hero_1792083453586.jpg',
    output: './src/assets/images/cutouts/giant_panda_cutout.png',
    threshold: 30,
  },
  {
    input: './src/assets/images/asiatic_lion_left_hero_1792083454461.jpg',
    output: './src/assets/images/cutouts/asiatic_lion_cutout.png',
    threshold: 32,
  },
  {
    input: './src/assets/images/predator_tiger_teaser_1792082979443.jpg',
    output: './src/assets/images/cutouts/predator_tiger_teaser_cutout.png',
    threshold: 38,
  },
];

async function processImage({ input, output, threshold }) {
  console.log(`Processing ${input}...`);
  const image = sharp(input);
  const metadata = await image.metadata();
  const { width, height } = metadata;

  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const visited = new Uint8Array(width * height);
  const queue = [];

  // Corner sample
  const bgR = data[0];
  const bgG = data[1];
  const bgB = data[2];

  const isBg = (idx) => {
    const r = data[idx * 4];
    const g = data[idx * 4 + 1];
    const b = data[idx * 4 + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const diff = Math.hypot(r - bgR, g - bgG, b - bgB);
    return lum < threshold && diff < 55;
  };

  // Border seeds for BFS
  for (let x = 0; x < width; x++) {
    const top = x;
    const bottom = (height - 1) * width + x;
    if (isBg(top) && !visited[top]) {
      visited[top] = 1;
      queue.push(top);
    }
    if (isBg(bottom) && !visited[bottom]) {
      visited[bottom] = 1;
      queue.push(bottom);
    }
  }

  for (let y = 0; y < height; y++) {
    const left = y * width;
    const right = y * width + (width - 1);
    if (isBg(left) && !visited[left]) {
      visited[left] = 1;
      queue.push(left);
    }
    if (isBg(right) && !visited[right]) {
      visited[right] = 1;
      queue.push(right);
    }
  }

  let head = 0;
  while (head < queue.length) {
    const curr = queue[head++];
    const cx = curr % width;
    const cy = Math.floor(curr / width);

    const neighbors = [
      cy > 0 ? (cy - 1) * width + cx : -1,
      cy < height - 1 ? (cy + 1) * width + cx : -1,
      cx > 0 ? cy * width + (cx - 1) : -1,
      cx < width - 1 ? cy * width + (cx + 1) : -1,
    ];

    for (const n of neighbors) {
      if (n >= 0 && !visited[n] && isBg(n)) {
        visited[n] = 1;
        queue.push(n);
      }
    }
  }

  // Clear alpha for visited background pixels
  for (let i = 0; i < visited.length; i++) {
    if (visited[i] === 1) {
      data[i * 4 + 3] = 0; // alpha = 0 (100% transparent)
    }
  }

  await sharp(data, {
    raw: {
      width,
      height,
      channels: 4,
    },
  })
    .png()
    .toFile(output);

  console.log(`Saved transparent cutout to ${output}`);
}

async function run() {
  for (const img of images) {
    await processImage(img);
  }
  console.log('All cutouts processed successfully!');
}

run().catch(console.error);
