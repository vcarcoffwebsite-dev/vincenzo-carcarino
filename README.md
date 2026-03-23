# Vincenzo Carcarino — Sito v2
## Guida completa: GitHub + Netlify + Decap CMS

---

## STRUTTURA FILE

```
vincenzo-carcarino/
├── index.html                  ← Sito principale
├── netlify.toml                ← Configurazione Netlify
├── build.js                    ← Script build (genera manifest)
├── package.json
├── admin/
│   ├── index.html              ← Pannello CMS
│   └── config.yml              ← Configurazione CMS
├── assets/
│   ├── css/
│   │   ├── themes.css          ← 4 temi grafici
│   │   └── main.css            ← Stili principali
│   └── js/
│       └── main.js             ← Logica sito
├── content/
│   ├── impostazioni.json       ← Dati generali sito
│   ├── musica/                 ← Brani e video
│   ├── eventi/                 ← Date e concerti
│   ├── discografia/            ← Album e singoli
│   ├── video/                  ← Video gallery
│   ├── stampa/                 ← Rassegna stampa
│   ├── gallery/                ← Foto carosello
│   ├── collaboratori/          ← Team
│   └── shop/                   ← Prodotti
├── netlify/
│   └── functions/
│       └── contact.js          ← Invio email serverless
└── static/uploads/             ← Foto caricate dal CMS
```

---

## PASSO 1 — GITHUB

1. Vai su **github.com** → crea account gratuito
2. Clicca **New repository** → nome: `vincenzo-carcarino`
3. Lascia pubblico (necessario per Netlify gratuito)
4. **Non** inizializzare con README
5. Carica tutti i file del progetto:
   - Scarica **GitHub Desktop** (desktop.github.com) — molto più semplice
   - Oppure usa il tasto "uploading an existing file" su GitHub

---

## PASSO 2 — NETLIFY

1. Vai su **netlify.com** → Sign up con GitHub
2. Clicca **Add new site → Import an existing project**
3. Seleziona **GitHub** → autorizza → scegli il repo `vincenzo-carcarino`
4. Build settings:
   - **Build command**: `node build.js`
   - **Publish directory**: `.`
5. Clicca **Deploy site**
6. Il sito sarà live su `xxxxx.netlify.app` in 2 minuti!

---

## PASSO 3 — NETLIFY IDENTITY (per il CMS)

1. Nel pannello Netlify → **Site configuration → Identity**
2. Clicca **Enable Identity**
3. Vai su **Registration** → seleziona **Invite only**
4. Vai su **Services → Git Gateway** → clicca **Enable Git Gateway**
5. Vai su **Identity** → **Invite users** → inserisci la tua email
6. Riceverai un'email → clicca il link → imposta password

Da quel momento accedi al CMS su:
`https://tuosito.netlify.app/admin/`

---

## PASSO 4 — CONFIGURARE IL CMS

Accedi al pannello admin e configura:

### ⚙️ Impostazioni Sito
- Nome artista, tagline, tema grafico
- Foto hero e foto profilo
- Biografia (3 paragrafi)
- Link piattaforme musicali
- Email contatti

### 🎵 Musica
- Aggiungi brani MP3 o video YouTube
- Carica la copertina
- La sezione appare automaticamente

### 📅 Eventi
- Aggiungi date, orari, indirizzi
- Carica una foto per ogni evento
- Gli eventi passati spariscono in automatico

### 💿 Discografia, 🎬 Video, 📰 Stampa, ecc.
- Tutto funziona allo stesso modo
- Le sezioni vuote si nascondono automaticamente

---

## PASSO 5 — EMAIL CONTATTI

Il form usa una **Netlify Function** per inviare email.

1. Nel pannello Netlify → **Site configuration → Environment variables**
2. Aggiungi queste variabili:

| Variabile | Valore |
|-----------|--------|
| `SMTP_HOST` | `smtp.gmail.com` (o il tuo provider) |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | la tua email Gmail |
| `SMTP_PASS` | app password Gmail* |
| `CONTACT_EMAIL` | email di Vincenzo su Aruba |
| `HCAPTCHA_SECRET` | secret key da hcaptcha.com |

*Per Gmail: Impostazioni → Sicurezza → Password per le app

### hCaptcha (anti-spam)
1. Vai su **hcaptcha.com** → crea account gratuito
2. Aggiungi il tuo sito → ottieni **Site Key** e **Secret Key**
3. Nel CMS → Impostazioni → Contatti → incolla la **Site Key**
4. In Netlify → Environment variables → `HCAPTCHA_SECRET` = la **Secret Key**

---

## PASSO 6 — DOMINIO PERSONALIZZATO (opzionale)

1. Acquista `vincenzocarcarino.it` su **Aruba** (~10€/anno)
2. Nel pannello Netlify → **Domain management → Add domain**
3. Inserisci `vincenzocarcarino.it`
4. Netlify ti dà i **DNS da copiare** su Aruba
5. Su Aruba → gestione DNS → sostituisci i nameserver
6. In 24-48h il dominio punta al sito Netlify

---

## AGGIORNARE IL SITO

Ogni volta che modifichi un contenuto dal CMS:
1. Decap CMS salva il file su GitHub
2. Netlify rileva la modifica
3. Ricostruisce il sito in ~30 secondi
4. Il sito è aggiornato automaticamente ✅

---

## TEMI DISPONIBILI

| Tema | Stile |
|------|-------|
| `nero-oro` | Elegante, classico (default) |
| `bianco-blu` | Luminoso, mediterraneo |
| `sabbia-terracotta` | Caldo, napoletano |
| `bianco-retro` | Vintage, fotografico |

Si cambia da **CMS → Impostazioni → Tema Grafico**
