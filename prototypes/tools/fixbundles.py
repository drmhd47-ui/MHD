"""Applies the M GROUP policy corrections to the unpacked App and Website Console bundles.

Works on the directories produced by unbundle.cjs (template.html + assets/*). Every replacement
asserts that its target exists, so a silent no-op cannot hide a missed fix.
"""
import json, os, re, shutil, uuid

HERE = os.path.dirname(os.path.abspath(__file__))  # مجلدا app/ وconsole/ الناتجان عن unbundle.cjs بجانب هذا الملف
FONTS = os.path.join(HERE, '..', '..', 'website', 'node_modules', '@fontsource', 'noto-naskh-arabic', 'files')
APP, CON = os.path.join(HERE, 'app'), os.path.join(HERE, 'console')
DATA = 'd0d164de-dc10-4ad8-82c0-22d36d130609.js'       # MG_DATA inside the app bundle
DATA_C = 'dd0f0daf-0ab2-451d-b465-fafbcb98e00d.js'     # same MG_DATA inside the console bundle
CONS = '1adb53e0-647e-4080-85aa-37a8c4076e08.js'       # MG_CONSOLE

log = []


def rd(p): return open(p, encoding='utf-8').read()
def wr(p, s): open(p, 'w', encoding='utf-8').write(s)


def rep(s, a, b, where, min_count=1, exact=None):
    n = s.count(a)
    assert n >= min_count, f'{where}: missing {a[:70]!r}'
    if exact is not None:
        assert n == exact, f'{where}: expected {exact}, found {n} for {a[:70]!r}'
    log.append((where, a[:60], n))
    return s.replace(a, b)


def rep_opt(s, a, b, where):
    n = s.count(a)
    if n:
        log.append((where, a[:60], n))
    return s.replace(a, b)


# ── Old → approved service keys (catalog of 49 on the five official axes) ──
KEYMAP = {
    'establish': 'company-formation', 'contracts': 'commercial-contracts', 'investment': 'foreign-investment',
    'merger': 'mergers-acquisitions', 'franchise': 'franchising', 'inheritance': 'estates-inheritance',
    'personal': 'personal-status', 'labor': 'employment-hr', 'data': 'data-cyber-ai', 'ip': 'intellectual-property',
    'realestate': 'real-estate', 'logistics': 'transport-logistics-aviation-ports', 'energy': 'energy-mining',
    'waqf': 'waqf-nonprofit', 'litigation': 'litigation', 'enforcement': 'enforcement', 'arbitration': 'arbitration-mediation',
}

# ── Shared text fixes (both bundles, template + data) ──
COMMON = [
    ('محاماة - استشارات - تحكيم - توثيق - صياغة عقود - إدارة قانونية', 'محاماة - استشارات - تحكيم - صياغة عقود - إدارة قانونية'),
    ('@mgroup.sa', '@mgrp.sa'),
]

ANONYMIZE = r'''
  // يُحجب ما يعرّف العملاء والأطراف قبل أي إرسال إلى المساعد الآلي (نظام حماية البيانات الشخصية):
  // الأسماء المعروفة تُستبدل برموز، وتُحذف حقول الاتصال والهوية، وتُقنَّع أرقام الهوية والسجل والجوال والبريد.
  anonymize(v) {
    const names = [], add = n => { if (!n) return; if (typeof n === 'object') { add(n.ar); add(n.en); return; } if (String(n).trim().length > 2) names.push(String(n).trim()); };
    const G = window.MG_DATA || {}, C = window.MG_CONSOLE || {}, S = this.state || {};
    [G.clients, C.clients, S.clients, G.conflicts, C.leads, S.leads].forEach(list => (Array.isArray(list) ? list : []).forEach(c => { add(c.name); add(c.contact); add(c.client); }));
    Object.values(C.parties || {}).forEach(ps => (ps || []).forEach(p => add(p.name)));
    const uniq = [...new Set(names)].sort((a, b) => b.length - a.length);
    const DROP = /^(phone|mobile|email|nid|iqama|cr|vat|iban|contact|address|wa|tel)$/i;
    const txt = t => uniq.reduce((x, n, i) => x.split(n).join(`[طرف ${i + 1}]`), String(t))
      .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[بريد]').replace(/\+?\d[\d\s•]{8,}\d/g, '[رقم]');
    const walk = x => typeof x === 'string' ? txt(x) : Array.isArray(x) ? x.map(walk)
      : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).filter(([k]) => !DROP.test(k)).map(([k, y]) => [k, walk(y)])) : x;
    return walk(v);
  }
'''

