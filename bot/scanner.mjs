// Postdoc Radarı — tarama çekirdeği (Node.js). OTOMATİK ÜRETİLDİ: elle düzenleme.
// Kaynak: web/app.template.html (Android ve web uygulamasıyla aynı ayrıştırma/sınıflandırma kodu).
// Yeniden üretmek için: python3 tools/gen_scanner.py web/app.template.html bot/scanner.mjs
import { DOMParser } from "linkedom";
export const UA = "Mozilla/5.0 (compatible; PostdocRadarBot/1.0)";
let settings = null;
const TOPIC_LABEL = {ML:"Makine Öğrenimi / YZ", Kuantum:"Kuantum", Nöro:"Nöroinformatik", Biyo:"Biyoinformatik / Sağlık", Yazılım:"Yazılım Test / Programlama"};
const DEFAULT_KW = {
  ML: "machine learning, deep learning, artificial intelligence, neural network, LLM, large language model, foundation model, natural language processing, NLP, computer vision, reinforcement learning, generative AI, generative model, data science, explainable AI, trustworthy AI, representation learning, graph neural network, transformer, AI",
  Kuantum: "quantum computing, quantum machine learning, quantum algorithm, quantum software, quantum information, quantum computer, variational quantum, QAOA, quantum optimization, qubit, quantum simulation, quantum error correction, quantum neural network, quantum programming, quantum technologies",
  Biyo: "bioinformatics, computational biology, genomics, multi-omics, omics, single-cell, proteomics, systems biology, biomedical, medical imaging, health data, clinical data, precision medicine, drug discovery, computational medicine, biostatistics, digital health, healthcare AI, medical AI, digital pathology, pathology, computational biomedicine, biomedical informatics, clinical informatics, radiology",
  Nöro: "neuroinformatics, computational neuroscience, NeuroAI, neural coding, neural decoding, brain-computer interface, BCI, EEG, fMRI, MEG, neuroimaging, connectomics, spiking neural network, cognitive computational neuroscience, neurotechnology, brain imaging, neural engineering, neuromorphic, neuroscience and AI, systems neuroscience",
  Yazılım: "software testing, test automation, automated testing, test generation, test case generation, software quality, quality assurance, fuzzing, regression testing, unit testing, mutation testing, model-based testing, search-based software engineering, software engineering, software verification, program analysis, program repair, formal verification, continuous integration, DevOps, MLOps, AI for software engineering, LLM for code, code generation, testing of AI systems, test oracle, software reliability, empirical software engineering"
};
const DEFAULT_LANGS = "Python, R, Julia, C++, C#, Java, MATLAB, Rust, Golang, JavaScript, TypeScript, Scala, Fortran, CUDA, SQL, Kotlin, Haskell, OCaml, Prolog, Qiskit, Cirq, PennyLane, Q#, PyTorch, TensorFlow, JAX, scikit-learn, Bioconductor, Selenium, Docker, Kubernetes, Linux, Git";
const CORE_TERMS = ["test automation","software testing","ai for software","llm for code","machine learning for software","testing of ai","ai-based testing","quantum machine learning","quantum software","quantum algorithm","quantum programming","neuroinformatics","neuroai","computational neuroscience","neural decoding","neural coding","brain-computer interface","bioinformatics","computational biology","medical ai","biomedical ai","healthcare ai","medical imaging"];
const DEFAULT_SEARCH = "python\nsoftware testing\ntest automation\nmachine learning\nartificial intelligence\ndeep learning\nbioinformatics\ncomputational biology\nquantum computing\nquantum machine learning\nneuroinformatics\ncomputational neuroscience\nmedical imaging";
const DEFAULT_EXCLUDE = "PhD student, PhD position, PhD candidate, doctoral candidate, doctoral student, professor, lecturer, tenure track, EngD, master thesis, internship";
const SOURCES = [
  {id:"ap", name:"AcademicPositions", note:"Alan sayfaları (ML, YZ, biyoinformatik, bilgisayar bilimi, nörobilim)"},
  {id:"at", name:"AcademicTransfer", note:"Hollanda üniversiteleri, terim araması"},
  {id:"qk", name:"Quantiki", note:"Kuantum postdoc ilanları"},
  {id:"bn", name:"Bernstein Network", note:"Hesaplamalı nörobilim ilanları"},
  {id:"nc", name:"Nature Careers", note:"Terim araması"},
  {id:"ja", name:"jobs.ac.uk", note:"Terim araması (İngiltere ve Avrupa)"},
  {id:"ex", name:"EURAXESS", note:"AB resmi portalı, terim araması (bazen erişim engelli olabilir)"},
  {id:"ncus", name:"Nature Careers – ABD", note:"ABD postdoc ilanları, terim araması", na:true},
  {id:"cra", name:"CRA Career Center", note:"ABD bilgisayar bilimi ve YZ ilanları", na:true},
  {id:"ajo", name:"AcademicJobsOnline", note:"Matematik, fizik ve kuantum ağırlıklı ilanlar (ABD ve dünya)", na:true},
  {id:"cn", name:"comp-neuro e-posta listesi", note:"Hesaplamalı nörobilim ilanları (ABD, Kanada, Avrupa)", na:true},
  {id:"sc", name:"Science Careers (AAAS)", note:"ABD ağırlıklı, deneysel: site bazen otomatik okumayı engeller", na:true}
];
const DEFAULT_SETTINGS = {hours:[8,13,19], notify:true, remind:true, kw:DEFAULT_KW, search:DEFAULT_SEARCH, exclude:DEFAULT_EXCLUDE, sources:{ap:true,at:true,qk:true,bn:true,nc:true,ja:true,ex:true,ncus:true,cra:true,ajo:true,cn:true,sc:true}, theme:"auto", regions:{eu:true, na:true}, langs:DEFAULT_LANGS, kwVersion:3};

