import { getCollection } from 'astro:content';
import type { Lang } from '../data/catalog';

/** المقالات المعتمدة للنشر فقط، الأحدث أولاً. */
export async function publishedArticles(lang: Lang) {
  const all = await getCollection('articles', (a) => a.data.status === 'reviewed' && a.data.lang === lang);
  return all.sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime());
}
