import { Resend } from 'resend';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';
import { welcomeEmailV1 } from './templates/welcome.v1.js';

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

export const emailService = {
  async sendWelcome({ to, name, idempotencyKey }) {
    const { data, error } = await getClient().emails.send({
      from: env.RESEND_FROM_EMAIL,
      to,
      subject: welcomeEmailV1.subject,
      html: welcomeEmailV1.html({ name }),
      tags: [{ name: 'template', value: 'welcome-v1' }]
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
};