/* ---------- helpers ---------- */
const esc = s => String(s==null?"":s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pad = n => String(n).padStart(2,"0");
const todayISO = () => { const d=new Date(); return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()); };
const startOfDay = () => { const d=new Date(); d.setHours(0,0,0,0); return d; };
function daysLeft(iso){ if(!iso) return null; const d=new Date(iso+"T00:00:00"); if(isNaN(d)) return null; return Math.round((d-startOfDay())/86400000); }
function slugId(u){ return u.replace(/^https?:\/\/(www\.)?/,"").replace(/[^A-Za-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(-120); }
const splitList = s => String(s||"").split(/[,\n]/).map(x=>x.trim()).filter(Boolean);

/* ---------- HTTP ---------- */
async function httpGet(url, ms){
  const ctl = new AbortController(); const t = setTimeout(()=>ctl.abort(), ms||25000);
  try{
    const r = await fetch(url, {signal:ctl.signal, redirect:"follow", headers:{"User-Agent":UA, "Accept":"text/html,application/xhtml+xml,*/*;q=0.8", "Accept-Language":"en-US,en;q=0.8"}});
    if(!r.ok) return null; return await r.text();
  }catch(e){ return null; } finally{ clearTimeout(t); }
}
async function pool(items, n, fn){
  const out=[]; let i=0;
  const workers = Array.from({length:Math.min(n,items.length)}, async () => { while(i<items.length){ const k=i++; try{ out[k]=await fn(items[k]); }catch(e){ out[k]=null; } } });
  await Promise.all(workers); return out;
}

/* ---------- parsing ---------- */
const MONTHS = {jan:1,january:1,januari:1,januar:1,janvier:1,feb:2,february:2,februari:2,februar:2,mar:3,march:3,maart:3,mrt:3,"märz":3,maerz:3,apr:4,april:4,avril:4,may:5,mei:5,mai:5,jun:6,june:6,juni:6,juin:6,jul:7,july:7,juli:7,juillet:7,aug:8,august:8,augustus:8,"août":8,sep:9,sept:9,september:9,septembre:9,oct:10,october:10,oktober:10,okt:10,octobre:10,nov:11,november:11,novembre:11,dec:12,december:12,dezember:12,dez:12,"décembre":12};
function mkISO(y,m,d){ y=+y; m=+m; d=+d; if(y<100) y+=2000; if(!(y>=2025&&y<=2030&&m>=1&&m<=12&&d>=1&&d<=31)) return null; return y+"-"+pad(m)+"-"+pad(d); }
function parseDateFrom(s, mdy){
  if(!s) return null; s = s.replace(/ /g," ");
  let m;
  if((m = s.match(/\b(20\d\d)-(\d{1,2})-(\d{1,2})\b/))) return mkISO(m[1],m[2],m[3]);
  if((m = s.match(/\b(\d{1,2})[.\/](\d{1,2})[.\/](20\d\d)\b/))){ let a=+m[1], b=+m[2]; const us = b>12 ? true : (a>12 ? false : !!mdy); return us ? mkISO(m[3],a,b) : mkISO(m[3],b,a); }
  if((m = s.match(/\b(\d{1,2})(?:st|nd|rd|th)?\.?\s+([A-Za-zäéû]{3,10})\.?,?\s+[’']?((?:20)?\d\d)\b/))){ const mo=MONTHS[m[2].toLowerCase()]; if(mo) return mkISO(m[3],mo,m[1]); }
  if((m = s.match(/\b([A-Za-zäéû]{3,10})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(20\d\d)\b/))){ const mo=MONTHS[m[1].toLowerCase()]; if(mo) return mkISO(m[3],mo,m[2]); }
  if((m = s.match(/(?:closing|closes|ends?)\s+in\s+(\d{1,3})\s+days?/i)) || (m = s.match(/(\d{1,3})\s+days?\s+(?:remaining|left)/i))){ const d=new Date(); d.setDate(d.getDate()+(+m[1])); return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()); }
  if(/closing\s+today|last\s+day\s+today/i.test(s)) return todayISO();
  return null;
}
const DL_LABEL = /(review\s+of\s+applications\s+(?:will\s+)?begins?|applications?\s+due|application\s+deadline|deadline\s+for\s+applications?|closing\s+date|deadline|apply\s+(?:by|before)|applications?\s+close|last\s+date|sluitingsdatum|reageren\s+(?:kan\s+)?tot|bewerbungs(?:frist|schluss)|date\s+limite|closing\s+in|days\s+(?:remaining|left))/i;
function findDeadline(text, mdy){
  if(!text) return null;
  const t = text.replace(/\s+/g," ");
  const re = new RegExp(DL_LABEL.source, "ig"); let m;
  while((m = re.exec(t))){
    const win = t.slice(Math.max(0,m.index-12), m.index + m[0].length + 70);
    const d = parseDateFrom(win, mdy); if(d) return d;
  }
  return null;
}
const COUNTRY = [
 ["Almanya",/\b(germany|deutschland|berlin|munich|münchen|hamburg|heidelberg|tübingen|tuebingen|jülich|juelich|bonn|aachen|dresden|bochum|freiburg|stuttgart|darmstadt|erlangen|göttingen|leipzig|frankfurt|cologne|köln|mainz|saarbrücken|karlsruhe|paderborn|potsdam|hannover|bremen|kiel|würzburg|ulm|magdeburg)\b/gi],
 ["Hollanda",/\b(netherlands|holland|amsterdam|delft|utrecht|leiden|nijmegen|groningen|eindhoven|enschede|twente|rotterdam|maastricht|tilburg|wageningen)\b/gi],
 ["İsveç",/\b(sweden|stockholm|gothenburg|göteborg|lund|uppsala|linköping|umeå|chalmers|karolinska)\b/gi],
 ["Danimarka",/\b(denmark|copenhagen|aarhus|odense|aalborg|lyngby)\b/gi],
 ["Belçika",/\b(belgium|leuven|ghent|gent|brussels|antwerp|liège)\b/gi],
 ["Fransa",/\b(france|paris|lyon|grenoble|toulouse|saclay|marseille|bordeaux|lille|rennes|nancy|strasbourg|sophia antipolis|montpellier)\b/gi],
 ["İsviçre",/\b(switzerland|zurich|zürich|lausanne|geneva|genève|basel|bern|lugano|epfl|eth zürich|eth zurich)\b/gi],
 ["Avusturya",/\b(austria|vienna|wien|graz|innsbruck|linz|klosterneuburg|salzburg)\b/gi],
 ["Norveç",/\b(norway|oslo|trondheim|bergen|stavanger|tromsø|kristiansand|ntnu)\b/gi],
 ["Finlandiya",/\b(finland|helsinki|espoo|aalto|tampere|oulu|turku|jyväskylä)\b/gi],
 ["İtalya",/\b(italy|milan|milano|rome|roma|turin|torino|bologna|padua|padova|pisa|trento|naples|napoli|florence|firenze|genoa|genova|bolzano)\b/gi],
 ["İspanya",/\b(spain|madrid|barcelona|valencia|seville|sevilla|bilbao|granada|salamanca)\b/gi],
 ["Portekiz",/\b(portugal|lisbon|lisboa|porto|coimbra|braga)\b/gi],
 ["İrlanda",/\b(ireland|dublin|cork|galway|limerick)\b/gi],
 ["Lüksemburg",/\b(luxembourg)\b/gi],
 ["Polonya",/\b(poland|warsaw|kraków|krakow|gdańsk|gdansk|wrocław|wroclaw|poznań|poznan|gliwice)\b/gi],
 ["Çekya",/\b(czech|czechia|prague|praha|brno)\b/gi],
 ["Birleşik Krallık",/\b(united kingdom|england|scotland|wales|london|oxford|edinburgh|manchester|glasgow|bristol|birmingham|leeds|sheffield|nottingham|southampton|warwick|imperial college)\b/gi],
 ["Yunanistan",/\b(greece|athens|thessaloniki|crete|heraklion|patras)\b/gi],
 ["Macaristan",/\b(hungary|budapest)\b/gi], ["Romanya",/\b(romania|bucharest|cluj)\b/gi], ["Slovenya",/\b(slovenia|ljubljana)\b/gi],
 ["Slovakya",/\b(slovakia|bratislava)\b/gi], ["Hırvatistan",/\b(croatia|zagreb)\b/gi], ["Estonya",/\b(estonia|tallinn|tartu)\b/gi],
 ["Letonya",/\b(latvia|riga)\b/gi], ["Litvanya",/\b(lithuania|vilnius|kaunas)\b/gi], ["Bulgaristan",/\b(bulgaria|sofia)\b/gi],
 ["Sırbistan",/\b(serbia|belgrade|novi sad)\b/gi], ["İzlanda",/\b(iceland|reykjavik)\b/gi], ["Kıbrıs",/\b(cyprus|nicosia|limassol)\b/gi], ["Malta",/\b(malta)\b/gi],
 ["ABD",/\b(united states|usa|u\.s\.a?\.|alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia, usa|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington, d\.?c|seattle|wisconsin|wyoming|boston|chicago|san francisco|los angeles|berkeley|stanford|pasadena|san diego|seattle|pittsburgh|philadelphia|baltimore|atlanta|houston|austin|ann arbor|princeton|new haven|cambridge, ma|bethesda|nih|argonne|los alamos|oak ridge|lawrence berkeley|brookhaven|mayo clinic)\b/gi],
 ["Kanada",/\b(canada|ontario|quebec|québec|british columbia|alberta|toronto|montreal|montréal|vancouver|ottawa|calgary|waterloo|mcgill|mila)\b/gi],
 ["_non",/\b(china|australia|saudi arabia|united arab emirates|uae|abu dhabi|morocco|israel|japan|korea|singapore|india|hong kong|taiwan|academia sinica|new zealand|brazil|qatar|beijing|shanghai|shenzhen|kaust|mbzuai)\b/gi]
];
function detectCountry(text){
  if(!text) return null; let best=null, bestN=0;
  for(const [name,re] of COUNTRY){ const n=(text.match(re)||[]).length; if(n>bestN){ best=name; bestN=n; } }
  return best;
}
const INST_RE = /(universit|institut|college|school|centre|center|hospital|laborator|academy|polytechn|politecnico|hochschule|forschungszentrum|max planck|helmholtz|fraunhofer|inria|cnrs|\bcea\b|\bkth\b|\beth\b|epfl|karolinska|\bumc\b|medical cent|radboud|nikhef|amolf|\bcwi\b|simula|sintef|leibniz|embl|\bdtu\b|\bntnu\b|\bista\b|chalmers|aalto|empa|\bvib\b|imec|clinic|foundation|national lab|nih\b|argonne|los alamos|oak ridge|brookhaven)/i;
const ACR = {kth:"KTH",eth:"ETH",epfl:"EPFL",tu:"TU",ku:"KU",uia:"UiA",ntnu:"NTNU",dtu:"DTU",ucl:"UCL",mpi:"MPI",cnrs:"CNRS",umc:"UMC",ista:"ISTA",imt:"IMT",dife:"DIfE",igz:"IGZ",ccri:"CCRI",luke:"Luke",vib:"VIB",embl:"EMBL",uu:"UU",of:"of",and:"and",the:"the",de:"de",di:"di",for:"for",la:"la",der:"der",zu:"zu"};
function prettySlug(sl){ return sl.split("-").filter(Boolean).map((w,i)=> ACR[w] && (i>0||ACR[w]===ACR[w].toUpperCase()) ? ACR[w] : w.charAt(0).toUpperCase()+w.slice(1)).join(" "); }
function textChunks(el){
  const out=[];
  (function walk(n){ for(const c of n.childNodes||[]){ if(c.nodeType===3){ const t=String(c.nodeValue||"").replace(/\s+/g," ").trim(); if(t.length>1) out.push(t); } else if(c.nodeType===1){ const tg=(c.tagName||"").toLowerCase(); if(tg!=="script"&&tg!=="style"&&tg!=="noscript") walk(c); } } })(el);
  return out;
}
// climb to the largest ancestor that still holds only this one posting link
function cardOf(a, req, href){
  let el=a;
  for(let i=0;i<8 && el.parentElement;i++){
    const p=el.parentElement; const hrefs=new Set();
    p.querySelectorAll("a[href]").forEach(x=>{ try{ const h=new URL(x.getAttribute("href"), req.url).href.split("#")[0]; if(req.link.test(h)) hrefs.add(h); }catch(e){} });
    hrefs.delete(href);
    if(hrefs.size>0) break;
    if((p.textContent||"").length>1500) break;
    el=p;
  }
  return el;
}
function compileKw(){
  const out={}; for(const t of Object.keys(TOPIC_LABEL)){ out[t]=splitList(settings.kw[t]).map(k=>k.toLowerCase()); } return out;
}
function kwHit(text, kw){
  // short all-caps style terms (AI, NLP, EEG) need word boundaries
  if(kw.length<=4) return new RegExp("(^|[^a-z0-9])"+kw.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"([^a-z0-9]|$)","i").test(text);
  return text.indexOf(kw) >= 0;
}
function detectLangs(text){
  const out=[]; const t=(" "+text+" ").replace(/\b(python|matlab|julia|stata|sas|spss)\b/gi, m=>m.toLowerCase());
  splitList(settings.langs||DEFAULT_LANGS).forEach(l=>{
    if(l==="R"){ if(/\b(python|matlab|julia|stata|sas|spss)\s*(,|or|and|\/|&)\s*R\b|\bR\s*(,|or|and|\/|&)\s*(python|matlab|julia)\b|\bR programming|\bR\/Bioconductor|\bR packages?\b|\bin R\b/.test(t)) out.push("R"); return; }
    const e=l.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
    if(new RegExp("(^|[^A-Za-z0-9#+])"+e+"($|[^A-Za-z0-9#+])", "i").test(t)) out.push(l);
  });
  return out;
}
const POSTDOC_RE = /(post-?doc|postdoctoral|post-doctoral|research fellow|research associate|wissenschaftliche[rn]? mitarbeiter|onderzoeker|researcher\b)/i;
function classify(title, extra){
  const text = (title+" "+(extra||"")).toLowerCase();
  const tl = title.toLowerCase();
  const kws = compileKw(); const hits={};
  for(const t of Object.keys(kws)){ hits[t] = kws[t].filter(k=>kwHit(text,k)); }
  const excl = splitList(settings.exclude).map(x=>x.toLowerCase());
  if(excl.some(x=>tl.indexOf(x)>=0) && !/post-?doc|postdoctoral/i.test(tl)) return null;
  const langs = detectLangs(title+" "+(extra||""));
  const spec = ["Kuantum","Nöro","Biyo","Yazılım"].map(t=>[t,hits[t].length]).sort((a,b)=>b[1]-a[1]);
  const anyML = hits.ML.length>0;
  let topic=null;
  if(spec[0][1]>0) topic=spec[0][0]; else if(anyML) topic="ML"; else if(langs.length) topic="Yazılım"; else return null;
  const core = CORE_TERMS.some(c=>text.indexOf(c)>=0);
  let rel = 1;
  if(topic!=="ML" && (anyML || core)) rel=3;
  else if(topic!=="ML" || hits.ML.length>=1) rel=2;
  if(topic==="Kuantum" && /quantum (sensing|optics|memory|materials|gravity)/.test(text) && !anyML && !core) rel=1;
  if(topic==="Yazılım" && !hits.Yazılım.length && !anyML) rel=1;
  const matched = [].concat(hits[topic].slice(0,3), topic!=="ML"?hits.ML.slice(0,2):[]);
  if(!matched.length && langs.length) matched.push(...langs.slice(0,3));
  return {topic, relevance:rel, matched, langs};
}

/* ---------- sources ---------- */
function searchTerms(){ return splitList(settings.search).slice(0,15); }
function buildRequests(){
  const R=[]; const terms=searchTerms(); const s=Object.assign({}, settings.sources);
  if(!settings.regions.eu){ ["ap","at","bn","nc","ja","ex"].forEach(k=>s[k]=false); }
  if(s.ap) ["machine-learning","artificial-intelligence","bioinformatics","computer-science","neuroscience","data-science","quantum-computing","physics"].forEach(f=>R.push({src:"AcademicPositions", url:"https://academicpositions.com/jobs/position/post-doc/field/"+f, link:/academicpositions\.[a-z.]+\/ad\//}));
  if(s.at) terms.forEach(t=>R.push({src:"AcademicTransfer", url:"https://www.academictransfer.com/en/jobs/?q="+encodeURIComponent("postdoc "+t), link:/academictransfer\.com\/[a-z]{2}\/jobs\/\d+\//, country:"Hollanda"}));
  if(s.qk) R.push({src:"Quantiki", url:"https://www.quantiki.org/job-type/postdoc", link:/quantiki\.org\/position\//, topic:"Kuantum"});
  if(s.bn) R.push({src:"Bernstein Network", url:"https://bernstein-network.de/en/karriere/stellenangebote/", link:/./, topic:"Nöro", loose:true});
  if(s.nc) terms.forEach(t=>R.push({src:"Nature Careers", url:"https://www.nature.com/naturecareers/jobs/postdoctoral/?keywords="+encodeURIComponent(t), link:/nature\.com\/naturecareers\/job\/\d+/}));
  if(s.ja) terms.forEach(t=>R.push({src:"jobs.ac.uk", url:"https://www.jobs.ac.uk/search/?keywords="+encodeURIComponent("postdoc "+t), link:/jobs\.ac\.uk\/job\/[A-Z0-9]+\//}));
  if(settings.regions.na){
    if(s.ncus) terms.forEach(t=>R.push({src:"Nature Careers ABD", url:"https://www.nature.com/naturecareers/jobs/postdoctoral/united-states/?keywords="+encodeURIComponent(t), link:/nature\.com\/naturecareers\/job\/\d+/, country:"ABD", mdy:true}));
    if(s.cra) terms.slice(0,6).forEach(t=>R.push({src:"CRA Career Center", url:"https://careercenter.cra.org/jobs/?keywords="+encodeURIComponent("postdoc "+t), link:/careercenter\.cra\.org\/job\/[a-z0-9-]+-\d+/, mdy:true}));
    if(s.ajo) R.push({src:"AcademicJobsOnline", url:"https://academicjobsonline.org/ajo/jobs", link:/academicjobsonline\.org\/ajo\/jobs\/\d+$/, mdy:false});
    if(s.cn){ const d=new Date(); const m1=d.getFullYear()+"/"+pad(d.getMonth()+1)+"/"; const p=new Date(d.getFullYear(), d.getMonth()-1, 1); const m0=p.getFullYear()+"/"+pad(p.getMonth()+1)+"/";
      [m1,m0].forEach(m=>R.push({src:"comp-neuro listesi", url:"https://lists.cnsorg.org/hyperkitty/list/comp-neuro@lists.cnsorg.org/"+m, link:/lists\.cnsorg\.org\/hyperkitty\/list\/comp-neuro@lists\.cnsorg\.org\/thread\/[A-Z0-9]+\/?$/, topic:"Nöro"})); }
    if(s.sc) terms.slice(0,6).forEach(t=>R.push({src:"Science Careers", url:"https://jobs.sciencecareers.org/jobs/postdoctoral/?keywords="+encodeURIComponent(t), link:/jobs\.sciencecareers\.org\/job\/\d+/, mdy:true}));
  }
  if(s.ex) terms.forEach(t=>R.push({src:"EURAXESS", url:"https://euraxess.ec.europa.eu/jobs/search?keywords="+encodeURIComponent("postdoc "+t), link:/euraxess\.ec\.europa\.eu\/jobs\/\d+/}));
  return R;
}
function extractFromListing(html, req){
  const doc = new DOMParser().parseFromString(html, "text/html");
  const found = [];
  doc.querySelectorAll("a[href]").forEach(a=>{
    let href; try{ href = new URL(a.getAttribute("href"), req.url).href.split("#")[0]; }catch(e){ return; }
    if(!/^https?:/.test(href) || !req.link.test(href)) return;
    if(req.loose && /bernstein-network\.de\/(en\/)?(karriere|stellenangebote|$)/.test(href) && !/\.pdf/i.test(href)) return;
    const title = (a.textContent||a.getAttribute("title")||"").replace(/\s+/g," ").trim();
    if(title.length<12 || title.length>220) return;
    if(/^(apply|read more|more|details|view|bewerben|lees meer)/i.test(title)) return;
    const card = cardOf(a, req, href);
    const chunks = textChunks(card).filter(c=>c!==title);
    const cardText = chunks.join(" · ");
    found.push({href, title, cardText, chunks});
  });
  const seen=new Set();
  return found.filter(f=>{ if(seen.has(f.href)) return false; seen.add(f.href); return true; });
}
function guessInstitution(f, req){
  let m = f.href.match(/academicpositions\.[a-z.]+\/ad\/([a-z0-9-]+)\//);
  if(m) return prettySlug(m[1]);
  const c = (f.chunks||[]).find(x=>x.length<90 && INST_RE.test(x) && !POSTDOC_RE.test(x));
  if(c){ const s=c.replace(/^(employer|organisation|organization|institution|werkgever)\s*:?\s*/i,""); const first=s.split(",")[0].trim(); return INST_RE.test(first) ? first : s; }
  return "";
}
async function enrich(job){
  const html = await httpGet(job.url, 20000);
  if(!html) return;
  let doc; try{ doc = new DOMParser().parseFromString(html, "text/html"); }catch(e){ return; }
  // JSON-LD JobPosting when the site provides it
  doc.querySelectorAll('script[type="application/ld+json"]').forEach(s=>{
    try{
      let d = JSON.parse(s.textContent); const arr = Array.isArray(d)?d:(d["@graph"]||[d]);
      arr.forEach(o=>{
        if(!o || !/JobPosting/i.test(String(o["@type"]))) return;
        if(!job.deadline && o.validThrough){ const v=String(o.validThrough).slice(0,10); if(/^\d{4}-\d\d-\d\d$/.test(v)) job.deadline=v; }
        const org = o.hiringOrganization && (o.hiringOrganization.name||o.hiringOrganization);
        if(!job.institution && typeof org==="string") job.institution=org;
        const loc = [].concat(o.jobLocation||[])[0]; const cc = loc && loc.address && (loc.address.addressCountry && (loc.address.addressCountry.name||loc.address.addressCountry));
        if(cc && !job.country){ const c=detectCountry(String(cc)) || ({DE:"Almanya",NL:"Hollanda",SE:"İsveç",DK:"Danimarka",BE:"Belçika",FR:"Fransa",CH:"İsviçre",AT:"Avusturya",NO:"Norveç",FI:"Finlandiya",IT:"İtalya",ES:"İspanya",PT:"Portekiz",IE:"İrlanda",LU:"Lüksemburg",PL:"Polonya",CZ:"Çekya",GB:"Birleşik Krallık",UK:"Birleşik Krallık"})[String(cc).toUpperCase()]; if(c) job.country=c; }
        if(o.description && !job.desc) job.desc = String(o.description).replace(/<[^>]+>/g," ").slice(0,3000);
      });
    }catch(e){}
  });
  doc.querySelectorAll("script,style,noscript,svg").forEach(n=>n.remove());
  const body = doc.body ? textChunks(doc.body).join(" ") : "";
  if(!job.deadline) job.deadline = findDeadline(body, job.mdy);
  if(!job.country){ const c = detectCountry(body.slice(0,20000)); if(c) job.country=c; }
  if(!job.institution){
    const og = doc.querySelector('meta[property="og:site_name"]'); const tt = (doc.title||"");
    const parts = tt.split(/\s[|–—-]\s/).map(x=>x.trim()).filter(x=>x && INST_RE.test(x) && x.length<90);
    job.institution = parts[0] || (og && og.content) || "";
  }
  if(!job.desc) job.desc = body.slice(0,3000);
  job.langs = Array.from(new Set((job.langs||[]).concat(detectLangs(job.title+" "+body.slice(0,40000)))));
  job.langsChecked = true;
  job.emails = Array.from(new Set((html.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)||[]).filter(e=>!/\.(png|jpe?g|gif|svg|webp)$/i.test(e) && !/(example|sentry|noreply|no-reply|wixpress|domain)\./i.test(e)))).slice(0,8);
}


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
export async function scan(jobs, opts={}){
  const started = Date.now(); const reqs = buildRequests();
  let ok=0, fail=0; const failed=[]; const candidates=[];
  const pages = await pool(reqs, opts.concurrency||4, async r => { const h = await httpGet(r.url, 25000); if(h){ ok++; return {r, h}; } fail++; failed.push(r.src); return null; });
  for(const p of pages){
    if(!p) continue;
    let items=[]; try{ items = extractFromListing(p.h, p.r); }catch(e){}
    for(const f of items){
      const id = slugId(f.href);
      if(jobs[id] || candidates.some(c=>c.id===id)) continue;
      const postdocish = POSTDOC_RE.test(f.title) || (p.r.src==="Quantiki") || (p.r.src==="Bernstein Network" && /post-?doc|postdoctoral/i.test(f.title+" "+f.cardText));
      if(!postdocish) continue;
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
export { TOPIC_LABEL, DEFAULT_SETTINGS, DEFAULT_KW, DEFAULT_SEARCH, DEFAULT_EXCLUDE, DEFAULT_LANGS, SOURCES, classify, detectLangs, findDeadline, parseDateFrom, detectCountry, extractFromListing, buildRequests, daysLeft, todayISO, pad };
