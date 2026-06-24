# Artistry Gaming – Streamerübersicht

Eine Streamerübersicht im Stil von `streams.homestate.eu`, im Artistry-Gaming-Branding.
Listet automatisch alle Twitch-Streams, die GTA V als Kategorie haben **und** ein
Keyword (z. B. `Artistry` oder `[AG]`) im Titel führen.

## Aufbau

```
artistry-streams/
├── server.js          # Node-Backend (Twitch-API + statischer Server), keine Dependencies
├── README.md
└── public/
    ├── streams.html   # Markup
    ├── style.css      # Styles (Frosted-Glass-Design)
    └── streams.js     # Frontend-Logik (lädt /api/streams, Fallback: Demo-Daten)
```

Das Frontend läuft auch **ohne** Backend – dann zeigt es Demo-Daten und blendet
oben rechts „Demo-Modus" ein.

## Einrichtung (echte Twitch-Daten)

1. **Twitch-App registrieren:** https://dev.twitch.tv/console/apps → *Register Your Application*.
   OAuth Redirect URL: `http://localhost:3000` genügt. Du bekommst **Client ID** und **Client Secret**.

2. **Konfiguration anlegen:** Kopiere `.env.example` zu `.env` und trage deine Werte ein:

   ```bash
   cp .env.example .env
   ```

   ```env
   TWITCH_CLIENT_ID=deine_client_id
   TWITCH_CLIENT_SECRET=dein_client_secret
   PORT=3000
   ```

3. **Starten** (Node 18+ nötig, wegen eingebautem `fetch`):

   ```bash
   node server.js
   ```

   Die `.env` wird automatisch geladen (kein zusätzliches Paket nötig). Alternativ gehen
   weiterhin direkte Umgebungsvariablen, die Vorrang vor der `.env` haben:

   ```bash
   TWITCH_CLIENT_ID=xxx TWITCH_CLIENT_SECRET=yyy node server.js
   ```

4. Öffne **http://localhost:3000**

> Die echte `.env` gehört nicht in ein öffentliches Repo – sie ist in `.gitignore` bereits ausgeschlossen.

## Konfiguration (in `server.js` → `CONFIG`)

| Feld | Bedeutung |
|------|-----------|
| `KEYWORDS` | Titel-Stichwörter, die einen Stream erfassen (lowercase) |
| `GAME_ID` | `32982` = GTA V. Nicht ändern, außer ihr nutzt eine andere Kategorie |
| `REFRESH_MS` | Wie oft die Twitch-API abgefragt wird (Standard 60s, schont das Rate-Limit) |
| `OFFLINE_TTL_H` | Nach wie vielen Stunden ein Channel aus der Offline-Liste fällt |
| `FIVEM_ENDPOINT` | Optional, z. B. `http://IP:30120` – holt echte Spielerzahl via `players.json` |

## Hinweise

- **Offline-Liste:** Channels erscheinen dort, sobald sie einmal live mit Keyword erfasst
  wurden und danach offline gehen. Beim ersten Start ist die Liste leer und füllt sich
  mit der Zeit. Eine feste Startliste kann man bei Bedarf in `lastSeen` vorbefüllen.
- **„Verified"-Häkchen:** entspricht Twitch-Partnern (`broadcaster_type === "partner"`).
- **Follower-Zahl:** Twitch erlaubt das exakte Auslesen nur mit einem User-Token + Scope
  pro Channel, daher hier weggelassen. Bei Bedarf nachrüstbar.
- **Deployment:** Hinter einen Reverse-Proxy (nginx) setzen und per `systemd`/`pm2`
  dauerhaft laufen lassen.