AI_RULES_AR = ('أنت أداة مساعدة داخلية لفريق الشركة فقط: مخرجاتك مسودات لا تُسلَّم للعميل ولا يُعتمد عليها إلا بعد مراجعة '
               'محامٍ مرخّص في الشركة. لا تَعِد بنتيجة ولا تقطع بمآل دعوى، واستخدم مصطلح "نظام" للتشريع السعودي. '
               'البيانات التعريفية محجوبة برموز مثل [طرف 1] فلا تحاول استنتاجها.')


def fix_fonts(d):
    """Replace every embedded font (Amiri, Noto Sans, Noto Sans Arabic) with self-hosted Noto Naskh Arabic."""
    t = rd(os.path.join(d, 'template.html'))
    faces = re.findall(r'@font-face\s*\{[^}]*\}', t)
    old_assets = set(re.findall(r'assets/([0-9a-f-]+\.woff2)', ''.join(faces)))
    for f in faces:
        t = t.replace(f, '', 1)
    man = json.load(open(os.path.join(d, 'manifest.json')))
    man['list'] = [l for l in man['list'] if l['name'] not in old_assets]
    for a in old_assets:
        os.remove(os.path.join(d, 'assets', a))
    ranges = {
        'arabic': 'U+0600-06FF, U+0750-077F, U+0870-088E, U+0890-0891, U+0897-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC, U+102E0-102FB, U+10E60-10E7E, U+10EC2-10EC4, U+10EFC-10EFF, U+1EE00-1EEFF',
        'latin-ext': 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF',
        'latin': 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
    }
    css = []
    for sub, rng in ranges.items():
        for w in (400, 500, 600, 700):
            u = str(uuid.uuid4()); name = u + '.woff2'
            shutil.copy(os.path.join(FONTS, f'noto-naskh-arabic-{sub}-{w}-normal.woff2'), os.path.join(d, 'assets', name))
            man['list'].append({'uuid': u, 'mime': 'font/woff2', 'size': os.path.getsize(os.path.join(d, 'assets', name)), 'name': name})
            css.append(f"@font-face{{font-family:'Noto Naskh Arabic';font-style:normal;font-weight:{w};font-display:swap;"
                       f"src:url(\"assets/{name}\") format('woff2');unicode-range:{rng};}}")
    t = t.replace('<style>', '<style>\n' + '\n'.join(css) + '\n', 1)
    json.dump(man, open(os.path.join(d, 'manifest.json'), 'w'), indent=1)
    # One family everywhere, no external font host.
    for fam in ["'Noto Sans Arabic'", "'Noto Sans'", "'Amiri'", '"Amiri"', '"Noto Sans Arabic"']:
        t = t.replace(fam, "'Noto Naskh Arabic'")
    t = re.sub(r'<link rel="preconnect" href="https://fonts\.(googleapis|gstatic)\.com"[^>]*>', '', t)
    t = t.replace('font-style:italic', 'font-style:normal').replace('font-style: italic', 'font-style: normal')
    wr(os.path.join(d, 'template.html'), t)
    log.append((d, f'fonts: removed {len(faces)} faces / {len(old_assets)} files, added 12 Noto Naskh files', 1))


