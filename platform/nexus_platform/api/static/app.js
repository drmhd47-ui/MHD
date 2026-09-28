"use strict";
// All server data is inserted with textContent (never innerHTML) — legal texts are untrusted input.

const $ = (id) => document.getElementById(id);

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

// replaceChildren() does not flatten arrays and would print "null"; always go through fill().
function fill(node, ...children) {
  node.replaceChildren(...children.flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false));
}

const STATUS = { in_force: "نافذ", amended: "معدَّل", repealed: "ملغى", historical: "مرجع تاريخي — غير نافذ", unknown: "حالة النفاذ غير محددة" };
const ACCESS = { public_web: "منشور — جلب آلي", requires_agreement: "يحتاج اتفاقية", manual_only: "رفع ملفات", not_public: "غير منشور" };

async function api(path, opts = {}) {
  const res = await fetch(path, { headers: { "Content-Type": "application/json", ...(opts.headers || {}) }, ...opts });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || res.statusText);
  return res.json();
}

function sourceLink(url) {
  return url ? el("a", { href: url, target: "_blank", rel: "noopener noreferrer" }, "المصدر الرسمي") : el("span", { class: "meta" }, "(مستورد من ملف)");
}

function statusBadge(s) { return el("span", { class: `badge ${s}` }, STATUS[s] || s); }

// ---- tabs
document.querySelectorAll("nav button").forEach((b) => b.addEventListener("click", () => {
  document.querySelectorAll("nav button").forEach((x) => x.classList.toggle("active", x === b));
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.id === `tab-${b.dataset.tab}`));
  if (b.dataset.tab === "sources") loadSources();
}));

api("/api/stats").then((s) => {
  $("stats").textContent = `نصوص معتمدة: ${s.approved_documents} وثيقة، ${s.approved_provisions} مادة — بانتظار المراجعة: ${s.pending_versions}`;
}).catch(() => {});

// ---- assistant
$("ask-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const out = $("answer");
  fill(out, el("p", { class: "meta" }, "جارٍ البحث في النصوص المعتمدة…"));
  try {
    const a = await api("/api/assistant/ask", { method: "POST", body: JSON.stringify({ question: $("question").value, consent_for_review: $("consent").checked }) });
    fill(out,
      a.urgent_notice ? el("div", { class: "notice" }, a.urgent_notice) : null,
      el("div", { class: "card" }, el("div", { class: "answer-text" }, a.answer)),
      a.offer_lawyer ? el("div", { class: "notice" }, "ننصحك بالتحدث مع محامٍ مختص" + (a.suggested_specialty ? ` (${a.suggested_specialty})` : "") + ". ربط المحامين متاح في المرحلة الثانية من المنصة.") : null,
      a.citations.length ? el("h3", {}, "النصوص التي بُنيت عليها الإجابة") : null,
      a.citations.map((c) => el("div", { class: "card" },
        el("h3", {}, `${c.label} — ${c.document_title}`, statusBadge(c.legal_status)),
        el("div", { class: "provision" }, c.excerpt),
        el("div", { class: "meta row" }, sourceLink(c.source_url), c.reviewed_at ? `اعتُمد: ${c.reviewed_at.slice(0, 10)}` : ""))),
      el("p", { class: "disclaimer" }, a.disclaimer),
    );
  } catch (err) { fill(out, el("div", { class: "notice" }, `تعذّر الإرسال: ${err.message}`)); }
});

// ---- search
$("search-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  fill($("document"));
  const q = encodeURIComponent($("q").value);
  const hits = await api(`/api/search?q=${q}&include_historical=${$("historical").checked}`);
  fill($("results"),
    hits.length ? null : el("p", {}, "لا نتائج في النصوص المعتمدة."),
    hits.map((h) => el("div", { class: "card" },
      el("h3", {}, `${h.label} — `, el("a", { href: "#", onclick: (ev) => { ev.preventDefault(); openDocument(h.document_id); } }, h.doc_title), statusBadge(h.legal_status)),
      el("div", { class: "provision" }, h.text.length > 700 ? h.text.slice(0, 700) + " …" : h.text),
      el("div", { class: "meta row" }, sourceLink(h.source_url), h.instrument || ""))),
  );
});

