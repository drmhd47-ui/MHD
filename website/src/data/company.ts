/**
 * بيانات الشركة الرسمية — مصدر واحد لكل ما يظهر في الترويسة والتذييل والبيانات المنظمة وصفحات السياسات.
 * أي تغيير في السجل التجاري أو الترخيص أو العنوان يُعدَّل هنا فقط.
 */
export const company = {
  nameAr: 'مجموعة إم القانونية',
  nameEn: 'M GROUP',
  /** الاسم كما ورد في السجل التجاري. */
  registeredNameEn: 'M GROUP COMPANY FOR LAWYERSHIP AND LEGAL CONSULATIONS',
  registeredShortName: 'M GRP',
  legalFormAr: 'شركة محاماة مهنية مرخّصة',
  legalFormEn: 'Licensed professional law firm',
  commercialRegistration: '7055255900',
  vatNumber: '3150535051',
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
  coverage: [
    { ar: { city: 'الرياض', region: 'منطقة الرياض — المقر الرئيسي في كافد' }, en: { city: 'Riyadh', region: 'Riyadh Region — headquarters at KAFD' }, hq: true },
    { ar: { city: 'الخبر', region: 'المنطقة الشرقية' }, en: { city: 'Al Khobar', region: 'Eastern Province' } },
    { ar: { city: 'القصيم', region: 'منطقة القصيم' }, en: { city: 'Al-Qassim', region: 'Al-Qassim Region' } },
    { ar: { city: 'المدينة المنورة', region: 'منطقة المدينة المنورة' }, en: { city: 'Madinah', region: 'Madinah Region' } },
    { ar: { city: 'جدة', region: 'منطقة مكة المكرمة' }, en: { city: 'Jeddah', region: 'Makkah Region' } }
  ]
} as const;

/** إصدار سياسة الخصوصية — يُرسل مع كل طلب ليُسجَّل أي نسخة وافق عليها المستخدم. */
export const PRIVACY_POLICY_VERSION = '2026-09-29';
