# 🎵 Vincenzo Carcarino — Setup Vercel + Decap CMS

## File inclusi in questo pacchetto

```
vercel.json          → configurazione Vercel
package.json         → dipendenze (nodemailer)
api/contact.js       → form contatti (hCaptcha + SMTP Aruba)
api/auth.js          → OAuth GitHub per Decap CMS
admin/index.html     → pannello CMS
admin/config.yml     → configurazione CMS (tutte le sezioni)
```

---

## STEP 1 — Copia i file nel repo GitHub

Copia questi file nel repo `vcarcoffwebsite-dev/vincenzo-carcarino`:
- `vercel.json` → nella root
- `package.json` → nella root
- `api/` → nella root
- `admin/` → nella root

---

## STEP 2 — GitHub OAuth App (per il CMS)

1. Vai su https://github.com/settings/developers
2. Clicca **"New OAuth App"**
3. Compila:
   - Application name: `Vincenzo Carcarino CMS`
   - Homepage URL: `https://vincenzocarcarino.it`
   - Authorization callback URL: `https://vincenzocarcarino.it/api/auth?action=callback`
4. Clicca **Register application**
5. Copia **Client ID** e **Client Secret** → ti servono nel prossimo step

---

## STEP 3 — Deploy su Vercel

1. Vai su https://vercel.com e accedi con GitHub
2. Clicca **"Add New Project"**
3. Importa il repo `vcarcoffwebsite-dev/vincenzo-carcarino`
4. Framework Preset: **Other**
5. Root Directory: lascia `/`
6. Clicca **"Environment Variables"** e aggiungi:

| Nome variabile       | Valore                          |
|---------------------|---------------------------------|
| `GITHUB_CLIENT_ID`  | (dalla OAuth App GitHub)        |
| `GITHUB_CLIENT_SECRET` | (dalla OAuth App GitHub)     |
| `HCAPTCHA_SECRET`   | (dalla dashboard hCaptcha)      |
| `SMTP_HOST`         | `smtpauth.aruba.it`             |
| `SMTP_PORT`         | `465`                           |
| `SMTP_USER`         | `info@vincenzocarcarino.it`     |
| `SMTP_PASS`         | (password casella Aruba)        |
| `MAIL_TO`           | `info@vincenzocarcarino.it`     |
| `SITE_URL`          | `https://vincenzocarcarino.it`  |

7. Clicca **Deploy** 🚀

---

## STEP 4 — Dominio Aruba su Vercel

1. Su Vercel → progetto → **Settings → Domains**
2. Aggiungi `vincenzocarcarino.it`
3. Vercel ti mostra i record DNS da inserire, tipo:
   - `A` → `76.76.21.21`
   - `CNAME www` → `cname.vercel-dns.com`
4. Vai su **Aruba → Pannello di controllo → DNS**
5. Inserisci quei record (sostituisci quelli esistenti se necessario)
6. Attendi 15-60 minuti per la propagazione

---

## STEP 5 — Accedere al CMS

1. Vai su `https://vincenzocarcarino.it/admin/`
2. Clicca **"Login with GitHub"**
3. Autorizza l'app
4. Sei dentro il pannello CMS!

---

## Note SMTP Aruba

- Crea la casella `info@vincenzocarcarino.it` dal pannello Aruba
- Host: `smtpauth.aruba.it`  
- Porta: `465` (SSL) oppure `587` (TLS)
- User: indirizzo email completo
- Pass: password della casella

---

## Struttura cartelle content (già nel repo)

```
content/
  impostazioni.json      ← impostazioni globali
  musica/                ← file .md per ogni brano/video
  eventi/                ← file .md per ogni evento
  discografia/           ← file .md per ogni release
  video/                 ← file .md per video gallery
  stampa/                ← file .md per articoli stampa
  gallery/               ← file .md per foto carosello
  collaboratori/         ← file .md per credits
  shop/                  ← file .md per prodotti
static/
  uploads/               ← immagini caricate dal CMS
```
