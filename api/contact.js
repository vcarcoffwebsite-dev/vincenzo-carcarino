// ==========================================================
//  api/contact.js — Vercel Serverless Function
//  Verifica hCaptcha + invia email via SMTP Aruba
//  Variabili d'ambiente richieste su Vercel:
//    HCAPTCHA_SECRET   → secret key hCaptcha
//    SMTP_HOST         → es. smtpauth.aruba.it
//    SMTP_PORT         → 465
//    SMTP_USER         → info@vincenzocarcarino.it
//    SMTP_PASS         → password casella Aruba
//    MAIL_TO           → indirizzo di ricezione
// ==========================================================

const nodemailer = require('nodemailer');

module.exports = async function handler(req, res) {

  // Solo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Metodo non consentito.' });
  }

  const { nome, email, oggetto, messaggio, hcaptcha_token } = req.body || {};

  // --- Validazione base ---
  if (!nome || !email || !oggetto || !messaggio) {
    return res.status(400).json({ success: false, error: 'Tutti i campi sono obbligatori.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: 'Email non valida.' });
  }
  if (messaggio.length < 10) {
    return res.status(400).json({ success: false, error: 'Messaggio troppo breve.' });
  }

  // --- Verifica hCaptcha ---
  const secret = process.env.HCAPTCHA_SECRET;
  if (secret) {
    if (!hcaptcha_token) {
      return res.status(400).json({ success: false, error: 'Captcha non completato.' });
    }
    try {
      const verify = await fetch('https://api.hcaptcha.com/siteverify', {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(hcaptcha_token)}`,
      });
      const result = await verify.json();
      if (!result.success) {
        return res.status(400).json({ success: false, error: 'Verifica captcha fallita. Riprova.' });
      }
    } catch (err) {
      console.error('hCaptcha verify error:', err);
      return res.status(500).json({ success: false, error: 'Errore verifica captcha.' });
    }
  }

  // --- Configurazione SMTP Aruba ---
  const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'smtpauth.aruba.it',
    port:   parseInt(process.env.SMTP_PORT || '465'),
    secure: true, // SSL
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false // compatibilità Aruba
    }
  });

  const mailTo = process.env.MAIL_TO || process.env.SMTP_USER;

  // --- Email di notifica (a Vincenzo) ---
  const notifyMail = {
    from:    `"Sito Vincenzo Carcarino" <${process.env.SMTP_USER}>`,
    to:      mailTo,
    replyTo: email,
    subject: `[Contatto Sito] ${oggetto} — da ${nome}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9f9f9;border-radius:8px;">
        <h2 style="color:#1a1a1a;border-bottom:2px solid #c9a96e;padding-bottom:12px;">
          Nuovo messaggio dal sito
        </h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#666;width:100px;vertical-align:top;"><strong>Nome:</strong></td>
            <td style="padding:8px 0;color:#1a1a1a;">${escHtml(nome)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#666;vertical-align:top;"><strong>Email:</strong></td>
            <td style="padding:8px 0;"><a href="mailto:${escHtml(email)}" style="color:#c9a96e;">${escHtml(email)}</a></td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#666;vertical-align:top;"><strong>Oggetto:</strong></td>
            <td style="padding:8px 0;color:#1a1a1a;">${escHtml(oggetto)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#666;vertical-align:top;"><strong>Messaggio:</strong></td>
            <td style="padding:8px 0;color:#1a1a1a;white-space:pre-wrap;">${escHtml(messaggio)}</td>
          </tr>
        </table>
        <p style="margin-top:24px;font-size:12px;color:#999;">
          Messaggio ricevuto il ${new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}
        </p>
      </div>
    `,
  };

  // --- Email di conferma automatica (al mittente) ---
  const confirmMail = {
    from:    `"Vincenzo Carcarino" <${process.env.SMTP_USER}>`,
    to:      email,
    subject: `Grazie per il tuo messaggio, ${nome}!`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0a0a0a;border-radius:8px;color:#f0f0f0;">
        <h2 style="color:#c9a96e;text-align:center;font-family:Georgia,serif;">
          Vincenzo Carcarino
        </h2>
        <p style="font-size:16px;">Ciao <strong>${escHtml(nome)}</strong>,</p>
        <p>Grazie per avermi contattato! Ho ricevuto il tuo messaggio e ti risponderò al più presto.</p>
        <hr style="border:none;border-top:1px solid #333;margin:20px 0;">
        <p style="color:#999;font-size:13px;"><strong>Il tuo messaggio:</strong></p>
        <blockquote style="border-left:3px solid #c9a96e;padding-left:16px;color:#ccc;margin:0;">
          ${escHtml(messaggio)}
        </blockquote>
        <hr style="border:none;border-top:1px solid #333;margin:20px 0;">
        <p style="text-align:center;margin-top:24px;">
          <a href="https://vincenzocarcarino.it" style="color:#c9a96e;text-decoration:none;">vincenzocarcarino.it</a>
        </p>
        <p style="font-size:11px;color:#555;text-align:center;">
          Questa è un'email automatica, non rispondere a questo indirizzo.
        </p>
      </div>
    `,
  };

  // --- Invio ---
  try {
    await transporter.sendMail(notifyMail);
    await transporter.sendMail(confirmMail);
    return res.status(200).json({
      success: true,
      message: 'Messaggio inviato! Riceverai una email di conferma a breve.',
    });
  } catch (err) {
    console.error('SMTP error:', err);
    return res.status(500).json({
      success: false,
      error: 'Errore nell\'invio. Riprova o contattami direttamente via email.',
    });
  }
};

// Escape HTML per prevenire XSS nelle email
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
