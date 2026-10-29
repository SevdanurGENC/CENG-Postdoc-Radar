// GitHub Actions'ın çalıştırdığı ana betik.
//   node bot/run.mjs                 → tara, docs/jobs.json'u güncelle, Telegram'a özet gönder
//   node bot/run.mjs --test-telegram → sadece Telegram bağlantısını dene
//   node bot/run.mjs --dry-run       → tara ama dosyaya yazma ve mesaj atma
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { configure, scan, prune, daysLeft, todayISO } from "./scanner.mjs";
import { sendTelegram, telegramConfigured, buildDigest } from "./telegram.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const CONFIG = ROOT + "bot/config.json";
const DATA = ROOT + "docs/jobs.json";
const args = new Set(process.argv.slice(2));

const repo = process.env.GITHUB_REPOSITORY || "";
const [owner, name] = repo.split("/");
const pagesUrl = process.env.PAGES_URL || (owner && name ? `https://${owner.toLowerCase()}.github.io/${name}/` : "");

if(args.has("--test-telegram")){
  await sendTelegram(`✅ <b>Postdoc Radarı</b> bağlantısı çalışıyor.\nBot ${repo || "yerel"} deposundan mesaj atabiliyor.${pagesUrl ? `\n<a href="${pagesUrl}">Panoyu aç</a>` : ""}`);
  console.log("Telegram test mesajı gönderildi.");
  process.exit(0);
}

const cfg = JSON.parse(readFileSync(CONFIG, "utf8"));
configure(cfg);
const data = existsSync(DATA) ? JSON.parse(readFileSync(DATA, "utf8")) : {jobs:{}, log:[]};
data.jobs = data.jobs || {};

console.log(`Tarama başlıyor (${todayISO()}), kayıtlı ilan: ${Object.keys(data.jobs).length}`);
const {fresh, stats} = await scan(data.jobs);
const removed = prune(data.jobs, cfg.cleanup?.keepDaysAfterDeadline ?? 14, cfg.cleanup?.keepDaysWithoutDeadline ?? 120);

const line = `${stats.pages} sayfa (${stats.ok} açıldı, ${stats.fail} açılmadı${stats.failedSources.length ? ": "+stats.failedSources.join(", ") : ""}), ${stats.candidates} aday, ${stats.added} yeni ilan, ${stats.backfilled} eski ilan okundu, ${removed} süresi geçmiş ilan silindi, ${stats.seconds} sn`;
console.log(line);
for(const j of fresh) console.log(`  + ${"★".repeat(j.relevance)} ${j.title} | ${j.institution} | ${j.country} | ${j.deadline||"-"}`);

if(args.has("--dry-run")){ console.log("--dry-run: dosya yazılmadı."); process.exit(0); }

const now = new Date();
const stamp = now.toLocaleString("tr-TR", {day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit"});
data.lastRun = now.toISOString();
data.lastAdded = stats.added;
data.lastStats = stats;
data.repo = repo || data.repo || "";
data.log = [`${stamp}  bot: ${line}`].concat(data.log||[]).slice(0, 60);
writeFileSync(DATA, JSON.stringify(data, null, 1) + "\n");
console.log(`docs/jobs.json yazıldı: ${Object.keys(data.jobs).length} ilan.`);

const tg = cfg.telegram || {};
if(!telegramConfigured()){
  console.log("Telegram ayarlı değil, mesaj atlanıyor.");
} else if(fresh.length || tg.sendWhenNothingNew){
  const {text, shownCount} = fresh.length
    ? buildDigest(fresh, {minStars: tg.minStars ?? 2, maxItems: tg.maxItems ?? 10, pagesUrl, daysLeft})
    : {text: `🔭 Postdoc Radarı: bu taramada yeni ilan yok.${pagesUrl ? `\n<a href="${pagesUrl}">Panoyu aç</a>` : ""}`, shownCount: 0};
  if(fresh.length && shownCount===0 && !tg.sendWhenNothingNew){
    console.log(`Yeni ilanların hiçbiri ${tg.minStars}+ yıldız değil, mesaj atılmadı.`);
  } else {
    try{ await sendTelegram(text); console.log("Telegram özeti gönderildi."); }
    catch(e){ console.log("::warning title=Telegram::" + e.message); } // mesaj hatası taramayı başarısız saymasın, ama Actions ekranında uyarı olarak görünsün
  }
}
