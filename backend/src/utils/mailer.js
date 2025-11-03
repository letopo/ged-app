// backend/src/utils/mailer.js
import nodemailer from 'nodemailer';

/**
 * Fonction pour envoyer un email de notification
 * @param {string} to - Email du destinataire
 * @param {string} subject - Sujet de l'email
 * @param {string} text - Contenu de l'email
 */
export const sendNotificationEmail = async (to, subject, text) => {
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
      from: `"GED HSJM" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2563eb; padding-bottom: 20px;">
                <h1 style="color: #2563eb; margin: 0; font-size: 24px;">
                  HÔPITAL SAINT JEAN DE MALTE
                </h1>
                <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 14px;">
                  Système de Gestion Électronique de Documents
                </p>
              </div>

              <!-- Content -->
              <div style="margin-bottom: 30px;">
                <h2 style="color: #1f2937; font-size: 20px; margin: 0 0 15px 0;">
                  ${subject}
                </h2>
                <p style="color: #4b5563; line-height: 1.6; margin: 0; font-size: 15px;">
                  ${text}
                </p>
              </div>

              <!-- Action Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="http://localhost:3001/tasks" 
                   style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; font-size: 14px;">
                  Accéder à mes tâches
                </a>
              </div>

              <!-- Footer -->
              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
                  Ceci est un message automatique, merci de ne pas y répondre directement.
                </p>
                <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0 0; text-align: center;">
                  © ${new Date().getFullYear()} Hôpital Saint Jean de Malte - Douala, Cameroun
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
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