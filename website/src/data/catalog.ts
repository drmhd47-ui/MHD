/**
 * كتالوج خدمات مجموعة إم القانونية — المصدر الوحيد لمحتوى الخدمات في الموقع.
 *
 * البنية: المحاور الخمسة الرسمية، وكل خدمة بقالب الهوية الرباعي (نخدم / ماذا نقدم / ما يميز عملنا / مخرجاتنا).
 * `official` يربط الخدمة برقمها في الفهرس الرسمي (01–32)، و`basis` يسجّل الإطار النظامي الحاكم لها
 * (للمراجعة التحريرية الداخلية فقط، لا يُعرض للجمهور). قاعدة الإدراج: لا تُدرج خدمة ليس لها نظام
 * أو إطار تنظيمي نافذ يحكمها، ولا خدمة تمس الأمن الوطني، ولا خدمة تتطلب ترخيصاً خاصاً لا تحمله الشركة
 * إلا بصيغة التعاقد مع جهة مرخّصة (`delivery: 'licensed-partner'`).
 *
 * أي تعديل هنا يمر بمراجعة محامٍ مرخّص قبل النشر (انظر website/README.md — سياسة المحتوى).
 */

export type Lang = 'ar' | 'en';

/** طريقة تقديم الخدمة — تحدد النص النظامي الإلزامي الذي يظهر في صفحة الخدمة. */
export type Delivery =
  /** تقدمها الشركة مباشرة بموجب ترخيصها. */
  | 'direct'
  /** خدمتا الشراكة الاستراتيجية (30، 31): بالتنسيق مع خبراء يُتعاقد معهم لكل مهمة على حدة. */
  | 'strategic-partnership'
  /** نشاط يتطلب ترخيصاً مستقلاً: يُنفَّذ عبر جهة مرخّصة يُتعاقد معها، وتتولى الشركة الجانب القانوني. */
  | 'licensed-partner';

export interface ServiceText {
  title: string;
  desc: string;
  serve: string;
  offer: string[];
  diff: string;
  out: string;
}

export interface Service {
  slug: string;
  axis: AxisSlug;
  official: number[];
  delivery: Delivery;
  basis: string[];
  ar: ServiceText;
  en: ServiceText;
}

export type AxisSlug = 'business' | 'family-wealth' | 'sports-entertainment-tourism' | 'residency' | 'specialized';

export interface Axis {
  slug: AxisSlug;
  num: string;
  ar: { title: string; sub: string };
  en: { title: string; sub: string };
}

export const axes: Axis[] = [
  {
    slug: 'business',
    num: '01',
    ar: { title: 'الشركات والأعمال والاستثمار', sub: 'التأسيس والحوكمة، العقود، الاستثمار، الامتثال، والمنازعات' },
    en: { title: 'Corporate, Business & Investment', sub: 'Formation & governance, contracts, investment, compliance and disputes' }
  },
  {
    slug: 'family-wealth',
    num: '02',
    ar: { title: 'الأسرة والثروة', sub: 'التركات، الوقف، الشركات العائلية، والأحوال الشخصية' },
    en: { title: 'Family & Wealth', sub: 'Estates, waqf, family businesses and personal status' }
  },
  {
    slug: 'sports-entertainment-tourism',
    num: '03',
    ar: { title: 'الرياضة والترفيه والسياحة والفعاليات', sub: 'القانون الرياضي، الترفيه، السياحة، الفعاليات، والألعاب الإلكترونية' },
    en: { title: 'Sports, Entertainment, Tourism & Events', sub: 'Sports law, entertainment, tourism, events and gaming' }
  },
  {
    slug: 'residency',
    num: '04',
    ar: { title: 'الإقامة', sub: 'الإقامة المميزة وخدمات المستثمر الأجنبي' },
    en: { title: 'Residency', sub: 'Premium Residency and foreign investor services' }
  },
  {
    slug: 'specialized',
    num: '05',
    ar: { title: 'الخدمات المتخصصة', sub: 'العقار، العمل، الملكية الفكرية، البيانات، القطاع العام، التمويل، والقطاعات النوعية' },
    en: { title: 'Specialized Services', sub: 'Real estate, employment, IP, data, public sector, finance and sector-specific practice' }
  }
];

