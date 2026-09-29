/**
 * بيانات الشركة الرسمية — مصدر واحد لكل ما يظهر في الترويسة والتذييل والبيانات المنظمة وصفحات السياسات.
 * أي تغيير في السجل التجاري أو الترخيص أو العنوان يُعدَّل هنا فقط.
 */
export const company = {
  nameAr: 'مجموعة إم القانونية',
  nameEn: 'M GROUP',
  /** الاسم كما ورد حرفياً في شهادة السجل التجاري (وزارة التجارة، تاريخ الإصدار 21/09/2026). */
  registeredNameEn: 'M GRP Company For Lawyership and Legal Consultations',
  legalFormAr: 'شركة محاماة مهنية مرخّصة',
  legalFormEn: 'Licensed professional law firm',
  /** نوع الكيان وصفته كما في السجل التجاري. */
  entityTypeAr: 'شركة ذات مسؤولية محدودة (مهنية)',
  entityTypeEn: 'Limited liability company (Professional)',
  commercialRegistration: '7055255900',
  /**
   * ضريبة القيمة المضافة: الشركة غير مسجّلة حالياً (منشأة جديدة دون حد التسجيل الإلزامي)، فلا يُعرض أي رقم
   * ضريبي في الموقع ولا تُحتسب ضريبة على الفواتير. عند التسجيل يُضاف رقم التسجيل (15 رقماً) هنا ويُعاد عرضه.
   */
  vatRegistered: false,
  lawPracticeLicense: '481757',
  address: {
    ar: 'مركز الملك عبدالله المالي (كافد)، الرياض 13519، المملكة العربية السعودية',
    en: 'King Abdullah Financial District (KAFD), Riyadh 13519, Kingdom of Saudi Arabia',
    locality: 'Riyadh',
    postalCode: '13519',
    country: 'SA'
  },
  phoneDisplay: '0546444000',
  phoneE164: '+966546444000',
  whatsappNumber: '966546444000',
  email: 'info@mgrp.sa',
  website: 'https://www.mgrp.sa',
  hours: {
    ar: 'الأحد إلى الخميس، من 8 صباحاً إلى 6 مساءً',
    en: 'Sunday to Thursday, 8:00 AM to 6:00 PM',
    schema: 'Su-Th 08:00-18:00'
  },
  social: [
    { key: 'x', label: 'X', handle: '@mgrpksa', url: 'https://x.com/mgrpksa' },
    { key: 'instagram', label: 'Instagram', handle: '@mgrp.sa', url: 'https://instagram.com/mgrp.sa' },
    { key: 'snapchat', label: 'Snapchat', handle: '@mgrp.sa', url: 'https://www.snapchat.com/add/mgrp.sa' },
    { key: 'tiktok', label: 'TikTok', handle: '@mgrp.sa', url: 'https://www.tiktok.com/@mgrp.sa' }
  ],
  /** حصيلة الأعمال السابقة للشركاء قبل انضمامهم إلى الشركة — ليست أعمال الشركة ككيان. */
  partnersTrackRecord: { cases: 4700, contracts: 4000, consultations: 14000 },
  managingPartner: {
    ar: {
      name: 'الدكتور محمد بن جمعان',
      role: 'الشريك الإداري',
      experience: 'أكثر من 30 عاماً من العمل الحكومي والدبلوماسي والمؤسسي في إدارة العقود والميزانية والإدارة.',
      education: [
        'دكتوراه في القانون والاقتصاد السياسي والتشريعات الاقتصادية',
        'ماجستير في الشريعة والقانون، تخصص القانون الجنائي المقارن',
        'الدبلوم العالي للمحامين، وزارة العدل',
        'بكالوريوس في القانون'
      ]
    },
    en: {
      name: 'Dr. Mohammed bin Jamaan',
      role: 'Managing Partner',
      experience: 'More than 30 years of governmental, diplomatic and institutional experience in contracts, budget and administration.',
      education: [
        'Ph.D. in Law, Political Economy and Economic Legislation',
        "Master's in Sharia and Law, Comparative Criminal Law",
        'Higher Diploma for Lawyers, Ministry of Justice',
        'Bachelor of Laws'
      ]
    }
  },
  licensedLawyers: [{ ar: { name: 'المحامية ضي حمد آل شيبان', role: 'محامية مرخّصة' }, en: { name: 'Dhai Hamad Al Shaiban', role: 'Licensed Lawyer' } }],
  /** مقر واحد فقط (لا مكاتب فعلية في مدن أخرى)؛ الخدمة في أي مدينة بالتنسيق المسبق. */
  coverage: [
    { ar: { city: 'الرياض', region: 'مركز الملك عبدالله المالي (كافد)' }, en: { city: 'Riyadh', region: 'King Abdullah Financial District (KAFD)' }, hq: true }
  ]
} as const;

/** إصدار سياسة الخصوصية — يُرسل مع كل طلب ليُسجَّل أي نسخة وافق عليها المستخدم. */
export const PRIVACY_POLICY_VERSION = '2026-09-29';
