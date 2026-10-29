"""Generates bot/scanner.mjs from the parsing/classification code in app.template.html.
Usage: python3 gen_scanner.py <app.template.html> <out scanner.mjs>"""
import sys, re

src, dst = sys.argv[1], sys.argv[2]
text = open(src, encoding="utf-8").read()
script = text.split("<script>", 1)[1].split("</script>", 1)[0]


def between(start_marker, end_marker):
    a = script.index(start_marker)
    b = script.index(end_marker, a)
    return script[a:b]


# constants: TOPIC_LABEL .. SOURCES, plus DEFAULT_SETTINGS
consts = between("const TOPIC_LABEL", "const DEFAULT_PROFILE")
dset = between("const DEFAULT_SETTINGS", "\n") + "\n"
core = between("/* ---------- helpers ---------- */", "let scanning = false;")

out = []
skip_block = False
for ln in core.split("\n"):
    if ln.startswith("function openExternal("):
        skip_block = True
        continue
    if skip_block:
        if ln.startswith("}"):
            skip_block = False
        continue
    if ln.startswith(("const $ = ", "function toast(", "function addLog(", "function fmtDate(")):
        continue
    out.append(ln)
core = "\n".join(out)

HTTP = r'''async function httpGet(url, ms){
  const ctl = new AbortController(); const t = setTimeout(()=>ctl.abort(), ms||25000);
  try{
    const r = await fetch(url, {signal:ctl.signal, redirect:"follow", headers:{"User-Agent":UA, "Accept":"text/html,application/xhtml+xml,*/*;q=0.8", "Accept-Language":"en-US,en;q=0.8"}});
    if(!r.ok) return null; return await r.text();
  }catch(e){ return null; } finally{ clearTimeout(t); }
}
'''
WALK = r'''function textChunks(el){
  // komşu metin düğümlerini birleştir: linkedom "Children&#39;s" gibi yerlerde metni böler
  const out=[];
  (function walk(n){ let buf="";
    const flush=()=>{ const t=buf.replace(/\s+/g," ").trim(); if(t.length>1) out.push(t); buf=""; };
    for(const c of n.childNodes||[]){
      if(c.nodeType===3){ buf+=String(c.nodeValue||""); }
      else if(c.nodeType===1){ flush(); const tg=(c.tagName||"").toLowerCase(); if(tg!=="script"&&tg!=="style"&&tg!=="noscript") walk(c); }
    }
    flush(); })(el);
  return out;
}
'''
core = re.sub(r"function httpGet\(url, ms\)\{.*?\n\}\n", lambda m: HTTP, core, flags=re.S)
core = re.sub(r"function textChunks\(el\)\{.*?\n\}\n", lambda m: WALK, core, flags=re.S)
for bad in ("XMLHttpRequest", "createTreeWalker", "$(", "HAS_NATIVE", "Android.", "window."):
    assert bad not in core, "browser code left: " + bad

