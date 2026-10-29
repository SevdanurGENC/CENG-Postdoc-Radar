// İnternete çıkmadan botu dener: siteleri sahte HTML ile taklit eder.  npm test
import assert from "node:assert/strict";
import { configure, scan, prune, repair, daysLeft, todayISO } from "./scanner.mjs";
import { buildDigest, sendTelegram } from "./telegram.mjs";

const pages = [
  [/academicpositions\.com\/jobs\/position\/post-doc\/field\/machine-learning/, `<ul>
    <li><article><a href="/ad/ku-leuven/2026/postdoc-in-quantum-machine-learning/999001">Postdoc in Quantum Machine Learning for Drug Discovery</a><div>KU Leuven</div><div>Leuven, Belgium</div><div>Closing in 10 days</div></article></li>
    <li><article><a href="/ad/tu-delft/2026/phd-position-in-ml/999003">PhD position in machine learning</a><div>TU Delft</div><div>Delft, Netherlands</div></article></li>
    <li><article><a href="/ad/kaust/2026/postdoc-ml/999005">Postdoctoral Fellow in Machine Learning</a><div>KAUST</div><div>Thuwal, Saudi Arabia</div></article></li>
    <li><article><a href="/ad/kth/2026/postdoc-test-automation/999006">Postdoc in AI for Software Testing and Test Automation</a><div>KTH Royal Institute of Technology</div><div>Stockholm, Sweden</div><div>Closing in 30 days</div></article></li></ul>`],
  [/naturecareers\/jobs\/postdoctoral\/united-states\/\?keywords=machine/, `<ul><li><a href="/naturecareers/job/12862383/postdoc-neuro/">Postdoctoral Associate in Systems Neuroscience and Neural Decoding</a><p>University of Pittsburgh</p><p>Pittsburgh, Pennsylvania</p><p>Closing date: 12/01/2030</p></li></ul>`],
  [/999001/, `<html><body><h1>x</h1><p>Leuven, Belgium.</p><p>Requirements: Python, Qiskit and PyTorch.</p><p>Contact: prof.x@kuleuven.be</p></body></html>`],
  [/999006/, `<html><body><p>We use Python and Selenium. Application deadline: 15 December 2030</p></body></html>`],
  [/quantum-software-copenhagen/, `<html><body><p>Rust and C++ experience welcome.</p></body></html>`],
  [/12862383/, `<html><body><p>Pittsburgh, Pennsylvania. MATLAB or Python.</p></body></html>`],
  [/naturecareers\/jobs\/postdoctoral\/united-states\/\?keywords=bioinformatics/, `<ul>
    <li><a href="/naturecareers/job/1/postdoc-biostat/">Postdoctoral Research Associate - Biostatistics and Machine Learning</a><p>St. Jude Children&#39;s Research Hospital</p><p>Memphis, Tennessee</p></li>
    <li><a href="/naturecareers/job/2/postdoc-genomics/">Postdoc Position for Computational Genomics and AI Precision Oncology</a><p>Competitive salary commensurate with experience (minimum per NIH/NRSA guidelines)</p><p>Bronx, New York</p></li>
    <li><a href="/naturecareers/job/3/postdoctoral-fellow/">Postdoctoral Fellow</a><p>Univ. Alabama, Birmingham</p><p>Bioinformatics and multi-omics of the immune system</p></li></ul>`],
  [/bernstein-network\.de\/en\/karriere\/stellenangebote/, `<div><a href="/en/bernstein-conference/early-career-scientists/postdoc-meeting/">Postdoc Meeting</a></div>
    <div><a href="/en/network/awards/brains-for-brains/">Brains for Brains Young Researcher Award for postdocs</a></div>
    <div><a href="/wp-content/uploads/2026/10/Stellenangebot_Postdoc_NeuroAI.pdf">Postdoc position in NeuroAI and neural coding</a> Tübingen, Germany</div>`],
  [/quantiki\.org\/job-type\/postdoc/, `<div class="views-row"><a href="/position/postdoc-quantum-software-copenhagen">Postdoc in quantum software and compilers</a><span>Deadline: Sunday, November 29, 2030</span><span>University of Copenhagen, Copenhagen, Denmark</span></div>
    <div class="views-row"><a href="/position/postdoc-qml-cnrs">Postdoc in quantum machine learning at CNRS</a><span>Deadline: 20 November 2030</span></div>`],
  [/old-seed-job/, `<html><body><p>Skills: Julia and Python.</p></body></html>`]
];
let calls = 0, telegramPayload = null;
globalThis.fetch = async (url, init={}) => {
  calls++;
  if(String(url).startsWith("https://api.telegram.org/")){
    telegramPayload = JSON.parse(init.body);
    return new Response(JSON.stringify({ok:true, result:{}}), {status:200});
  }
  for(const [re, body] of pages) if(re.test(url)) return new Response(body, {status:200, headers:{"content-type":"text/html"}});
  return new Response("not found", {status:404});
};

configure({});
const jobs = {
  "old-seed-job": {id:"old-seed-job", title:"Postdoc in bioinformatics", url:"https://example.org/old-seed-job", topic:"Biyo", relevance:3, foundAt:todayISO()},
  "expired": {id:"expired", title:"Old postdoc", url:"https://example.org/x", deadline:"2025-01-01", foundAt:"2025-01-01", relevance:1}
};
const {fresh, stats} = await scan(jobs);
const by = t => fresh.find(j=>j.title.includes(t));

