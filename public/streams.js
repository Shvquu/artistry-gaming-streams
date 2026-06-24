/* ============================================================
   Artistry Gaming – Streamerübersicht  ·  streams.js
   Holt Live-Daten vom Backend (/api/streams). Läuft kein
   Backend, wird automatisch auf Demo-Daten zurückgegriffen,
   damit die Seite auch standalone funktioniert.
   ============================================================ */

/* ---------------- KONFIG ---------------- */
const API_URL    = "/api/streams";   // Endpunkt des Node-Backends
const REFRESH_MS = 60000;            // alle 60s neu vom Backend holen

/* ---------------- DEMO-DATEN (Fallback) ---------------- */
const DEMO = {
    stats: { streamsTotal: 186, players: 142, playersMax: 256 },
    streams: [
        {login:"littlesophyy", name:"LittleSophyy", v:true,  title:"[Artistry] Lara Croft auf Abwegen | Tag 4 als Detektivin | !discord !cmd", viewers:312, uptime:13512, followers:79800, scene:"city",   tags:["Roleplay","Deutsch"]},
        {login:"sirmpixx",     name:"sirmpixx",     v:true,  title:"[AG] +18 | Neuanfang in Los Santos – wer braucht schon einen Plan?",       viewers:287, uptime:18153, followers:43800, scene:"road",   tags:["GTARP","+18","Deutsch"]},
        {login:"krasserkevin", name:"KrasserKevin", v:true,  title:"[Artistry] Mechaniker des Vertrauens – heute: Tuning & Drama",              viewers:198, uptime:8048,  followers:32400, scene:"street", tags:["MechanicRP","Deutsch"]},
        {login:"ninarp",       name:"NinaRP",       v:true,  title:"[AG] Polizei Streife mit Herz | !prep !nyfter",                            viewers:156, uptime:16255, followers:32500, scene:"street", tags:["PoliceRP","Deutsch"]},
        {login:"maxpower_tv",  name:"MaxPower_TV",  v:false, title:"[Artistry] Dealerkrieg eskaliert?! Großer Deal heute Abend",               viewers:143, uptime:7101,  followers:16300, scene:"road",   tags:["GangRP","Deutsch"]},
        {login:"chiaravibes",  name:"ChiaraVibes",  v:true,  title:"[AG] Café Eröffnung Downtown – kommt vorbei!",                             viewers:98,  uptime:11564, followers:9200,  scene:"club",   tags:["CivilianRP","Lustig","Deutsch"]},
        {login:"der_jonas",    name:"der_jonas",    v:false, title:"[Artistry] EMS Schicht | Leben retten in Los Santos | !steam",             viewers:76,  uptime:21677, followers:12100, scene:"ems",    tags:["EMS","Deutsch"]},
        {login:"pixelpaula",   name:"PixelPaula",   v:true,  title:"[AG] Erste Schritte als Anwältin – Gerichtstag!",                          viewers:54,  uptime:2910,  followers:6200,  scene:"city",   tags:["LawyerRP","Deutsch"]},
        {login:"toxictom",     name:"ToxicTom",     v:false, title:"[Artistry] Bankraub Planung – leise sein bitte",                          viewers:41,  uptime:8709,  followers:5400,  scene:"desert", tags:["HeistRP","Deutsch"]},
        {login:"lenaloots",    name:"LenaLoots",    v:true,  title:"[AG] Shopping & Chillen mit den Mädels",                                  viewers:33,  uptime:5630,  followers:4100,  scene:"street", tags:["CivilianRP","Lustig"]},
        {login:"robberp",      name:"RobbeRP",      v:false, title:"[Artistry] Taxifahrer Simulator – wohin darf's gehen?",                   viewers:27,  uptime:15042, followers:2700,  scene:"city",   tags:["JobRP","Deutsch"]},
        {login:"miamoon",      name:"MiaMoon",      v:true,  title:"[AG] Reporterin unterwegs – Skandal in den Vinewood Hills?",              viewers:19,  uptime:1335,  followers:1900,  scene:"desert", tags:["MediaRP","Deutsch"]}
    ],
    offline: [
        {name:"Ippolus__",v:false,since:"9 Min."},{name:"loboshood",v:false,since:"17 Min."},
        {name:"nc_lonni_",v:false,since:"27 Min."},{name:"NachiCocom",v:true,since:"29 Min."},
        {name:"rogeroverout538",v:false,since:"33 Min."},{name:"timbow_abi",v:false,since:"1 Std."},
        {name:"damnTropicc",v:false,since:"1 Std."},{name:"l3nashh",v:false,since:"2 Std."},
        {name:"f0kx1337",v:true,since:"2 Std."},{name:"AnsuroTV",v:false,since:"3 Std."},
        {name:"Burschi86",v:false,since:"3 Std."},{name:"nox142",v:false,since:"4 Std."},
        {name:"Minimaus96",v:false,since:"5 Std."},{name:"psychocat2902",v:false,since:"5 Std."},
        {name:"marschmelloh",v:true,since:"6 Std."},{name:"GhostByte",v:false,since:"7 Std."}
    ]
};

