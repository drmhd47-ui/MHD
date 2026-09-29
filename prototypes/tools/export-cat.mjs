import { axes, services } from './cat.mts'; // نسخة من website/src/data/catalog.ts
import fs from 'fs';
const out = axes.map((a, i) => ({
  id: 'axis-' + (i + 1), num: a.num,
  title: { ar: a.ar.title, en: a.en.title }, sub: { ar: a.ar.sub, en: a.en.sub },
  services: services.filter(s => s.axis === a.slug).map(s => ({
    key: s.slug, delivery: s.delivery,
    title: { ar: s.ar.title, en: s.en.title }, desc: { ar: s.ar.desc, en: s.en.desc },
    serve: { ar: s.ar.serve, en: s.en.serve },
    offer: s.ar.offer.map((x, j) => ({ ar: x, en: s.en.offer[j] || '' })),
    diff: { ar: s.ar.diff, en: s.en.diff }, out: { ar: s.ar.out, en: s.en.out } }))
}));
fs.writeFileSync('axes.json', JSON.stringify(out));
console.log(out.map(a => a.id + ' ' + a.title.ar + ' ' + a.services.length).join('\n'), '\ntotal', out.reduce((n, a) => n + a.services.length, 0));
console.log(out.flatMap(a=>a.services.map(s=>s.key)).join(' '));
