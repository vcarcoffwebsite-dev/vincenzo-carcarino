const nodemailer = require('nodemailer');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Dati non validi' }) };
  }

  const { nome, email, oggetto, messaggio, hcaptcha_token } = data;

  // Validazione base
  if (!nome || !email || !oggetto || !messaggio) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Tutti i campi sono obbligatori.' }) };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Email non valida.' }) };
  }
  if (messaggio.length < 10) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Messaggio troppo breve.' }) };
  }

  // Verifica hCaptcha
  const hcaptchaSecret = process.env.HCAPTCHA_SECRET;
  if (hcaptchaSecret && hcaptcha_token) {
    const verifyRes = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${hcaptchaSecret}&response=${hcaptcha_token}`
    });
    const verifyData = await verifyRes.json();
    if (!verifyData.success) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Verifica captcha fallita. Riprova.' }) };
    }
  }

  const oggettiMap = {
    booking: '🎤 Richiesta Booking / Prenotazione',
    collaborazione: '🤝 Proposta di Collaborazione',
    stampa: '📰 Stampa e Media',
    fan: '💛 Messaggio da un Fan',
    altro: '✉ Altro'
  };
  const oggettoLabel = oggettiMap[oggetto] || oggetto;

  // Corpo email HTML
  const bodyHtml = `
  <!DOCTYPE html>
  <html lang="it">
  <head><meta charset="UTF-8"><style>
    body{font-family:Georgia,serif;background:#0a0a0a;color:#e8e0d0;margin:0;padding:0}
    .wrap{max-width:600px;margin:0 auto;background:#111;border:1px solid rgba(201,168,76,0.2)}
    .header{background:#0a0a0a;padding:30px 40px;border-bottom:2px solid #c9a84c}
    .header h1{font-size:22px;color:#c9a84c;margin:0;letter-spacing:0.1em}
    .header p{color:#8a8070;font-size:12px;margin:5px 0 0;letter-spacing:0.2em;text-transform:uppercase}
    .body{padding:35px 40px}
    .field{margin-bottom:22px}
    .field label{display:block;font-size:11px;letter-spacing:0.25em;text-transform:uppercase;color:#c9a84c;margin-bottom:6px}
    .field .value{font-size:15px;color:#e8e0d0;line-height:1.7;background:#1a1a1a;padding:12px 15px;border-left:3px solid #c9a84c}
    .footer{background:#0a0a0a;padding:20px 40px;border-top:1px solid rgba(201,168,76,0.1);font-size:11px;color:#8a8070;text-align:center}
  </style></head>
  <body><div class="wrap">
    <div class="header"><h1>Vincenzo Carcarino</h1><p>Nuovo messaggio dal sito ufficiale</p></div>
    <div class="body">
      <div class="field"><label>Da</label><div class="value">${nome}</div></div>
      <div class="field"><label>Email</label><div class="value">${email}</div></div>
      <div class="field"><label>Oggetto</label><div class="value">${oggettoLabel}</div></div>
      <div class="field"><label>Messaggio</label><div class="value">${messaggio.replace(/\n/g, '<br>')}</div></div>
    </div>
    <div class="footer">Inviato il ${new Date().toLocaleDateString('it-IT')} — vincenzocarcarino.it</div>
  </div></body></html>`;

  // Email di conferma al mittente
  const confirmHtml = `
  <!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><style>
    body{font-family:Georgia,serif;background:#0a0a0a;color:#e8e0d0;margin:0}
    .wrap{max-width:600px;margin:0 auto;background:#111;border:1px solid rgba(201,168,76,0.2)}
    .header{background:#0a0a0a;padding:30px 40px;border-bottom:2px solid #c9a84c}
    .header h1{font-size:22px;color:#c9a84c;margin:0}
    .body{padding:35px 40px;font-size:15px;line-height:1.8;color:#e8e0d0}
    .footer{background:#0a0a0a;padding:20px 40px;border-top:1px solid rgba(201,168,76,0.1);font-size:11px;color:#8a8070;text-align:center}
  </style></head><body><div class="wrap">
    <div class="header"><h1>Vincenzo Carcarino</h1></div>
    <div class="body">
      <p>Ciao <strong>${nome}</strong>,</p>
      <p>grazie per avermi scritto! Ho ricevuto il tuo messaggio e ti risponderò al più presto.</p>
      <p style="color:#8a8070;margin-top:2rem">— Vincenzo Carcarino</p>
    </div>
    <div class="footer">vincenzocarcarino.it</div>
  </div></body></html>`;

  // Invio via Netlify (usa variabili d'ambiente SMTP)
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const destinatario = process.env.CONTACT_EMAIL || 'info@vincenzocarcarino.it';

    // Email a Vincenzo
    await transporter.sendMail({
      from: `"Sito Vincenzo Carcarino" <${process.env.SMTP_USER}>`,
      to: destinatario,
      replyTo: `"${nome}" <${email}>`,
      subject: `[Sito] ${oggettoLabel} — ${nome}`,
      html: bodyHtml,
    });

    // Email di conferma al mittente
    await transporter.sendMail({
      from: `"Vincenzo Carcarino" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Ho ricevuto il tuo messaggio — Vincenzo Carcarino',
      html: confirmHtml,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Messaggio inviato con successo! Ti risponderò presto.' })
    };
  } catch (err) {
    console.error('Email error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Errore nell\'invio. Riprova o scrivi direttamente all\'email indicata.' })
    };
  }
};
