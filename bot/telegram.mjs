// Telegram Bot API ile mesaj gönderir. Token ve sohbet kimliği GitHub "Secrets" içinden gelir.
const esc = s => String(s==null?"":s).replace(/[&<>]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));

export function telegramConfigured(){
  return !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

export async function sendTelegram(text){
  const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  if(!token || !chat) throw new Error("TELEGRAM_BOT_TOKEN veya TELEGRAM_CHAT_ID tanımlı değil (GitHub > Settings > Secrets and variables > Actions).");
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({chat_id: chat, text, parse_mode: "HTML", disable_web_page_preview: true})
  });
  const body = await r.json().catch(()=>({}));
  if(!r.ok || !body.ok){
    const why = body.description || r.status;
    let hint = "";
    if(/chat not found/i.test(why)) hint = " → Sohbet kimliği yanlış ya da bota hiç /start yazmadın.";
    if(/unauthorized/i.test(why)) hint = " → Bot token'ı yanlış.";
    throw new Error("Telegram hatası: " + why + hint);
  }
  return body;
}

const fmtDate = iso => new Date(iso+"T00:00:00").toLocaleDateString("tr-TR",{day:"numeric",month:"short",year:"numeric"});

export function buildDigest(fresh, {minStars=2, maxItems=10, pagesUrl="", daysLeft}){
  const shown = fresh.filter(j=>(j.relevance||1)>=minStars).sort((a,b)=>(b.relevance||0)-(a.relevance||0) || String(a.deadline||"9").localeCompare(String(b.deadline||"9")));
  const top = shown.filter(j=>j.relevance===3).length;
  let head = `🔭 <b>Postdoc Radarı</b>: ${fresh.length} yeni ilan`;
  if(top) head += ` (${top} tanesi ★★★)`;
  const lines = [head, ""];
  for(const j of shown.slice(0, maxItems)){
    const d = daysLeft(j.deadline);
    const dl = j.deadline ? `son tarih ${fmtDate(j.deadline)}${d!==null && d<=7 ? " ⚠️" : ""}` : "son tarih belirtilmemiş";
    lines.push(`${"★".repeat(j.relevance||1)} <a href="${esc(j.url)}">${esc(j.title)}</a>`);
    lines.push(`${esc(j.institution||"Kurum belirtilmemiş")}${j.country?" · "+esc(j.country):""} · ${dl}`);
    if(j.langs && j.langs.length) lines.push(`<i>${esc(j.langs.slice(0,6).join(", "))}</i>`);
    lines.push("");
  }
  const hidden = fresh.length - Math.min(shown.length, maxItems);
  if(hidden>0) lines.push(`+${hidden} ilan daha panoda.`);
  if(pagesUrl) lines.push(`<a href="${esc(pagesUrl)}">Tüm ilanları aç</a>`);
  let text = lines.join("\n");
  if(text.length > 4000) text = text.slice(0, 3990) + "…";
  return {text, shownCount: Math.min(shown.length, maxItems)};
}