def fix_data(p, where):
    s = rd(p)
    for a, b in COMMON:
        s = rep_opt(s, a, b, where)
    s = rep(s, "firm:'M GROUP LAW FIRM'", "firm:'M GROUP'", where)
    # Managing partner: the admin demo account represents him; no CEO / founder titles.
    s = rep(s, "initials:{ar:'ف',en:'F'}, name:{ar:'فيصل المالكي',en:'Faisal Al-Malki'}, role:{ar:'الرئيس التنفيذي',en:'CEO'}",
            "initials:{ar:'م',en:'M'}, name:{ar:'الدكتور محمد بن جمعان',en:'Dr. Mohammed bin Jumaan'}, role:{ar:'الشريك الإداري',en:'Managing Partner'}", where)
    s = rep(s, "'فيصل المالكي', 'Faisal Al-Malki'", "'الدكتور محمد بن جمعان', 'Dr. Mohammed bin Jumaan'", where)
    s = rep(s, "demoPartner: 'فيصل · شريك'", "demoPartner: 'د. محمد · الشريك الإداري'", where)
    s = rep(s, "demoPartner: 'Faisal · Partner'", "demoPartner: 'Dr. Mohammed · Managing Partner'", where)
    s = rep(s, 'الرئيس التنفيذي', 'الشريك الإداري', where)
    s = rep(s, 'lead lawyer + CEO', 'lead lawyer + managing partner', where)
    s = rep(s, 'lead lawyer and CEO', 'lead lawyer and managing partner', where)
    s = rep(s, "بوابة مستقلة للشركاء المؤسسين", "بوابة مستقلة لشركاء الشركة", where)
    s = rep(s, "Private portal for founding partners", "Private portal for the firm partners", where)
    # Translation is delivered only through a licensed translation office; forensic accounting was removed.
    s = rep(s, "{key:'translation', name:{ar:'الترجمة القانونية',en:'Legal translation'}}",
            "{key:'translation', name:{ar:'الترجمة القانونية (عبر مكتب ترجمة مرخّص)',en:'Legal translation (via a licensed office)'}}", where)
    s = rep(s, "{key:'accounting', name:{ar:'محاسبة قانونية',en:'Legal accounting'}}",
            "{key:'accounting', name:{ar:'ملخص مالي للملف',en:'Matter financial summary'}}", where)
    # AI scope note: tell users what is withheld before sending.
    s = rep(s, "ويجب مطابقة النص مع المصدر الرسمي قبل الاعتماد والتوقيع.'",
            "ويجب مطابقة النص مع المصدر الرسمي قبل الاعتماد والتوقيع. تُحجب أسماء العملاء والأطراف وأرقامهم آلياً قبل الإرسال، ولا تُدخل بيانات تعريفية في النص الحر. والمخرجات مسودات داخلية لا تُسلَّم للعميل قبل مراجعة محامٍ مرخّص.'", where)
    s = rep(s, "must be matched against the official text before approval and signing.'",
            "must be matched against the official text before approval and signing. Client and party names and numbers are masked automatically before sending; do not type identifying data in free text. Outputs are internal drafts, never sent to a client before review by a licensed lawyer.'", where)
    s = rep(s, "svcSub: '53 تخصصًا · 7 محاور'", "svcSub: '49 خدمة · 5 محاور رسمية'", where)
    s = rep(s, "svcSub: '53 specialties · 7 practice axes'", "svcSub: '49 services · 5 official axes'", where)
    # Sign-in log: the browser no longer calls a public geolocation service (see fix_template).
    s = rep(s, "saNote: 'كل دخول وخروج يُسجل مع الجهاز وعنوان IP والموقع التقريبي.'",
            "saNote: 'كل دخول وخروج يُسجَّل في سجل الخادم مع الجهاز وعنوان IP.'", where)
    s = rep(s, "slNote: 'يُحدَّد عنوان IP والموقع التقريبي في هذا النموذج عبر خدمة عامة. في النسخة الإنتاجية يسجلها الخادم مباشرة،",
            "slNote: 'لا يستدعي التطبيق أي خدمة خارجية لتحديد العنوان أو الموقع؛ يسجّل الخادم عنوان IP مباشرة في سجل التدقيق،", where)
    s = rep(s, "saNote: 'Every sign-in and sign-out is logged with device, IP address and approximate location.'",
            "saNote: 'Every sign-in and sign-out is logged with device and IP address in the server log, as described in the privacy notice.'", where)
    s = rep(s, "slNote: 'In this prototype the IP and approximate location come from a public lookup service. In production the server records them directly",
            "slNote: 'The app calls no external lookup service; the server records the IP address directly in the audit log", where)
    # Approved catalog replaces the old 53-service / 7-axis list (military, space, crypto, notarisation…).
    lines = s.split('\n')
    idx = [i for i, l in enumerate(lines) if l.lstrip().startswith('D.axes = [')]
    assert len(idx) == 1, where + ': D.axes line'
    lines[idx[0]] = '  D.axes = ' + rd(os.path.join(HERE, 'axes.json')) + ';'
    s = '\n'.join(lines)
    log.append((where, 'D.axes → approved 49 services / 5 axes', 1))
    wr(p, s)


