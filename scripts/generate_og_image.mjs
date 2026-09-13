// Builds public/og-image.png — the 1200×630 card used for Open Graph, Twitter/X,
// WhatsApp/LinkedIn previews and the Event rich result. Re-run after changing
// the prize pool, dates or logo:  node scripts/generate_og_image.mjs
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const W = 1200;
const H = 630;
const font = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

const svg = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg" cx="30%" cy="10%" r="95%">
      <stop offset="0%" stop-color="#0B2545"/>
      <stop offset="55%" stop-color="#050B18"/>
      <stop offset="100%" stop-color="#010308"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#00BCF2" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#00BCF2" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="azure" x1="0" x2="1">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="55%" stop-color="#BAE6FD"/>
      <stop offset="100%" stop-color="#00BCF2"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="985" cy="285" r="300" fill="url(#glow)"/>
  ${Array.from({ length: 70 }, (_, i) => {
    // Deterministic scatter (golden-ratio hashing) so re-runs produce identical bytes.
    const x = Math.floor(((i * 0.6180339887) % 1) * W);
    const y = Math.floor(((i * i * 0.7548776662) % 1) * H);
    const r = (i % 3) * 0.6 + 0.6;
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="#FFFFFF" opacity="${0.2 + (i % 5) * 0.1}"/>`;
  }).join('')}
  <rect x="0" y="0" width="300" height="8" fill="#F25022"/>
  <rect x="300" y="0" width="300" height="8" fill="#7FBA00"/>
  <rect x="600" y="0" width="300" height="8" fill="#00A4EF"/>
  <rect x="900" y="0" width="300" height="8" fill="#FFB900"/>

  <text x="72" y="118" font-family="${font}" font-size="24" font-weight="700" letter-spacing="5" fill="#7DD3FC">MICROSOFT CLUB SIST PRESENTS</text>
  <text x="68" y="238" font-family="${font}" font-size="128" font-weight="900" fill="url(#azure)">ORION 1.0</text>
  <text x="72" y="306" font-family="${font}" font-size="44" font-weight="700" fill="#FFFFFF">24-Hour National Level Hackathon</text>
  <text x="72" y="356" font-family="${font}" font-size="30" font-weight="500" fill="#BAE6FD">Sathyabama Institute, Chennai · Tamil Nadu</text>

  <g font-family="${font}" font-weight="800">
    <rect x="72" y="410" width="250" height="96" rx="10" fill="#00BCF2" fill-opacity="0.12" stroke="#00BCF2" stroke-opacity="0.55"/>
    <text x="197" y="455" font-size="40" fill="#FFFFFF" text-anchor="middle">₹1,00,000</text>
    <text x="197" y="487" font-size="18" fill="#7DD3FC" text-anchor="middle" letter-spacing="2">PRIZE POOL</text>

    <rect x="342" y="410" width="240" height="96" rx="10" fill="#00BCF2" fill-opacity="0.12" stroke="#00BCF2" stroke-opacity="0.55"/>
    <text x="462" y="455" font-size="40" fill="#FFFFFF" text-anchor="middle">4 Tracks</text>
    <text x="462" y="487" font-size="18" fill="#7DD3FC" text-anchor="middle" letter-spacing="2">AI · WEB3 · CLIMATE</text>

    <rect x="602" y="410" width="200" height="96" rx="10" fill="#00BCF2" fill-opacity="0.12" stroke="#00BCF2" stroke-opacity="0.55"/>
    <text x="702" y="455" font-size="40" fill="#FFFFFF" text-anchor="middle">Top 70</text>
    <text x="702" y="487" font-size="18" fill="#7DD3FC" text-anchor="middle" letter-spacing="2">OFFLINE FINALE</text>
  </g>

  <text x="72" y="574" font-family="${font}" font-size="26" font-weight="700" fill="#FFFFFF">Register your team — ₹100 · Round 1 closes 21 Sep 2026</text>
</svg>`;

const logo = await sharp(path.join(root, 'public/orion-logo-v1.webp')).resize(370, 370, { fit: 'contain' }).png().toBuffer();

await sharp(Buffer.from(svg))
  .composite([{ input: logo, left: 800, top: 100 }])
  .png({ compressionLevel: 9, palette: false })
  .toFile(path.join(root, 'public/og-image.png'));

console.log('Wrote public/og-image.png');
