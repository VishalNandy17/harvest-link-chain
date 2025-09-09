import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a simple SVG icon for PWA
const createIconSVG = (size) => {
  const color = '#16a34a'; // Green color matching your theme
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${color}" rx="20"/>
  <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-family="Arial, sans-serif" font-size="${size * 0.4}" font-weight="bold">HC</text>
</svg>`;
};

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, 'public');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate 192x192 icon
const icon192 = createIconSVG(192);
fs.writeFileSync(path.join(iconsDir, 'pwa-192x192.svg'), icon192);

// Generate 512x512 icon
const icon512 = createIconSVG(512);
fs.writeFileSync(path.join(iconsDir, 'pwa-512x512.svg'), icon512);

console.log('PWA icons generated successfully!');
console.log('- pwa-192x192.svg (192x192)');
console.log('- pwa-512x512.svg (512x512)');
console.log('');
console.log('Note: These are SVG icons. For production, consider converting to PNG using:');
console.log('- Online tools: https://convertio.co/svg-png/');
console.log('- Design tools: Figma, Canva, or Adobe Illustrator');
console.log('- Command line: svgexport (npm install -g svgexport)');
