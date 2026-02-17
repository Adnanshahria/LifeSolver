import sharp from 'sharp';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '..', 'public');
const svgPath = resolve(publicDir, 'logo.svg');
const svgBuffer = readFileSync(svgPath);

const sizes = [
    { name: 'favicon-32.png', size: 32 },
    { name: 'favicon-16.png', size: 16 },
    { name: 'logo-192.png', size: 192 },
    { name: 'logo-512.png', size: 512 },
    { name: 'apple-touch-icon.png', size: 180 },
];

for (const { name, size } of sizes) {
    await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(resolve(publicDir, name));
    console.log(`✅ Generated ${name} (${size}x${size})`);
}

// Generate ICO-style favicon (just a 32x32 PNG named favicon.ico — browsers accept it)
await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(resolve(publicDir, 'favicon.ico'));
console.log('✅ Generated favicon.ico (32x32 PNG)');

console.log('\n🎉 All icons generated from logo.svg!');
