// İnternete çıkmadan botu dener: siteleri sahte HTML ile taklit eder.  npm test
import assert from "node:assert/strict";
import { configure, scan, prune, daysLeft, todayISO } from "./scanner.mjs";
import { buildDigest, sendTelegram } from "./telegram.mjs";

const pages = [
  [/academicpositions\.com\/jobs\/position\/post-doc\/field\/machine-learning/, `<ul>
    <li><article><a href="/ad/ku-leuven/2026/postdoc-in-quantum-machine-learning/999001">Postdoc in Quantum Machine Learning for Drug Discovery</a><div>KU Leuven</div><div>Leuven, Belgium</div><div>Closing in 10 days</div></article></li>
    <li><article><a href="/ad/tu-delft/2026/phd-position-in-ml/999003">PhD position in machine learning</a><div>TU Delft</div><div>Delft, Netherlands</div></article></li>
    <li><article><a href="/ad/kaust/2026/postdoc-ml/999005">Postdoctoral Fellow in Machine Learning</a><div>KAUST</div><div>Thuwal, Saudi Arabia</div></article></li>
    <li><article><a href="/ad/kth/2026/postdoc-test-automation/999006">Postdoc in AI for Software Testing and Test Automation</a><div>KTH Royal Institute of Technology</div><div>Stockholm, Sweden</div><div>Closing in 30 days</div></article></li></ul>`],
  [/quantiki\.org\/job-type\/postdoc/, `<div class="views-row"><a href="/position/postdoc-quantum-software-copenhagen">Postdoc in quantum software and compilers</a><span>Deadline: Sunday, November 29, 2030</span><span>University of Copenhagen, Copenhagen, Denmark</span></div>`],
  [/naturecareers\/jobs\/postdoctoral\/united-states\/\?keywords=machine/, `<ul><li><a href="/naturecareers/job/12862383/postdoc-neuro/">Postdoctoral Associate in Systems Neuroscience and Neural Decoding</a><p>University of Pittsburgh</p><p>Pittsburgh, Pennsylvania</p><p>Closing date: 12/01/2030</p></li></ul>`],
  [/999001/, `<html><body><h1>x</h1><p>Leuven, Belgium.</p><p>Requirements: Python, Qiskit and PyTorch.</p><p>Contact: prof.x@kuleuven.be</p></body></html>`],
  [/999006/, `<html><body><p>We use Python and Selenium. Application deadline: 15 December 2030</p></body></html>`],
  [/quantum-software-copenhagen/, `<html><body><p>Rust and C++ experience welcome.</p></body></html>`],
  [/12862383/, `<html><body><p>Pittsburgh, Pennsylvania. MATLAB or Python.</p></body></html>`],
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

const {text} = buildDigest(fresh, {minStars:2, maxItems:10, pagesUrl:"https://kullanici.github.io/postdoc-radar/", daysLeft});
assert.ok(text.includes("★★★") && text.includes("Tüm ilanları aç") && text.length < 4096);
process.env.TELEGRAM_BOT_TOKEN = "TEST"; process.env.TELEGRAM_CHAT_ID = "1";
await sendTelegram(text);
assert.equal(telegramPayload.parse_mode, "HTML");
assert.equal(telegramPayload.chat_id, "1");

console.log(`Tüm testler geçti. ${stats.pages} istek planlandı, ${calls} sahte istek yapıldı, ${fresh.length} yeni ilan bulundu.`);
console.log("\n--- Telegram mesajı önizlemesi ---\n" + text.replace(/<[^>]+>/g, ""));