async function openDocument(id) {
  const d = await api(`/api/documents/${id}`);
  fill($("document"), el("div", { class: "card" },
    el("h3", {}, d.title, statusBadge(d.legal_status)),
    el("div", { class: "meta row" }, d.instrument || "", sourceLink(d.source_url), `الإصدار ${d.version_no}، اعتمده ${d.reviewed_by} في ${String(d.reviewed_at).slice(0, 10)}`),
    d.provisions.map((p) => el("div", {}, el("strong", {}, p.label), el("div", { class: "provision" }, p.text)))));
  $("document").scrollIntoView({ behavior: "smooth" });
}

// ---- sources
async function loadSources() {
  const rows = await api("/api/sources");
  fill($("sources"), el("table", {},
    el("tr", {}, el("th", {}, "المصدر"), el("th", {}, "طريقة الاستيراد"), el("th", {}, "الحالة"), el("th", {}, "آخر تشغيل")),
    rows.map((s) => el("tr", {},
      el("td", {}, s.name_ar, el("div", { class: "meta" }, s.notes || "")),
      el("td", {}, ACCESS[s.access] || s.access),
      el("td", {}, s.connector === "crawler" ? `${s.enabled ? "مفعّل" : "معطّل"}${s.calibrated ? "" : " — بانتظار المعايرة"}` : "استيراد ملفات"),
      el("td", {}, s.last_run_status || "—")))));
}

// ---- review
let token = "";
const auth = () => ({ Authorization: `Bearer ${token}` });

$("token-form").addEventListener("submit", (e) => { e.preventDefault(); token = $("token").value; loadQueue(); });

async function loadQueue() {
  try {
    const rows = await api("/api/review/queue", { headers: auth() });
    fill($("version"));
    fill($("queue"),
      rows.length ? null : el("p", {}, "لا توجد نسخ بانتظار المراجعة."),
      rows.map((r) => el("div", { class: "card" },
        el("h3", {}, el("a", { href: "#", onclick: (ev) => { ev.preventDefault(); openVersion(r.version_id); } }, r.title), ` (الإصدار ${r.version_no})`),
        el("div", { class: "meta" }, `[${r.source_id}] ${r.doc_type} — ${r.provision_count} جزء`),
        r.parse_warnings.length ? el("div", { class: "notice" }, "تنبيهات التحليل: " + r.parse_warnings.join("، ")) : null)));
  } catch (err) { fill($("queue"), el("div", { class: "notice" }, err.message)); }
}

async function openVersion(id) {
  const v = await api(`/api/review/versions/${id}`, { headers: auth() });
  const note = el("input", { type: "text", placeholder: "ملاحظة (إلزامية عند الرفض)" });
  const status = el("select", {}, el("option", { value: "" }, "حالة النفاذ: بلا تغيير"),
    Object.entries(STATUS).map(([k, t]) => el("option", { value: k }, t)));
  const decide = async (approve) => {
    try {
      await api(`/api/review/versions/${id}`, { method: "POST", headers: auth(), body: JSON.stringify({ approve, note: note.value || null, legal_status: status.value || null }) });
      loadQueue();
    } catch (err) { alert(err.message); }
  };
  const prev = new Map(v.previous_provisions.map((p) => [p.label, p.text]));
  fill($("version"), el("div", { class: "card" },
    el("h3", {}, v.title), el("div", { class: "meta row" }, v.instrument || "", sourceLink(v.source_url)),
    v.parse_warnings.length ? el("div", { class: "notice" }, "تنبيهات التحليل: " + v.parse_warnings.join("، ")) : null,
    el("p", { class: "meta" }, "قارن كل مادة بالمصدر الرسمي قبل الاعتماد. المواد المتغيرة عن النسخة المعتمدة معلَّمة."),
    v.provisions.map((p) => {
      const old = prev.get(p.label);
      const changed = v.previous_provisions.length && old !== p.text;
      return el("div", { class: changed ? "notice" : "" },
        el("strong", {}, p.label, changed ? (old === undefined ? " — جديدة" : " — تغيّر نصها") : ""),
        changed && old !== undefined ? el("div", { class: "cols" }, el("div", { class: "provision" }, "قبل: " + old), el("div", { class: "provision" }, "بعد: " + p.text)) : el("div", { class: "provision" }, p.text));
    }),
    el("div", { class: "row" }, note, status,
      el("button", { onclick: () => decide(true) }, "اعتماد"),
      el("button", { class: "danger", onclick: () => decide(false) }, "رفض"))));
  $("version").scrollIntoView({ behavior: "smooth" });
}
