import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * المقالات والمستجدات النظامية (المرحلة الثالثة).
 * لا يُنشر مقال إلا إذا كانت حالته "reviewed" واسم المحامي المراجِع مُسجلاً، مع مصدر رسمي واحد على الأقل.
 * المسودات تبقى في المستودع للمراجعة ولا تُبنى صفحاتها ولا تظهر في خريطة الموقع.
 */
const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z
    .object({
      title: z.string().min(5),
      lang: z.enum(['ar', 'en']),
      summary: z.string().min(20).max(300),
      publishedAt: z.coerce.date(),
      updatedAt: z.coerce.date().optional(),
      status: z.enum(['draft', 'reviewed']),
      reviewedBy: z.string().optional(),
      sources: z.array(z.object({ title: z.string(), url: z.string().url() })).default([])
    })
    .refine((a) => a.status !== 'reviewed' || (a.reviewedBy && a.sources.length > 0), {
      message: 'المقال المعتمد للنشر يلزمه اسم المراجِع ومصدر رسمي واحد على الأقل'
    })
});

/** صفحات السياسات (الخصوصية وشروط الاستخدام) بالعربية والإنجليزية. */
const legal = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/legal' })
});

export const collections = { articles, legal };
