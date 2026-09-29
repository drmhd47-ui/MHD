// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.mgrp.sa',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'never' },
  // لا سكربتات مضمّنة في الصفحات، ليعمل الموقع بسياسة CSP صارمة (script-src 'self').
  vite: { build: { assetsInlineLimit: 0 } },
  compressHTML: true,
  // "/" يُوجَّه إلى النسخة العربية؛ nginx يُرجع 301 نفسه في الإنتاج (انظر deploy/nginx.conf).
  redirects: { '/': '/ar/' },
  integrations: [
    sitemap({
      i18n: { defaultLocale: 'ar', locales: { ar: 'ar-SA', en: 'en-US' } },
      filter: (page) => !/\/contact\/(thanks|error)\/$/.test(page)
    })
  ],
  image: { responsiveStyles: false }
});
