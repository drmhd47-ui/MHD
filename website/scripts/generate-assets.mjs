// يولّد أيقونات الموقع وصورة المشاركة من الشعار الرسمي وصورة كافد. يُشغَّل يدوياً عند تغيير الشعار:
//   node scripts/generate-assets.mjs
import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const CREAM = '#FDFBF6';
const NAVY_DEEP = '#0A1B2E';
const GOLD = '#A9812F';
const logoSvg = await readFile('src/assets/logo-mark.svg');
await mkdir('public/icons', { recursive: true });
await mkdir('public/og', { recursive: true });

/** شعار على لوح كريمي بإطار ذهبي، كما في الهوية الرسمية. */
async function plate(size, pad = 0.14, radius = 0.12, border = true) {
  const inner = Math.round(size * (1 - pad * 2));
  const logo = await sharp(logoSvg, { density: 600 }).resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const r = Math.round(size * radius);
  const bw = border ? Math.max(1, Math.round(size / 64)) : 0;
  const bg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect x="${bw / 2}" y="${bw / 2}" width="${size - bw}" height="${size - bw}" rx="${r}" fill="${CREAM}" stroke="${GOLD}" stroke-width="${bw}"/></svg>`
  );
  return sharp(bg).composite([{ input: logo, gravity: 'center' }]).png();
}

await (await plate(512)).toFile('public/icons/logo-512.png');
await (await plate(192)).toFile('public/icons/icon-192.png');
await (await plate(180, 0.1, 0, false)).flatten({ background: CREAM }).toFile('public/icons/apple-touch-icon.png');
const ico32 = await (await plate(32, 0.06, 0.15)).toBuffer();
const ico16 = await (await plate(16, 0.04, 0.15, false)).toBuffer();
await writeFile('public/favicon.ico', await pngToIco([ico32, ico16]));

// favicon.svg: الشعار نفسه على لوح كريمي (vector)
const path = logoSvg.toString().replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
await writeFile(
  'public/favicon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-200 -200 2312 2248"><rect x="-200" y="-200" width="2312" height="2248" rx="300" fill="${CREAM}"/>${path}</svg>`
);

// صورة المشاركة 1200×630: صورة كافد الليلية بتدرج كحلي، والشعار على لوح كريمي في الوسط.
for (const lang of ['ar', 'en']) {
  const bgImg = await sharp('src/assets/kafd-night.jpg').resize(1200, 630, { fit: 'cover', position: 'center' }).toBuffer();
  const shade = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${NAVY_DEEP}" stop-opacity="0.72"/><stop offset="1" stop-color="${NAVY_DEEP}" stop-opacity="0.92"/></linearGradient></defs><rect width="1200" height="630" fill="url(#g)"/><rect x="0" y="622" width="1200" height="8" fill="${GOLD}"/></svg>`
  );
  const logo = await (await plate(300)).toBuffer();
  await sharp(bgImg).composite([{ input: shade }, { input: logo, gravity: 'center' }]).jpeg({ quality: 82, mozjpeg: true }).toFile(`public/og/og-${lang}.jpg`);
}
console.log('assets generated');
