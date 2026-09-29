import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * صندوق صادر دائم ومشفّر: كل طلب ملف مستقل مشفّر بـ AES-256-GCM، يُكتب بإعادة تسمية ذرّية
 * فلا يُقرأ ملف نصف مكتوب. يبقى الملف حتى يؤكد النظام الداخلي الاستلام ثم يُحذف.
 */
export class Outbox {
  constructor(dir, deadLetterDir, key) {
    this.dir = dir;
    this.deadLetterDir = deadLetterDir;
    this.key = key;
  }

  async init() {
    await mkdir(this.dir, { recursive: true, mode: 0o700 });
    await mkdir(this.deadLetterDir, { recursive: true, mode: 0o700 });
  }

  encrypt(obj) {
    const iv = randomBytes(12);
    const c = createCipheriv('aes-256-gcm', this.key, iv);
    const data = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
    return Buffer.concat([iv, c.getAuthTag(), data]);
  }

  decrypt(buf) {
    const d = createDecipheriv('aes-256-gcm', this.key, buf.subarray(0, 12));
    d.setAuthTag(buf.subarray(12, 28));
    return JSON.parse(Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString('utf8'));
  }

  async put(record) {
    const final = join(this.dir, `${record.id}.bin`);
    const tmp = `${final}.tmp`;
    await writeFile(tmp, this.encrypt(record), { mode: 0o600 });
    await rename(tmp, final);
  }

  async list() {
    const names = (await readdir(this.dir)).filter((n) => n.endsWith('.bin'));
    const out = [];
    for (const n of names) {
      const p = join(this.dir, n);
      try {
        out.push({ path: p, mtimeMs: (await stat(p)).mtimeMs });
      } catch {
        /* حُذف بين القراءة والفحص */
      }
    }
    return out.sort((a, b) => a.mtimeMs - b.mtimeMs);
  }

  async read(path) {
    return this.decrypt(await readFile(path));
  }

  async remove(path) {
    await rm(path, { force: true });
  }

  async deadLetter(path) {
    await rename(path, join(this.deadLetterDir, path.split('/').pop()));
  }
}