/* ---------------- HELPER ---------------- */
const $ = s => document.querySelector(s);
const scenes = {
    road:  "linear-gradient(180deg,#3a2c20,#86532f 38%,#cf8047 50%,#5a3b27 60%,#171109)",
    street:"linear-gradient(180deg,#5d6b7a,#8a99a8 30%,#6b7686 48%,#3f4a57 64%,#1c2128)",
    city:  "linear-gradient(180deg,#10203a,#1c3358 40%,#2a4a72 55%,#101d30 75%,#070d18)",
    club:  "linear-gradient(150deg,#1a0a2a,#4a1466 40%,#a01e7a 60%,#2a0a3a 80%,#0c0414)",
    desert:"linear-gradient(180deg,#9aa9c2,#c9b48a 36%,#b89763 52%,#7a6440 66%,#2b2418)",
    ems:   "linear-gradient(180deg,#0f2a2a,#15524a 38%,#1d7a68 52%,#0e3a34 66%,#06140f)"
};
const sceneKeys = Object.keys(scenes);
const avatarColors = [
    "linear-gradient(135deg,#3b82f6,#1e40af)","linear-gradient(135deg,#5eead4,#0d9488)",
    "linear-gradient(135deg,#a855f7,#6d28d9)","linear-gradient(135deg,#f59e0b,#b45309)",
    "linear-gradient(135deg,#ef4444,#991b1b)","linear-gradient(135deg,#4ade80,#15803d)",
    "linear-gradient(135deg,#ec4899,#9d174d)","linear-gradient(135deg,#06b6d4,#0e7490)"
];
const hash      = n => [...n].reduce((a,c)=>a+c.charCodeAt(0),0);
const colorFor  = n => avatarColors[hash(n)%avatarColors.length];
const sceneFor  = n => sceneKeys[hash(n)%sceneKeys.length];
const initials  = n => n.replace(/[^a-zA-Z0-9]/g,'').slice(0,2).toUpperCase();
const fmtNum    = n => n>=1000 ? (n/1000).toFixed(n>=10000?0:1).replace('.',',')+"k" : ""+n;
const fmtTime   = s => { s=Math.max(0,Math.floor(s)); const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;
    return `${h}:${String(m).padStart(2,'0')}:${String(x).padStart(2,'0')}`; };

const verifiedSvg = '<svg class="verified" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1.5l2.4 1.9 3-.4 1 2.9 2.8 1.2-.7 3 1.9 2.4-1.9 2.4.7 3-2.8 1.2-1 2.9-3-.4L12 22.5l-2.4-1.9-3 .4-1-2.9-2.8-1.2.7-3L1.6 11.5l1.9-2.4-.7-3 2.8-1.2 1-2.9 3 .4z"/><path d="m8.4 12.2 2.3 2.3 4.9-5" stroke="#fff" stroke-width="2.1" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/* ---------------- STATE ---------------- */
const state = { sort:"viewers", view:"grid", streams:[], offline:[], live:false };

