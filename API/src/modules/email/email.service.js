import { Resend } from 'resend';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';
import { welcomeEmailV1 } from './templates/welcome.v1.js';
import { verifyEmailV1 } from './templates/verify-email.v1.js';
import { passwordResetV1 } from './templates/password-reset.v1.js';

let resend;

function getClient() {
  if (!env.RESEND_API_KEY) {
    throw new AppError('O envio de e-mails ainda não foi configurado neste ambiente.', {
      statusCode: 503,
      code: 'EMAIL_NOT_CONFIGURED'
    });
  }
  resend ??= new Resend(env.RESEND_API_KEY);
  return resend;
}

async function send({ to, subject, html, template, idempotencyKey }) {
  const { data, error } = await getClient().emails.send({
    from: env.RESEND_FROM_EMAIL,
    to,
    subject,
    html,
    tags: [{ name: 'template', value: template }]
  }, idempotencyKey ? { idempotencyKey } : undefined);

  if (error) {
    throw new AppError('Não foi possível enviar o e-mail.', {
      statusCode: 502,
      code: 'EMAIL_SEND_FAILED',
      cause: new Error(error.message)
    });
  }

  return data;
}

export const emailService = {
  async sendWelcome({ to, name, idempotencyKey }) {
    return send({
      to,
      subject: welcomeEmailV1.subject,
      html: welcomeEmailV1.html({ name }),
      template: 'welcome-v1',
      idempotencyKey
    });
  },

  async sendVerification({ to, code, ttlMinutes, idempotencyKey }) {
    return send({
      to,
      subject: verifyEmailV1.subject,
      html: verifyEmailV1.html({ code, ttlMinutes }),
      template: 'verify-email-v1',
      idempotencyKey
    });
  },

  async sendPasswordReset({ to, code, ttlMinutes, idempotencyKey }) {
    return send({
      to,
      subject: passwordResetV1.subject,
      html: passwordResetV1.html({ code, ttlMinutes }),
      template: 'password-reset-v1',
      idempotencyKey
    });
  }
};