export const services: Service[] = [
  // ─────────────────────────── المحور الأول: الشركات والأعمال والاستثمار ───────────────────────────
  {
    slug: 'company-formation',
    axis: 'business',
    official: [1],
    delivery: 'direct',
    basis: ['نظام الشركات', 'نظام السجل التجاري'],
    ar: {
      title: 'تأسيس الشركات وإعادة الهيكلة والتصفية',
      desc: 'تأسيس الكيانات التجارية والمهنية في المملكة وتعديل هياكلها وتصفيتها.',
      serve: 'رواد الأعمال، والشركات الناشئة والعائلية والمساهمة والمهنية، والشركات الأجنبية الداخلة إلى السوق السعودية.',
      offer: [
        'اختيار الشكل النظامي الأنسب ومقارنة مزاياه والتزاماته',
        'صياغة عقود التأسيس والأنظمة الأساس واتفاقيات الشركاء',
        'مصفوفات الصلاحيات ومحاضر الجمعيات وقراراتها',
        'زيادة رأس المال وتعديل الحصص والتخارج المنظم وتصحيح الهيكل',
        'التصفية وإنهاء الشركات ومعالجة الالتزامات والضمانات'
      ],
      diff: 'نصمم آلية اتخاذ القرار وحل الخلاف قبل التوقيع لا بعد نشوء النزاع، ونربط التأسيس بالحوكمة والتمويل والزكاة من اليوم الأول.',
      out: 'عقد تأسيس ونظام أساس جاهزان للقيد، واتفاقية شركاء، ومصفوفة صلاحيات، وخارطة طريق نظامية.'
    },
    en: {
      title: 'Company Formation, Restructuring & Liquidation',
      desc: 'Incorporation, restructuring and liquidation of commercial and professional entities in the Kingdom.',
      serve: 'Entrepreneurs, startups, family-owned, joint-stock and professional companies, and foreign companies entering the Saudi market.',
      offer: [
        'Selecting the most suitable legal form and comparing its benefits and obligations',
        "Drafting Articles of Association, bylaws and shareholders' agreements",
        'Authority matrices, general assembly minutes and resolutions',
        'Capital increases, quota adjustments, structured exits and corporate rectification',
        'Liquidation and dissolution, and settlement of obligations and guarantees'
      ],
      diff: 'We design decision-making and dispute-resolution mechanisms before signature, not after a dispute arises, integrating governance, financing and zakat from day one.',
      out: "Articles and bylaws ready for registration, a shareholders' agreement, an authority matrix and a regulatory roadmap."
    }
  },
  {
    slug: 'corporate-governance',
    axis: 'business',
    official: [1],
    delivery: 'direct',
    basis: ['نظام الشركات', 'لائحة حوكمة الشركات الصادرة عن هيئة السوق المالية'],
    ar: {
      title: 'حوكمة الشركات ومجالس الإدارة',
      desc: 'لوائح الحوكمة واللجان والسياسات المتوافقة مع متطلبات هيئة السوق المالية.',
      serve: 'الشركات المساهمة، والشركات العائلية الكبرى، والجهات الخاضعة لمتطلبات هيئة السوق المالية.',
      offer: [
        'لوائح مجلس الإدارة واللجان: التنفيذية، والمراجعة، والمكافآت، والمخاطر',
        'مصفوفات الصلاحيات وسياسات تعارض المصالح والإفصاح',
        'تقييم أداء المجلس وأمانة السر وحوكمة الاجتماعات',
        'حوكمة الشركات المدرجة وفق لوائح هيئة السوق المالية',
        'إعداد تقارير الحوكمة السنوية'
      ],
      diff: 'نحوّل الحوكمة من وثائق إلى ممارسة: اجتماعات فعّالة، وقرارات موثقة، ومساءلة واضحة.',
      out: 'دليل حوكمة، ولوائح اللجان، ومصفوفة صلاحيات، ونماذج المحاضر والتقارير.'
    },
    en: {
      title: 'Corporate Governance & Board Advisory',
      desc: 'Governance charters, board committees and policies aligned with Capital Market Authority requirements.',
      serve: 'Joint-stock companies, large family businesses and entities subject to Capital Market Authority requirements.',
      offer: [
        'Board and committee charters: executive, audit, remuneration and risk',
        'Authority matrices, conflict-of-interest and disclosure policies',
        'Board performance evaluation, board secretariat and meeting governance',
        'Governance of listed companies under Capital Market Authority regulations',
        'Annual governance reporting'
      ],
      diff: 'We turn governance from documents into practice: effective meetings, documented decisions and clear accountability.',
      out: 'A governance manual, committee charters, an authority matrix, and minutes and reporting templates.'
    }
  },
  {
    slug: 'commercial-contracts',
    axis: 'business',
    official: [2],
    delivery: 'direct',
    basis: ['نظام المعاملات المدنية', 'نظام المحاكم التجارية'],
    ar: {
      title: 'صياغة العقود التجارية ومراجعتها',
      desc: 'إعداد العقود المحلية والدولية ومراجعتها وتحليل مخاطرها التعاقدية.',
      serve: 'الإدارات القانونية والمشتريات والمبيعات والتشغيل في المنشآت الكبرى والمتوسطة.',
      offer: [
        'صياغة عقود التوريد والخدمات والشراكة والتوزيع والوكالة',
        'مراجعة العقود الدولية وتحليل المخاطر التعاقدية وصياغة بنود الحماية',
        'نماذج عقود موحدة ومكتبة بنود للاستخدام المتكرر',
        'اتفاقيات عدم الإفصاح وعدم المنافسة وعدم الاستقطاب وحماية الأسرار التجارية',
        'آليات حل النزاع والتعويض والشرط الجزائي وحدود المسؤولية'
      ],
      diff: 'نكتب العقد بلغة تنفيذية قابلة للقياس لا بلغة نظرية؛ كل بند مرتبط بمدة وجزاء وآلية إثبات.',
      out: 'عقد ثنائي اللغة مع ملحق للمخاطر وتوصيات تفاوضية ونسخة قابلة للأتمتة.'
    },
    en: {
      title: 'Commercial Contract Drafting & Review',
      desc: 'Drafting and reviewing domestic and cross-border agreements and analysing their contractual risk.',
      serve: 'Legal, procurement, sales and operations departments in large and mid-sized enterprises.',
      offer: [
        'Drafting supply, services, partnership, distribution and agency agreements',
        'Reviewing cross-border contracts, contractual risk analysis and protective clauses',
        'Standard templates and a clause library for recurring use',
        'NDAs, non-compete, non-solicitation and trade secret protection',
        'Dispute resolution, compensation, penalty clauses and limitation of liability'
      ],
      diff: 'We draft in operational, measurable language rather than academic prose: every clause is linked to a timeline, a remedy and an evidentiary mechanism.',
      out: 'A bilingual agreement with a risk annex, negotiation recommendations and an automatable version.'
    }
  },
  {
    slug: 'franchising',
    axis: 'business',
    official: [2],
    delivery: 'direct',
    basis: ['نظام الامتياز التجاري', 'نظام العلامات التجارية'],
    ar: {
      title: 'الامتياز التجاري والوكالات التجارية',
      desc: 'هيكلة الامتياز التجاري وحماية العلامة ونماذج التوسع.',
      serve: 'أصحاب العلامات الراغبون في التوسع، ومستوردو الامتياز، وقطاعا المطاعم والتجزئة.',
      offer: [
        'تقييم قابلية النموذج للامتياز وإعداد وثيقة الإفصاح',
        'اتفاقية امتياز تحمي العلامة والمعرفة الفنية',
        'دليل التشغيل وحماية الأسرار التجارية ومعايير الجودة',
        'هيكلة رسوم الامتياز والنطاقات الجغرافية والتوريد الحصري',
        'قيد الامتياز لدى وزارة التجارة'
      ],
      diff: 'نبني نموذج امتياز قابلاً للتكرار لا مجرد عقد ترخيص علامة، مع حماية تشغيلية ونظامية.',
      out: 'وثيقة إفصاح، واتفاقية امتياز، ودليل تشغيل، وخطة توسع.'
    },
    en: {
      title: 'Franchising & Commercial Agencies',
      desc: 'Franchise structuring, brand protection and expansion models.',
      serve: 'Brand owners seeking expansion, franchise importers, and the F&B and retail sectors.',
      offer: [
        'Franchise viability assessment and preparation of the disclosure document',
        'Franchise agreements protecting the trademark and know-how',
        'Operations manual, trade secret protection and quality standards',
        'Structuring franchise fees, territories and exclusive supply',
        'Franchise registration with the Ministry of Commerce'
      ],
      diff: 'We build a replicable franchise model, not a mere trademark licence, with operational and regulatory protection.',
      out: 'A disclosure document, a franchise agreement, an operations manual and an expansion plan.'
    }
  },
  {
    slug: 'foreign-investment',
    axis: 'business',
    official: [3],
    delivery: 'direct',
    basis: ['نظام الاستثمار', 'نظام الشركات'],
    ar: {
      title: 'الاستثمار الأجنبي ودخول السوق',
      desc: 'دخول السوق والتسجيل لدى وزارة الاستثمار وهيكلة الاستثمار وفق نظام الاستثمار.',
      serve: 'المستثمرون الأجانب، وصناديق الاستثمار، والشركات الراغبة في التوسع الإقليمي انطلاقاً من المملكة.',
      offer: [
        'هيكلة دخول السوق والتسجيل لدى وزارة الاستثمار وفق نظام الاستثمار',
        'متطلبات المقر الإقليمي وحوافزه ومتطلبات التوطين',
        'هيكلة الاستثمار: حصة مباشرة، أو مشروع مشترك، أو شركة تابعة، أو فرع',
        'اتفاقيات المساهمين وحماية المستثمر وحقوق الأقلية',
        'التخارج: بيع الحصص، أو الطرح العام، أو إعادة الهيكلة'
      ],
      diff: 'نبني الهيكل حول هدف الاستثمار لا حول نموذج جاهز، مع مواءمة الاعتبارات الزكوية والضريبية.',
      out: 'مذكرة هيكلة استثمارية، وملف التسجيل لدى وزارة الاستثمار، واتفاقية مساهمين، وخطة امتثال نظامي.'
    },
    en: {
      title: 'Foreign Direct Investment & Market Entry',
      desc: 'Market entry, registration with the Ministry of Investment and investment structuring under the Investment Law.',
      serve: 'Foreign investors, investment funds and companies expanding regionally from the Kingdom.',
      offer: [
        'Market entry structuring and registration with the Ministry of Investment under the Investment Law',
        'Regional Headquarters requirements, incentives and localisation obligations',
        'Investment structuring: direct equity, joint venture, subsidiary or branch',
        "Shareholders' agreements, investor protection and minority rights",
        'Exit: share sale, public offering or restructuring'
      ],
      diff: 'We structure around the investment objective rather than an off-the-shelf form, aligning zakat and tax considerations.',
      out: "An investment structuring memorandum, the Ministry of Investment registration file, a shareholders' agreement and a regulatory compliance plan."
    }
  },
  {
    slug: 'investment-protection',
    axis: 'business',
    official: [3],
    delivery: 'direct',
    basis: ['اتفاقيات الاستثمار الثنائية النافذة للمملكة', 'اتفاقية تسوية منازعات الاستثمار (ICSID)', 'نظام التحكيم'],
    ar: {
      title: 'حماية الاستثمار الدولي',
      desc: 'الحماية المقررة في اتفاقيات الاستثمار وهيكلة الاستثمار العابر للحدود.',
      serve: 'المستثمرون السعوديون في الخارج، والمستثمرون الأجانب في المملكة، والشركات ذات الاستثمارات العابرة للحدود.',
      offer: [
        'تحليل الحماية المقررة في اتفاقيات الاستثمار الثنائية ومتعددة الأطراف',
        'هيكلة الاستثمار العابر للحدود بما يراعي الحماية التعاهدية المتاحة',
        'منازعات الاستثمار أمام مركز تسوية منازعات الاستثمار (ICSID) بالتنسيق مع محامين مرخّصين في الدولة المعنية',
        'مراجعة عقود الاستثمار مع الجهات الأجنبية من منظور الحماية وتسوية المنازعات'
      ],
      diff: 'نقرأ الاتفاقية قبل الاستثمار لا بعد النزاع، فتُبنى الحماية في الهيكل نفسه.',
      out: 'مذكرة حماية استثمار، وتوصية بالهيكل، وبنود تسوية المنازعات.'
    },
    en: {
      title: 'International Investment Protection',
      desc: 'Protection under investment treaties and structuring of cross-border investments.',
      serve: 'Saudi investors abroad, foreign investors in the Kingdom and companies with cross-border investments.',
      offer: [
        'Analysing protections under bilateral and multilateral investment treaties',
        'Structuring cross-border investments with regard to available treaty protection',
        'Investment disputes before ICSID in coordination with lawyers licensed in the relevant jurisdiction',
        'Reviewing investment contracts with foreign counterparties for protection and dispute resolution'
      ],
      diff: 'We read the treaty before the investment, not after the dispute, so protection is built into the structure itself.',
      out: 'An investment protection memorandum, a structuring recommendation and dispute-resolution clauses.'
    }
  },
  {
    slug: 'startups-venture-capital',
    axis: 'business',
    official: [1, 3],
    delivery: 'direct',
    basis: ['نظام الشركات', 'لوائح هيئة السوق المالية ذات الصلة'],
    ar: {
      title: 'الشركات الناشئة ورأس المال الجريء',
      desc: 'جولات التمويل واتفاقيات المساهمين وخطط أسهم الموظفين للشركات الناشئة.',
      serve: 'المؤسسون، والمستثمرون الأفراد، وصناديق رأس المال الجريء.',
      offer: [
        'جولات التمويل من المرحلة التأسيسية إلى المراحل المتقدمة، وأدوات التمويل القابلة للتحويل',
        'اتفاقيات المساهمين والحقوق التفضيلية والحماية من التخفيف',
        'خطط أسهم الموظفين وجداول الاستحقاق',
        'هيكلة الشركات القابضة عبر الحدود بالتنسيق مع مستشارين مرخّصين في الدولة المعنية',
        'حوكمة الشركات الناشئة والتخارج والطرح العام'
      ],
      diff: 'نبني شركة قابلة للاستثمار: ملكية واضحة، وحوكمة مبكرة، وملكية فكرية مسجلة باسم الشركة.',
      out: 'ورقة شروط الاستثمار، واتفاقية مساهمين، وأداة تمويل قابلة للتحويل، وخطة أسهم الموظفين.'
    },
    en: {
      title: 'Startups & Venture Capital',
      desc: "Funding rounds, shareholders' agreements and employee share plans for startups.",
      serve: 'Founders, angel investors and venture capital funds.',
      offer: [
        'Funding rounds from pre-seed to later stages, and convertible instruments',
        "Shareholders' agreements, preferred rights and anti-dilution protection",
        'Employee share plans and vesting schedules',
        'Cross-border holding structures in coordination with advisers licensed in the relevant jurisdiction',
        'Startup governance, exits and public offerings'
      ],
      diff: 'We build an investable company: clear ownership, early governance and IP registered in the company’s name.',
      out: "A term sheet, a shareholders' agreement, a convertible instrument and an employee share plan."
    }
  },
  {
    slug: 'mergers-acquisitions',
    axis: 'business',
    official: [4],
    delivery: 'direct',
    basis: ['نظام الشركات', 'نظام المنافسة', 'لائحة الاندماج والاستحواذ الصادرة عن هيئة السوق المالية'],
    ar: {
      title: 'الاندماج والاستحواذ والعناية الواجبة',
      desc: 'العناية الواجبة (الفحص النافي للجهالة)، وهيكلة الصفقات، والإخطار بالتركز الاقتصادي.',
      serve: 'الشركات المستحوِذة والمستهدَفة، والمجموعات العائلية، وصناديق الملكية الخاصة.',
      offer: [
        'العناية الواجبة (الفحص النافي للجهالة) القانونية، بالتكامل مع الفحص المالي والضريبي والبيئي والعمالي',
        'هيكلة الصفقة: شراء أصول، أو شراء حصص وأسهم، أو اندماج',
        'الإخطار بالتركز الاقتصادي لدى الهيئة العامة للمنافسة، ومتطلبات هيئة السوق المالية عند الاقتضاء',
        'اتفاقيات البيع والشراء والإقرارات والضمانات والتعويضات وحجز جزء من الثمن',
        'خطة الدمج النظامي والتشغيلي بعد الاستحواذ'
      ],
      diff: 'نركز على مخاطر ما بعد التوقيع قبل التقييم: العقود، والتراخيص، والنزاعات، والالتزامات غير الظاهرة.',
      out: 'تقرير العناية الواجبة، واتفاقية البيع والشراء، وورقة الشروط، وخطة الدمج.'
    },
    en: {
      title: 'Mergers, Acquisitions & Due Diligence',
      desc: 'Legal due diligence, deal structuring and economic concentration filings.',
      serve: 'Acquirers and targets, family groups and private equity funds.',
      offer: [
        'Legal due diligence, integrated with financial, tax, environmental and labour reviews',
        'Deal structuring: asset purchase, share purchase or merger',
        'Economic concentration filings with the General Authority for Competition, and Capital Market Authority requirements where applicable',
        'SPAs, representations, warranties, indemnities and escrow of part of the price',
        'Post-acquisition regulatory and operational integration plan'
      ],
      diff: 'We focus on post-signing risk before valuation: contracts, licences, disputes and undisclosed liabilities.',
      out: 'A due diligence report, an SPA, a term sheet and an integration plan.'
    }
  },
  {
    slug: 'anti-concealment',
    axis: 'business',
    official: [5],
    delivery: 'direct',
    basis: ['نظام مكافحة التستر ولائحته التنفيذية'],
    ar: {
      title: 'مكافحة التستر وتصحيح الأوضاع',
      desc: 'معالجة مخاطر التستر وتصحيح أوضاع الملكية والإدارة وفق الأحكام النافذة.',
      serve: 'المنشآت محل الاشتباه، والمستثمرون الراغبون في تصحيح أوضاعهم، والشركاء المتضررون.',
      offer: [
        'تقييم مخاطر التستر من الجوانب النظامية والجزائية والزكوية',
        'خطة معالجة الأوضاع وفق الأحكام النافذة لنظام مكافحة التستر',
        'إعادة هيكلة الملكية والإدارة والتمويل',
        'التمثيل أمام وزارة التجارة والجهات المختصة والنيابة العامة',
        'برنامج امتثال يمنع تكرار المخالفة'
      ],
      diff: 'نعالج السبب لا العَرَض: من نموذج عمل غير نظامي إلى كيان استثماري ملتزم.',
      out: 'تقرير المخاطر، وخطة المعالجة، ومستندات التعديل، وبرنامج امتثال تشغيلي.'
    },
    en: {
      title: 'Anti-Concealment (Tasattur) Rectification',
      desc: 'Managing concealment risk and regularising ownership and management under the laws in force.',
      serve: 'Entities under suspicion, investors seeking to regularise their position and affected partners.',
      offer: [
        'Assessing concealment risk from regulatory, criminal and zakat perspectives',
        'A regularisation plan under the provisions in force of the Anti-Concealment Law',
        'Restructuring ownership, management and financing',
        'Representation before the Ministry of Commerce, competent authorities and the Public Prosecution',
        'A compliance programme that prevents recurrence'
      ],
      diff: 'We address the cause, not the symptom: from a non-compliant business model to a compliant investment entity.',
      out: 'A risk report, a regularisation plan, amendment documents and an operational compliance programme.'
    }
  },
  {
    slug: 'regulatory-compliance',
    axis: 'business',
    official: [5],
    delivery: 'direct',
    basis: ['نظام المنافسة', 'نظام حماية المستهلك', 'نظام التجارة الإلكترونية', 'نظام (قانون) الجمارك الموحد لدول مجلس التعاون'],
    ar: {
      title: 'الامتثال التنظيمي والقانون الاقتصادي',
      desc: 'المنافسة، وحماية المستهلك والتجارة الإلكترونية، والجمارك والتجارة الخارجية.',
      serve: 'المنشآت التجارية والصناعية، والمتاجر الإلكترونية، والمستوردون والمصدّرون.',
      offer: [
        'الامتثال لنظام المنافسة: الممارسات المقيِّدة، والإخطار بالتركز الاقتصادي، والرد على طلبات الهيئة العامة للمنافسة',
        'حماية المستهلك والتجارة الإلكترونية: شروط البيع وسياسات الاسترجاع ومراجعة الإعلانات',
        'الجمارك والتجارة الخارجية: التصنيف الجمركي، وشهادات المطابقة، وقواعد المنشأ، ومنازعات الشحنات',
        'مصفوفات الالتزامات النظامية وبرامج الامتثال الداخلي',
        'الرد على الجهات الرقابية والتمثيل في إجراءات المخالفات'
      ],
      diff: 'نحوّل الأنظمة المتفرقة إلى سجل التزامات واحد لكل منشأة، مرتبط بالمسؤول عنه ومواعيده.',
      out: 'سجل الالتزامات النظامية، وسياسات الامتثال، ومذكرات الرد على الجهات الرقابية.'
    },
    en: {
      title: 'Regulatory Compliance & Economic Law',
      desc: 'Competition, consumer protection and e-commerce, customs and foreign trade.',
      serve: 'Commercial and industrial businesses, online stores, importers and exporters.',
      offer: [
        'Competition Law compliance: restrictive practices, concentration filings and responses to the General Authority for Competition',
        'Consumer protection and e-commerce: terms of sale, return policies and advertising review',
        'Customs and foreign trade: tariff classification, conformity certificates, rules of origin and shipment disputes',
        'Regulatory obligation registers and internal compliance programmes',
        'Responding to regulators and representation in violation proceedings'
      ],
      diff: 'We turn scattered regulations into a single obligations register for each business, linked to an owner and a deadline.',
      out: 'A regulatory obligations register, compliance policies and response memoranda to regulators.'
    }
  },
  {
    slug: 'aml-compliance',
    axis: 'business',
    official: [5],
    delivery: 'direct',
    basis: ['نظام مكافحة غسل الأموال', 'نظام مكافحة جرائم الإرهاب وتمويله'],
    ar: {
      title: 'مكافحة غسل الأموال وتمويل الإرهاب',
      desc: 'برامج الامتثال والعناية الواجبة تجاه العملاء وحوكمة الالتزام.',
      serve: 'البنوك، وشركات التمويل، وشركات التقنية المالية، وشركات التأمين، والجهات غير المالية الخاضعة للنظام.',
      offer: [
        'تصميم برنامج مكافحة غسل الأموال وتمويل الإرهاب وتطبيقه',
        'العناية الواجبة تجاه العملاء وتقييم مخاطر العملاء والمعاملات',
        'سياسات الإبلاغ والرقابة الداخلية وتدريب موظفي الالتزام',
        'إجراءات الإبلاغ عن العمليات المشتبه بها للإدارة العامة للتحريات المالية',
        'حوكمة الالتزام وتقارير مجلس الإدارة'
      ],
      diff: 'نبني التزاماً يقلل الاحتكاك التشغيلي لا يزيده، بسياسات واضحة وإجراءات قابلة للأتمتة.',
      out: 'دليل الامتثال، ومصفوفة المخاطر، وسياسات العناية الواجبة، وخطة التدريب والمراجعة.'
    },
    en: {
      title: 'AML / CTF Compliance Programmes',
      desc: 'Compliance programmes, customer due diligence and compliance governance.',
      serve: 'Banks, finance companies, FinTechs, insurers and designated non-financial businesses.',
      offer: [
        'Designing and implementing AML/CTF programmes',
        'Customer due diligence and customer and transaction risk assessment',
        'Reporting policies, internal controls and compliance staff training',
        'Suspicious transaction reporting procedures to the General Directorate of Financial Investigation',
        'Compliance governance and board reporting'
      ],
      diff: 'We build compliance that reduces operational friction rather than adding to it, through clear policies and automatable procedures.',
      out: 'A compliance manual, a risk matrix, due diligence policies and a training and review plan.'
    }
  },
  {
    slug: 'capital-markets',
    axis: 'business',
    official: [5, 27],
    delivery: 'direct',
    basis: ['نظام السوق المالية ولوائحه التنفيذية'],
    ar: {
      title: 'أسواق رأس المال',
      desc: 'الطرح والإدراج والصناديق الاستثمارية والصكوك وأدوات الدين.',
      serve: 'الشركات الراغبة في الطرح، ومديرو الصناديق، ومُصدِرو الصكوك وأدوات الدين.',
      offer: [
        'الطرح العام والخاص والإدراج في السوق الرئيسية والسوق الموازية',
        'الصناديق الاستثمارية والعقارية وصناديق الملكية الخاصة',
        'الصكوك وأدوات الدين والتمويل المهيكل',
        'الإفصاح المستمر وحوكمة الشركات المدرجة',
        'إعادة هيكلة رأس المال والتوزيعات وشراء الشركة لأسهمها'
      ],
      diff: 'نربط الهيكلة النظامية بمتطلبات الطرح من البداية، للحد من الحاجة إلى إعادة الهيكلة لاحقاً.',
      out: 'نشرة الإصدار، وشروط الصندوق وأحكامه، ومستندات الإدراج، وبرنامج الإفصاح.'
    },
    en: {
      title: 'Capital Markets',
      desc: 'Offerings, listings, investment funds, sukuk and debt instruments.',
      serve: 'Companies seeking to go public, fund managers, and sukuk and debt issuers.',
      offer: [
        'Public and private offerings and listing on the Main Market and the Parallel Market',
        'Investment funds, real estate funds and private equity funds',
        'Sukuk, debt instruments and structured finance',
        'Continuing disclosure and governance of listed companies',
        'Capital restructuring, distributions and share buybacks'
      ],
      diff: 'We link regulatory structuring to offering requirements from the outset, reducing the need for later restructuring.',
      out: 'A prospectus, fund terms and conditions, listing documents and a disclosure programme.'
    }
  },
  {
    slug: 'zakat-tax',
    axis: 'business',
    official: [6],
    delivery: 'direct',
    basis: ['نظام ضريبة الدخل', 'نظام ضريبة القيمة المضافة', 'اللائحة التنفيذية لجباية الزكاة'],
    ar: {
      title: 'الزكاة والضريبة',
      desc: 'الجوانب النظامية للزكاة وضريبة الدخل والقيمة المضافة والاستقطاع، والاعتراضات.',
      serve: 'الشركات والمجموعات، والمستثمرون الأجانب، والشركات العائلية.',
      offer: [
        'التخطيط الزكوي والضريبي وهيكلة المجموعات ضمن الإطار النظامي',
        'مراجعة الإقرارات الزكوية والضريبية من الناحية النظامية',
        'الاعتراضات والتظلمات أمام لجان الفصل في المخالفات والمنازعات الضريبية ولجان الاستئناف',
        'المعاملة الزكوية والضريبية للشركات المختلطة وحالات التستر',
        'التسعير التحويلي واتفاقيات تجنب الازدواج الضريبي'
      ],
      diff: 'نربط الزكاة والضريبة بالهيكلة التجارية لا بالمحاسبة وحدها، بما يحقق الامتثال ويحد من الأعباء ضمن الإطار النظامي.',
      out: 'مذكرة التخطيط الزكوي والضريبي، ومذكرات الاعتراض، ومقترح هيكلة المجموعة.'
    },
    en: {
      title: 'Zakat & Tax',
      desc: 'Regulatory aspects of zakat, income tax, VAT and withholding tax, and objections.',
      serve: 'Companies and groups, foreign investors and family businesses.',
      offer: [
        'Zakat and tax planning and group structuring within the regulatory framework',
        'Regulatory review of zakat and tax returns',
        'Objections and appeals before the tax dispute and appeal committees',
        'Zakat and tax treatment of mixed-ownership companies and concealment cases',
        'Transfer pricing and double taxation treaties'
      ],
      diff: 'We link zakat and tax to commercial structuring, not accounting alone, achieving compliance and lawfully limiting the burden.',
      out: 'A zakat and tax planning memorandum, objection memoranda and a group structuring proposal.'
    }
  },
  {
    slug: 'bankruptcy-restructuring',
    axis: 'business',
    official: [7],
    delivery: 'direct',
    basis: ['نظام الإفلاس ولائحته التنفيذية'],
    ar: {
      title: 'الإفلاس وإعادة الهيكلة المالية',
      desc: 'التسوية الوقائية، وإعادة التنظيم المالي، والتصفية.',
      serve: 'الشركات المتعثرة، والدائنون، والبنوك، والملاك.',
      offer: [
        'التسوية الوقائية وإعادة التنظيم المالي',
        'التصفية وبيع الأصول وفق إجراءات نظام الإفلاس',
        'تمثيل الدائنين أمام أمين الإفلاس والمحكمة',
        'إعادة هيكلة الديون والضمانات والتفاوض الجماعي مع الدائنين',
        'خطط استمرارية النشاط أثناء الإجراء'
      ],
      diff: 'نعالج السيولة والهيكل معاً، ولا نؤجل الأزمة إلى مرحلة التصفية.',
      out: 'مقترح التسوية الوقائية أو إعادة التنظيم، واتفاقيات الدائنين، والطلبات المقدمة إلى المحكمة.'
    },
    en: {
      title: 'Bankruptcy & Financial Restructuring',
      desc: 'Preventive settlement, financial reorganisation and liquidation.',
      serve: 'Distressed companies, creditors, banks and owners.',
      offer: [
        'Preventive settlement and financial reorganisation',
        'Liquidation and asset sales under Bankruptcy Law procedures',
        'Creditor representation before the bankruptcy trustee and the court',
        'Debt and security restructuring and collective creditor negotiations',
        'Business continuity plans during the proceedings'
      ],
      diff: 'We address liquidity and structure together and do not defer the crisis to the liquidation stage.',
      out: 'A preventive settlement or reorganisation proposal, creditor agreements and court filings.'
    }
  },
  {
    slug: 'enforcement',
    axis: 'business',
    official: [8],
    delivery: 'direct',
    basis: ['نظام التنفيذ ولائحته التنفيذية', 'نظام التحكيم'],
    ar: {
      title: 'التنفيذ والتحصيل',
      desc: 'تنفيذ الأحكام المحلية والأجنبية والسندات التنفيذية وإجراءات الحجز.',
      serve: 'الدائنون، والبنوك، والملاك، والشركات المحكوم لها.',
      offer: [
        'طلبات تنفيذ الأحكام وأحكام التحكيم المحلية والأجنبية',
        'طلبات الحجز التنفيذي على الأموال والحسابات والأسهم والعقار',
        'طلب إجراءات التنفيذ النظامية كالمنع من السفر وإيقاف الخدمات والإفصاح عن الأموال',
        'تنفيذ الشيكات والسندات لأمر والأوراق التجارية',
        'الاستعلام عن أموال المدين عبر محكمة التنفيذ وإدارة ملفات التحصيل المركّبة'
      ],
      diff: 'نبدأ من السند التنفيذي: خطة تنفيذ مرتبة الأولويات منذ صدور الحكم.',
      out: 'طلب التنفيذ، وطلبات الحجز، وخطة التحصيل.'
    },
    en: {
      title: 'Enforcement & Debt Recovery',
      desc: 'Enforcement of domestic and foreign judgments and enforceable instruments, and attachment procedures.',
      serve: 'Creditors, banks, landlords and judgment creditors.',
      offer: [
        'Applications to enforce domestic and foreign judgments and arbitral awards',
        'Attachment applications against funds, accounts, shares and real estate',
        'Requesting statutory enforcement measures such as travel bans, service suspension and asset disclosure',
        'Enforcement of cheques, promissory notes and commercial papers',
        'Asset enquiries through the Enforcement Court and management of complex recovery files'
      ],
      diff: 'We start from the enforceable instrument: a prioritised enforcement plan from the moment judgment is issued.',
      out: 'An enforcement application, attachment applications and a recovery plan.'
    }
  },
  {
    slug: 'construction-contracts',
    axis: 'business',
    official: [9],
    delivery: 'direct',
    basis: ['نظام المعاملات المدنية', 'نظام المنافسات والمشتريات الحكومية (للعقود الحكومية)'],
    ar: {
      title: 'المقاولات والعقود الإنشائية',
      desc: 'عقود فيديك، ومطالبات التمديد والتعويض، وإدارة المشاريع المتعثرة.',
      serve: 'مقاولو الهندسة والتوريد والإنشاء، ومطورو المشاريع الكبرى، والاستشاريون، والملاك.',
      offer: [
        'عقود فيديك (الأحمر والأصفر والفضي) والصياغة الخاصة المتوائمة مع الأنظمة السعودية',
        'مطالبات التمديد الزمني والتعويض المالي والتكاليف الإضافية',
        'إدارة المشاريع المتعثرة والإنذارات وسحب العمل',
        'منازعات المقاولات أمام القضاء والتحكيم، والتنسيق مع الخبرة الهندسية',
        'ضمانات حسن الأداء والدفعة المقدمة والتأمينات'
      ],
      diff: 'نبني المطالبة من يوميات المشروع لا من المكتب: الوقائع، والمراسلات، والبرامج الزمنية.',
      out: 'عقد فيديك معدّل، ومطالبة تمديد وتعويض، وخطة معالجة المشروع المتعثر.'
    },
    en: {
      title: 'Construction Contracts (FIDIC)',
      desc: 'FIDIC contracts, extension-of-time and compensation claims, and distressed projects.',
      serve: 'EPC contractors, major project developers, consultants and owners.',
      offer: [
        'FIDIC Red, Yellow and Silver Books and bespoke drafting aligned with Saudi law',
        'Extension-of-time, compensation and additional cost claims',
        'Distressed project management, notices and termination',
        'Construction disputes before courts and arbitration, in coordination with engineering experts',
        'Performance and advance payment guarantees and insurances'
      ],
      diff: 'We build the claim from the project records, not from the office: facts, correspondence and programmes.',
      out: 'An amended FIDIC contract, an extension and compensation claim and a distressed project plan.'
    }
  },
  {
    slug: 'litigation',
    axis: 'business',
    official: [10],
    delivery: 'direct',
    basis: ['نظام المرافعات الشرعية', 'نظام المحاكم التجارية', 'نظام المرافعات أمام ديوان المظالم', 'نظام الإثبات'],
    ar: {
      title: 'التقاضي أمام المحاكم',
      desc: 'التمثيل أمام المحاكم التجارية والعامة والعمالية وديوان المظالم.',
      serve: 'الشركات، والمطورون، والمقاولون، والملاك، والمستثمرون.',
      offer: [
        'التمثيل أمام المحاكم التجارية والعامة والعمالية وديوان المظالم',
        'القضايا العقارية والحقوقية وقضايا المقاولات',
        'منازعات الشركاء والمساهمين والشركات',
        'إدارة محافظ القضايا المتعددة وإعداد استراتيجية التقاضي',
        'الاعتراض على الأحكام بالاستئناف والنقض والتماس إعادة النظر'
      ],
      diff: 'ندير القضية كمشروع له أهداف وميزانية وسيناريوهات، لا كمرافعة منفردة.',
      out: 'استراتيجية التقاضي، وصحائف الدعوى والمذكرات، وملف الأدلة.'
    },
    en: {
      title: 'Litigation',
      desc: 'Representation before the Commercial, General and Labour Courts and the Board of Grievances.',
      serve: 'Companies, developers, contractors, owners and investors.',
      offer: [
        'Representation before the Commercial, General and Labour Courts and the Board of Grievances',
        'Real estate, civil and construction cases',
        'Partner, shareholder and corporate disputes',
        'Management of multi-case portfolios and litigation strategy',
        'Challenging judgments by appeal, cassation and petition for review'
      ],
      diff: 'We run each case as a project with objectives, a budget and scenarios, not as a standalone pleading.',
      out: 'A litigation strategy, statements of claim and memoranda, and an evidence file.'
    }
  },
  {
    slug: 'arbitration-mediation',
    axis: 'business',
    official: [10],
    delivery: 'direct',
    basis: ['نظام التحكيم', 'اتفاقية نيويورك للاعتراف بأحكام التحكيم الأجنبية وتنفيذها'],
    ar: {
      title: 'التحكيم والوساطة',
      desc: 'التحكيم المؤسسي والحر، والوساطة، وتنفيذ أحكام التحكيم.',
      serve: 'المقاولون، وشركات الطاقة والشحن، والمستثمرون.',
      offer: [
        'صياغة شرط التحكيم ومشارطته',
        'التحكيم أمام المركز السعودي للتحكيم التجاري ومراكز التحكيم الدولية',
        'منازعات عقود فيديك ومطالبات التمديد والتعويض',
        'الوساطة والتسوية الودية قبل التحكيم',
        'تنفيذ أحكام التحكيم المحلية والأجنبية وفق اتفاقية نيويورك'
      ],
      diff: 'نبني ملف التحكيم حول رواية هندسية ومالية مدعومة بالمستندات، لا حول الحجة القانونية وحدها.',
      out: 'شرط تحكيم، وبيان الدعوى أو الدفاع، وخطة إدارة التحكيم.'
    },
    en: {
      title: 'Arbitration & Mediation',
      desc: 'Institutional and ad hoc arbitration, mediation and enforcement of awards.',
      serve: 'Contractors, energy and shipping companies, and investors.',
      offer: [
        'Drafting arbitration clauses and submission agreements',
        'Arbitration before the Saudi Center for Commercial Arbitration and international institutions',
        'FIDIC disputes and extension-of-time and compensation claims',
        'Mediation and amicable settlement before arbitration',
        'Enforcement of domestic and foreign awards under the New York Convention'
      ],
      diff: 'We build the arbitration file around a documented engineering and financial narrative, not the legal argument alone.',
      out: 'An arbitration clause, a statement of claim or defence, and an arbitration management plan.'
    }
  },
  {
    slug: 'business-crimes-defense',
    axis: 'business',
    official: [11],
    delivery: 'direct',
    basis: ['نظام الإجراءات الجزائية', 'نظام مكافحة الرشوة', 'نظام مكافحة التزوير', 'نظام مكافحة الجرائم المعلوماتية', 'نظام مكافحة غسل الأموال'],
    ar: {
      title: 'القضايا الجزائية المتصلة بالأعمال',
      desc: 'الدفاع في الجرائم الاقتصادية والمالية وبرامج الامتثال الجزائي.',
      serve: 'التنفيذيون، وأعضاء مجالس الإدارة، والشركات.',
      offer: [
        'الدفاع في قضايا الرشوة والاختلاس وغسل الأموال',
        'قضايا الجرائم المعلوماتية والتستر والتزوير',
        'التمثيل أمام النيابة العامة وهيئة الرقابة ومكافحة الفساد والمحاكم الجزائية',
        'برامج الامتثال الجزائي وقنوات الإبلاغ الداخلية',
        'الصلح في الحق الخاص فيما يجوز فيه الصلح نظاماً'
      ],
      diff: 'نبدأ بالوقاية: برامج امتثال تحد من مخاطر المساءلة، ودفاع مبني على الوقائع والمستندات.',
      out: 'مذكرات الدفاع، وخطة إدارة الإجراءات، وبرنامج الامتثال الجزائي.'
    },
    en: {
      title: 'Business Crimes Defence',
      desc: 'Defence in economic and financial crimes and criminal compliance programmes.',
      serve: 'Executives, board members and companies.',
      offer: [
        'Defence in bribery, embezzlement and money laundering cases',
        'Cybercrime, concealment and forgery cases',
        'Representation before the Public Prosecution, the Oversight and Anti-Corruption Authority and the criminal courts',
        'Criminal compliance programmes and internal reporting channels',
        'Settlement of private rights where settlement is permitted by law'
      ],
      diff: 'We start with prevention: compliance programmes that reduce exposure, and a defence built on facts and documents.',
      out: 'Defence memoranda, a proceedings management plan and a criminal compliance programme.'
    }
  },

  // ─────────────────────────── المحور الثاني: الأسرة والثروة ───────────────────────────
  {
    slug: 'estates-inheritance',
    axis: 'family-wealth',
    official: [12],
    delivery: 'direct',
    basis: ['نظام الأحوال الشخصية', 'نظام المرافعات الشرعية'],
    ar: {
      title: 'التركات والمواريث والوصايا',
      desc: 'قسمة التركات وإدارة الأصول الموروثة ومنازعات الوصايا.',
      serve: 'الورثة، والمكاتب العائلية، والشركات الموروثة، والعقارات المشتركة.',
      offer: [
        'قسمة التركات بالتراضي أو قضاءً وتصفيتها',
        'إدارة الأصول الموروثة: الشركات والعقارات والمحافظ',
        'منازعات الوصايا والأوقاف الأهلية المرتبطة بالتركة',
        'بيع الأصول الموروثة وتوزيع حصيلتها، بالتنسيق مع مقيّمين معتمدين',
        'المساندة في إجراءات حصر الورثة أمام الجهات المختصة'
      ],
      diff: 'قسمة تحفظ قيمة التركة ولا تفتّتها، وتحافظ على العلاقة بين الورثة.',
      out: 'اتفاقية القسمة، وآلية إدارة الأصول وبيعها، والطلبات المقدمة إلى المحكمة.'
    },
    en: {
      title: 'Estates, Inheritance & Wills',
      desc: 'Estate division, management of inherited assets and will disputes.',
      serve: 'Heirs, family offices, inherited companies and co-owned properties.',
      offer: [
        'Amicable or judicial estate division and settlement',
        'Management of inherited assets: companies, real estate and portfolios',
        'Will disputes and family waqf matters connected to the estate',
        'Sale of inherited assets and distribution of proceeds, in coordination with accredited valuers',
        'Support with heir determination procedures before the competent authorities'
      ],
      diff: 'Division that preserves the value of the estate rather than fragmenting it, and preserves relations between heirs.',
      out: 'A division agreement, an asset management and sale mechanism, and court filings.'
    }
  },
  {
    slug: 'waqf-nonprofit',
    axis: 'family-wealth',
    official: [13],
    delivery: 'direct',
    basis: ['نظام الهيئة العامة للأوقاف', 'نظام الجمعيات والمؤسسات الأهلية'],
    ar: {
      title: 'الوقف والقطاع غير الربحي',
      desc: 'تأسيس الأوقاف والصناديق الوقفية وحوكمة الجهات غير الربحية.',
      serve: 'الواقفون، والأسر، والشركات، والجمعيات والمؤسسات الأهلية.',
      offer: [
        'تأسيس الأوقاف الأهلية والخيرية والمشتركة وصياغة شروط الواقف',
        'الصناديق الوقفية والاستثمار الوقفي',
        'حوكمة الجمعيات والمؤسسات الأهلية',
        'منازعات الوقف والنظارة والاستبدال',
        'الامتثال لمتطلبات الهيئة العامة للأوقاف والمركز الوطني لتنمية القطاع غير الربحي'
      ],
      diff: 'نحوّل النية إلى مؤسسة مستدامة: حوكمة، واستثمار، وأثر قابل للقياس.',
      out: 'مسودة صك الوقف وشروطه، ولائحة الحوكمة، وخطة الاستثمار الوقفي.'
    },
    en: {
      title: 'Waqf & Non-Profit Sector',
      desc: 'Establishing waqfs and waqf funds and governance of non-profit entities.',
      serve: 'Endowers, families, companies, and civil associations and foundations.',
      offer: [
        'Establishing family, charitable and mixed waqfs and drafting the endower’s conditions',
        'Waqf funds and waqf investment',
        'Governance of civil associations and foundations',
        'Waqf, trusteeship and substitution disputes',
        'Compliance with the General Authority for Awqaf and the National Center for Non-Profit Sector requirements'
      ],
      diff: 'We turn intention into a sustainable institution: governance, investment and measurable impact.',
      out: 'A draft waqf deed and conditions, a governance charter and a waqf investment plan.'
    }
  },
  {
    slug: 'family-business',
    axis: 'family-wealth',
    official: [14],
    delivery: 'direct',
    basis: ['نظام الشركات (الميثاق العائلي)'],
    ar: {
      title: 'الشركات العائلية وتخطيط التعاقب',
      desc: 'المواثيق العائلية، وانتقال الأجيال، والفصل بين الملكية والإدارة.',
      serve: 'الشركات العائلية في جيلها الأول والثاني، والمكاتب العائلية.',
      offer: [
        'ميثاق عائلي ينظم الملكية والإدارة والتوظيف والتوزيعات',
        'الفصل بين الملكية والإدارة، ومجلس العائلة، ومجلس إدارة مستقل',
        'هيكلة انتقال الثروة، بما فيها الصناديق والأوقاف العائلية',
        'آليات حل الخلاف العائلي وشراء الحصص والتخارج',
        'خطط التعاقب وإعداد قيادات الجيل التالي'
      ],
      diff: 'نعالج العاطفة بالحوكمة: قرارات مكتوبة، وأدوار واضحة، ومعايير موضوعية قبل الأزمات.',
      out: 'ميثاق عائلي، ولائحة حوكمة عائلية، وهيكلة انتقال الثروة، واتفاقيات الشركاء العائلية.'
    },
    en: {
      title: 'Family Business & Succession Planning',
      desc: 'Family charters, generational transition and separation of ownership and management.',
      serve: 'First- and second-generation family businesses and family offices.',
      offer: [
        'A family charter governing ownership, management, employment and distributions',
        'Separating ownership and management, a family council and an independent board',
        'Structuring wealth transfer, including family funds and waqfs',
        'Family dispute resolution, share buy-backs and exits',
        'Succession plans and next-generation leadership'
      ],
      diff: 'We address emotion with governance: written decisions, clear roles and objective criteria before a crisis.',
      out: "A family charter, a family governance charter, a wealth transfer structure and family shareholders' agreements."
    }
  },
  {
    slug: 'personal-status',
    axis: 'family-wealth',
    official: [15],
    delivery: 'direct',
    basis: ['نظام الأحوال الشخصية'],
    ar: {
      title: 'الأحوال الشخصية',
      desc: 'قضايا الأسرة والحضانة والنفقة بمنهجية تحافظ على الكيان الأسري.',
      serve: 'الأفراد والأسر.',
      offer: [
        'قضايا الزواج والطلاق والحضانة والنفقة والزيارة',
        'قضايا الخلع والفسخ والعضل',
        'صياغة الشروط في عقد الزواج وترتيبات حماية الحقوق المالية',
        'تنفيذ أحكام الأحوال الشخصية',
        'الوساطة والصلح الأسري'
      ],
      diff: 'منهجية تحافظ على الكيان الأسري وتقلل النزاع ولا تؤججه.',
      out: 'اتفاقية صلح أسري، وصحائف الدعوى والمذكرات، وخطة التنفيذ.'
    },
    en: {
      title: 'Personal Status & Family',
      desc: 'Family, custody and maintenance matters with an approach that preserves the family.',
      serve: 'Individuals and families.',
      offer: [
        'Marriage, divorce, custody, maintenance and visitation matters',
        'Khul’, annulment and ‘adl (guardian’s refusal) cases',
        'Drafting conditions in the marriage contract and financial rights arrangements',
        'Enforcement of personal status judgments',
        'Family mediation and settlement'
      ],
      diff: 'An approach that preserves the family and reduces conflict rather than escalating it.',
      out: 'A family settlement agreement, statements of claim and memoranda, and an enforcement plan.'
    }
  },

  // ─────────────────────── المحور الثالث: الرياضة والترفيه والسياحة والفعاليات ───────────────────────
  {
    slug: 'sports-law',
    axis: 'sports-entertainment-tourism',
    official: [16],
    delivery: 'direct',
    basis: ['نظام الرياضة', 'لوائح الاتحادات الرياضية', 'قواعد مركز التحكيم الرياضي السعودي'],
    ar: {
      title: 'القانون الرياضي والاستثمار الرياضي',
      desc: 'عقود الاحتراف، والمنازعات والتحكيم الرياضي، والاستثمار في الأندية.',
      serve: 'الأندية، واللاعبون، ووكلاء اللاعبين، والاتحادات، والمستثمرون في القطاع الرياضي.',
      offer: [
        'عقود الاحتراف والانتقال والإعارة وحقوق الصورة',
        'المنازعات أمام غرف فض المنازعات في الاتحادات ومركز التحكيم الرياضي السعودي ومحكمة التحكيم الرياضية الدولية',
        'قضايا المنشطات والانضباط والاستئناف',
        'الاستثمار في الأندية وتخصيصها وعقود الرعاية وحقوق البث',
        'عقود وكلاء اللاعبين ومتطلبات ترخيصهم'
      ],
      diff: 'نفهم صناعة الرياضة بأبعادها الثلاثة: الرياضة، والإعلام، والاستثمار.',
      out: 'عقد الاحتراف، وبيان الدعوى الرياضية، واتفاقية الرعاية والحقوق.'
    },
    en: {
      title: 'Sports Law & Sports Investment',
      desc: 'Professional contracts, sports disputes and arbitration, and club investment.',
      serve: "Clubs, players, players' agents, federations and investors in the sports sector.",
      offer: [
        'Professional, transfer and loan contracts and image rights',
        'Disputes before federation dispute resolution chambers, the Saudi Sports Arbitration Center and the Court of Arbitration for Sport',
        'Anti-doping, disciplinary and appeal matters',
        'Club investment and privatisation, sponsorship and broadcasting rights',
        "Players' agent contracts and licensing requirements"
      ],
      diff: 'We understand the sports industry in all three dimensions: sport, media and investment.',
      out: 'A professional contract, a sports statement of claim and a sponsorship and rights agreement.'
    }
  },
  {
    slug: 'entertainment',
    axis: 'sports-entertainment-tourism',
    official: [17],
    delivery: 'direct',
    basis: ['الأنظمة واللوائح المنظمة للأنشطة الترفيهية الصادرة عن الهيئة العامة للترفيه'],
    ar: {
      title: 'الترفيه والأنشطة الترفيهية',
      desc: 'تراخيص الأنشطة الترفيهية وتصاريحها، وعقود الفنانين والعروض الحية.',
      serve: 'منظمو الأنشطة الترفيهية، والفنانون، وشركات الترفيه.',
      offer: [
        'تراخيص الأنشطة الترفيهية وتصاريحها لدى الهيئة العامة للترفيه',
        'عقود الفنانين والعروض الحية والحقوق المجاورة',
        'متطلبات السلامة والتأمين والمسؤولية في الأنشطة الترفيهية',
        'حقوق التصوير والبث والرعاية',
        'منازعات الإلغاء والتأجيل والتعويض'
      ],
      diff: 'ندير مخاطر العرض قبل العرض: الترخيص، والسلامة، والحقوق.',
      out: 'ملف الترخيص أو التصريح، وعقد الفنان، وخطة إدارة المخاطر.'
    },
    en: {
      title: 'Entertainment',
      desc: 'Entertainment activity licences and permits, and artist and live performance contracts.',
      serve: 'Entertainment organisers, artists and entertainment companies.',
      offer: [
        'Entertainment licences and permits from the General Entertainment Authority',
        'Artist and live performance contracts and neighbouring rights',
        'Safety, insurance and liability requirements for entertainment activities',
        'Filming, broadcasting and sponsorship rights',
        'Cancellation, postponement and compensation disputes'
      ],
      diff: 'We manage show risk before the show: licensing, safety and rights.',
      out: 'A licence or permit file, an artist agreement and a risk management plan.'
    }
  },
  {
    slug: 'tourism-hospitality',
    axis: 'sports-entertainment-tourism',
    official: [18],
    delivery: 'direct',
    basis: ['نظام السياحة ولوائحه'],
    ar: {
      title: 'السياحة والضيافة',
      desc: 'تراخيص الأنشطة السياحية، وعقود إدارة الفنادق وتشغيلها.',
      serve: 'الفنادق، والمنتجعات، ووكالات السفر والسياحة، والمطورون السياحيون.',
      offer: [
        'تراخيص الأنشطة السياحية ومرافق الضيافة وتصنيفها',
        'عقود إدارة الفنادق وتشغيلها وترخيص العلامات الفندقية',
        'عقود التأجير السياحي ومنصات الحجز والمسؤوليات',
        'الامتثال البيئي والتراثي في تطوير الوجهات السياحية',
        'المنازعات السياحية والتعويض'
      ],
      diff: 'نربط الترخيص بالتشغيل وتجربة الضيف، لا بالمستندات وحدها.',
      out: 'ملف الترخيص السياحي، واتفاقية الإدارة الفندقية، وخطة الامتثال التشغيلي.'
    },
    en: {
      title: 'Tourism & Hospitality',
      desc: 'Tourism activity licensing and hotel management and operation agreements.',
      serve: 'Hotels, resorts, travel and tourism agencies and tourism developers.',
      offer: [
        'Licensing and classification of tourism activities and hospitality facilities',
        'Hotel management and operation agreements and hotel brand licensing',
        'Tourist rental agreements, booking platforms and liabilities',
        'Environmental and heritage compliance in destination development',
        'Tourism disputes and compensation'
      ],
      diff: 'We link licensing to operations and the guest experience, not to paperwork alone.',
      out: 'A tourism licence file, a hotel management agreement and an operational compliance plan.'
    }
  },
  {
    slug: 'events-exhibitions',
    axis: 'sports-entertainment-tourism',
    official: [19],
    delivery: 'direct',
    basis: ['الأنظمة واللوائح المنظمة للفعاليات والمعارض والمؤتمرات'],
    ar: {
      title: 'الفعاليات والمؤتمرات والمعارض',
      desc: 'الهيكلة النظامية للفعاليات والمهرجانات والمعارض والمؤتمرات.',
      serve: 'منظمو المعارض والمؤتمرات، والجهات الحكومية المنظِّمة، والرعاة.',
      offer: [
        'الهيكلة النظامية للفعاليات والمهرجانات والمعارض المحلية والدولية',
        'عقود الرعاية والأجنحة والعارضين والخدمات اللوجستية',
        'التصاريح والتأمين والسلامة والمسؤوليات',
        'حقوق التصوير والبث والملكية الفكرية للمحتوى',
        'إدارة الإلغاء والتأجيل والقوة القاهرة'
      ],
      diff: 'نبني الفعالية على أساس نظامي واضح منذ التخطيط لا عند وقوع الإشكال.',
      out: 'دليل نظامي للفعالية، وحزمة عقود الرعاية والعارضين، وخطة إدارة المخاطر.'
    },
    en: {
      title: 'Events, Conferences & Exhibitions',
      desc: 'Regulatory structuring of events, festivals, exhibitions and conferences.',
      serve: 'Exhibition and conference organisers, government organising entities and sponsors.',
      offer: [
        'Regulatory structuring of domestic and international events, festivals and exhibitions',
        'Sponsorship, stand, exhibitor and logistics agreements',
        'Permits, insurance, safety and liabilities',
        'Filming, broadcasting and content IP rights',
        'Cancellation, postponement and force majeure management'
      ],
      diff: 'We put the event on a clear regulatory footing from the planning stage, not when a problem arises.',
      out: 'A regulatory event guide, a sponsorship and exhibitor agreement package and a risk plan.'
    }
  },
  {
    slug: 'gaming-esports',
    axis: 'sports-entertainment-tourism',
    official: [17, 32],
    delivery: 'direct',
    basis: ['نظام الإعلام المرئي والمسموع', 'نظام حماية حقوق المؤلف'],
    ar: {
      title: 'الألعاب الإلكترونية والرياضات الإلكترونية',
      desc: 'الجوانب النظامية لنشر الألعاب وتصنيفها وبطولات الرياضات الإلكترونية.',
      serve: 'استوديوهات الألعاب، والناشرون، وفرق الرياضات الإلكترونية ومنظمو البطولات.',
      offer: [
        'متطلبات تصنيف الألعاب وفسحها لدى الهيئة العامة لتنظيم الإعلام',
        'عقود النشر والتطوير والتوزيع',
        'حقوق المؤلف والملكية الفكرية في الألعاب والمحتوى الرقمي',
        'عقود اللاعبين والفرق والبطولات والجوائز',
        'منازعات الحقوق والعقود'
      ],
      diff: 'نفهم اقتصاد اللعبة: التطوير، والنشر، والمتاجر، والبطولات.',
      out: 'ملف التصنيف والفسح، وعقد النشر، واتفاقية الفريق والبطولة.'
    },
    en: {
      title: 'Gaming & Esports',
      desc: 'Regulatory aspects of game publishing, classification and esports tournaments.',
      serve: 'Game studios, publishers, esports teams and tournament organisers.',
      offer: [
        'Game classification and clearance requirements with the General Authority for Media Regulation',
        'Publishing, development and distribution agreements',
        'Copyright and IP in games and digital content',
        'Player, team, tournament and prize agreements',
        'Rights and contract disputes'
      ],
      diff: 'We understand the game economy: development, publishing, stores and tournaments.',
      out: 'A classification and clearance file, a publishing agreement and a team and tournament agreement.'
    }
  },

  // ─────────────────────────── المحور الرابع: الإقامة ───────────────────────────
  {
    slug: 'premium-residency',
    axis: 'residency',
    official: [20],
    delivery: 'direct',
    basis: ['نظام الإقامة المميزة ولائحته التنفيذية'],
    ar: {
      title: 'الإقامة المميزة وخدمات المستثمر الأجنبي',
      desc: 'طلبات الإقامة المميزة والخدمات النظامية المرتبطة بإقامة المستثمر وأسرته.',
      serve: 'المستثمرون، ورواد الأعمال، والكفاءات، وملاك العقار من غير السعوديين.',
      offer: [
        'دراسة الأهلية لمنتجات الإقامة المميزة وفق الشروط المعلنة من مركز الإقامة المميزة',
        'إعداد ملف الطلب ومتابعته',
        'تأسيس النشاط الاستثماري المرتبط بالإقامة',
        'الاعتبارات الزكوية والضريبية للمقيم',
        'ترتيبات إقامة أفراد الأسرة المشمولين نظاماً'
      ],
      diff: 'نتحقق من الشروط والمقابل المالي النافذ وقت الطلب، ونربط الإقامة بالاستثمار والأسرة لا بالمعاملة وحدها.',
      out: 'دراسة الأهلية، وملف طلب الإقامة المميزة، وخطة الانتقال.'
    },
    en: {
      title: 'Premium Residency & Foreign Investor Services',
      desc: 'Premium Residency applications and regulatory services related to the residence of investors and their families.',
      serve: 'Non-Saudi investors, entrepreneurs, professionals and property owners.',
      offer: [
        'Eligibility review for Premium Residency products under the conditions published by the Premium Residency Center',
        'Preparing and following up the application file',
        'Establishing the investment activity linked to residency',
        'Zakat and tax considerations for the resident',
        'Residency arrangements for eligible family members'
      ],
      diff: 'We verify the conditions and fees in force at the time of application, and link residency to investment and family rather than the transaction alone.',
      out: 'An eligibility review, a Premium Residency application file and a relocation plan.'
    }
  },

  // ─────────────────────────── المحور الخامس: الخدمات المتخصصة ───────────────────────────
  {
    slug: 'real-estate',
    axis: 'specialized',
    official: [21],
    delivery: 'direct',
    basis: ['نظام بيع وتأجير مشروعات عقارية على الخارطة', 'نظام ملكية الوحدات العقارية وفرزها وإدارتها', 'نظام الوساطة العقارية'],
    ar: {
      title: 'العقار والتطوير العقاري',
      desc: 'التطوير العقاري والبيع على الخارطة واتحادات الملاك.',
      serve: 'المطورون، والملاك، والصناديق العقارية، واتحادات الملاك.',
      offer: [
        'التطوير العقاري والبيع والتأجير على الخارطة وإجراءات الترخيص المرتبطة بها',
        'اتحادات الملاك وإدارة المجمعات والمرافق المشتركة',
        'عقود المقاولات والتوريد وإدارة الأملاك',
        'منازعات الإيجار والإخلاء والتعويض',
        'هيكلة الصناديق العقارية وتمويل التطوير'
      ],
      diff: 'نربط العقار بالتمويل والتشغيل، لا بالبيع وحده.',
      out: 'الإطار النظامي للمشروع، وعقود البيع على الخارطة، ولائحة اتحاد الملاك.'
    },
    en: {
      title: 'Real Estate & Development',
      desc: 'Real estate development, off-plan sales and owners’ associations.',
      serve: 'Developers, owners, real estate funds and owners’ associations.',
      offer: [
        'Real estate development, off-plan sale and lease, and related licensing procedures',
        'Owners’ associations and management of compounds and common facilities',
        'Construction, supply and property management agreements',
        'Lease, eviction and compensation disputes',
        'Structuring real estate funds and development finance'
      ],
      diff: 'We link real estate to financing and operations, not to the sale alone.',
      out: 'The project’s regulatory framework, off-plan sale agreements and owners’ association bylaws.'
    }
  },
  {
    slug: 'employment-hr',
    axis: 'specialized',
    official: [22],
    delivery: 'direct',
    basis: ['نظام العمل ولائحته التنفيذية'],
    ar: {
      title: 'العمل والموارد البشرية',
      desc: 'عقود العمل واللوائح الداخلية والتوطين وتسوية النزاعات العمالية.',
      serve: 'إدارات الموارد البشرية، والمنشآت كثيفة العمالة، والشركات الناشئة.',
      offer: [
        'عقود العمل واللوائح الداخلية وسياسات الموارد البشرية',
        'متطلبات التوطين وبرنامج نطاقات',
        'تسوية النزاعات العمالية وإنهاء العقود ومكافأة نهاية الخدمة',
        'الجوانب النظامية لعقود توفير العمالة وتقديم الخدمات العمالية',
        'التحقيقات الداخلية والتظلمات والسلوك الوظيفي'
      ],
      diff: 'نصمم علاقة عمل تحمي الإنتاجية وتحد من النزاع.',
      out: 'لائحة تنظيم العمل، ونماذج عقود العمل، وسياسات الموارد البشرية.'
    },
    en: {
      title: 'Employment & Human Resources',
      desc: 'Employment contracts, internal regulations, localisation and labour dispute resolution.',
      serve: 'HR departments, labour-intensive businesses and startups.',
      offer: [
        'Employment contracts, internal work regulations and HR policies',
        'Localisation requirements and the Nitaqat programme',
        'Labour dispute resolution, termination and end-of-service benefits',
        'Regulatory aspects of manpower supply and labour service agreements',
        'Internal investigations, grievances and workplace conduct'
      ],
      diff: 'We design employment relationships that protect productivity and limit disputes.',
      out: 'Internal work regulations, employment contract templates and HR policies.'
    }
  },
  {
    slug: 'intellectual-property',
    axis: 'specialized',
    official: [23],
    delivery: 'direct',
    basis: ['نظام العلامات التجارية', 'نظام براءات الاختراع', 'نظام حماية حقوق المؤلف'],
    ar: {
      title: 'الملكية الفكرية والعلامات التجارية',
      desc: 'العلامات التجارية وبراءات الاختراع والمصنفات والأسرار التجارية.',
      serve: 'الشركات التقنية، والمصانع، والمبدعون، والجامعات.',
      offer: [
        'تسجيل العلامات التجارية وحمايتها ومكافحة التقليد',
        'براءات الاختراع: الإيداع والاعتراض والدفاع',
        'حقوق المؤلف وتراخيص البرمجيات والمحتوى',
        'حماية الأسرار التجارية واتفاقيات السرية مع الموظفين والشركاء',
        'منازعات الملكية الفكرية والإنفاذ، بما فيه التدابير الحدودية'
      ],
      diff: 'نحوّل الفكرة إلى أصل قابل للترخيص والتمويل، لا مجرد تسجيل.',
      out: 'سجل محفظة الملكية الفكرية، واتفاقيات الترخيص، وخطة الإنفاذ.'
    },
    en: {
      title: 'Intellectual Property & Trademarks',
      desc: 'Trademarks, patents, copyright and trade secrets.',
      serve: 'Technology companies, manufacturers, creators and universities.',
      offer: [
        'Trademark registration, protection and anti-counterfeiting',
        'Patents: filing, opposition and defence',
        'Copyright and software and content licensing',
        'Trade secret protection and confidentiality agreements with employees and partners',
        'IP disputes and enforcement, including border measures'
      ],
      diff: 'We turn an idea into an asset that can be licensed and financed, not merely registered.',
      out: 'An IP portfolio register, licence agreements and an enforcement plan.'
    }
  },
  {
    slug: 'data-cyber-ai',
    axis: 'specialized',
    official: [24],
    delivery: 'direct',
    basis: ['نظام حماية البيانات الشخصية ولوائحه', 'الضوابط الأساسية للأمن السيبراني الصادرة عن الهيئة الوطنية للأمن السيبراني', 'المبادئ والأطر الصادرة عن الهيئة السعودية للبيانات والذكاء الاصطناعي'],
    ar: {
      title: 'حماية البيانات والأمن السيبراني والذكاء الاصطناعي',
      desc: 'الامتثال لنظام حماية البيانات الشخصية، والجوانب النظامية للأمن السيبراني واستخدام الذكاء الاصطناعي.',
      serve: 'المنصات والتطبيقات، والمنشآت التي تعالج بيانات شخصية، والجهات التي تستخدم أنظمة الذكاء الاصطناعي.',
      offer: [
        'الامتثال لنظام حماية البيانات الشخصية ولوائحه، وسياسات الخصوصية وإشعاراتها',
        'تقييم الأثر على حماية البيانات وسجل أنشطة المعالجة',
        'إدارة حوادث تسرب البيانات والإشعار بها، وضوابط نقل البيانات خارج المملكة',
        'الجوانب التعاقدية والتنظيمية للامتثال للضوابط الأساسية للأمن السيبراني',
        'الجوانب النظامية لاستخدام الذكاء الاصطناعي: معالجة البيانات الشخصية، والمبادئ الصادرة عن الهيئة السعودية للبيانات والذكاء الاصطناعي'
      ],
      diff: 'نبني خصوصية قابلة للتشغيل: موافقات، وحقوق، وإجراءات واضحة لطلبات أصحاب البيانات.',
      out: 'دليل الخصوصية، وسجل المعالجة، وتقييم الأثر، وخطة الاستجابة لحوادث التسرب، وسياسة استخدام الذكاء الاصطناعي.'
    },
    en: {
      title: 'Data Protection, Cybersecurity & AI',
      desc: 'Compliance with the Personal Data Protection Law, and regulatory aspects of cybersecurity and AI use.',
      serve: 'Platforms and apps, organisations processing personal data and entities using AI systems.',
      offer: [
        'Compliance with the Personal Data Protection Law and its regulations, privacy policies and notices',
        'Data protection impact assessments and records of processing',
        'Data breach management and notification, and controls on transfers outside the Kingdom',
        'Contractual and governance aspects of compliance with the Essential Cybersecurity Controls',
        'Regulatory aspects of AI use: personal data processing and principles issued by the Saudi Data & AI Authority'
      ],
      diff: 'We build operable privacy: consents, rights and clear procedures for data subject requests.',
      out: 'A privacy manual, a record of processing, an impact assessment, a breach response plan and an AI use policy.'
    }
  },
  {
    slug: 'telecom-cloud',
    axis: 'specialized',
    official: [24],
    delivery: 'direct',
    basis: ['نظام الاتصالات وتقنية المعلومات', 'الإطار التنظيمي للحوسبة السحابية'],
    ar: {
      title: 'الاتصالات وتقنية المعلومات والحوسبة السحابية',
      desc: 'التراخيص والتسجيلات والالتزامات النظامية لمقدمي خدمات الاتصالات والحوسبة السحابية.',
      serve: 'شركات الاتصالات، ومقدمو خدمات الحوسبة السحابية، والمنصات الرقمية.',
      offer: [
        'تراخيص وتسجيلات هيئة الاتصالات والفضاء والتقنية',
        'متطلبات الإطار التنظيمي للحوسبة السحابية',
        'اتفاقيات مستوى الخدمة وعقود الحوسبة السحابية',
        'الالتزامات النظامية لمقدمي الخدمات الرقمية تجاه المستخدمين',
        'منازعات الاتصالات والتقنية'
      ],
      diff: 'نربط الترخيص بالمنتج التقني نفسه، لا بالمستندات وحدها.',
      out: 'ملف الترخيص أو التسجيل، واتفاقية الخدمة السحابية، ومصفوفة الالتزامات.'
    },
    en: {
      title: 'Telecoms, IT & Cloud',
      desc: 'Licences, registrations and regulatory obligations of telecom and cloud service providers.',
      serve: 'Telecom operators, cloud service providers and digital platforms.',
      offer: [
        'Licences and registrations with the Communications, Space & Technology Commission',
        'Cloud Computing Regulatory Framework requirements',
        'Service level agreements and cloud contracts',
        'Regulatory obligations of digital service providers towards users',
        'Telecom and technology disputes'
      ],
      diff: 'We link licensing to the technical product itself, not to paperwork alone.',
      out: 'A licence or registration file, a cloud services agreement and an obligations matrix.'
    }
  },
  {
    slug: 'data-centers',
    axis: 'specialized',
    official: [24],
    delivery: 'direct',
    basis: ['الإطار التنظيمي للحوسبة السحابية', 'نظام حماية البيانات الشخصية'],
    ar: {
      title: 'مراكز البيانات والبنية السحابية',
      desc: 'عقود مراكز البيانات واتفاقيات مستوى الخدمة ومتطلبات توطين البيانات.',
      serve: 'مشغلو مراكز البيانات، ومقدمو الخدمات السحابية، والبنوك، والمنشآت الكبرى.',
      offer: [
        'هيكلة مشاريع مراكز البيانات واتفاقيات تأجير المساحات والطاقة',
        'اتفاقيات مستوى الخدمة ومتطلبات توطين البيانات',
        'عقود الطاقة والتبريد والربط',
        'الامتثال لمتطلبات تصنيف البيانات وحمايتها',
        'منازعات الانقطاع والتعويض والمسؤوليات'
      ],
      diff: 'نحسب المخاطر بالميغاواط وساعات التشغيل، لا بالبنود وحدها.',
      out: 'اتفاقية مركز البيانات، واتفاقية مستوى الخدمة، وخطة استمرارية الأعمال.'
    },
    en: {
      title: 'Data Centers & Cloud Infrastructure',
      desc: 'Data center agreements, SLAs and data localisation requirements.',
      serve: 'Data center operators, cloud providers, banks and large enterprises.',
      offer: [
        'Structuring data center projects and space and power lease agreements',
        'Service level agreements and data localisation requirements',
        'Power, cooling and connectivity contracts',
        'Compliance with data classification and protection requirements',
        'Outage, compensation and liability disputes'
      ],
      diff: 'We measure risk in megawatts and operating hours, not in clauses alone.',
      out: 'A data center agreement, an SLA and a business continuity plan.'
    }
  },
  {
    slug: 'government-procurement-ppp',
    axis: 'specialized',
    official: [25],
    delivery: 'direct',
    basis: ['نظام المنافسات والمشتريات الحكومية ولائحته التنفيذية', 'نظام التخصيص'],
    ar: {
      title: 'المشتريات الحكومية والشراكة مع القطاع الخاص والتخصيص',
      desc: 'المنافسات عبر منصة اعتماد، والتظلمات، والعقود الحكومية، ومشاريع التخصيص.',
      serve: 'المقاولون، والموردون، والمستثمرون في مشاريع الشراكة والتخصيص.',
      offer: [
        'المنافسات عبر منصة اعتماد: التأهيل، والعروض، والاستفسارات',
        'التظلمات أمام اللجان المختصة وفق نظام المنافسات والمشتريات الحكومية',
        'عقود الأشغال والمشتريات والخدمات الاستشارية الحكومية',
        'مطالبات التمديد والتعويض في العقود الحكومية',
        'هيكلة مشاريع الشراكة بين القطاعين العام والخاص والتخصيص وفق نظام التخصيص'
      ],
      diff: 'نحوّل المنافسة من سعر إلى قيمة: التأهيل، والالتزام، والقدرة على التنفيذ.',
      out: 'العرض الفني والمالي، ومذكرة التظلم، وعقد حكومي متوازن، وهيكلة مشروع الشراكة.'
    },
    en: {
      title: 'Government Procurement, PPP & Privatisation',
      desc: 'Etimad tenders, grievances, government contracts and privatisation projects.',
      serve: 'Contractors, suppliers and investors in PPP and privatisation projects.',
      offer: [
        'Tenders via the Etimad platform: qualification, bids and clarifications',
        'Grievances before the competent committees under the Government Tenders and Procurement Law',
        'Government works, procurement and consultancy contracts',
        'Extension-of-time and compensation claims in government contracts',
        'Structuring public-private partnership and privatisation projects under the Privatisation Law'
      ],
      diff: 'We move the tender from price to value: qualification, commitment and delivery capability.',
      out: 'A technical and financial bid, a grievance memorandum, a balanced government contract and a PPP structure.'
    }
  },
  {
    slug: 'government-advisory',
    axis: 'specialized',
    official: [26],
    delivery: 'direct',
    basis: ['الأنظمة المنظمة لعمل الجهة المستفيدة', 'نظام المرافعات أمام ديوان المظالم'],
    ar: {
      title: 'الاستشارات القانونية للجهات الحكومية',
      desc: 'الرأي القانوني للجهات الحكومية وشبه الحكومية ولوائحها الداخلية.',
      serve: 'الوزارات، والهيئات، والبرامج الوطنية، والشركات المملوكة للدولة.',
      offer: [
        'الرأي القانوني في تفسير الأنظمة المطبقة على عمل الجهة',
        'مراجعة كراسات الشروط قبل طرحها ومطابقة العقود للنماذج المعتمدة',
        'حوكمة الجهات الحكومية ولوائحها الداخلية',
        'مراجعة القرارات والعقود الحكومية',
        'تمثيل الجهة أمام اللجان المختصة وديوان المظالم عند التفويض'
      ],
      diff: 'نفهم دورة القرار في الجهة الحكومية: الأساس النظامي، والاعتمادات المالية، ومتطلبات الحوكمة.',
      out: 'مذكرة الرأي القانوني، ولائحة الحوكمة، ومذكرات التمثيل.'
    },
    en: {
      title: 'Legal Advisory for Government Entities',
      desc: 'Legal opinions and internal regulations for government and semi-government entities.',
      serve: 'Ministries, authorities, national programmes and state-owned companies.',
      offer: [
        'Legal opinions on the interpretation of laws applicable to the entity',
        'Reviewing tender documents before issue and aligning contracts with approved templates',
        'Governance and internal regulations of government entities',
        'Review of government decisions and contracts',
        'Representing the entity before competent committees and the Board of Grievances when authorised'
      ],
      diff: 'We understand the government decision cycle: the legal basis, budget appropriations and governance requirements.',
      out: 'A legal opinion memorandum, a governance charter and representation memoranda.'
    }
  },
  {
    slug: 'regulations-drafting',
    axis: 'specialized',
    official: [26],
    delivery: 'direct',
    basis: ['قواعد إعداد ومراجعة مشروعات الأنظمة واللوائح المعمول بها'],
    ar: {
      title: 'صياغة الأنظمة واللوائح',
      desc: 'المساندة في إعداد مشروعات الأنظمة واللوائح ودراسات أثرها.',
      serve: 'الجهات الحكومية المختصة بإعداد الأنظمة واللوائح، والجهات الخاضعة للتنظيم عند إبداء المرئيات.',
      offer: [
        'المساندة في إعداد مشروعات الأنظمة واللوائح التنفيذية والتنظيمية',
        'دراسات الأثر التنظيمي والمقارنات الدولية',
        'إعداد المرئيات على مشروعات الأنظمة المطروحة لاستطلاع الآراء',
        'مواءمة اللوائح مع مستهدفات رؤية المملكة 2030 والالتزامات الدولية',
        'الأدلة الاسترشادية والتفسيرية'
      ],
      diff: 'نصوغ نصاً قابلاً للتطبيق، مصحوباً بأدوات تنفيذه.',
      out: 'مسودة مشروع النظام أو اللائحة، ودراسة الأثر، والدليل التنفيذي.'
    },
    en: {
      title: 'Legislative & Regulatory Drafting',
      desc: 'Supporting the preparation of draft laws and regulations and their impact assessments.',
      serve: 'Government entities responsible for preparing laws and regulations, and regulated entities submitting comments.',
      offer: [
        'Supporting the preparation of draft laws, implementing and organisational regulations',
        'Regulatory impact assessments and international benchmarking',
        'Preparing comments on draft laws published for public consultation',
        'Aligning regulations with Saudi Vision 2030 objectives and international commitments',
        'Guidance and interpretive manuals'
      ],
      diff: 'We draft text that can be applied in practice, together with the tools to implement it.',
      out: 'A draft law or regulation, an impact assessment and an implementation guide.'
    }
  },
  {
    slug: 'finance-islamic-finance',
    axis: 'specialized',
    official: [27],
    delivery: 'direct',
    basis: ['نظام مراقبة البنوك', 'نظام الضمانات المنقولة', 'نظام مراقبة شركات التمويل'],
    ar: {
      title: 'التمويل والضمانات والتمويل الإسلامي',
      desc: 'تمويل المشاريع، وهيكلة الضمانات، وصيغ التمويل الإسلامي.',
      serve: 'المطورون، والمقاولون، والمصانع، وشركات الطاقة والخدمات.',
      offer: [
        'تمويل المشاريع وهيكلة حزمة الضمانات وتسجيلها في سجل الضمانات المنقولة',
        'إعادة الهيكلة التمويلية والجدولة واتفاقيات الدائنين',
        'صيغ التمويل الإسلامي: المرابحة، والإجارة، والاستصناع، والمشاركة',
        'القروض المشتركة وضمانات الشركات والأصول',
        'التفاوض مع البنوك والتمثيل أمام لجنة المنازعات والمخالفات المصرفية'
      ],
      diff: 'نفاوض البنك بلغة البنك: التدفق النقدي، والضمانات، والمخاطر، لا باللغة القانونية وحدها.',
      out: 'اتفاقية التمويل، وهيكلة الضمانات، ومذكرة الشروط، وخطة السداد.'
    },
    en: {
      title: 'Finance, Security & Islamic Finance',
      desc: 'Project finance, security structuring and Islamic finance structures.',
      serve: 'Developers, contractors, manufacturers, and energy and services companies.',
      offer: [
        'Project finance, security package structuring and registration in the movable security registry',
        'Financial restructuring, rescheduling and intercreditor agreements',
        'Islamic finance: murabaha, ijarah, istisna’ and musharakah',
        'Syndicated loans and corporate and asset guarantees',
        'Bank negotiations and representation before the Banking Disputes and Violations Committee'
      ],
      diff: 'We negotiate with the bank in the bank’s language: cash flow, security and risk, not legal language alone.',
      out: 'A finance agreement, a security structure, a term sheet and a repayment plan.'
    }
  },
  {
    slug: 'fintech-payments',
    axis: 'specialized',
    official: [27],
    delivery: 'direct',
    basis: ['نظام المدفوعات وخدماتها', 'قواعد البنك المركزي السعودي ذات الصلة', 'لوائح هيئة السوق المالية للتمويل الجماعي'],
    ar: {
      title: 'التقنية المالية والمدفوعات',
      desc: 'طلبات الترخيص لدى البنك المركزي السعودي وهيئة السوق المالية لمنتجات التقنية المالية.',
      serve: 'شركات التقنية المالية، ومقدمو خدمات المدفوعات، ومنصات التمويل الجماعي والشراء الآجل.',
      offer: [
        'طلبات الترخيص لدى البنك المركزي السعودي وهيئة السوق المالية',
        'البيئة التجريبية التشريعية: الدخول والخروج منها',
        'اتفاقيات الربط البرمجي ومقدمي الخدمات والبنوك',
        'شروط الاستخدام وسياسات الائتمان وحماية العملاء',
        'الامتثال لمتطلبات المدفوعات ومكافحة الاحتيال'
      ],
      diff: 'نبني المنتج حول متطلبات الترخيص منذ البداية، للحد من إعادة البناء بعد تقديم الطلب.',
      out: 'ملف طلب الترخيص، وسياسات الائتمان والمخاطر، والاتفاقيات البنكية والتقنية.'
    },
    en: {
      title: 'FinTech & Payments',
      desc: 'Licensing applications with the Saudi Central Bank and the Capital Market Authority for FinTech products.',
      serve: 'FinTech companies, payment service providers, crowdfunding and BNPL platforms.',
      offer: [
        'Licensing applications with the Saudi Central Bank and the Capital Market Authority',
        'The regulatory sandbox: entry and graduation',
        'API, service provider and banking agreements',
        'Terms of use, credit policies and customer protection',
        'Payments compliance and fraud prevention'
      ],
      diff: 'We build the product around licensing requirements from the outset, reducing rework after the application is filed.',
      out: 'A licensing application file, credit and risk policies, and banking and technology agreements.'
    }
  },
  {
    slug: 'finance-companies',
    axis: 'specialized',
    official: [28],
    delivery: 'direct',
    basis: ['نظام مراقبة شركات التمويل', 'نظام الإيجار التمويلي', 'نظام التمويل العقاري'],
    ar: {
      title: 'خدمات شركات التمويل',
      desc: 'الخدمات القانونية المستمرة لشركات التمويل المرخّصة بوصفها منشأة بمحفظة عقود.',
      serve: 'شركات التمويل المرخّصة من البنك المركزي السعودي: التأجير التمويلي، والتمويل الاستهلاكي، والتمويل العقاري.',
      offer: [
        'نماذج عقود التمويل والتحصيل الموحدة لمحفظة الشركة',
        'الامتثال المستمر لمتطلبات البنك المركزي السعودي',
        'اللوائح الداخلية وسياسات منح التمويل',
        'التحصيل والتقاضي نيابة عن الشركة ضد المتعثرين',
        'مراجعة اتفاقيات إعادة التمويل والتوريق'
      ],
      diff: 'نعامل المحفظة كوحدة واحدة: نموذج عقد موحد، وسياسة تحصيل موحدة، ومؤشرات امتثال قابلة للمتابعة.',
      out: 'حزمة نماذج العقود، وسياسة منح التمويل، وخطة التحصيل، وتقرير الامتثال الدوري.'
    },
    en: {
      title: 'Finance Company Services',
      desc: 'Ongoing legal services for licensed finance companies as institutions with contract portfolios.',
      serve: 'Finance companies licensed by the Saudi Central Bank: finance lease, consumer finance and real estate finance.',
      offer: [
        'Standard finance and collection contract templates for the company’s portfolio',
        'Ongoing compliance with Saudi Central Bank requirements',
        'Internal regulations and credit granting policies',
        'Collection and litigation on behalf of the company against defaulters',
        'Review of refinancing and securitisation agreements'
      ],
      diff: 'We treat the portfolio as one unit: a standard contract, a standard collection policy and trackable compliance indicators.',
      out: 'A contract template package, a credit granting policy, a collection plan and a periodic compliance report.'
    }
  },
  {
    slug: 'insurance',
    axis: 'specialized',
    official: [29],
    delivery: 'direct',
    basis: ['نظام مراقبة شركات التأمين التعاوني ولائحته التنفيذية', 'نظام هيئة التأمين'],
    ar: {
      title: 'التأمين وعقوده ومنازعاته',
      desc: 'تراخيص التأمين، والمطالبات الكبرى، وإعادة التأمين.',
      serve: 'شركات التأمين، ووسطاء التأمين، وكبار المؤمَّن لهم، والمشاريع الكبرى.',
      offer: [
        'تراخيص التأمين وإعادة التأمين لدى هيئة التأمين',
        'صياغة وثائق التأمين للمشاريع والمسؤوليات',
        'المطالبات الكبرى: الحريق، والهندسي، والبحري، والمسؤوليات',
        'إعادة التأمين الاتفاقي والاختياري ومنازعاته',
        'تأمين ائتمان الصادرات والضمانات'
      ],
      diff: 'نقرأ الوثيقة كخريطة مخاطر لا كعقد فقط، ونبني المطالبة من تاريخ الاكتتاب.',
      out: 'وثيقة التأمين، وبرنامج إعادة التأمين، وخطة إدارة المطالبات.'
    },
    en: {
      title: 'Insurance, Contracts & Disputes',
      desc: 'Insurance licensing, major claims and reinsurance.',
      serve: 'Insurers, insurance brokers, large insureds and major projects.',
      offer: [
        'Insurance and reinsurance licensing with the Insurance Authority',
        'Drafting insurance wordings for projects and liabilities',
        'Major claims: fire, engineering, marine and liability',
        'Treaty and facultative reinsurance and related disputes',
        'Export credit insurance and guarantees'
      ],
      diff: 'We read the policy as a risk map, not only a contract, and build the claim from the underwriting date.',
      out: 'An insurance policy wording, a reinsurance programme and a claims management plan.'
    }
  },
  {
    slug: 'transport-logistics-aviation-ports',
    axis: 'specialized',
    official: [30],
    delivery: 'strategic-partnership',
    basis: ['الأنظمة واللوائح المنظمة للنقل البري', 'نظام الطيران المدني', 'النظام البحري التجاري'],
    ar: {
      title: 'النقل والخدمات اللوجستية والطيران والموانئ',
      desc: 'عقود النقل والشحن والتخزين، ومسؤولية الناقل، والتراخيص القطاعية.',
      serve: 'شركات النقل والخدمات اللوجستية، والشاحنون، وملاك السفن، وشركات الطيران والمسافرون.',
      offer: [
        'تراخيص أنشطة النقل والخدمات اللوجستية',
        'عقود النقل والتوزيع والتخزين ومسؤولية الناقل',
        'عقود النقل البحري واستئجار السفن والحجز على السفن والتأمين البحري',
        'مسؤولية الناقل الجوي وحقوق المسافرين أمام الجهات المختصة',
        'مطالبات فقد البضائع وتلفها وتأخرها'
      ],
      diff: 'نقرأ سلسلة النقل كخريطة مخاطر واحدة: الشحن، والتأمين، والميناء، والمطار.',
      out: 'ملف الترخيص، والعقد اللوجستي، ومذكرة المطالبة.'
    },
    en: {
      title: 'Transport, Logistics, Aviation & Ports',
      desc: 'Carriage, shipping and storage contracts, carrier liability and sector licensing.',
      serve: 'Transport and logistics companies, shippers, shipowners, airlines and passengers.',
      offer: [
        'Transport and logistics activity licences',
        'Carriage, distribution and storage contracts and carrier liability',
        'Maritime carriage, charterparties, ship arrest and marine insurance',
        'Air carrier liability and passenger rights before the competent authorities',
        'Cargo loss, damage and delay claims'
      ],
      diff: 'We read the transport chain as a single risk map: shipping, insurance, port and airport.',
      out: 'A licence file, a logistics agreement and a claim memorandum.'
    }
  },
  {
    slug: 'energy-mining',
    axis: 'specialized',
    official: [31],
    delivery: 'strategic-partnership',
    basis: ['نظام الكهرباء', 'نظام الاستثمار التعديني ولائحته التنفيذية'],
    ar: {
      title: 'الطاقة والتعدين',
      desc: 'اتفاقيات شراء الطاقة، ومشاريع الطاقة المتجددة، وتراخيص التعدين.',
      serve: 'مطورو مشاريع الطاقة، والمصانع، والمستثمرون في قطاع التعدين.',
      offer: [
        'اتفاقيات شراء الطاقة ومشاريع الطاقة الشمسية وطاقة الرياح',
        'عقود الهندسة والتوريد والإنشاء والصيانة لمشاريع الطاقة',
        'تراخيص الطاقة والربط بالشبكة والامتثال',
        'رخص الكشف والاستغلال التعديني وفق نظام الاستثمار التعديني',
        'منازعات الطاقة والتعدين والتحكيم فيها'
      ],
      diff: 'نربط الجوانب الفنية بالتمويل: الإنتاج، والربط، والبيع.',
      out: 'اتفاقية شراء الطاقة، وعقد الهندسة والتوريد والإنشاء، وملف الترخيص.'
    },
    en: {
      title: 'Energy & Mining',
      desc: 'Power purchase agreements, renewable energy projects and mining licences.',
      serve: 'Energy project developers, manufacturers and investors in the mining sector.',
      offer: [
        'Power purchase agreements and solar and wind projects',
        'EPC and maintenance contracts for energy projects',
        'Energy licences, grid connection and compliance',
        'Exploration and exploitation licences under the Mining Investment Law',
        'Energy and mining disputes and arbitration'
      ],
      diff: 'We link the technical side to financing: generation, connection and offtake.',
      out: 'A power purchase agreement, an EPC contract and a licence file.'
    }
  },
  {
    slug: 'environment',
    axis: 'specialized',
    official: [31],
    delivery: 'direct',
    basis: ['نظام البيئة ولوائحه التنفيذية'],
    ar: {
      title: 'البيئة والامتثال البيئي',
      desc: 'الامتثال لنظام البيئة، وتقييم الأثر البيئي، والتمويل الأخضر.',
      serve: 'المنشآت الصناعية، ومشاريع الطاقة، والمطورون.',
      offer: [
        'الامتثال لنظام البيئة ولوائحه التنفيذية والتصاريح البيئية',
        'الجوانب النظامية لتقييم الأثر البيئي',
        'إدارة النفايات والمياه وفق الأنظمة النافذة',
        'التمويل الأخضر والصكوك الخضراء وفق لوائح هيئة السوق المالية',
        'المنازعات البيئية والتعويض عن الأضرار البيئية'
      ],
      diff: 'نربط الامتثال البيئي بالتشغيل والتمويل: تصاريح، وتقييم أثر، والتزامات قابلة للقياس.',
      out: 'دراسة الامتثال البيئي، ومستندات تقييم الأثر، ووثائق التمويل الأخضر.'
    },
    en: {
      title: 'Environment & Environmental Compliance',
      desc: 'Compliance with the Environmental Law, environmental impact assessment and green finance.',
      serve: 'Industrial facilities, energy projects and developers.',
      offer: [
        'Compliance with the Environmental Law and its implementing regulations, and environmental permits',
        'Regulatory aspects of environmental impact assessment',
        'Waste and water management under the laws in force',
        'Green finance and green sukuk under Capital Market Authority regulations',
        'Environmental disputes and compensation for environmental damage'
      ],
      diff: 'We link environmental compliance to operations and financing: permits, impact assessment and measurable obligations.',
      out: 'An environmental compliance review, impact assessment documents and green finance documentation.'
    }
  },
  {
    slug: 'media-digital-content',
    axis: 'specialized',
    official: [32],
    delivery: 'direct',
    basis: ['نظام الإعلام المرئي والمسموع', 'نظام المطبوعات والنشر', 'نظام حماية حقوق المؤلف'],
    ar: {
      title: 'الإعلام والمحتوى الرقمي',
      desc: 'التراخيص الإعلامية، وعقود الإنتاج والبث، والإعلان والمحتوى.',
      serve: 'القنوات، والمنصات، وشركات الإنتاج، والمعلنون، وصناع المحتوى.',
      offer: [
        'التراخيص الإعلامية لدى الهيئة العامة لتنظيم الإعلام',
        'عقود الإنتاج والتوزيع ومنصات البث عبر الإنترنت',
        'حقوق البث الرياضي والترفيهي',
        'الإعلان وتراخيص صناع المحتوى والمسؤولية عن المحتوى',
        'منازعات التشهير والحقوق وملكية المحتوى'
      ],
      diff: 'نبني العقد الإعلامي حول الشاشة والإيراد، لا حول البند وحده.',
      out: 'ملف الترخيص الإعلامي، وعقد الإنتاج والبث، وسياسة المحتوى والإعلان.'
    },
    en: {
      title: 'Media & Digital Content',
      desc: 'Media licensing, production and broadcasting agreements, advertising and content.',
      serve: 'Channels, platforms, production companies, advertisers and content creators.',
      offer: [
        'Media licences with the General Authority for Media Regulation',
        'Production, distribution and streaming platform agreements',
        'Sports and entertainment broadcasting rights',
        'Advertising, content creator licences and content liability',
        'Defamation, rights and content ownership disputes'
      ],
      diff: 'We build media contracts around the screen and the revenue, not the clause alone.',
      out: 'A media licence file, a production and broadcasting agreement, and a content and advertising policy.'
    }
  },
  {
    slug: 'healthcare-education',
    axis: 'specialized',
    official: [],
    delivery: 'direct',
    basis: ['نظام المؤسسات الصحية الخاصة', 'نظام مزاولة المهن الصحية', 'اللوائح المنظمة للتعليم الأهلي'],
    ar: {
      title: 'الصحة والتعليم',
      desc: 'تراخيص المنشآت الصحية والتعليمية الخاصة والمسؤولية المهنية الطبية.',
      serve: 'المستشفيات، والعيادات، وشركات الأدوية، والمدارس والجامعات الأهلية.',
      offer: [
        'تراخيص المنشآت الصحية والتعليمية الخاصة واعتمادها',
        'المسؤولية المهنية الطبية والتأمين ضد الأخطاء المهنية',
        'عقود الممارسين الصحيين والتشغيل والإدارة وتوريد الأدوية',
        'البيانات الصحية وخصوصيتها والأبحاث السريرية',
        'المنازعات الصحية والتعليمية'
      ],
      diff: 'نربط الترخيص بالسلامة والجودة، لا بالمستندات وحدها.',
      out: 'ملف الترخيص، وعقد التشغيل، وبرنامج إدارة المسؤولية المهنية.'
    },
    en: {
      title: 'Healthcare & Education',
      desc: 'Licensing of private health and education facilities and medical professional liability.',
      serve: 'Hospitals, clinics, pharmaceutical companies, and private schools and universities.',
      offer: [
        'Licensing and accreditation of private health and education facilities',
        'Medical professional liability and malpractice insurance',
        'Practitioner, operation, management and pharmaceutical supply agreements',
        'Health data privacy and clinical research',
        'Healthcare and education disputes'
      ],
      diff: 'We link licensing to safety and quality, not to paperwork alone.',
      out: 'A licence file, an operation agreement and a professional liability programme.'
    }
  },
  {
    slug: 'major-projects',
    axis: 'specialized',
    official: [9, 25],
    delivery: 'direct',
    basis: ['الأنظمة واللوائح المنظمة للمناطق الاقتصادية الخاصة', 'نظام المعاملات المدنية', 'نظام المنافسات والمشتريات الحكومية'],
    ar: {
      title: 'المشاريع الكبرى والوجهات التنموية',
      desc: 'الهيكلة النظامية لمشاريع التطوير الكبرى ضمن مستهدفات رؤية المملكة 2030.',
      serve: 'مطورو المشاريع الكبرى والوجهات السياحية، والمقاولون والمشغلون المتعاقدون معهم.',
      offer: [
        'الأطر التنظيمية والحوافز في المناطق الاقتصادية الخاصة',
        'عقود التطوير والبنية التحتية وإدارة الوجهات',
        'شراكات الفنادق والعلامات والضيافة والترفيه',
        'متطلبات الامتثال البيئي والتراثي والسياحي',
        'تمويل المشاريع الكبرى وهيكلة ضماناتها'
      ],
      diff: 'نعمل بمنطق الوجهة لا المشروع المنفرد: أطر تنظيمية خاصة، وعقود طويلة الأجل، ومخاطر تشغيلية ممتدة.',
      out: 'الإطار النظامي للمشروع، وحزمة عقود التطوير والتشغيل، وخطة الامتثال.'
    },
    en: {
      title: 'Major Projects & Development Destinations',
      desc: 'Regulatory structuring of major development projects within Saudi Vision 2030 objectives.',
      serve: 'Developers of major projects and tourism destinations, and the contractors and operators engaged by them.',
      offer: [
        'Regulatory frameworks and incentives in special economic zones',
        'Development, infrastructure and destination management agreements',
        'Hotel, brand, hospitality and entertainment partnerships',
        'Environmental, heritage and tourism compliance requirements',
        'Major project finance and security structuring'
      ],
      diff: 'We think at destination level rather than single-project level: special regulatory frameworks, long-term contracts and extended operational risk.',
      out: 'The project’s regulatory framework, a development and operation contract package and a compliance plan.'
    }
  },
  {
    slug: 'legal-translation',
    axis: 'specialized',
    official: [],
    delivery: 'licensed-partner',
    basis: ['الأحكام المنظمة لمكاتب الترجمة المرخّصة'],
    ar: {
      title: 'الترجمة القانونية',
      desc: 'ترجمة معتمدة عبر مكاتب ترجمة مرخّصة، مع مراجعة قانونية من الشركة.',
      serve: 'الشركات، والمستثمرون الأجانب، والأفراد الذين يحتاجون ترجمة معتمدة لوثائق قانونية.',
      offer: [
        'تنسيق الترجمة المعتمدة للعقود والأحكام والوثائق مع مكتب ترجمة مرخّص يُتعاقد معه لكل مهمة',
        'المراجعة القانونية للمصطلحات والأثر النظامي للنص المترجم',
        'مراجعة الترجمات القانونية ثنائية اللغة',
        'إعداد مسرد المصطلحات القانونية المعتمد للمنشأة'
      ],
      diff: 'ترجمة تحافظ على الأثر النظامي للنص لا على المعنى الحرفي وحده.',
      out: 'وثيقة مترجمة ترجمة معتمدة من مكتب مرخّص، مع مذكرة المراجعة القانونية.'
    },
    en: {
      title: 'Legal Translation',
      desc: 'Certified translation through licensed translation offices, with legal review by the firm.',
      serve: 'Companies, foreign investors and individuals needing certified translation of legal documents.',
      offer: [
        'Coordinating certified translation of contracts, judgments and documents with a licensed translation office engaged for each assignment',
        'Legal review of terminology and the regulatory effect of the translated text',
        'Review of bilingual legal translations',
        'Preparing an approved legal glossary for the organisation'
      ],
      diff: 'Translation that preserves the legal effect of the text, not only its literal meaning.',
      out: 'A document translated and certified by a licensed office, with a legal review memorandum.'
    }
  }
];

export const servicesByAxis = (axis: AxisSlug) => services.filter((s) => s.axis === axis);
export const findService = (slug: string) => services.find((s) => s.slug === slug);
export const findAxis = (slug: string) => axes.find((a) => a.slug === slug);