/* ---------------- DATEN LADEN ---------------- */
async function loadData(){
    try{
        const r = await fetch(API_URL, {cache:"no-store"});
        if(!r.ok) throw new Error("HTTP "+r.status);
        const d = await r.json();
        state.streams = (d.streams||[]).map(normalize);
        state.offline = d.offline || [];
        setStats(d.stats || {}, true);
        setUpdate(true);
    }catch(e){
        // Backend nicht erreichbar → Demo
        state.streams = DEMO.streams.map(s=>normalize({...s, startedAt: Date.now()-s.uptime*1000}));
        state.offline = DEMO.offline;
        setStats({ streamsTotal:DEMO.stats.streamsTotal, players:DEMO.stats.players, playersMax:DEMO.stats.playersMax }, false);
        setUpdate(false);
    }
    renderGrid();
    renderOffline();
}

/* vereinheitlicht API- und Demo-Datensätze auf eine Form */
function normalize(s){
    const startedAt = s.startedAt ?? (s.uptime!=null ? Date.now()-s.uptime*1000 : Date.now());
    return {
        login:    s.login || (s.name||"").toLowerCase(),
        name:     s.name,
        v:        !!s.v,
        title:    s.title || "",
        viewers:  s.viewers || 0,
        followers:s.followers ?? null,
        startedAt,
        thumb:    s.thumb || null,         // echtes Twitch-Thumbnail (vom Backend)
        avatar:   s.avatar || null,        // echtes Profilbild (vom Backend)
        scene:    s.scene || sceneFor(s.name||"x"),
        tags:     (s.tags && s.tags.length) ? s.tags : ["GTARP","Deutsch"]
    };
}

/* ---------------- HEADER-STATS ---------------- */
function setStats(stats, live){
    state.live = live;
    $("#st-streams-total").textContent = stats.streamsTotal ?? "—";
    $("#st-players").textContent       = stats.players ?? "—";
    $("#st-players-max").textContent   = stats.playersMax ?? "—";
}
function setUpdate(live){
    const dot=$("#updateDot"), txt=$("#updateText");
    if(live){ dot.classList.remove("stale"); txt.textContent="wird aktualisiert"; }
    else    { dot.classList.add("stale");   txt.textContent="Demo-Modus"; }
}

/* ---------------- RENDER: GRID ---------------- */
function renderGrid(){
    const q = $("#searchOnline").value.trim().toLowerCase();
    let list = state.streams
        .map(s=>({...s, uptime:(Date.now()-s.startedAt)/1000}))
        .filter(s=> !q || s.name.toLowerCase().includes(q) || s.title.toLowerCase().includes(q));

    ({
        viewers:  ()=>list.sort((a,b)=>b.viewers-a.viewers),
        new:      ()=>list.sort((a,b)=>a.uptime-b.uptime),
        alpha:    ()=>list.sort((a,b)=>a.name.toLowerCase().localeCompare(b.name.toLowerCase())),
        uptime:   ()=>list.sort((a,b)=>b.uptime-a.uptime),
        followers:()=>list.sort((a,b)=>(b.followers||0)-(a.followers||0))
    })[state.sort]();

    const grid=$("#grid"), empty=$("#empty");
    grid.className = "grid"+(state.view==="list"?" list":"");
    if(!list.length){ grid.innerHTML=""; empty.style.display="block"; }
    else{
        empty.style.display="none";
        grid.innerHTML = list.map(s=>{
            const long = s.uptime>=5*3600;
            const sceneEl = s.thumb
                ? `<img class="scene" src="${s.thumb}" alt="" loading="lazy">`
                : `<div class="scene" style="background:${scenes[s.scene]||scenes.city}"></div>`;
            const avatarEl = s.avatar
                ? `<div class="avatar"><img src="${s.avatar}" alt=""></div>`
                : `<div class="avatar" style="background:${colorFor(s.name)}">${initials(s.name)}</div>`;
            const followers = s.followers!=null
                ? `<div class="followers"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 14c2.5.4 4 2.3 4 6"/></svg>${fmtNum(s.followers)} Follower</div>` : "";
            return `<article class="card" data-login="${s.login}">
        <div class="thumb">
          ${sceneEl}
          <span class="live-tag"><span class="d"></span>LIVE</span>
          <span class="badge views"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg><span class="vc">${s.viewers}</span></span>
          <span class="badge time ${long?'long':''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><span class="ut" data-start="${s.startedAt}">${fmtTime(s.uptime)}</span></span>
        </div>
        <div class="card-body">
          ${avatarEl}
          <div class="card-info">
            <div class="streamer"><span class="name">${s.name}</span>${s.v?verifiedSvg:''}</div>
            <div class="title">${s.title}</div>
            ${followers}
            <div class="tags">${s.tags.map(t=>`<span class="tag ${t==='Deutsch'?'':'brand'}">${t}</span>`).join('')}</div>
          </div>
        </div>
      </article>`;
        }).join('');
    }

    $("#st-streams").textContent = list.length;
    $("#st-viewers").textContent = list.reduce((a,s)=>a+s.viewers,0).toLocaleString('de-DE');
}

