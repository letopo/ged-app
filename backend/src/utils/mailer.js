// backend/src/utils/mailer.js
import nodemailer from 'nodemailer';

/**
 * Fonction pour envoyer un email de notification
 * @param {string} to - Email du destinataire
 * @param {string} subject - Sujet de l'email
 * @param {string} text - Contenu de l'email
 */
/**
 * Genere le HTML d'un email selon le type de notification
 */
const getEmailHTML = (subject, text, type = 'default', link = null) => {
  const colors = {
    approved: { accent: '#16a34a', bg: '#f0fdf4', icon: '&#10004;' },
    rejected: { accent: '#dc2626', bg: '#fef2f2', icon: '&#10006;' },
    task:     { accent: '#2563eb', bg: '#eff6ff', icon: '&#9997;' },
    chat:     { accent: '#6366f1', bg: '#eef2ff', icon: '&#128172;' },
    mention:  { accent: '#8b5cf6', bg: '#f5f3ff', icon: '&#64;' },
    default:  { accent: '#2563eb', bg: '#eff6ff', icon: '&#128196;' },
  };
  const c = colors[type] || colors.default;

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f3f4f6;">
      <div style="max-width:600px;margin:0 auto;padding:20px;">
        <div style="background-color:white;border-radius:12px;padding:30px;box-shadow:0 2px 8px rgba(0,0,0,0.08);border-top:4px solid ${c.accent};">
          <div style="text-align:center;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid #e5e7eb;">
            <h1 style="color:${c.accent};margin:0;font-size:22px;">GED - HSJM</h1>
            <p style="color:#6b7280;margin:4px 0 0;font-size:13px;">Gestion Electronique de Documents</p>
          </div>
          <div style="background:${c.bg};border-radius:8px;padding:16px 20px;margin-bottom:20px;">
            <h2 style="color:#1f2937;font-size:18px;margin:0 0 8px;">${subject}</h2>
            <p style="color:#4b5563;line-height:1.6;margin:0;font-size:14px;">${text}</p>
          </div>
          <div style="text-align:center;margin:24px 0;">
            <a href="${link || `${process.env.APP_URL || 'http://localhost:3001'}/my-tasks`}"
               style="display:inline-block;background-color:${c.accent};color:white;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:bold;font-size:14px;">
              Acceder a la GED
            </a>
          </div>
          <div style="border-top:1px solid #e5e7eb;padding-top:16px;margin-top:24px;">
            <p style="color:#9ca3af;font-size:11px;margin:0;text-align:center;">
              Message automatique - Ne pas repondre directement.<br/>
              &copy; ${new Date().getFullYear()} Hopital Saint Jean de Malte - Douala, Cameroun
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const sendNotificationEmail = async (to, subject, text, type = 'default', link = null) => {
  try {
    // Si les notifications sont désactivées, on log seulement
    if (process.env.WORKFLOW_ENABLE_NOTIFICATIONS === 'false') {
      console.log('📧 [EMAIL SIMULÉ] ─────────────────────');
      console.log(`À: ${to}`);
      console.log(`Sujet: ${subject}`);
      console.log(`Message: ${text}`);
      console.log('──────────────────────────────────────');
      return { success: true, messageId: 'simulated-' + Date.now() };
    }

    // Configuration du transporteur avec vos credentials
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false, // true pour 465, false pour 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false // Pour éviter les erreurs de certificat en dev
      }
    });

    // Vérifier la connexion
    await transporter.verify();
    console.log('✅ Connexion SMTP établie');

    // Options de l'email
    const mailOptions = {
      from: `"GED HSJM" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html: getEmailHTML(subject, text, type, link),
    };

    // Envoyer l'email
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email envoyé avec succès:', info.messageId);
    console.log(`   Destinataire: ${to}`);
    console.log(`   Sujet: ${subject}`);
    
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('❌ Erreur envoi email:', error.message);
    // Ne pas bloquer le processus si l'email échoue
    return { success: false, error: error.message };
  }
};

/**
 * Fonction pour tester la configuration email
 */
export const testEmailConfig = async () => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.verify();
    console.log('✅ Configuration email valide');
    return true;
  } catch (error) {
    console.error('❌ Configuration email invalide:', error.message);
    return false;
  }
};

export default { sendNotificationEmail, testEmailConfig };