def fix_console_data(p):
    s = rd(p); w = 'MG_CONSOLE'
    s = rep(s, "en: 'M GROUP LAW FIRM', vat: '300000000000003', cr: '1010000000', address: 'مركز الملك عبدالله المالي (كافد) — الرياض'",
            "en: 'M GRP Company For Lawyership and Legal Consultations', vat: '3150535051', cr: '7055255900', license: '481757', address: 'مركز الملك عبدالله المالي (كافد) — الرياض 13519'", w)
    # One headquarters; other cities are served by prior arrangement, not from branches.
    i = s.index('branches: ['); j = s.index('],', i) + 2
    s = s[:i] + "branches: [\n    { id: 'ruh', name: 'الرياض', note: 'المقر الرئيسي — كافد' }, { id: 'oth', name: 'مدن أخرى', note: 'بالتنسيق المسبق' }\n  ]," + s[j:]
    log.append((w, 'branches → HQ + other cities by arrangement', 1))
    for b in ('jed', 'khb', 'qas', 'med'):
        s = rep_opt(s, f"branch: '{b}'", "branch: 'oth'", w)
    s = rep_opt(s, '@mgroup.sa', '@mgrp.sa', w)
    s = rep(s, "desc: 'مزامنة الجلسات والأحكام والوكالات والضبوط عبر إضافة المتصفح تحت تحكم المحامي'",
            "desc: 'مزامنة الجلسات والأحكام والوكالات عبر الربط الرسمي المعتمد من وزارة العدل عند إتاحته، وإلا إدخال يدوي بمسؤولية المحامي — لا استخلاص آلي للبيانات من المنصة'", w)
    s = rep(s, "desc: 'روابط اجتماعات تلقائية مع العملاء'", "desc: 'روابط اجتماعات مع العملاء عبر منصة مستضافة داخل المملكة'", w)
    s = rep(s, "desc: 'ربط Outlook وGmail بصندوق المكتب'", "desc: 'ربط صندوق بريد الشركة الرسمي (@mgrp.sa) فقط'", w)
    for old, new in KEYMAP.items():
        s = rep_opt(s, f"service: '{old}'", f"service: '{new}'", w)
    wr(p, s)


