window.MG_CONSOLE = {
  ver: 3, today: '2026-09-29',
  firm: { name: 'مجموعة إم القانونية', en: 'M GRP Company For Lawyership and Legal Consultations', vat: '3150535051', cr: '7055255900', license: '481757', address: 'مركز الملك عبدالله المالي (كافد) — الرياض 13519', phone: '+966 54 644 4000', email: 'info@mgrp.sa' },
  branches: [
    { id: 'ruh', name: 'الرياض', note: 'المقر الرئيسي — كافد' }, { id: 'oth', name: 'مدن أخرى', note: 'بالتنسيق المسبق' }
  ],
  extraUsers: [{ id: 'lama', username: 'lama', pass: 'Mg@2026', cls: 'admin', name: { ar: 'لمى الشهري', en: 'Lama Al-Shehri' }, initials: { ar: 'ل', en: 'L' }, email: 'lama@mgrp.sa', mobile: '+966 55 210 4408', nid: '1010000008', license: '', online: true, locked: null, role: { ar: 'إداري', en: 'Administrative' } }],
  staff: { faisal: { branch: 'ruh', rate: 1500, cost: 950 }, hind: { branch: 'ruh', rate: 1400, cost: 900 }, abdullah: { branch: 'ruh', rate: 1200, cost: 750 }, sara: { branch: 'ruh', rate: 800, cost: 420 }, noura: { branch: 'oth', rate: 750, cost: 400 }, majed: { branch: 'oth', rate: 450, cost: 230 }, reem: { branch: 'ruh', rate: 350, cost: 200 }, lama: { branch: 'ruh', rate: 0, cost: 180 } },
  clients: [
    { id: 'noor', name: 'شركة النور التجارية', type: 'شركة', cr: '1010456789', vat: '310456789000003', contact: 'أحمد الشمري', phone: '+966 50 111 2201', email: 'ahmed@alnoor.sa', branch: 'ruh', kyc: [1, 1, 1, 1, 1], wathq: 'active', since: '2025-03-10' },
    { id: 'khalid', name: 'خالد المطيري', type: 'فرد', cr: '', vat: '', contact: 'خالد المطيري', phone: '+966 55 300 4412', email: 'k.mutairi@mail.sa', branch: 'oth', kyc: [1, 0, 1, 1, 1], wathq: '-', since: '2026-01-20' },
    { id: 'mona', name: 'منى الحربي', type: 'فرد', cr: '', vat: '', contact: 'منى الحربي', phone: '+966 56 410 7720', email: 'mona.h@mail.sa', branch: 'ruh', kyc: [1, 0, 0, 1, 0], wathq: '-', since: '2026-06-14' },
    { id: 'bayanat', name: 'شركة بيانات للتقنية', type: 'شركة', cr: '1010778812', vat: '310778812000003', contact: 'لمى الغامدي', phone: '+966 50 880 3190', email: 'legal@bayanat.sa', branch: 'ruh', kyc: [1, 1, 1, 1, 1], wathq: 'active', since: '2026-01-01' },
    { id: 'riyada', name: 'مجموعة الريادة القابضة', type: 'شركة', cr: '4030221190', vat: '300221190000003', contact: 'سلمان العنزي', phone: '+966 54 771 0021', email: 'salman@riyada.sa', branch: 'oth', kyc: [1, 1, 0, 1, 1], wathq: 'active', since: '2025-11-02' }
  ],
  kycItems: ['التحقق من الهوية أو السجل التجاري', 'التحقق عبر واثق', 'تحديد المستفيد الحقيقي', 'مصدر الأموال وطبيعة النشاط', 'الفحص مقابل قوائم العقوبات'],
  matters: [
    { no: 'CN-2026-0118', type: 'contract', service: 'commercial-contracts', client: 'noor', lead: 'sara', team: ['sara', 'reem'], status: 'review', title: 'صياغة ومراجعة عقد توريد', branch: 'ruh', opened: '2026-09-18', lastActivity: '2026-09-28', fee: 'FC-2026-021' },
    { no: 'CN-2026-0121', type: 'case', service: 'litigation', client: 'khalid', lead: 'sara', team: ['sara', 'majed'], status: 'hearing', title: 'دعوى تجارية — مطالبة مالية', branch: 'ruh', court: 'المحكمة التجارية بالرياض', caseNo: '4712•••890', level: 0, opened: '2026-09-05', claim: 385000, lastActivity: '2026-09-27', fee: 'FC-2026-019' },
    { no: 'CN-2026-0097', type: 'case', service: 'employment-hr', client: 'mona', lead: 'abdullah', team: ['abdullah'], status: 'hearing', title: 'استئناف حكم عمالي', branch: 'ruh', court: 'محكمة الاستئناف بالرياض', caseNo: '4698•••221', level: 1, opened: '2026-06-14', lastActivity: '2026-09-22', fee: 'FC-2026-011' },
    { no: 'CN-2026-0130', type: 'consult', service: 'data-cyber-ai', client: 'bayanat', lead: 'noura', team: ['noura'], status: 'active', title: 'الامتثال لنظام حماية البيانات الشخصية', branch: 'oth', opened: '2026-09-01', lastActivity: '2026-09-08', retainer: 'RT-2026-004' },
    { no: 'CN-2026-0134', type: 'follow', service: 'intellectual-property', client: 'noor', lead: 'noura', team: ['noura'], status: 'active', title: 'متابعة تجديد العلامة التجارية', branch: 'oth', opened: '2026-09-20', lastActivity: '2026-09-25' },
    { no: 'CN-2026-0142', type: 'case', service: 'real-estate', client: 'riyada', lead: 'noura', team: ['noura', 'majed'], status: 'hearing', title: 'دعوى إخلاء عقار وأجرة متأخرة', branch: 'oth', court: 'المحكمة العامة بجدة', caseNo: '4705•••067', level: 0, opened: '2026-08-02', claim: 212000, lastActivity: '2026-09-24', fee: 'FC-2026-015' },
    { no: 'CN-2026-0150', type: 'case', service: 'enforcement', client: 'khalid', lead: 'majed', team: ['majed'], status: 'active', title: 'تنفيذ حكم مالي', branch: 'oth', court: 'محكمة التنفيذ بالخبر', caseNo: '4406•••112', level: 0, opened: '2026-08-25', claim: 385000, lastActivity: '2026-09-26', fee: 'FC-2026-017' },
    { no: 'CN-2026-0088', type: 'opinion', service: 'mergers-acquisitions', client: 'riyada', lead: 'abdullah', team: ['abdullah', 'hind'], status: 'closed', title: 'رأي قانوني في هيكلة استحواذ', branch: 'ruh', opened: '2026-07-01', closed: '2026-09-01', lastActivity: '2026-09-01' }
  ],
  parties: {
    'CN-2026-0121': [{ name: 'خالد المطيري', role: 'مدعٍ — موكلنا' }, { name: 'مؤسسة الأفق للتجارة', role: 'مدعى عليه' }],
    'CN-2026-0142': [{ name: 'مجموعة الريادة القابضة', role: 'مدعٍ — موكلنا' }, { name: 'مؤسسة سنا للتجزئة', role: 'مدعى عليه — مستأجر' }],
    'CN-2026-0097': [{ name: 'منى الحربي', role: 'مستأنِفة — موكلتنا' }, { name: 'مصنع الريادة للبلاستيك', role: 'مستأنَف ضده' }],
    'CN-2026-0118': [{ name: 'شركة النور التجارية', role: 'مشترٍ — موكلنا' }, { name: 'شركة الوفاق للتوريدات', role: 'مورد' }],
    'CN-2026-0150': [{ name: 'خالد المطيري', role: 'طالب التنفيذ — موكلنا' }, { name: 'مؤسسة الأفق للتجارة', role: 'منفذ ضده' }]
  },
  docs: {
    'CN-2026-0118': [{ code: 'DOC-01', name: 'خطاب التكليف', kind: 'PDF', date: '2026-09-18', by: 'sara', v: 1, status: 'approved' }, { code: 'DOC-02', name: 'نسخة العقد الأصلية', kind: 'PDF', date: '2026-09-20', by: 'sara', v: 1, status: 'approved' }, { code: 'DOC-03', name: 'المسودة المعدلة', kind: 'DOCX', date: '2026-09-28', by: 'sara', v: 2, status: 'draft' }],
    'CN-2026-0121': [{ code: 'DOC-01', name: 'صحيفة الدعوى', kind: 'PDF', date: '2026-09-10', by: 'sara', v: 1, status: 'approved' }, { code: 'DOC-02', name: 'حافظة المستندات', kind: 'PDF', date: '2026-09-12', by: 'majed', v: 1, status: 'approved' }, { code: 'DOC-03', name: 'ضبط جلسة 15 سبتمبر', kind: 'DOCX', date: '2026-09-15', by: 'najiz', v: 1, status: 'approved' }],
    'CN-2026-0142': [{ code: 'DOC-01', name: 'عقد الإيجار', kind: 'PDF', date: '2026-08-02', by: 'noura', v: 1, status: 'approved' }, { code: 'DOC-02', name: 'صك الحكم المستعجل', kind: 'DOCX', date: '2026-09-24', by: 'najiz', v: 1, status: 'approved' }],
    'CN-2026-0097': [{ code: 'DOC-01', name: 'اللائحة الاعتراضية', kind: 'PDF', date: '2026-09-22', by: 'abdullah', v: 1, status: 'approved' }],
    'CN-2026-0130': [{ code: 'DOC-01', name: 'استبيان جمع البيانات', kind: 'XLSX', date: '2026-09-08', by: 'noura', v: 1, status: 'approved' }],
    'CN-2026-0088': [{ code: 'DOC-01', name: 'الرأي القانوني النهائي', kind: 'PDF', date: '2026-09-01', by: 'abdullah', v: 3, status: 'approved' }]
  },
  events: {
    'CN-2026-0121': [{ date: '2026-09-05', text: 'فتح الملف وتوقيع عقد الأتعاب الموحد' }, { date: '2026-09-10', text: 'قيد صحيفة الدعوى أمام المحكمة التجارية' }, { date: '2026-09-15', text: 'الجلسة الأولى — دفع المدعى عليه بعدم الاختصاص' }, { date: '2026-09-20', text: 'صدور قرار مستعجل برفض طلب الحجز التحفظي' }],
    'CN-2026-0142': [{ date: '2026-08-02', text: 'فتح الملف' }, { date: '2026-08-10', text: 'قيد الدعوى وتبليغ المدعى عليه' }, { date: '2026-09-24', text: 'صدور حكم مستعجل بالإخلاء' }],
    'CN-2026-0097': [{ date: '2026-06-14', text: 'فتح الملف' }, { date: '2026-09-01', text: 'تسلّم صك الحكم الابتدائي' }, { date: '2026-09-22', text: 'تقديم اللائحة الاعتراضية — انتقال للاستئناف' }]
  },
  hearings: [
    { id: 'h1', matter: 'CN-2026-0121', date: '2026-10-02', time: '10:00', court: 'المحكمة التجارية بالرياض', circuit: 'الدائرة التجارية الثالثة', mode: 'حضوري', status: 'upcoming', lawyer: 'sara' },
    { id: 'h2', matter: 'CN-2026-0097', date: '2026-10-06', time: '11:30', court: 'محكمة الاستئناف بالرياض', circuit: 'الدائرة العمالية الثانية', mode: 'مرئي', status: 'upcoming', lawyer: 'abdullah' },
    { id: 'h3', matter: 'CN-2026-0142', date: '2026-09-30', time: '09:00', court: 'المحكمة العامة بجدة', circuit: 'الدائرة الخامسة', mode: 'حضوري', status: 'upcoming', lawyer: 'noura' },
    { id: 'h4', matter: 'CN-2026-0121', date: '2026-09-15', time: '10:30', court: 'المحكمة التجارية بالرياض', circuit: 'الدائرة التجارية الثالثة', mode: 'حضوري', status: 'done', lawyer: 'sara', summary: 'قدّم المدعى عليه مذكرة جوابية ودفع بعدم الاختصاص، فمنحت الدائرة المدعي مهلة للرد وأُجّلت الجلسة.', next: 'تقديم مذكرة الرد قبل الجلسة القادمة.', reportSent: false },
    { id: 'h5', matter: 'CN-2026-0142', date: '2026-09-24', time: '09:30', court: 'المحكمة العامة بجدة', circuit: 'الدائرة الخامسة', mode: 'حضوري', status: 'done', lawyer: 'noura', summary: 'صدر حكم مستعجل بإلزام المستأجر بإخلاء العين المؤجرة.', next: 'متابعة مدة الاعتراض ثم طلب التنفيذ.', reportSent: true }
  ],
  judgments: [
    { id: 'j1', matter: 'CN-2026-0142', level: 'ابتدائي', kind: 'urgent', received: '2026-09-24', outcome: 'لصالح الموكل', summary: 'إلزام المدعى عليه بإخلاء العين المؤجرة.', decision: 'monitor', status: 'open' },
    { id: 'j2', matter: 'CN-2026-0097', level: 'ابتدائي', kind: 'general', received: '2026-09-01', outcome: 'ضد الموكلة جزئيًا', summary: 'رفض طلب التعويض عن الفصل.', decision: 'object', status: 'filed', filedOn: '2026-09-22' },
    { id: 'j3', matter: 'CN-2026-0150', level: 'ابتدائي', kind: 'general', received: '2026-07-20', outcome: 'لصالح الموكل', summary: 'إلزام المدعى عليه بسداد 385,000 ريال.', decision: 'monitor', status: 'final', finalOn: '2026-08-19' },
    { id: 'j4', matter: 'CN-2026-0121', level: 'ابتدائي', kind: 'urgent', received: '2026-09-20', outcome: 'ضد الموكل', summary: 'رفض طلب الحجز التحفظي على أموال المدعى عليه.', decision: 'object', status: 'open' }
  ],
  holidays: [
    { id: 'hd1', name: 'اليوم الوطني', from: '2026-09-23', to: '2026-09-23' },
    { id: 'hd2', name: 'يوم التأسيس', from: '2027-02-22', to: '2027-02-22' },
    { id: 'hd3', name: 'إجازة عيد الفطر (تقديرية حسب أم القرى)', from: '2027-03-08', to: '2027-03-13' },
    { id: 'hd4', name: 'إجازة عيد الأضحى (تقديرية حسب أم القرى)', from: '2027-05-15', to: '2027-05-20' }
  ],
  poas: [
    { no: '4471029', client: 'khalid', agents: ['sara', 'majed'], issued: '2025-10-12', expires: '2026-10-11', scope: 'المرافعة والمدافعة والتنفيذ والصلح والإقرار', matters: ['CN-2026-0121', 'CN-2026-0150'] },
    { no: '4390112', client: 'mona', agents: ['abdullah'], issued: '2024-09-26', expires: '2026-09-25', scope: 'المرافعة والاستئناف وطلب التمييز', matters: ['CN-2026-0097'] },
    { no: '4502331', client: 'riyada', agents: ['noura', 'majed'], issued: '2026-07-28', expires: '2027-07-27', scope: 'المرافعة والتنفيذ واستلام المبالغ', matters: ['CN-2026-0142'] },
    { no: '4488120', client: 'noor', agents: ['sara', 'noura'], issued: '2026-03-02', expires: '2027-03-01', scope: 'التوقيع على العقود والمراجعة لدى الجهات', matters: ['CN-2026-0118', 'CN-2026-0134'] }
  ],
  enforcement: [{ id: 'e1', matter: 'CN-2026-0150', court: 'محكمة التنفيذ بالخبر', reqNo: '4406•••112', filed: '2026-08-27', amount: 385000, collected: 120000, stage: 2, debtor: 'مؤسسة الأفق للتجارة' }],
  enfStages: ['قيد طلب التنفيذ', 'إبلاغ المنفذ ضده', 'الإفصاح عن الأموال', 'الحجز والمنع', 'التحصيل والإقفال'],
  notices: [
    { no: 'MG-N-2026-0031', type: 'mutalaba', to: 'مؤسسة سنا للتجزئة', matter: 'CN-2026-0142', date: '2026-07-20', channel: 'بريد مسجل', status: 'تم التسليم' },
    { no: 'MG-N-2026-0032', type: 'sadad', to: 'مؤسسة الأفق للتجارة', matter: 'CN-2026-0121', date: '2026-08-30', channel: 'بريد إلكتروني', status: 'أُرسل' }
  ],
  noticeTypes: [
    { key: 'mutalaba', name: 'مطالبة ودية بالسداد', body: 'بصفتنا وكلاء عن موكلنا {client}، نُخطركم بوجوب سداد المبلغ المستحق وقدره {amount} ريال خلال {days} أيام من تاريخ هذا الإخطار، وإلا فسيُتخذ ما يلزم من إجراءات نظامية لحفظ حقوق موكلنا.' },
    { key: 'ikhla', name: 'إنذار بالإخلاء', body: 'بصفتنا وكلاء عن موكلنا {client}، نُنذركم بإخلاء العين المؤجرة وتسليمها خالية خلال {days} أيام من تاريخه، وسداد الأجرة المتأخرة وقدرها {amount} ريال.' },
    { key: 'sadad', name: 'إخطار قبل طلب التنفيذ', body: 'نُخطركم بأن موكلنا {client} سيتقدم بطلب تنفيذ الحكم الصادر لصالحه ما لم يتم سداد مبلغ {amount} ريال خلال {days} أيام.' },
    { key: 'khitam', name: 'إخطار بإنهاء عقد', body: 'بصفتنا وكلاء عن موكلنا {client}، نُخطركم بإنهاء العقد المبرم بينكما بعد انقضاء {days} يومًا من تاريخه، مع تسوية المستحقات البالغة {amount} ريال.' }
  ],
  leads: [
    { id: 'L1', name: 'شركة مدار للخدمات اللوجستية', source: 'الموقع', service: 'transport-logistics-aviation-ports', value: 85000, stage: 'new', owner: 'abdullah', date: '2026-09-28' },
    { id: 'L2', name: 'عبدالرحمن السالم', source: 'واتساب', service: 'estates-inheritance', value: 40000, stage: 'contacted', owner: 'sara', date: '2026-09-25' },
    { id: 'L3', name: 'مصنع الخليج للأغذية', source: 'إحالة', service: 'employment-hr', value: 120000, stage: 'proposal', owner: 'hind', date: '2026-09-18' },
    { id: 'L4', name: 'جمعية تكافل الخيرية', source: 'الموقع', service: 'waqf-nonprofit', value: 60000, stage: 'negotiation', owner: 'hind', date: '2026-09-10' },
    { id: 'L5', name: 'شركة أفق الطاقة', source: 'فعالية', service: 'energy-mining', value: 300000, stage: 'won', owner: 'faisal', date: '2026-08-30' },
    { id: 'L6', name: 'مؤسسة رواد للتجزئة', source: 'الموقع', service: 'franchising', value: 35000, stage: 'lost', owner: 'sara', date: '2026-08-12' }
  ],
  intake: [
    { no: 'REQ-2026-040', client: 'شركة الأفق للمقاولات', contact: 'ماجد القرني', phone: '+966 50 222 1133', service: 'commercial-contracts', details: 'مراجعة عقد مقاولة من الباطن قبل التوقيع.', urgency: 'high', source: 'التطبيق', date: '2026-09-28', stage: 0 },
    { no: 'REQ-2026-041', client: 'شركة سدير للاستثمار', contact: 'نايف العتيبي', phone: '+966 55 610 2280', service: 'foreign-investment', details: 'هيكلة دخول شريك أجنبي بحصة 30% وفق نظام الاستثمار.', urgency: 'normal', source: 'الموقع', date: '2026-09-27', stage: 2, conflict: 'none', quote: { amount: 45000, desc: 'مذكرة هيكلة الاستثمار واتفاقية الشركاء' } },
    { no: 'REQ-2026-039', client: 'هيفاء الزهراني', contact: 'هيفاء الزهراني', phone: '+966 53 118 7702', service: 'personal-status', details: 'دعوى حضانة ونفقة.', urgency: 'normal', source: 'واتساب', date: '2026-09-24', stage: 3, conflict: 'none', quote: { amount: 18000, desc: 'التمثيل في دعوى الحضانة والنفقة' } }
  ],
  feeContracts: [
    { id: 'FC-2026-019', matter: 'CN-2026-0121', client: 'khalid', type: 'mixed', desc: 'مبلغ مقطوع 30,000 ريال + 10% مما يُحكم به ويُحصَّل', unified: true, signed: '2026-09-05', milestones: [{ name: 'عند التوقيع', amount: 15000, trigger: 'التوقيع', status: 'paid' }, { name: 'عند قيد الدعوى', amount: 15000, trigger: 'قيد الدعوى', status: 'paid' }, { name: 'نسبة 10% من المحكوم به', amount: 38500, trigger: 'صدور حكم نهائي', status: 'pending' }] },
    { id: 'FC-2026-021', matter: 'CN-2026-0118', client: 'noor', type: 'fixed', desc: 'مبلغ مقطوع 22,000 ريال', unified: true, signed: '2026-09-18', milestones: [{ name: 'دفعة أولى', amount: 11000, trigger: 'التوقيع', status: 'paid' }, { name: 'تسليم المسودة النهائية', amount: 11000, trigger: 'التسليم', status: 'due', due: '2026-10-05' }] },
    { id: 'FC-2026-011', matter: 'CN-2026-0097', client: 'mona', type: 'fixed', desc: 'مبلغ مقطوع 18,000 ريال', unified: false, signed: '2026-06-14', milestones: [{ name: 'دفعة أولى', amount: 9000, trigger: 'التوقيع', status: 'paid' }, { name: 'عند صدور حكم الاستئناف', amount: 9000, trigger: 'صدور حكم نهائي', status: 'pending' }] },
    { id: 'FC-2026-015', matter: 'CN-2026-0142', client: 'riyada', type: 'percent', desc: '12% من المبالغ المحصلة', unified: true, signed: '2026-08-02', milestones: [{ name: '12% من المحصل', amount: 25440, trigger: 'التحصيل', status: 'pending' }] },
    { id: 'FC-2026-017', matter: 'CN-2026-0150', client: 'khalid', type: 'hourly', desc: 'بالساعة 450 ريال بحد أعلى 40,000 ريال', unified: true, signed: '2026-08-25', milestones: [{ name: 'فوترة شهرية للساعات', amount: 0, trigger: 'شهري', status: 'pending' }] }
  ],
  retainers: [
    { id: 'RT-2026-004', client: 'bayanat', title: 'عقد خدمات استشارية سنوي', start: '2026-01-01', end: '2026-12-31', items: [{ name: 'استشارات', budget: 80000 }, { name: 'مراجعة عقود', budget: 40000 }], used: [{ date: '2026-03-12', desc: 'مراجعة اتفاقية مزود سحابي', amount: 9000, item: 1 }, { date: '2026-05-20', desc: 'استشارة تسجيل علامة', amount: 6000, item: 0 }, { date: '2026-09-01', matter: 'CN-2026-0130', desc: 'مشروع الامتثال لنظام حماية البيانات', amount: 36000, item: 0 }] },
    { id: 'RT-2026-006', client: 'riyada', title: 'إدارة قانونية خارجية', start: '2026-04-01', end: '2027-03-31', items: [{ name: 'تقاضٍ', budget: 150000 }, { name: 'استشارات وحوكمة', budget: 90000 }], used: [{ date: '2026-07-01', matter: 'CN-2026-0088', desc: 'رأي هيكلة الاستحواذ', amount: 65000, item: 1 }, { date: '2026-08-02', matter: 'CN-2026-0142', desc: 'دعوى الإخلاء', amount: 30000, item: 0 }] }
  ],
  invoices: [
    { no: 'INV-2026-0120', client: 'mona', matter: 'CN-2026-0097', date: '2026-06-14', due: '2026-06-21', lines: [{ d: 'أتعاب — الدفعة الأولى', a: 9000 }], status: 'paid', paidOn: '2026-06-18', zatca: 'reported', type: 'simplified' },
    { no: 'INV-2026-0138', client: 'bayanat', matter: 'CN-2026-0130', date: '2026-08-20', due: '2026-09-03', lines: [{ d: 'مشروع الامتثال — الدفعة الأولى', a: 18000 }], status: 'unpaid', zatca: 'cleared', type: 'tax' },
    { no: 'INV-2026-0142', client: 'khalid', matter: 'CN-2026-0121', date: '2026-09-05', due: '2026-09-12', lines: [{ d: 'أتعاب — دفعة التوقيع', a: 15000 }], status: 'paid', paidOn: '2026-09-06', zatca: 'reported', type: 'simplified' },
    { no: 'INV-2026-0149', client: 'riyada', matter: 'CN-2026-0088', date: '2026-07-10', due: '2026-07-24', lines: [{ d: 'رأي قانوني في هيكلة الاستحواذ', a: 65000 }], status: 'unpaid', zatca: 'cleared', type: 'tax' },
    { no: 'INV-2026-0151', client: 'khalid', matter: 'CN-2026-0121', date: '2026-09-12', due: '2026-09-19', lines: [{ d: 'أتعاب — دفعة قيد الدعوى', a: 15000 }], status: 'paid', paidOn: '2026-09-14', zatca: 'reported', type: 'simplified' },
    { no: 'INV-2026-0156', client: 'noor', matter: 'CN-2026-0118', date: '2026-09-18', due: '2026-09-25', lines: [{ d: 'أتعاب صياغة العقد — دفعة أولى', a: 11000 }], status: 'paid', paidOn: '2026-09-21', zatca: 'cleared', type: 'tax' },
    { no: 'INV-2026-0159', client: 'riyada', matter: 'CN-2026-0142', date: '2026-09-26', due: '2026-10-10', lines: [{ d: 'مصروفات قضائية مستردة', a: 3800 }], status: 'unpaid', zatca: 'cleared', type: 'tax' }
  ],
  expenses: [
    { id: 'X1', matter: 'CN-2026-0142', desc: 'رسوم تبليغ عبر مكتب محضرين', amount: 1200, date: '2026-08-10', billable: true, cat: 'قضائية', by: 'noura' },
    { id: 'X2', matter: 'CN-2026-0118', desc: 'ترجمة معتمدة للعقد', amount: 2600, date: '2026-09-21', billable: true, cat: 'ترجمة', by: 'reem' },
    { id: 'X3', matter: 'CN-2026-0142', desc: 'سفر لحضور جلسة جدة', amount: 1850, date: '2026-09-23', billable: true, cat: 'سفر', by: 'majed' },
    { id: 'X4', matter: '', desc: 'اشتراك قواعد بيانات قانونية', amount: 4200, date: '2026-09-01', billable: false, cat: 'تشغيل', by: 'lama' },
    { id: 'X5', matter: '', desc: 'إيجار مكتب الخبر — الربع الرابع', amount: 18000, date: '2026-09-28', billable: false, cat: 'إيجار', by: 'lama' }
  ],
  treasury: [{ id: 'bank', name: 'الحساب البنكي الرئيسي', balance: 486200 }, { id: 'cash', name: 'الصندوق النقدي', balance: 8400 }],
  time: [
    { id: 'T1', user: 'sara', matter: 'CN-2026-0121', date: '2026-09-28', min: 180, note: 'إعداد مذكرة الرد على الدفع بعدم الاختصاص', billable: true, billed: false },
    { id: 'T2', user: 'majed', matter: 'CN-2026-0150', date: '2026-09-26', min: 240, note: 'مراجعة الإفصاح عن الأموال ومتابعة المحكمة', billable: true, billed: false },
    { id: 'T3', user: 'majed', matter: 'CN-2026-0150', date: '2026-09-10', min: 300, note: 'قيد طلب التنفيذ وإعداد المستندات', billable: true, billed: false },
    { id: 'T4', user: 'noura', matter: 'CN-2026-0142', date: '2026-09-24', min: 150, note: 'حضور الجلسة وصدور الحكم', billable: true, billed: false },
    { id: 'T5', user: 'sara', matter: 'CN-2026-0118', date: '2026-09-27', min: 210, note: 'صياغة المسودة الثانية', billable: true, billed: false },
    { id: 'T6', user: 'abdullah', matter: 'CN-2026-0097', date: '2026-09-21', min: 270, note: 'إعداد اللائحة الاعتراضية', billable: true, billed: false },
    { id: 'T7', user: 'hind', matter: 'CN-2026-0088', date: '2026-08-28', min: 360, note: 'مراجعة الرأي النهائي', billable: true, billed: true },
    { id: 'T8', user: 'reem', matter: 'CN-2026-0118', date: '2026-09-25', min: 120, note: 'ترجمة بنود العقد', billable: false, billed: false }
  ],
  tasks: [
    { id: 1, title: 'إعداد مذكرة الرد على الدفع بعدم الاختصاص', matter: 'CN-2026-0121', assignee: 'sara', due: '2026-10-01', priority: 'high', done: false },
    { id: 2, title: 'إضافة بند السرية لعقد التوريد', matter: 'CN-2026-0118', assignee: 'sara', due: '2026-09-29', priority: 'high', done: false },
    { id: 3, title: 'تجهيز حافظة مستندات الاستئناف', matter: 'CN-2026-0097', assignee: 'abdullah', due: '2026-10-03', priority: 'med', done: false },
    { id: 4, title: 'تقرير فجوات الامتثال', matter: 'CN-2026-0130', assignee: 'noura', due: '2026-09-27', priority: 'med', done: false },
    { id: 5, title: 'ترجمة المسودة إلى الإنجليزية', matter: 'CN-2026-0118', assignee: 'reem', due: '2026-10-04', priority: 'low', done: false },
    { id: 6, title: 'مراجعة حافظة المستندات قبل الجلسة', matter: 'CN-2026-0142', assignee: 'majed', due: '2026-09-29', priority: 'high', done: false }
  ],
  templates: [
    { id: 'TP1', name: 'خطاب التكليف المعتمد', cat: 'عام', versions: [{ v: '1.0', date: '2025-02-01', by: 'faisal', note: 'الإصدار الأول', status: 'approved' }, { v: '1.1', date: '2025-11-10', by: 'hind', note: 'إضافة بند حماية البيانات الشخصية', status: 'approved' }, { v: '2.0', date: '2026-06-01', by: 'faisal', note: 'مواءمة مع العقد الموحد لأتعاب المحاماة', status: 'approved' }] },
    { id: 'TP2', name: 'عقد توريد ثنائي اللغة', cat: 'العقود', versions: [{ v: '1.0', date: '2025-05-12', by: 'abdullah', note: 'الإصدار الأول', status: 'approved' }, { v: '1.1', date: '2026-02-03', by: 'hind', note: 'تحديث حدود المسؤولية والشرط الجزائي', status: 'approved' }] },
    { id: 'TP3', name: 'مذكرة جوابية — المحاكم التجارية', cat: 'التقاضي', versions: [{ v: '1.0', date: '2025-09-01', by: 'abdullah', note: 'الإصدار الأول', status: 'approved' }] },
    { id: 'TP4', name: 'اتفاقية عدم إفصاح', cat: 'العقود', versions: [{ v: '1.0', date: '2025-03-15', by: 'hind', note: 'الإصدار الأول', status: 'approved' }] },
    { id: 'TP5', name: 'مطالبة ودية بالسداد', cat: 'التحصيل', versions: [{ v: '1.0', date: '2026-09-26', by: 'majed', note: 'مسودة أولى من محامٍ مساعد', status: 'pending' }] }
  ],
  playbook: [
    { clause: 'حدود المسؤولية', position: 'لا تقل عن قيمة العقد، ولا تشمل الغش والإهمال الجسيم.' },
    { clause: 'النظام الحاكم', position: 'الأنظمة السارية في المملكة العربية السعودية.' },
    { clause: 'تسوية النزاعات', position: 'التحكيم لدى المركز السعودي للتحكيم التجاري أو المحاكم المختصة في الرياض.' },
    { clause: 'الشرط الجزائي', position: 'لا يتجاوز 10% من قيمة العقد ما لم يُتفق صراحة على غيره.' },
    { clause: 'السرية', position: 'تستمر ثلاث سنوات على الأقل بعد انتهاء العقد.' },
    { clause: 'الإنهاء', position: 'إشعار مسبق 30 يومًا ومهلة 15 يومًا لمعالجة الإخلال.' },
    { clause: 'حماية البيانات', position: 'الالتزام بنظام حماية البيانات الشخصية ولائحته التنفيذية.' },
    { clause: 'الدفع', position: 'خلال 30 يومًا من الفاتورة، مع غرامة تأخير محددة.' }
  ],
  attendance: { faisal: { in: '08:05', status: 'present' }, hind: { in: '08:40', status: 'present' }, abdullah: { in: '—', status: 'court' }, sara: { in: '07:55', status: 'present' }, noura: { in: '08:20', status: 'remote' }, majed: { in: '09:12', status: 'late' }, reem: { in: '—', status: 'leave' }, lama: { in: '07:50', status: 'present' } },
  leaves: [
    { id: 'LV1', user: 'noura', type: 'إجازة سنوية', from: '2026-10-12', to: '2026-10-14', status: 'pending' },
    { id: 'LV2', user: 'reem', type: 'إجازة مرضية', from: '2026-09-29', to: '2026-09-30', status: 'approved' },
    { id: 'LV3', user: 'majed', type: 'استئذان', from: '2026-10-01', to: '2026-10-01', status: 'pending' }
  ],
  meetings: [
    { id: 'M1', client: 'noor', matter: 'CN-2026-0118', date: '2026-10-01', time: '13:00', title: 'مناقشة المسودة الثانية لعقد التوريد', link: 'https://meet.google.com/mgr-noor-118', with: ['sara'] },
    { id: 'M2', client: 'riyada', matter: 'CN-2026-0142', date: '2026-10-03', time: '11:00', title: 'خطة التنفيذ بعد حكم الإخلاء', link: 'https://meet.google.com/mgr-riy-142', with: ['noura', 'hind'] }
  ],
  lawVerify: { 1: ['2026-09-01', 'hind'], 4: ['2026-08-20', 'hind'], 6: ['2026-09-10', 'abdullah'], 11: ['2026-02-01', 'hind'], 12: ['2026-09-12', 'abdullah'], 15: ['2026-09-05', 'hind'], 28: ['2026-03-01', 'faisal'], 37: ['2026-09-15', 'hind'] },
  najizFeed: [
    { id: 'n1', kind: 'hearing', matter: 'CN-2026-0121', text: 'جلسة جديدة — المحكمة التجارية بالرياض', date: '2026-10-20', time: '10:00', court: 'المحكمة التجارية بالرياض', circuit: 'الدائرة التجارية الثالثة' },
    { id: 'n2', kind: 'minutes', matter: 'CN-2026-0142', text: 'ضبط جلسة 24 سبتمبر — ملف Word', date: '2026-09-24' },
    { id: 'n3', kind: 'poa', matter: 'CN-2026-0130', text: 'وكالة جديدة رقم 4519077 — شركة بيانات للتقنية', date: '2026-09-28', client: 'bayanat', no: '4519077' },
    { id: 'n4', kind: 'judgment', matter: 'CN-2026-0097', text: 'قيد الاعتراض بالاستئناف وإحالته للدائرة', date: '2026-09-27' }
  ],
  integrations: [
    { key: 'najiz', name: 'ناجز', desc: 'مزامنة الجلسات والأحكام والوكالات عبر الربط الرسمي المعتمد من وزارة العدل عند إتاحته، وإلا إدخال يدوي بمسؤولية المحامي — لا استخلاص آلي للبيانات من المنصة', on: true },
    { key: 'zatca', name: 'زاتكا — فاتورة', desc: 'إصدار واعتماد الفواتير الإلكترونية للمرحلة الثانية', on: true },
    { key: 'nafith', name: 'نافذ', desc: 'إنشاء العقد الموحد لأتعاب المحاماة بصفة سند تنفيذي', on: true },
    { key: 'wathq', name: 'واثق', desc: 'التحقق من السجلات التجارية قبل التعاقد', on: true },
    { key: 'whatsapp', name: 'واتساب للأعمال', desc: 'إشعارات العملاء وتقارير الجلسات وروابط الدفع', on: true },
    { key: 'sms', name: 'الرسائل النصية', desc: 'تنبيهات المواعيد والمهل', on: true },
    { key: 'email', name: 'البريد الإلكتروني', desc: 'ربط صندوق بريد الشركة الرسمي (@mgrp.sa) فقط', on: true },
    { key: 'meet', name: 'الاجتماعات المرئية', desc: 'روابط اجتماعات مع العملاء عبر منصة مستضافة داخل المملكة', on: true },
    { key: 'pay', name: 'بوابة الدفع الإلكتروني', desc: 'روابط سداد الفواتير — مدى وبطاقات وApple Pay', on: true },
    { key: 'esign', name: 'التوقيع الإلكتروني', desc: 'توقيع العروض وعقود الأتعاب', on: true },
    { key: 'drive', name: 'التخزين السحابي للمستندات', desc: 'حفظ المستندات في مساحة المكتب الخاصة', on: false },
    { key: 'site', name: 'موقع المجموعة mgrp.sa', desc: 'طلبات الخدمات من الموقع تصل إلى الطلبات الواردة مباشرة', on: true }
  ]
};
