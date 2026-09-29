// Unpacks a "Bundled Page" HTML into a directory: template.html + assets/<uuid>.<ext>
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const [src, out] = process.argv.slice(2);
const html = fs.readFileSync(src, 'utf8');
function block(type) {
  const re = new RegExp('<script type="__bundler/' + type + '"[^>]*>([\\s\\S]*?)</script>');
  const m = html.match(re); return m ? m[1] : null;
}
const manifest = JSON.parse(block('manifest'));
let template = JSON.parse(block('template'));
const extRes = block('ext_resources');
fs.mkdirSync(path.join(out, 'assets'), { recursive: true });
const extOf = (mime) => ({ 'text/javascript': 'js', 'application/javascript': 'js', 'text/css': 'css', 'text/html': 'html',
  'image/png': 'png', 'image/svg+xml': 'svg', 'image/jpeg': 'jpg', 'font/woff2': 'woff2', 'application/json': 'json' }[mime] || 'bin');
const list = [];
for (const [uuid, e] of Object.entries(manifest)) {
  let buf = Buffer.from(e.data, 'base64');
  if (e.compressed) buf = zlib.gunzipSync(buf);
  const name = uuid + '.' + extOf(e.mime);
  fs.writeFileSync(path.join(out, 'assets', name), buf);
  list.push({ uuid, mime: e.mime, size: buf.length, name });
  template = template.split(uuid).join('assets/' + name);
}
fs.writeFileSync(path.join(out, 'template.html'), template);
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({ list, extRes: extRes && JSON.parse(extRes) }, null, 1));
console.log(src, '->', list.length, 'assets; template', template.length, 'chars');
for (const l of list) console.log(' ', l.mime, l.size, l.name);
