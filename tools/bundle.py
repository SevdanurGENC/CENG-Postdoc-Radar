"""web/app.template.html'den iki sayfa üretir:
  android/assets/index.html  → Android uygulaması (başlangıç ilanlarıyla)
  docs/index.html            → GitHub Pages panosu (ilanları bottan, docs/jobs.json'dan okur)
Ayrıca bot/scanner.mjs'i aynı şablondan yeniden üretir."""
import os, json, subprocess, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(root, *a)
t = open(P("web", "app.template.html"), encoding="utf-8").read()
seed = open(P("web", "seed.json"), encoding="utf-8").read()
assert "/*SEED*/[]" in t and "/*WEB*/false" in t
open(P("android", "assets", "index.html"), "w", encoding="utf-8").write(t.replace("/*SEED*/[]", seed))
open(P("docs", "index.html"), "w", encoding="utf-8").write(t.replace("/*WEB*/false", "true"))
if not os.path.exists(P("docs", "jobs.json")):
    jobs = {j["id"]: j for j in json.loads(seed)}
    json.dump({"jobs": jobs, "lastRun": None, "log": [], "repo": ""}, open(P("docs", "jobs.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
open(P("docs", ".nojekyll"), "w").close()
subprocess.run([sys.executable, P("tools", "gen_scanner.py"), P("web", "app.template.html"), P("bot", "scanner.mjs")], check=True)
print("android/assets/index.html, docs/index.html ve bot/scanner.mjs güncellendi")
