/* ============================================================
   Artistry Gaming – Streamerübersicht  ·  server.js
   ------------------------------------------------------------
   Node-Backend ohne externe Abhängigkeiten (benötigt Node 18+).
   - Fragt die Twitch-Helix-API nach GTA-V-Streams ab
   - Filtert nach Titel-Keywords (z. B. "artistry", "[ag]")
   - Liefert Live-Streams + Offline-Liste + Stats als JSON
   - Serviert die Dateien aus /public
   - Optional: liest die Spielerzahl vom FiveM-Server

   START:  node server.js
   ============================================================ */

const http = require("http");
const fs   = require("fs");
const path = require("path");

/* ----------------------- KONFIG ----------------------- */
const CONFIG = {
    PORT:          process.env.PORT          || 2005,

    // Twitch Developer App: https://dev.twitch.tv/console/apps
    CLIENT_ID:     process.env.TWITCH_CLIENT_ID,     //|| "kt920x90a52xn69p46s4xx782s41vd",
    CLIENT_SECRET: process.env.TWITCH_CLIENT_SECRET, //|| "24fkhzf7hsiazs6olce5ynwfbhz3v7",

    GAME_ID:       "32982",                          // GTA V (Twitch game_id)
    KEYWORDS:      ["[ArtistryGaming]", "[AGRP]", "[AG]"], // im Stream-Titel gesucht (lowercase)

    REFRESH_MS:    60_000,                            // Cache-Dauer / Twitch-Abruf-Intervall
    OFFLINE_TTL_H: 12,                                // Channel nach X Std. aus Offline-Liste entfernen

    // Optional: FiveM-Server für die Spielerzahl. Leer lassen, wenn nicht gewünscht.
    // Beispiel: "http://123.45.67.89:30120"
    FIVEM_ENDPOINT: process.env.FIVEM_ENDPOINT || "",
    PLAYERS_MAX:    Number(process.env.PLAYERS_MAX || 256)
};

/* ----------------------- TWITCH AUTH ----------------------- */
let token = { value: null, expires: 0 };

async function getToken(){
    if(token.value && Date.now() < token.expires - 60_000) return token.value;
    const url = `https://id.twitch.tv/oauth2/token?client_id=${CONFIG.CLIENT_ID}`
        + `&client_secret=${CONFIG.CLIENT_SECRET}&grant_type=client_credentials`;
    const r = await fetch(url, { method:"POST" });
    if(!r.ok) throw new Error("Twitch-Token fehlgeschlagen: "+r.status);
    const d = await r.json();
    token = { value: d.access_token, expires: Date.now() + d.expires_in*1000 };
    return token.value;
}

function twHeaders(tok){ return { "Client-Id": CONFIG.CLIENT_ID, "Authorization": "Bearer "+tok }; }

/* ----------------------- TWITCH ABFRAGEN ----------------------- */
// Alle GTA-V-Streams holen (paginiert) und nach Keyword filtern
async function fetchMatchingStreams(tok){
    const matched = [];
    let cursor = null, pages = 0;
    do{
        const u = new URL("https://api.twitch.tv/helix/streams");
        u.searchParams.set("game_id", CONFIG.GAME_ID);
        u.searchParams.set("first", "100");
        if(cursor) u.searchParams.set("after", cursor);
        const r = await fetch(u, { headers: twHeaders(tok) });
        if(!r.ok) throw new Error("Twitch /streams: "+r.status);
        const d = await r.json();
        for(const s of d.data){
            const t = (s.title||"").toLowerCase();
            if(CONFIG.KEYWORDS.some(k => t.includes(k))) matched.push(s);
        }
        cursor = d.pagination?.cursor;
        pages++;
    } while(cursor && pages < 6); // bis zu 600 GTA-Streams scannen
    return matched;
}

// Profilbilder + Partner-Status (= "verified"-Häkchen) für mehrere User holen
async function fetchUsers(tok, logins){
    const map = {};
    for(let i=0; i<logins.length; i+=100){
        const chunk = logins.slice(i, i+100);
        const u = new URL("https://api.twitch.tv/helix/users");
        chunk.forEach(l => u.searchParams.append("login", l));
        const r = await fetch(u, { headers: twHeaders(tok) });
        if(!r.ok) continue;
        const d = await r.json();
        d.data.forEach(usr => map[usr.login] = usr);
    }
    return map;
}

/* ----------------------- FIVEM SPIELERZAHL ----------------------- */
async function fetchPlayers(){
    if(!CONFIG.FIVEM_ENDPOINT) return { players: null, playersMax: CONFIG.PLAYERS_MAX };
    try{
        const [pRes, iRes] = await Promise.all([
            fetch(CONFIG.FIVEM_ENDPOINT + "/players.json"),
            fetch(CONFIG.FIVEM_ENDPOINT + "/info.json")
        ]);
        const players = pRes.ok ? (await pRes.json()).length : null;
        let max = CONFIG.PLAYERS_MAX;
        if(iRes.ok){ const info = await iRes.json(); max = Number(info?.vars?.sv_maxClients) || max; }
        return { players, playersMax: max };
    }catch{ return { players: null, playersMax: CONFIG.PLAYERS_MAX }; }
}

