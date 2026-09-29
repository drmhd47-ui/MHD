import type { Lang } from './data/catalog';

export const langs: Lang[] = ['ar', 'en'];

export const dir = (lang: Lang) => (lang === 'ar' ? 'rtl' : 'ltr');
export const other = (lang: Lang): Lang => (lang === 'ar' ? 'en' : 'ar');

/** يبني مساراً داخلياً بلغة معينة: path('ar', 'services') → /ar/services/ */
export const path = (lang: Lang, ...segments: string[]) =>
  `/${[lang, ...segments.filter(Boolean)].join('/')}/`.replace(/\/+/g, '/');

const nf = { ar: new Intl.NumberFormat('ar-SA-u-nu-latn'), en: new Intl.NumberFormat('en-US') };
export const num = (lang: Lang, n: number) => nf[lang].format(n);

export const t = {
  ar: {
    siteName: 'مجموعة إم القانونية',
    tagline: 'شركة محاماة واستشارات قانونية سعودية مرخّصة',
    skip: 'تخطَّ إلى المحتوى',
    nav: { home: 'الرئيسية', about: 'من نحن', services: 'الخدمات', coverage: 'التغطية', articles: 'المقالات', contact: 'تواصل معنا' },
    menu: 'القائمة',
    close: 'إغلاق',
    switchLang: 'English',
    switchLangLabel: 'Switch to English',
    cta: 'اطلب استشارة',
    hero: {
      eyebrow: 'مركز الملك عبدالله المالي، الرياض',
      title: 'مجموعة إم القانونية',
      lead: 'شركة محاماة واستشارات قانونية سعودية تقدم حلولاً قانونية متكاملة لقطاعات المال والأعمال والمنشآت والقطاعات الحيوية. نعمل بمنهجية قانونية منضبطة تُمكّن الإدارة من اتخاذ القرار السليم، عبر التقاء الخبرة القانونية بالإدارة الاحترافية.',
      secondary: 'تعرّف على الخدمات'
    },
    record: {
      title: 'حصيلة خبرة الشركاء',
      cases: 'قضية ومنازعة',
      contracts: 'عقد ووثيقة',
      consultations: 'استشارة مهنية',
      note: 'هذه الأرقام حصيلة الأعمال السابقة للشركاء قبل انضمامهم إلى الشركة، وليست أعمالاً منجزة باسم الشركة.',
      summary: 'تنوعت خبرات الشركاء السابقة بين القضايا الحقوقية والعقارية والتجارية وقضايا المقاولات والتنفيذ والإفلاس والتحكيم، وصياغة عقود فيديك وعدم الإفصاح والامتياز وتوفير العمالة والشراكات، والاستشارات في المنازعات والعمل والقرارات الإدارية والامتثال وإدارة المخاطر لقطاعات الإنشاءات والصناعة والنفط والغاز والتجزئة والسياحة.'
    },
    about: {
      eyebrow: 'من نحن',
      title: 'شركة مهنية سعودية بمنهجية تجمع القانون والإدارة',
      p1: 'مجموعة إم القانونية شركة محاماة مهنية سعودية مرخّصة، مقرها الرئيسي في مركز الملك عبدالله المالي بالرياض، تقدم خدماتها القانونية عبر خمسة محاور رئيسية تلبي احتياجات الأفراد والمنشآت والقطاعات الحيوية.',
      p2: 'تضم الشركة شركاء قانونيين مؤهلين بالخبرة اللازمة لخدمتكم.',
      p3: 'وتعمل الشركة مع شبكة من القانونيين المتعاونين بموجب اتفاقيات شراكة عمل غير متفرغة، يُستعان بهم بحسب طبيعة كل مهمة ونطاقها، وتبقى المسؤولية المهنية أمام العميل على الشركة وفق ترخيصها.',
      more: 'المزيد عن الشركة',
      methodTitle: 'منهجيتنا',
      method: [
        { t: 'الخبرة القانونية', d: 'تحليل الأنظمة واللوائح والمبادئ القضائية وتقديم رأي قانوني مسبَّب.' },
        { t: 'الإدارة الاحترافية', d: 'ترجمة الرأي القانوني إلى قرار إداري قابل للتنفيذ.' },
        { t: 'التكامل بين التخصصات', d: 'تخصصات تعمل منظومةً واحدة لخدمة القرار، لا جزراً منفصلة.' }
      ],
      missionTitle: 'رسالتنا',
      mission: 'تمكين الإدارة من اتخاذ القرار السليم في بيئة عمل آمنة ومستدامة، عبر منظومة قانونية متكاملة تجمع بين الخبرة القانونية والإدارة الاحترافية.'
    },
    people: {
      title: 'الشركاء والفريق',
      managing: 'الشريك الإداري',
      lawyers: 'المحامون المرخّصون',
      network: 'شبكة القانونيين المتعاونين',
      education: 'المؤهلات العلمية'
    },
    services: {
      eyebrow: 'حلول إم القانونية',
      title: 'الخدمات',
      lead: 'خدماتنا موزعة على خمسة محاور. تعرض صفحة كل خدمة: من نخدم، وماذا نقدم، وما يميز عملنا، ومخرجاتنا.',
      count: (s: number, a: number) => `${s} خدمة في ${a} محاور`,
      inAxis: (n: number) => `${n} ${n >= 3 && n <= 10 ? 'خدمات' : 'خدمة'}`,
      viewAxis: 'عرض خدمات المحور',
      weServe: 'نخدم',
      offer: 'ماذا نقدم',
      diff: 'ما يميز عملنا',
      out: 'مخرجاتنا',
      inquire: 'استفسر عن هذه الخدمة',
      related: 'خدمات أخرى في هذا المحور',
      deliveryTitle: 'طريقة تقديم الخدمة',
      delivery: {
        'strategic-partnership':
          'تُقدَّم هذه الخدمة بالتنسيق مع خبراء ومستشارين متخصصين يُتعاقد معهم لكل مهمة على حدة بحسب طبيعتها ونطاقها. ولا تربط الشركة بأي جهة في هذا المجال علاقة شراكة دائمة أو حصرية، وتبقى المسؤولية المهنية عن العمل القانوني أمام العميل على الشركة وفق ترخيصها.',
        'licensed-partner':
          'الترجمة المعتمدة نشاط يتطلب ترخيصاً مستقلاً؛ لذلك تُنفَّذ عبر مكتب ترجمة مرخّص يُتعاقد معه لكل مهمة، ويصدر عنه اعتماد الترجمة، وتتولى الشركة المراجعة القانونية للنص المترجم وأثره النظامي.'
      }
    },
    coverage: {
      eyebrow: 'التغطية',
      title: 'نخدم عملاءنا في مختلف مناطق المملكة',
      lead: 'تُدار الأعمال مركزياً من المقر الرئيسي في مركز الملك عبدالله المالي، مع متابعة في المدن التالية عبر الشركاء والقانونيين المتعاونين.',
      hq: 'المقر الرئيسي'
    },
    contact: {
      eyebrow: 'تواصل معنا',
      title: 'اطلب استشارة',
      lead: 'أرسل طلبك عبر النموذج، وسيتواصل معك أحد أعضاء الفريق خلال أوقات العمل.',
      direct: 'قنوات التواصل المباشر',
      phone: 'الهاتف وواتساب',
      email: 'البريد الإلكتروني',
      address: 'العنوان',
      hours: 'ساعات العمل',
      whatsapp: 'واتساب',
      whatsappNote: 'لا ترسل مستندات أو تفاصيل سرية عبر واتساب أو البريد قبل التواصل مع المحامي.',
      whatsappText: 'السلام عليكم ورحمة الله وبركاته\nمجموعة إم القانونية\nأرغب في الحديث معكم عن الحلول والخدمات القانونية التي تقدمونها.',
      call: 'اتصال'
    },
    form: {
      title: 'نموذج طلب استشارة',
      intro: 'الحقول المطلوبة محدودة عمداً. لا تكتب في النموذج تفاصيل سرية عن مسألتك؛ سنطلبها منك مباشرة عند التواصل.',
      name: 'الاسم الكامل أو اسم المنشأة',
      contactMethod: 'وسيلة التواصل المفضلة',
      byPhone: 'الهاتف',
      byEmail: 'البريد الإلكتروني',
      phone: 'رقم الجوال',
      phoneHint: 'مثال: 05XXXXXXXX',
      email: 'البريد الإلكتروني',
      service: 'نوع الخدمة',
      serviceNone: 'غير محدد / لا أعرف',
      opposing: 'اسم الطرف الآخر في المسألة (إن وُجد)',
      opposingHint: 'نستخدمه فقط لفحص تعارض المصالح قبل قبول الطلب.',
      consent: 'اطلعت على سياسة الخصوصية وأوافق على معالجة بياناتي لغرض الرد على طلبي.',
      privacyLink: 'سياسة الخصوصية',
      submit: 'إرسال الطلب',
      sending: 'جارٍ الإرسال…',
      required: 'مطلوب',
      optional: 'اختياري',
      hp: 'اترك هذا الحقل فارغاً',
      success: 'تم استلام طلبك.',
      successRef: 'رقم الطلب',
      successNext: 'سيتواصل معك أحد أعضاء الفريق خلال أوقات العمل. استلام الطلب لا يُنشئ علاقة توكيل، ولا يتضمن أي رأي قانوني.',
      errors: {
        name: 'اكتب الاسم (حرفان على الأقل).',
        phone: 'اكتب رقم جوال سعودي صحيحاً يبدأ بـ 05 ومكوناً من 10 أرقام.',
        email: 'اكتب بريداً إلكترونياً صحيحاً.',
        consent: 'يلزم الموافقة على سياسة الخصوصية لإرسال الطلب.',
        server: 'تعذّر إرسال الطلب الآن. حاول مرة أخرى بعد قليل، أو تواصل معنا هاتفياً.',
        rate: 'تم إرسال عدد كبير من الطلبات من هذا الجهاز. حاول مرة أخرى بعد ساعة.'
      },
      noscriptThanks: 'تم استلام طلبك',
      errorPageTitle: 'تعذّر إرسال الطلب',
      errorPageBody: 'لم نتمكن من استلام الطلب. تحقق من الحقول المطلوبة ثم أعد المحاولة، أو تواصل معنا هاتفياً.',
      back: 'العودة إلى النموذج'
    },
    articles: {
      title: 'المقالات والمستجدات النظامية',
      lead: 'معلومات عامة عن الأنظمة والمستجدات، مع الإحالة إلى النص الرسمي. لا تُعد استشارة قانونية.',
      reviewed: 'راجعه',
      published: 'نُشر في',
      sources: 'المصادر الرسمية',
      notice: 'هذا المقال معلومات عامة مستندة إلى النص الرسمي المشار إليه وقت النشر، ولا يُعد استشارة قانونية في مسألة بعينها. قد تتغير الأنظمة بعد تاريخ النشر.'
    },
    footer: {
      legal: 'البيانات النظامية',
      cr: 'السجل التجاري',
      vat: 'الرقم الضريبي',
      license: 'ترخيص المحاماة',
      registeredName: 'الاسم في السجل التجاري',
      disclaimer:
        'المحتوى المنشور في هذا الموقع معلومات عامة عن الشركة وخدماتها، ولا يُعد استشارة قانونية، ولا يُنشئ الاطلاع عليه أو التواصل عبره علاقة توكيل بين المستخدم والشركة.',
      privacy: 'سياسة الخصوصية',
      terms: 'شروط الاستخدام',
      rights: 'جميع الحقوق محفوظة',
      follow: 'تابعنا'
    },
    notFound: { title: 'الصفحة غير موجودة', body: 'الرابط الذي فتحته غير موجود أو نُقل.', home: 'العودة إلى الرئيسية' },
    breadcrumb: 'مسار التنقل'
  },
  en: {
    siteName: 'M GROUP',
    tagline: 'A licensed Saudi law firm and legal consultancy',
    skip: 'Skip to content',
    nav: { home: 'Home', about: 'About', services: 'Services', coverage: 'Coverage', articles: 'Articles', contact: 'Contact' },
    menu: 'Menu',
    close: 'Close',
    switchLang: 'العربية',
    switchLangLabel: 'التبديل إلى العربية',
    cta: 'Request a consultation',
    hero: {
      eyebrow: 'King Abdullah Financial District, Riyadh',
      title: 'M GROUP',
      lead: 'A Saudi law firm and legal consultancy providing integrated legal solutions to the financial, commercial, corporate and vital sectors. Our disciplined legal methodology enables management to make sound decisions, combining legal expertise with professional management.',
      secondary: 'Explore our services'
    },
    record: {
      title: "Partners' track record",
      cases: 'Cases & disputes',
      contracts: 'Contracts & instruments',
      consultations: 'Professional consultations',
      note: "These figures are the partners' prior work before joining the firm, not work completed in the firm's name.",
      summary: "The partners' prior experience spans civil, real estate, commercial, construction, enforcement, insolvency and arbitration matters; drafting FIDIC, NDA, franchise, manpower supply and partnership agreements; and advising on disputes, employment, administrative decisions, compliance and risk management for construction, industry, oil and gas, retail and tourism."
    },
    about: {
      eyebrow: 'About us',
      title: 'A Saudi professional firm combining law and management',
      p1: 'M GROUP is a licensed Saudi professional law firm headquartered at King Abdullah Financial District in Riyadh, delivering legal services across five core practice axes for individuals, businesses and vital sectors.',
      p2: 'The firm comprises qualified legal partners with the experience needed to serve you.',
      p3: 'The firm also works with a network of collaborating legal professionals under non-exclusive, part-time working partnership agreements, engaged according to the nature and scope of each assignment. Professional responsibility towards the client remains with the firm under its licence.',
      more: 'More about the firm',
      methodTitle: 'Our methodology',
      method: [
        { t: 'Legal expertise', d: 'Analysis of laws, regulations and judicial principles, delivering reasoned legal opinions.' },
        { t: 'Professional management', d: 'Translating legal opinion into actionable management decisions.' },
        { t: 'Integrated practice', d: 'Practice areas working as one system to serve the decision, not as isolated silos.' }
      ],
      missionTitle: 'Our mission',
      mission: 'Enabling management to make sound decisions in a secure and sustainable business environment, through an integrated legal framework that combines legal expertise with professional management.'
    },
    people: {
      title: 'Partners & team',
      managing: 'Managing Partner',
      lawyers: 'Licensed lawyers',
      network: 'Collaborating legal network',
      education: 'Qualifications'
    },
    services: {
      eyebrow: 'M GROUP legal solutions',
      title: 'Services',
      lead: 'Our services are organised in five practice axes. Each service page sets out who we serve, what we offer, what distinguishes our work and our deliverables.',
      count: (s: number, a: number) => `${s} services across ${a} axes`,
      inAxis: (n: number) => `${n} services`,
      viewAxis: 'View services in this axis',
      weServe: 'We serve',
      offer: 'What we offer',
      diff: 'What distinguishes our work',
      out: 'Deliverables',
      inquire: 'Inquire about this service',
      related: 'Other services in this axis',
      deliveryTitle: 'How this service is delivered',
      delivery: {
        'strategic-partnership':
          'This service is delivered in coordination with specialist experts and advisers engaged separately for each assignment according to its nature and scope. The firm has no permanent or exclusive partnership with any party in this field, and professional responsibility for the legal work towards the client remains with the firm under its licence.',
        'licensed-partner':
          'Certified translation is an activity that requires a separate licence. It is therefore carried out by a licensed translation office engaged for each assignment, which certifies the translation, while the firm conducts the legal review of the translated text and its regulatory effect.'
      }
    },
    coverage: {
      eyebrow: 'Coverage',
      title: 'Serving clients across the Kingdom',
      lead: 'Work is managed centrally from our headquarters at King Abdullah Financial District, with follow-up in the following cities through our partners and collaborating legal professionals.',
      hq: 'Headquarters'
    },
    contact: {
      eyebrow: 'Contact',
      title: 'Request a consultation',
      lead: 'Send your request through the form and a member of the team will contact you during working hours.',
      direct: 'Direct contact',
      phone: 'Phone & WhatsApp',
      email: 'Email',
      address: 'Address',
      hours: 'Working hours',
      whatsapp: 'WhatsApp',
      whatsappNote: 'Please do not send documents or confidential details by WhatsApp or email before speaking with a lawyer.',
      whatsappText: 'Hello M GROUP,\nI would like to discuss your legal solutions and services.',
      call: 'Call'
    },
    form: {
      title: 'Consultation request form',
      intro: 'We deliberately ask for very little. Please do not include confidential details about your matter; we will ask for them directly when we contact you.',
      name: 'Full name or organisation name',
      contactMethod: 'Preferred contact method',
      byPhone: 'Phone',
      byEmail: 'Email',
      phone: 'Mobile number',
      phoneHint: 'e.g. 05XXXXXXXX',
      email: 'Email address',
      service: 'Service',
      serviceNone: 'Not sure / other',
      opposing: 'Name of the other party in the matter (if any)',
      opposingHint: 'Used only to check for conflicts of interest before accepting the request.',
      consent: 'I have read the privacy policy and agree to my data being processed to respond to my request.',
      privacyLink: 'Privacy policy',
      submit: 'Send request',
      sending: 'Sending…',
      required: 'required',
      optional: 'optional',
      hp: 'Leave this field empty',
      success: 'Your request has been received.',
      successRef: 'Request number',
      successNext: 'A member of the team will contact you during working hours. Receipt of a request does not create a lawyer-client relationship and contains no legal opinion.',
      errors: {
        name: 'Enter a name (at least two characters).',
        phone: 'Enter a valid Saudi mobile number starting with 05 (10 digits).',
        email: 'Enter a valid email address.',
        consent: 'You must accept the privacy policy to send the request.',
        server: 'We could not send the request right now. Please try again shortly, or call us.',
        rate: 'Too many requests were sent from this device. Please try again in an hour.'
      },
      noscriptThanks: 'Your request has been received',
      errorPageTitle: 'The request could not be sent',
      errorPageBody: 'We could not receive the request. Check the required fields and try again, or call us.',
      back: 'Back to the form'
    },
    articles: {
      title: 'Articles & regulatory updates',
      lead: 'General information about laws and regulatory developments, with references to the official text. Not legal advice.',
      reviewed: 'Reviewed by',
      published: 'Published',
      sources: 'Official sources',
      notice: 'This article is general information based on the official text referenced at the time of publication and is not legal advice on any specific matter. Laws may change after the publication date.'
    },
    footer: {
      legal: 'Regulatory information',
      cr: 'Commercial Registration',
      vat: 'VAT Number',
      license: 'Law Practice Licence',
      registeredName: 'Registered name',
      disclaimer:
        'Content on this website is general information about the firm and its services. It is not legal advice, and viewing it or contacting us through it does not create a lawyer-client relationship.',
      privacy: 'Privacy policy',
      terms: 'Terms of use',
      rights: 'All rights reserved',
      follow: 'Follow us'
    },
    notFound: { title: 'Page not found', body: 'The link you opened does not exist or has moved.', home: 'Back to home' },
    breadcrumb: 'Breadcrumb'
  }
} as const;
