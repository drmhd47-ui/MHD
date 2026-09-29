import type { APIRoute } from 'astro';
import { axes, services } from '../../data/catalog';

/**
 * فهرس الخدمات بصيغة JSON — يقرؤه خادم الاستقبال للتحقق من قيمة "نوع الخدمة" وإرفاق عنوانها بالطلب،
 * فيبقى الكتالوج مصدراً واحداً للموقع وللنظام الداخلي.
 */
export const GET: APIRoute = () =>
  new Response(
    JSON.stringify(
      services.map((s) => ({
        slug: s.slug,
        axis: s.axis,
        axisTitleAr: axes.find((a) => a.slug === s.axis)!.ar.title,
        titleAr: s.ar.title,
        titleEn: s.en.title,
        official: s.official,
        delivery: s.delivery
      }))
    ),
    { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
  );
