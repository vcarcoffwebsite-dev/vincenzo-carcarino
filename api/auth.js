// ==========================================================
//  api/auth.js — GitHub OAuth proxy per Decap CMS
//  Variabili d'ambiente richieste su Vercel:
//    GITHUB_CLIENT_ID      → dalla GitHub OAuth App
//    GITHUB_CLIENT_SECRET  → dalla GitHub OAuth App
// ==========================================================

const GITHUB_CLIENT_ID     = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const SITE_URL             = process.env.SITE_URL || 'https://vincenzocarcarino.it';

module.exports = async function handler(req, res) {
  const { searchParams } = new URL(req.url, `https://${req.headers.host}`);
  const action = searchParams.get('action') || req.query?.action;
  const code   = searchParams.get('code')   || req.query?.code;

  // Step 1 — Redirect a GitHub per autorizzazione
  if (action === 'auth' || (!action && !code)) {
    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      redirect_uri: `${SITE_URL}/api/auth?action=callback`,
      scope: 'repo,user',
    });
    return res.redirect(302, `https://github.com/login/oauth/authorize?${params}`);
  }

  // Step 2 — Callback da GitHub, scambia code → token
  if (action === 'callback' && code) {
    try {
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept':        'application/json',
        },
        body: JSON.stringify({
          client_id:     GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code,
        }),
      });

      const tokenData = await tokenRes.json();

      if (tokenData.error) {
        return res.status(400).send(`
          <script>
            window.opener.postMessage(
              'authorization:github:error:${JSON.stringify(tokenData.error)}',
              '*'
            );
          </script>
        `);
      }

      // Invia il token al CMS tramite postMessage
      const token    = tokenData.access_token;
      const provider = 'github';
      return res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Autorizzazione completata</title></head>
        <body>
          <script>
            (function() {
              function receiveMessage(e) {
                console.log("Ricevuto messaggio:", e.origin);
                window.opener.postMessage(
                  'authorization:${provider}:success:{"token":"${token}","provider":"${provider}"}',
                  e.origin
                );
              }
              window.addEventListener("message", receiveMessage, false);
              window.opener.postMessage("authorizing:${provider}", "*");
            })();
          </script>
          <p>Autorizzazione completata. Puoi chiudere questa finestra.</p>
        </body>
        </html>
      `);
    } catch (err) {
      console.error('OAuth error:', err);
      return res.status(500).send('Errore durante l\'autenticazione.');
    }
  }

  return res.status(400).send('Richiesta non valida.');
};
