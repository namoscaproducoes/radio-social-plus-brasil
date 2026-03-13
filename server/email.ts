import { Resend } from "resend";

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Envia um email usando o Resend
 */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  if (!payload.to || !payload.subject || !payload.html) {
    console.error("[Email] Email payload is incomplete");
    return false;
  }

  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error("[Email] Resend API key not configured");
      return false;
    }

    const resend = new Resend(resendApiKey);

    console.log(`[Email] Enviando email para ${payload.to}`);
    console.log(`[Email] Assunto: ${payload.subject}`);

    const response = await resend.emails.send({
      from: "contato@radiosocialplusbrasil.com.br",
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });

    if (response.error) {
      console.error(`[Email] Failed to send email:`, response.error);
      return false;
    }

    console.log(`[Email] Email enviado com sucesso para ${payload.to}! ID: ${response.data?.id}`);
    return true;
  } catch (error) {
    console.error("[Email] Error sending email:", error);
    return false;
  }
}

/**
 * Remove tags HTML de uma string
 */
function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

/**
 * Cria o HTML do email de recuperação de senha
 */
export function createPasswordResetEmailHTML(
  userName: string,
  resetLink: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #f39c12;
            padding-bottom: 20px;
          }
          .header h1 {
            color: #2c3e50;
            margin: 0;
            font-size: 28px;
          }
          .logo {
            display: inline-block;
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 8px;
            margin-bottom: 10px;
            font-size: 24px;
            line-height: 50px;
            text-align: center;
            color: white;
            font-weight: bold;
          }
          .content {
            margin-bottom: 30px;
          }
          .content p {
            margin: 15px 0;
            color: #555;
          }
          .greeting {
            font-size: 18px;
            color: #2c3e50;
            font-weight: 600;
            margin-bottom: 20px;
          }
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
            color: white;
            padding: 14px 40px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
            transition: transform 0.2s;
          }
          .cta-button:hover {
            transform: translateY(-2px);
          }
          .link-section {
            background-color: #f9f9f9;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
            word-break: break-all;
          }
          .link-section p {
            margin: 0 0 10px 0;
            color: #666;
            font-size: 12px;
          }
          .link-section a {
            color: #f39c12;
            text-decoration: none;
            font-size: 13px;
          }
          .warning {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
            color: #856404;
            font-size: 14px;
          }
          .footer {
            border-top: 1px solid #eee;
            padding-top: 20px;
            text-align: center;
            color: #999;
            font-size: 12px;
          }
          .footer p {
            margin: 5px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🎙️</div>
            <h1>Rádio Social Plus Brasil</h1>
          </div>

          <div class="content">
            <p class="greeting">Olá ${userName},</p>
            
            <p>Recebemos uma solicitação para redefinir a senha da sua conta. Se você não fez essa solicitação, ignore este email.</p>

            <p>Clique no botão abaixo para redefinir sua senha:</p>

            <center>
              <a href="${resetLink}" class="cta-button">Redefinir Senha</a>
            </center>

            <p>Ou copie e cole este link no seu navegador:</p>
            
            <div class="link-section">
              <p>Link de recuperação:</p>
              <a href="${resetLink}">${resetLink}</a>
            </div>

            <div class="warning">
              <strong>⚠️ Importante:</strong> Este link expira em 1 hora por segurança. Se o link expirar, solicite um novo link de recuperação.
            </div>

            <p>Se você não solicitou a recuperação de senha, por favor ignore este email. Sua conta permanecerá segura.</p>
          </div>

          <div class="footer">
            <p>&copy; 2026 Rádio Social Plus Brasil. Todos os direitos reservados.</p>
            <p>Este é um email automático. Por favor, não responda este email.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Envia email de recuperação de senha
 */
export async function sendPasswordResetEmail(
  userEmail: string,
  userName: string,
  resetToken: string,
  frontendUrl: string
): Promise<boolean> {
  const resetLink = `${frontendUrl}/auth/reset-password?token=${resetToken}`;
  const html = createPasswordResetEmailHTML(userName, resetLink);

  console.log(`[Email] Preparando email de recuperação de senha para ${userEmail}`);
  console.log(`[Email] Link de reset: ${resetLink}`);

  return sendEmail({
    to: userEmail,
    subject: "Redefinir sua senha - Rádio Social Plus Brasil",
    html,
  });
}