HEADER = '''// Postdoc Radarı — tarama çekirdeği (Node.js). OTOMATİK ÜRETİLDİ: elle düzenleme.
// Kaynak: web/app.template.html (Android ve web uygulamasıyla aynı ayrıştırma/sınıflandırma kodu).
// Yeniden üretmek için: python3 tools/gen_scanner.py web/app.template.html bot/scanner.mjs
import { DOMParser } from "linkedom";
export const UA = "Mozilla/5.0 (compatible; PostdocRadarBot/1.0)";
let settings = null;
'''
FOOTER = r'''
/* ---------- bot tarama döngüsü (uygulamadaki runScan'in arayüzsüz hâli) ---------- */
export function configure(cfg){
  const kw = Object.assign({}, DEFAULT_KW, cfg.keywords||{});
  for(const k in kw){ if(Array.isArray(kw[k])) kw[k]=kw[k].join(", "); }
  settings = Object.assign({}, DEFAULT_SETTINGS, {
    kw,
    search: Array.isArray(cfg.search) ? cfg.search.join("\n") : (cfg.search||DEFAULT_SEARCH),
    exclude: Array.isArray(cfg.exclude) ? cfg.exclude.join(", ") : (cfg.exclude||DEFAULT_EXCLUDE),
    langs: Array.isArray(cfg.languages) ? cfg.languages.join(", ") : (cfg.languages||DEFAULT_LANGS),
    sources: Object.assign({}, DEFAULT_SETTINGS.sources, cfg.sources||{}),
    regions: Object.assign({eu:true, na:true}, cfg.regions||{})
  });
  return settings;
}
// eski kayıtları yeni kurallarla onar: duyuruları sil, kurum/ülke/yıldızı düzelt
export function repair(jobs){
  let fixed=0, removed=0;
  for(const [id,j] of Object.entries(jobs)){
    if(isNonJob(j.title)){ delete jobs[id]; removed++; continue; }
    const before=JSON.stringify([j.institution||"",j.country||"",j.relevance]);
    const raw=String(j.institution||"");
    let inst=cleanInstitution(raw, j.title) || institutionFromTitle(j.title);
    if(raw && !inst) j.langsChecked=false;   // sayfayı yeniden okuyup kurumu bulmayı dene
    j.institution=inst;
    const c=detectCountry(inst); if(c && c!=="_non" && j.country && c!==j.country) j.country=c;
    if((j.relevance||0)===3 && !titleHasKeyword(j.title)) j.relevance=2;
    if(before!==JSON.stringify([j.institution||"",j.country||"",j.relevance])) fixed++;
  }
  return {fixed, removed};
}
export async function scan(jobs, opts={}){
  const started = Date.now(); const reqs = buildRequests();
  const rep = repair(jobs); if(rep.fixed||rep.removed) console.log(`Onarım: ${rep.fixed} kayıt düzeltildi, ${rep.removed} duyuru silindi`);
  let ok=0, fail=0; const failed=[]; const candidates=[];
  const pages = await pool(reqs, opts.concurrency||4, async r => { const h = await httpGet(r.url, 25000); if(h){ ok++; return {r, h}; } fail++; failed.push(r.src); return null; });
  for(const p of pages){
    if(!p) continue;
    let items=[]; try{ items = extractFromListing(p.h, p.r); }catch(e){}
    for(const f of items){
      const id = slugId(f.href);
      if(jobs[id] || candidates.some(c=>c.id===id)) continue;
      const postdocish = POSTDOC_RE.test(f.title) || (p.r.src==="Quantiki") || (p.r.src==="Bernstein Network" && /post-?doc|postdoctoral/i.test(f.title+" "+f.cardText));
      if(!postdocish || isNonJob(f.title)) continue;
      const cls = classify(f.title, f.cardText) || (p.r.topic ? {topic:p.r.topic, relevance: p.r.topic==="Nöro"?2:1, matched:[]} : null);
      if(!cls) continue;
      if(p.r.topic && cls.topic==="ML") cls.topic = p.r.topic;
      const closing = f.cardText.match(/(closing|closes)[^·]{0,40}/i);
      candidates.push({ id, title:f.title, url:f.href, source:p.r.src,
        institution: guessInstitution(f, p.r), country: p.r.country || detectCountry(f.cardText) || "",
        deadline: findDeadline(f.cardText, p.r.mdy) || parseDateFrom(closing ? closing[0] : "") || null,
        topic:cls.topic, relevance:cls.relevance, matched:cls.matched, langs:cls.langs||[], foundAt:todayISO(), mdy:!!p.r.mdy });
    }
  }
  candidates.sort((a,b)=>b.relevance-a.relevance);
  await pool(candidates.slice(0, opts.enrichLimit||60), 4, async c => { await enrich(c); const re = classify(c.title, (c.desc||"").slice(0,3000)); if(re){ if(re.relevance>c.relevance) c.relevance=re.relevance; if(c.topic==="ML" && re.topic!=="ML") c.topic=re.topic; c.matched = re.matched.length?re.matched:c.matched; c.langs = Array.from(new Set((c.langs||[]).concat(re.langs||[]))); } });
  const backlog = Object.values(jobs).filter(j=>!j.langsChecked && (daysLeft(j.deadline)===null || daysLeft(j.deadline)>=0)).slice(0, opts.backlogLimit||40);
  await pool(backlog, 4, async j => { await enrich(j); delete j.desc; }); // enrich() sayfa açılırsa langsChecked=true yapar
  const fresh=[];
  for(const c of candidates){
    if(c.country==="_non") continue;
    const na = c.country==="ABD" || c.country==="Kanada";
    if(na && !settings.regions.na) continue;
    if(!na && c.country && !settings.regions.eu) continue;
    const dl = daysLeft(c.deadline); if(dl!==null && dl<0) continue;
    c.note = c.matched && c.matched.length ? "Eşleşen: "+c.matched.slice(0,4).join(", ") : "";
    delete c.chunks; delete c.mdy; delete c.desc;
    jobs[c.id]=c; fresh.push(c);
  }
  return { fresh, stats:{ pages:reqs.length, ok, fail, failedSources:[...new Set(failed)], candidates:candidates.length, added:fresh.length, backfilled:backlog.filter(j=>j.langsChecked).length, seconds:Math.round((Date.now()-started)/1000) } };
}
// süresi çoktan geçmiş ilanları dosyadan temizle
export function prune(jobs, keepDaysAfterDeadline=14, keepDaysNoDeadline=120){
  let removed=0;
  for(const [id,j] of Object.entries(jobs)){
    const d = daysLeft(j.deadline);
    const age = j.foundAt ? Math.round((startOfDay()-new Date(j.foundAt+"T00:00:00"))/86400000) : 0;
    if((d!==null && d < -keepDaysAfterDeadline) || (d===null && age > keepDaysNoDeadline)){ delete jobs[id]; removed++; }
  }
  return removed;
}
export { cleanInstitution, institutionFromTitle, isNonJob, titleHasKeyword, TOPIC_LABEL, DEFAULT_SETTINGS, DEFAULT_KW, DEFAULT_SEARCH, DEFAULT_EXCLUDE, DEFAULT_LANGS, SOURCES, classify, detectLangs, findDeadline, parseDateFrom, detectCountry, extractFromListing, buildRequests, daysLeft, todayISO, pad };
'''
open(dst, "w", encoding="utf-8").write(HEADER + consts + dset + "\n" + core + FOOTER)
print("yazildi:", dst)