def fix_template(d, kind):
    p = os.path.join(d, 'template.html'); s = rd(p); w = kind + '/template'
    for a, b in COMMON:
        s = rep(s, a, b, w) if a.startswith('محاماة') else rep_opt(s, a, b, w)
    s = rep(s, 'M GROUP LAW FIRM', 'M GROUP', w)
    # Every call to the external assistant goes through anonymize().
    n = s.count('window.claude.complete(prompt)')
    assert n >= 1, w
    s = s.replace('window.claude.complete(prompt)', 'window.claude.complete(this.anonymize(prompt))')
    log.append((w, 'anonymize() around window.claude.complete', n))
    if kind == 'app':
        s = rep(s, '  aiBase() {', ANONYMIZE + '  aiBase() {', w, exact=1)
        s = rep(s, 'قواعد صارمة: لا تختلق رقم مادة', AI_RULES_AR + '\nقواعد صارمة: لا تختلق رقم مادة', w, exact=1)
        s = rep(s, 'اكتب بلغة قانونية قضائية دقيقة لا تحتمل التأويل.', 'اكتب بلغة قانونية دقيقة وواضحة.', w, exact=1)
        # No third-party IP geolocation from the browser: the server logs the address it sees.
        a = s.index("let net = null; try { const ctl = new AbortController()")
        b = s.index('\n', s.index("fetch('https://api.ipify.org"))
        s = s[:a] + "let net = null; // عنوان IP يسجّله الخادم في سجل التدقيق؛ لا استدعاء لخدمات تحديد موقع خارجية (نظام حماية البيانات الشخصية)" + s[b:]
        log.append((w, 'removed ipapi.co / ipify.org lookups', 1))
        s = rep(s, "selSvc: 'establish'", "selSvc: 'company-formation'", w)
        # Greeting keeps the honorific with the first name ("الدكتور محمد", "Dr. Mohammed").
        s = rep(s, "first: L(cu.name).replace(/^(د\\.|Dr\\.)\\s*/, '').split(' ')[0]",
                "first: (m => m ? m[1] + ' ' + m[2] : L(cu.name).split(' ')[0])(L(cu.name).match(/^(الدكتور|د\\.|Dr\\.)\\s*(\\S+)/))", w, exact=1)
    else:
        s = rep(s, '  aiRules() {', ANONYMIZE + '  aiRules() {', w, exact=1)
        s = rep(s, 'قواعد صارمة: لا تختلق رقم مادة', AI_RULES_AR + '\\nقواعد صارمة: لا تختلق رقم مادة', w, exact=1)
        s = rep(s, 'أنت مساعد ملف قانوني لدى مجموعة إم القانونية.', 'أنت مساعد ملف قانوني داخلي لدى مجموعة إم القانونية. ' + AI_RULES_AR, w, exact=1)
        s = rep(s, 'مع مساعد قانوني يستند إلى الأنظمة ويكشف المخالفات.', 'مع مساعد آلي يعين الفريق على مراجعة المسودات، وتخضع مخرجاته لمراجعة محامٍ مرخّص.', w)
        # Branch wording → service location (one HQ, other cities by prior arrangement).
        s = rep(s, 'الفروع والموارد البشرية', 'الموارد البشرية', w)
        s = rep(s, 'خمسة فروع بإدارة مركزية من كافد:', 'مقر واحد في كافد، ويخدم الفريق العملاء في المدن الأخرى بالتنسيق المسبق:', w)
        s = rep(s, 'مع ربط كل عضو بفرعه وملفاته', 'مع ربط كل عضو بملفاته', w)
        s = rep(s, "'كل الفروع'", "'كل المواقع'", w)
        s = rep(s, '>الفرع<', '>موقع الخدمة<', w)
        s = rep(s, 'فرع {{', 'موقع الخدمة: {{', w)
        s = rep(s, 'فرع ${', 'موقع الخدمة: ${', w)
        s = rep(s, "/litigation|labor|personal|enforcement|realestate|arbitration|defense/",
                "/litigation|employment-hr|personal-status|enforcement|real-estate|arbitration-mediation|business-crimes-defense|estates-inheritance/", w)
        # Public site ↔ internal system: one-way intake only. No script from the internal system on the public
        # site, and no link to the partners' console (it is reachable from the firm's private network only).
        a = s.index('o.embed = `'); b = s.index('`;', a) + 2
        s = s[:a] + ('o.embed = `<!-- نموذج طلب الخدمة في mgrp.sa: نموذج ثابت يُرسل إلى خادم الاستقبال فقط (باتجاه واحد، موقَّع ومشفّر) -->\\n'
                     '<form method="post" action="/api/intake"> … الاسم، وسيلة التواصل، الخدمة (49)، اسم الطرف الآخر، الموافقة … </form>\\n'
                     '<!-- لا يُضاف إلى الموقع العام أي سكربت أو رابط من النظام الداخلي -->`;') + s[b:]
        log.append((w, 'embed snippet → one-way intake form', 1))
        s = rep(s, 'وتُفتح واجهة الشركاء من رابط «دخول الشركاء» في الموقع.', 'ولا يظهر في الموقع العام أي رابط لواجهة الشركاء؛ فهي متاحة من شبكة الشركة الداخلية فقط.', w)
        s = rep(s, 'https://meet.google.com/mgr-', 'https://meet.mgrp.sa/mgr-', w)
        s = rep(s, "r.service === 'contracts'", "r.service === 'commercial-contracts'", w)
        s = rep(s, "service: 'contracts', value:", "service: 'commercial-contracts', value:", w)
    wr(p, s)


if __name__ == '__main__':
    fix_fonts(APP); fix_fonts(CON)
    fix_data(os.path.join(APP, 'assets', DATA), 'MG_DATA(app)')
    fix_data(os.path.join(CON, 'assets', DATA_C), 'MG_DATA(console)')
    fix_console_data(os.path.join(CON, 'assets', CONS))
    fix_template(APP, 'app'); fix_template(CON, 'console')
    for l in log:
        print(*l, sep=' | ')