assert.ok(by("Quantum Machine Learning"), "KU Leuven ilanı bulunmalı");
assert.equal(by("Quantum Machine Learning").country, "Belçika");
assert.equal(by("Quantum Machine Learning").topic, "Kuantum");
assert.equal(by("Quantum Machine Learning").relevance, 3);
assert.deepEqual(by("Quantum Machine Learning").emails, ["prof.x@kuleuven.be"]);
assert.ok(by("Quantum Machine Learning").langs.includes("Qiskit"));
assert.ok(!fresh.some(j=>/PhD position/.test(j.title)), "doktora ilanı elenmeli");
assert.ok(!fresh.some(j=>/KAUST|Saudi/.test(j.institution+j.title) && j.country==="_non"), "Avrupa/ABD dışı elenmeli");
assert.ok(!fresh.some(j=>j.url.includes("999005")), "Suudi Arabistan ilanı eklenmemeli");
assert.equal(by("Test Automation").topic, "Yazılım");
assert.ok(by("Test Automation").deadline, "son tarih bulunmalı");
assert.ok(by("Test Automation").langs.includes("Selenium"));
assert.equal(by("quantum software").deadline, "2030-11-29");
assert.equal(by("Neural Decoding").country, "ABD");
assert.equal(by("Neural Decoding").deadline, "2030-12-01", "ABD tarihi ay/gün/yıl okunmalı");
assert.ok(jobs["old-seed-job"].langsChecked && jobs["old-seed-job"].langs.includes("Julia"), "eski ilanın dili geri doldurulmalı");
assert.equal(prune(jobs), 1, "süresi çoktan geçmiş ilan silinmeli");
assert.ok(!jobs.expired);

// düzeltmeler
assert.equal(by("Biostatistics and Machine Learning").institution, "St. Jude Children's Research Hospital", "kesme işareti metni bölmemeli");
assert.equal(by("Computational Genomics").institution, "", "maaş cümlesi kurum sayılmamalı");
assert.equal(by("Postdoctoral Fellow")?.country ?? "ABD", "ABD", "Birmingham, Alabama ABD olmalı");
assert.ok(!fresh.some(j=>/Postdoc Meeting|Award/.test(j.title)), "toplantı/ödül duyurusu ilan sayılmamalı");
assert.ok(by("NeuroAI and neural coding"), "Bernstein PDF ilanı alınmalı");
assert.equal(by("at CNRS").institution, "CNRS", "kurum başlıktan çıkarılmalı");
const fel = fresh.find(j=>j.title==="Postdoctoral Fellow"); if(fel) assert.equal(fel.relevance <= 2, true, "başlıkta alan kelimesi yoksa ★★★ verilmemeli");
// eski hatalı kayıtların onarımı
const old = {
  a:{title:"Postdoctoral Research Associate - Radiology", institution:"s Research Hospital", country:"ABD", relevance:2, langsChecked:true},
  b:{title:"Postdoctoral Fellow", institution:"Univ. Alabama, Birmingham", country:"Birleşik Krallık", relevance:3},
  c:{title:"Postdoc Meeting", institution:"Bernstein Network", country:"Almanya", relevance:3},
  d:{title:"Postdoctoral contract at Instituto de Neurociencias (Alicante, Spain) - up to 2 years", institution:"Postdoctoral contract at Instituto de Neurociencias (Alicante, Spain)", country:"İspanya", relevance:2},
  e:{title:"Computational Postdoctoral Position: Uncovering the Mathematics of Predictive Pursuit", institution:"by jonathan.whitlock＠ntnu.no", country:"Norveç", relevance:3},
  f:{title:"Postdoctoral Fellow in Blood Cancer Genetics and Genomics", institution:"Albert Einstein College of Medicine (Bronx", country:"ABD", relevance:3}
};
const r = repair(old);
assert.equal(r.removed, 1); assert.ok(!old.c);
assert.equal(old.a.institution, ""); assert.equal(old.a.langsChecked, false);
assert.equal(old.b.country, "ABD"); assert.equal(old.b.relevance, 2);
assert.equal(old.d.institution, "Instituto de Neurociencias");
assert.equal(old.e.institution, "");
assert.equal(old.f.institution, "Albert Einstein College of Medicine"); assert.equal(old.f.relevance, 3);

const {text} = buildDigest(fresh, {minStars:2, maxItems:10, pagesUrl:"https://kullanici.github.io/postdoc-radar/", daysLeft});
assert.ok(text.includes("★★★") && text.includes("Tüm ilanları aç") && text.length < 4096);
process.env.TELEGRAM_BOT_TOKEN = "TEST"; process.env.TELEGRAM_CHAT_ID = "1";
await sendTelegram(text);
assert.equal(telegramPayload.parse_mode, "HTML");
assert.equal(telegramPayload.chat_id, "1");

console.log(`Tüm testler geçti. ${stats.pages} istek planlandı, ${calls} sahte istek yapıldı, ${fresh.length} yeni ilan bulundu.`);
console.log("\n--- Telegram mesajı önizlemesi ---\n" + text.replace(/<[^>]+>/g, ""));
