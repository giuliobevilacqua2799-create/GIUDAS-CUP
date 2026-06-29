# Setup Firebase — Guida Rapida

## 1. Crea il progetto Firebase

1. Vai su https://console.firebase.google.com
2. Clicca **"Aggiungi progetto"** → nome: `torneo-wc2026` → continua
3. Disabilita Google Analytics (non necessario) → crea progetto

## 2. Abilita il Realtime Database

1. Nel menu laterale: **Build → Realtime Database**
2. Clicca **"Crea database"**
3. Seleziona la region: **europe-west1 (Belgium)**
4. Scegli **"Avvia in modalità test"** → poi applicherai le regole corrette

## 3. Abilita Authentication

1. Nel menu: **Build → Authentication → Inizia**
2. Scheda **"Sign-in method"**
3. Abilita **Anonimo** (per i partecipanti)
4. Abilita **Email/password** (per l'admin)

## 4. Crea l'account admin

1. In Authentication → **Utenti → Aggiungi utente**
2. Email: la tua email (es. `giulio.bevilacqua2799@gmail.com`)
3. Password: scegli una password sicura

## 5. Ottieni la configurazione Firebase

1. In Firebase Console → **Impostazioni progetto** (⚙️) → scheda **"Generale"**
2. Scorri fino a **"Le tue app"** → clicca **"</> Web"**
3. Registra l'app con un nome (es. `torneo-web`)
4. Copia l'oggetto `firebaseConfig`

## 6. Incolla la config nei file HTML

Apri questi 3 file e sostituisci il blocco `firebase.initializeApp({...})`:

- `index.html` (riga ~80)
- `leaderboard.html` (riga ~65)
- `admin.html` (riga ~100)

Sostituisci `YOUR_API_KEY`, `YOUR_PROJECT`, ecc. con i tuoi valori reali.

```javascript
firebase.initializeApp({
  apiKey:            "AIzaSy...",
  authDomain:        "torneo-wc2026.firebaseapp.com",
  databaseURL:       "https://torneo-wc2026-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "torneo-wc2026",
  storageBucket:     "torneo-wc2026.firebasestorage.app",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abcdef"
});
```

## 7. Applica le Security Rules

1. In Firebase Console → **Realtime Database → Regole**
2. Copia il contenuto di `firebase-rules.json` e incollalo
3. Clicca **"Pubblica"**

## 8. Hosting (condividi il link con gli amici)

**Opzione A — GitHub Pages (gratuito, facile):**
1. Crea un repository pubblico su GitHub
2. Carica tutti i file nella cartella `torneo/`
3. In Settings → Pages → Source: `main` branch, cartella root
4. Il link sarà: `https://tuonome.github.io/torneo-wc2026/`

**Opzione B — Firebase Hosting (gratuito):**
1. Installa Firebase CLI: `npm install -g firebase-tools`
2. Nella cartella `torneo/`: `firebase login` poi `firebase init hosting`
3. Public directory: `.` (cartella corrente)
4. `firebase deploy`
5. Il link sarà: `https://torneo-wc2026.web.app`

**Opzione C — Locale (solo per testare):**
Non aprire i file direttamente con `file://` — Firebase SDK richiede HTTP.
Usa VS Code con l'estensione **Live Server** (tasto destro → "Open with Live Server").

## 9. Primo avvio

1. Apri `admin.html` → accedi con la tua email/password
2. Vai in **"Configurazione"** → inserisci le 16 partite del Turno dei 32
3. Clicca **"Salva Accoppiamenti"**
4. Vai in **"Gestione"** → verifica che le predizioni siano aperte
5. Condividi il link di `index.html` con gli amici!

## Struttura file

```
torneo/
├── index.html          → Bracket editor (link da condividere)
├── leaderboard.html    → Classifica in tempo reale
├── admin.html          → Pannello admin
├── css/style.css
├── js/
│   ├── common.js       → Dati condivisi + logica scoring
│   ├── app.js          → Bracket editor
│   ├── leaderboard.js  → Classifica
│   └── admin.js        → Pannello admin
└── firebase-rules.json → Regole di sicurezza Firebase
```

## Punteggio

| Turno | Punti/squadra |
|-------|--------------|
| Turno dei 32 | 1 |
| Ottavi | 2 |
| Quarti | 4 |
| Semifinali | 8 |
| 3° posto | 8 |
| Finalista | 16 |
| 🏆 Campione | 32 |
| Bonus (MVP, Giovane, Portiere) | 5 cad. |
| **Massimo** | **135** |
