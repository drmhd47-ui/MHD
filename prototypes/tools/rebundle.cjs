// Repacks a directory produced by unbundle.cjs back into the original "Bundled Page" HTML shell.
// usage: node rebundle.cjs <original.html> <dir> <out.html>
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const [src, dir, out] = process.argv.slice(2);
let html = fs.readFileSync(src, 'utf8');
const meta = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
const origManifest = JSON.parse(html.match(/<script type="__bundler\/manifest"[^>]*>([\s\S]*?)<\/script>/)[1]);
let template = fs.readFileSync(path.join(dir, 'template.html'), 'utf8');
const manifest = {};
for (const l of meta.list) {
  const buf = fs.readFileSync(path.join(dir, 'assets', l.name));
  const o = origManifest[l.uuid] || { mime: l.mime, compressed: true };
  manifest[l.uuid] = { ...o, mime: l.mime, compressed: true, data: zlib.gzipSync(buf, { level: 9 }).toString('base64') };
  template = template.split('assets/' + l.name).join(l.uuid);
}
const esc = (s) => s.replace(/<\//g, '<\\u002F');
function put(type, text) {
  const re = new RegExp('(<script type="__bundler/' + type + '"[^>]*>)[\\s\\S]*?(</script>)');
  html = html.replace(re, (_, a, b) => a + '\n' + text + '\n  ' + b);
}
put('manifest', esc(JSON.stringify(manifest)));
put('template', esc(JSON.stringify(template)));
fs.writeFileSync(out, html);
console.log('wrote', out, (html.length / 1024).toFixed(0) + 'KB');
