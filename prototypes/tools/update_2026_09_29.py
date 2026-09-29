"""تحديث 29 سبتمبر 2026 على النموذجين المصحّحين (بقرار الإدارة):

1. الشركة غير مسجّلة في ضريبة القيمة المضافة (منشأة جديدة دون حد التسجيل): لا ضريبة ولا رقم ضريبي ولا رمز
   فاتورة ضريبية في واجهة الإدارة؛ النسبة تُقرأ من firm.vatRegistered بدل 15% الثابتة.
2. الفريق الفعلي: الدكتور محمد العنزي (الشريك الإداري)، والمستشار محمد سعد (الشريك الاستشاري القانوني)،
   والمحامية ضي حمد آل شيبان. بقية الحسابات التجريبية تُوسم "(تجريبي)" حتى لا يُظن أنها أعضاء فعليون.
3. "مجموعة إم للمحاماة" ← "مجموعة إم القانونية" (الاسم المعتمد).

الاستخدام (من هذا المجلد):
    node unbundle.cjs ../M_Group_App.html app && node unbundle.cjs ../M_Group_Website_Console.html console
    python3 update_2026_09_29.py
    node rebundle.cjs ../M_Group_App.html app ../M_Group_App.html
    node rebundle.cjs ../M_Group_Website_Console.html console ../M_Group_Website_Console.html
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
log = []


def rd(p): return open(p, encoding='utf-8').read()
def wr(p, s): open(p, 'w', encoding='utf-8').write(s)


def rep(s, a, b, where, exact=None):
    n = s.count(a)
    assert n >= 1, f'{where}: missing {a[:70]!r}'
    if exact is not None:
        assert n == exact, f'{where}: expected {exact}, found {n} for {a[:70]!r}'
    log.append((where, a[:60], n))
    return s.replace(a, b)


def rep_opt(s, a, b, where):
    n = s.count(a)
    if n:
        log.append((where, a[:60], n))
    return s.replace(a, b)


def asset_by_prefix(d, prefix):
    man = json.load(open(os.path.join(d, 'manifest.json')))
    names = [l['name'] for l in man['list'] if open(os.path.join(d, 'assets', l['name']), 'rb').read(64).startswith(prefix.encode())]
    assert len(names) == 1, (d, prefix, names)
    return os.path.join(d, 'assets', names[0])


DEMO = [('عبدالله الزهراني', 'Abdullah Al-Zahrani'), ('نورة القحطاني', 'Noura Al-Qahtani'), ('ماجد العمري', 'Majed Al-Omari'),
        ('ريم الدوسري', 'Reem Al-Dosari'), ('لمى الشهري', 'Lama Al-Shehri')]


def roster(s, where):
    s = rep_opt(s, 'الدكتور محمد بن جمعان', 'الدكتور محمد العنزي', where)
    s = rep_opt(s, 'Dr. Mohammed bin Jumaan', 'Dr. Mohammed Al-Anazi', where)
    s = rep_opt(s, 'د. هند السبيعي', 'المستشار محمد سعد', where)
    s = rep_opt(s, 'Dr. Hind Al-Subaie', 'Counsel Mohammed Saad', where)
    s = rep_opt(s, "{id:'sara', initials:{ar:'س',en:'S'}, name:{ar:'سارة العتيبي',en:'Sara Al-Otaibi'}, role:{ar:'محامية أولى',en:'Senior Associate'}",
                "{id:'sara', initials:{ar:'ض',en:'D'}, name:{ar:'ضي حمد آل شيبان',en:'Dhai Hamad Al Shaiban'}, role:{ar:'محامية',en:'Lawyer'}", where)
    s = rep_opt(s, 'سارة العتيبي', 'ضي حمد آل شيبان', where)
    s = rep_opt(s, 'Sara Al-Otaibi', 'Dhai Hamad Al Shaiban', where)
    s = rep_opt(s, "demoStaff: 'سارة · محامية'", "demoStaff: 'ضي · محامية'", where)
    s = rep_opt(s, "demoStaff: 'Sara · Lawyer'", "demoStaff: 'Dhai · Lawyer'", where)
    # رقم الرخصة الوهمي يُحذف؛ يُدخل الرقم الفعلي في النظام الحقيقي.
    s = rep_opt(s, "'sara@mgrp.sa', '+966 55 210 4404', '1010000004', 'L-41207'", "'sara@mgrp.sa', '+966 55 210 4404', '1010000004', ''", where)
    s = rep_opt(s, "name: { ar: 'شريك استشاري', en: 'Consulting Partner' }", "name: { ar: 'الشريك الاستشاري القانوني', en: 'Legal Consulting Partner' }", where)
    for ar, en in DEMO:
        s = rep_opt(s, ar, ar + ' (تجريبي)', where)
        s = rep_opt(s, en, en + ' (demo)', where)
    s = rep_opt(s, 'مجموعة إم للمحاماة', 'مجموعة إم القانونية', where)
    return s


def console_vat(s, w):
    s = rep(s, '  zatcaQR(v) {\n', "  /** نسبة ضريبة القيمة المضافة: صفر ما دامت الشركة غير مسجّلة. */\n  vr() { return window.MG_CONSOLE.firm.vatRegistered ? 0.15 : 0; }\n  zatcaQR(v) {\n    if (!window.MG_CONSOLE.firm.vatRegistered) return '';\n", w, exact=1)
    s = rep(s, "rq.qTotals = amt ? `المبلغ ${this.sar(amt)} + ضريبة 15% ${this.sar(amt * 0.15)} = ${this.sar(amt * 1.15)} · صلاحية العرض 30 يومًا` : 'أدخل مبلغ الأتعاب';",
            "rq.qTotals = amt ? (this.vr() ? `المبلغ ${this.sar(amt)} + ضريبة ${this.vr() * 100}% ${this.sar(amt * this.vr())} = ${this.sar(amt * (1 + this.vr()))}` : `المبلغ ${this.sar(amt)} — الشركة غير مسجّلة في ضريبة القيمة المضافة`) + ' · صلاحية العرض 30 يومًا' : 'أدخل مبلغ الأتعاب';", w, exact=1)
    s = rep(s, " + الضريبة = ${this.sar(q.amount * 1.15)}", "${this.vr() ? ' + الضريبة = ' + this.sar(q.amount * (1 + this.vr())) : ''}", w, exact=1)
    s = rep(s, "title: v.type === 'tax' ? 'فاتورة ضريبية' : 'فاتورة ضريبية مبسطة', no: v.no, vatNo: window.MG_CONSOLE.firm.vat,",
            "title: !window.MG_CONSOLE.firm.vatRegistered ? 'فاتورة' : v.type === 'tax' ? 'فاتورة ضريبية' : 'فاتورة ضريبية مبسطة', no: v.no, vatNo: window.MG_CONSOLE.firm.vatRegistered ? window.MG_CONSOLE.firm.vat : 'غير مسجّلة في ضريبة القيمة المضافة',", w, exact=1)
    s = rep(s, "this.opts([['tax', 'فاتورة ضريبية (منشآت)'], ['simplified', 'فاتورة مبسطة (أفراد)']], F.invType || 'tax'",
            "this.opts(window.MG_CONSOLE.firm.vatRegistered ? [['tax', 'فاتورة ضريبية (منشآت)'], ['simplified', 'فاتورة مبسطة (أفراد)']] : [['tax', 'فاتورة (الشركة غير مسجّلة في ضريبة القيمة المضافة)']], F.invType || 'tax'", w, exact=1)
    s = rep(s, '* 1.15', '* (1 + this.vr())', w)
    s = rep(s, '* 0.15', '* this.vr()', w)
    s = rep(s, '<span>ضريبة القيمة المضافة 15%</span>', '<span>ضريبة القيمة المضافة</span>', w, exact=1)
    s = rep(s, "sub: 'شاملة ضريبة القيمة المضافة'", "sub: 'إجمالي المستحق'", w, exact=1)
    # الفوترة الإلكترونية (زاتكا) تخص المسجَّلين في الضريبة: لا "اعتماد" ولا "إرسال لزاتكا" قبل التسجيل.
    s = rep(s, 'فواتير ضريبية ومبسطة متوافقة مع متطلبات الفوترة الإلكترونية، برمز QR ورقم ضريبي، وروابط دفع إلكتروني وتذكير آلي بالمتأخرات.',
            'الفواتير وروابط الدفع الإلكتروني والتذكير بالمتأخرات. الشركة غير مسجّلة حالياً في ضريبة القيمة المضافة، فتصدر الفواتير بلا ضريبة ولا رقم ضريبي؛ وعند التسجيل تُفعَّل الفواتير الضريبية وربط الفوترة الإلكترونية.', w, exact=1)
    s = rep(s, "type: v.type === 'tax' ? 'ضريبية' : 'مبسطة',", "type: !window.MG_CONSOLE.firm.vatRegistered ? 'فاتورة' : v.type === 'tax' ? 'ضريبية' : 'مبسطة',", w, exact=1)
    s = rep(s, "zatca: v.zatca === 'cleared' ?", "zatca: !window.MG_CONSOLE.firm.vatRegistered ? 'لا تنطبق' : v.zatca === 'cleared' ?", w, exact=1)
    s = rep(s, "zPill: this.pill(v.zatca === 'pending' ? 'gold' : 'navy')", "zPill: this.pill(!window.MG_CONSOLE.firm.vatRegistered ? 'gray' : v.zatca === 'pending' ? 'gold' : 'navy')", w, exact=1)
    s = rep(s, '<div>زاتكا</div>', '<div>الفوترة الإلكترونية</div>', w, exact=1)
    s = rep(s, 'إصدار الفاتورة الأولى (50%) وإرسالها لزاتكا', 'إصدار الفاتورة الأولى (50%)', w, exact=1)
    s = rep(s, 'إصدار وإرسال لزاتكا', 'إصدار الفاتورة', w, exact=1)
    s = rep(s, ' وإرسالها لزاتكا`', '`', w, exact=1)
    s = rep(s, ' واعتُمدت من زاتكا وأُرسلت للعميل مع رابط الدفع', ' وأُرسلت للعميل مع رابط الدفع', w, exact=1)
    s = rep(s, ' واعتُمدت من زاتكا', '', w, exact=1)
    return s


if __name__ == '__main__':
    app, con = os.path.join(HERE, 'app'), os.path.join(HERE, 'console')
    for d, name in ((app, 'app'), (con, 'console')):
        p = os.path.join(d, 'template.html')
        s = roster(rd(p), name + '/template')
        if name == 'console':
            s = console_vat(s, 'console/template')
        wr(p, s)
        p = asset_by_prefix(d, 'window.MG_DATA')
        wr(p, roster(rd(p), name + '/MG_DATA'))
    p = asset_by_prefix(con, 'window.MG_CONSOLE')
    s = rd(p)
    s = rep(s, "vat: '3150535051'", "vat: '', vatRegistered: false", 'MG_CONSOLE', exact=1)
    s = rep(s, "{ key: 'zatca', name: 'زاتكا — فاتورة', desc: 'إصدار واعتماد الفواتير الإلكترونية للمرحلة الثانية', on: true }",
            "{ key: 'zatca', name: 'زاتكا — فاتورة', desc: 'الفوترة الإلكترونية — تُفعَّل بعد التسجيل في ضريبة القيمة المضافة', on: false }", 'MG_CONSOLE', exact=1)
    wr(p, roster(s, 'MG_CONSOLE'))
    for l in log:
        print(*l, sep=' | ')