/* ----------------------- AGGREGATION + CACHE ----------------------- */
const lastSeen = new Map();   // login -> { ts, name, avatar, v }  (für Offline-Liste)
let cache = { data: null, ts: 0 };

function sinceLabel(ms){
    const min = Math.floor((Date.now()-ms)/60000);
    if(min < 60) return `${Math.max(1,min)} Min.`;
    return `${Math.floor(min/60)} Std.`;
}

async function buildPayload(){
    const tok = await getToken();
    const live = await fetchMatchingStreams(tok);
    const users = await fetchUsers(tok, live.map(s => s.user_login));

    const streams = live.map(s => {
        const usr = users[s.user_login] || {};
        // Offline-Tracking aktualisieren
        lastSeen.set(s.user_login, {
            ts: Date.now(), name: s.user_name,
            avatar: usr.profile_image_url || null,
            v: usr.broadcaster_type === "partner"
        });
        return {
            login:     s.user_login,
            name:      s.user_name,
            v:         usr.broadcaster_type === "partner",
            title:     s.title,
            viewers:   s.viewer_count,
            startedAt: new Date(s.started_at).getTime(),
            thumb:     s.thumbnail_url.replace("{width}","440").replace("{height}","248"),
            avatar:    usr.profile_image_url || null,
            followers: null, // exakte Follower-Zahl braucht User-Token mit Scope – hier weggelassen
            tags:      buildTags(s)
        };
    });

    // Offline-Liste: bekannte Channels, die gerade NICHT live sind
    const liveLogins = new Set(live.map(s => s.user_login));
    const offline = [];
    for(const [login, info] of lastSeen){
        const ageH = (Date.now()-info.ts)/3_600_000;
        if(ageH > CONFIG.OFFLINE_TTL_H){ lastSeen.delete(login); continue; }
        if(liveLogins.has(login)) continue;
        offline.push({ login, name: info.name, v: info.v, avatar: info.avatar, since: sinceLabel(info.ts), _ts: info.ts });
    }
    offline.sort((a,b)=>b._ts-a._ts).forEach(o=>delete o._ts);

    const { players, playersMax } = await fetchPlayers();

    return {
        stats: {
            streamsTotal: lastSeen.size,        // alle je erfassten Channels
            players, playersMax
        },
        streams,
        offline,
        updatedAt: Date.now()
    };
}

function buildTags(s){
    const tags = [];
    const t = (s.title||"").toLowerCase();
    if(t.includes("[ag]")||t.includes("artistry")) tags.push("Artistry");
    if(Array.isArray(s.tags)) tags.push(...s.tags.slice(0,2));
    if(s.language === "de" && !tags.includes("Deutsch")) tags.push("Deutsch");
    return [...new Set(tags)].slice(0,4);
}

async function getData(){
    if(cache.data && Date.now()-cache.ts < CONFIG.REFRESH_MS) return cache.data;
    const data = await buildPayload();
    cache = { data, ts: Date.now() };
    return data;
}

/* ----------------------- STATISCHER SERVER ----------------------- */
const MIME = { ".html":"text/html",".css":"text/css",".js":"text/javascript",
    ".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg",".ico":"image/x-icon" };
const PUBLIC = path.join(__dirname, "public");

function serveStatic(req, res){
    let p = decodeURIComponent(req.url.split("?")[0]);
    if(p === "/") p = "/streams.html";
    const file = path.join(PUBLIC, path.normalize(p).replace(/^(\.\.[/\\])+/,""));
    if(!file.startsWith(PUBLIC)) { res.writeHead(403).end("Forbidden"); return; }
    fs.readFile(file, (err, buf) => {
        if(err){ res.writeHead(404).end("Not found"); return; }
        res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
        res.end(buf);
    });
}

/* ----------------------- HTTP SERVER ----------------------- */
http.createServer(async (req, res) => {
    if(req.url.startsWith("/api/streams")){
        try{
            const data = await getData();
            res.writeHead(200, { "Content-Type":"application/json", "Access-Control-Allow-Origin":"*" });
            res.end(JSON.stringify(data));
        }catch(e){
            console.error("API-Fehler:", e.message);
            res.writeHead(500, { "Content-Type":"application/json" });
            res.end(JSON.stringify({ error: e.message }));
        }
        return;
    }
    serveStatic(req, res);
}).listen(CONFIG.PORT, () => {
    console.log(`\n  Artistry Streamerübersicht läuft:  http://localhost:${CONFIG.PORT}`);
    if(CONFIG.CLIENT_ID === "DEINE_CLIENT_ID")
        console.log("  ⚠  Trage zuerst TWITCH_CLIENT_ID und TWITCH_CLIENT_SECRET ein (siehe README).\n");
});