/* ---------------- RENDER: OFFLINE ---------------- */
function renderOffline(){
    const q=$("#searchOffline").value.trim().toLowerCase();
    const list=state.offline.filter(o=>!q||o.name.toLowerCase().includes(q));
    $("#offCount").textContent = `${list.length}/${state.offline.length}`;
    $("#offlineList").innerHTML = list.map(o=>{
        const av = o.avatar
            ? `<div class="av"><img src="${o.avatar}" alt=""></div>`
            : `<div class="av" style="background:${colorFor(o.name)}">${initials(o.name)}</div>`;
        return `<div class="off-item" data-login="${(o.login||o.name).toLowerCase()}">
      ${av}
      <div class="meta">
        <div class="nm">${o.name}${o.v?verifiedSvg:''}</div>
        <div class="since">seit ${o.since}</div>
      </div>
    </div>`;
    }).join('');
}

/* ---------------- EVENTS ---------------- */
$("#sortList").addEventListener("click",e=>{
    const b=e.target.closest(".sort-btn"); if(!b)return;
    document.querySelectorAll(".sort-btn").forEach(x=>x.classList.remove("active"));
    b.classList.add("active"); state.sort=b.dataset.sort; renderGrid();
});
$("#viewSeg").addEventListener("click",e=>{
    const b=e.target.closest("button"); if(!b)return;
    document.querySelectorAll("#viewSeg button").forEach(x=>x.classList.remove("active"));
    b.classList.add("active"); state.view=b.dataset.view; renderGrid();
});
$("#themeSeg").addEventListener("click",e=>{
    const b=e.target.closest("button"); if(!b)return;
    document.querySelectorAll("#themeSeg button").forEach(x=>x.classList.remove("active"));
    b.classList.add("active"); document.documentElement.dataset.theme=b.dataset.theme;
});
$("#searchOnline").addEventListener("input",renderGrid);
$("#searchOffline").addEventListener("input",renderOffline);
document.addEventListener("click",e=>{
    const item=e.target.closest("[data-login]"); if(!item)return;
    window.open("https://twitch.tv/"+item.dataset.login,"_blank");
});

/* ---------------- LIVE-TICK ---------------- */
// Streamzeit jede Sekunde hochzählen (ohne Re-Render)
setInterval(()=>{
    document.querySelectorAll(".ut").forEach(el=>{
        el.textContent = fmtTime((Date.now()-Number(el.dataset.start))/1000);
        el.closest(".badge").classList.toggle("long",(Date.now()-Number(el.dataset.start))/1000>=5*3600);
    });
},1000);

// Im Demo-Modus die Zuschauerzahlen leicht "atmen" lassen
setInterval(()=>{
    if(state.live) return;
    state.streams.forEach(s=>{ s.viewers=Math.max(3,s.viewers+Math.round((Math.random()-.5)*Math.max(2,s.viewers*0.04))); });
    if(state.sort==="viewers") renderGrid();
    else {
        document.querySelectorAll(".card").forEach(c=>{
            const s=state.streams.find(x=>x.login===c.dataset.login);
            const vc=c.querySelector(".vc"); if(s&&vc) vc.textContent=s.viewers;
        });
        $("#st-viewers").textContent = state.streams.reduce((a,s)=>a+s.viewers,0).toLocaleString('de-DE');
    }
},8000);

/* ---------------- START ---------------- */
loadData();
setInterval(loadData, REFRESH_MS);