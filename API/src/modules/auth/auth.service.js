import { serializeOwnUser } from '../users/users.serializer.js';
import { AppError } from '../../shared/errors/AppError.js';
import { emailService as applicationEmailService } from '../email/email.service.js';
import { authRepository as applicationRepository } from './auth.repository.js';
import { hashOpaqueToken, hashPassword, needsPasswordRehash, validateCpf, verifyPassword } from './auth.crypto.js';
import { loginSchema, registerSchema, resetPasswordSchema, verifyEmailSchema } from './auth.schemas.js';
import { PENDING_REGISTRATION_TTL_MS } from './auth.constants.js';
import { normalizeEmail } from './validators.js';
import {
  AUTH_CODE_MAX_ATTEMPTS,
  AUTH_CODE_TTL_MINUTES,
  VERIFICATION_RESEND_COOLDOWN_MS,
  createAuthCodeMaterial,
  createSessionMaterial,
  createTokenResponse
} from './auth.tokens.js';

const dummyPasswordHash = hashPassword('TrocaLivros-Dummy@123');
const systemClock = { now: () => new Date() };

const accountConflict = () => new AppError('Não foi possível criar a conta com os dados informados.', {
  statusCode: 409,
  code: 'ACCOUNT_ALREADY_EXISTS'
});

const invalidCredentials = () => new AppError('E-mail ou senha inválidos.', {
  statusCode: 401,
  code: 'INVALID_CREDENTIALS'
});

const invalidCode = () => new AppError('Código inválido ou expirado.', {
  statusCode: 400,
  code: 'INVALID_OR_EXPIRED_CODE'
});

const invalidSession = () => new AppError('Sessão inválida ou expirada.', {
  statusCode: 401,
  code: 'INVALID_SESSION'
});

const isUniqueRace = (error) => error?.code === 'P2002';



export const createAuthService = ({
  repository = applicationRepository,
  emailService = applicationEmailService,
  clock = systemClock,
  logger = console
} = {}) => {
  const sendMailSafely = async (code, userId, operation) => {
    try {
      await operation();
    } catch (error) {
      logger.warn(JSON.stringify({
        level: 'warn',
        code,
        userId,
        causeType: error?.name || 'Error'
      }));
    }
  };

  const issueSession = async (user, session, refreshToken, now) => ({
    ...await createTokenResponse({ user, session, refreshToken, now }),
    user: await serializeOwnUser(user)
  });

  return {
    async register(input) {
      const payload = registerSchema.parse(input);
      const now = clock.now();
      const cpf = validateCpf(payload.cpf);

      await repository.deleteExpiredPendingAccounts(now);

      const code = createAuthCodeMaterial(now);
      const passwordHash = await hashPassword(payload.password);
      let registration;
      try {
        registration = await repository.upsertPendingAccount({
          user: {
            name: 'Leitor TrocaLivros',
            email: payload.email,
            passwordHash,
            cpfHash: cpf.hash,
            cpfEncrypted: cpf.encrypted,
            phone: payload.phone,
            isActive: false,
            emailVerifiedAt: null,
            pendingRegistrationExpiresAt: new Date(now.getTime() + PENDING_REGISTRATION_TTL_MS)
          },
          code: code.stored,
          now
        });
      } catch (error) {
        if (isUniqueRace(error)) throw accountConflict();
        throw error;
      }

      if (registration.status === 'CONFLICT') throw accountConflict();
      const user = registration.user;

      await sendMailSafely('VERIFICATION_EMAIL_FAILED', user.id, () => emailService.sendVerification({
        to: user.email,
        code: code.code,
        ttlMinutes: AUTH_CODE_TTL_MINUTES,
        idempotencyKey: `verify:${user.id}:${code.stored.codeHash}`
      }));

      return { userId: user.id, email: user.email, requiresEmailVerification: true };
    },

    async verifyEmail(input, meta) {
      const payload = verifyEmailSchema.parse(input);
      const now = clock.now();
      const material = createSessionMaterial({ now, meta });
      const result = await repository.verifyEmailAndCreateSession({
        email: payload.email,
        codeHash: hashOpaqueToken(payload.code),
        now,
        maxAttempts: AUTH_CODE_MAX_ATTEMPTS,
        session: material.stored
      });

      if (result.status !== 'VERIFIED') throw invalidCode();

      try {
        await emailService.sendWelcome({
          to: result.user.email,
          name: result.user.name,
          idempotencyKey: `welcome:${result.user.id}`
        });
      } catch (error) {
        logger.warn(JSON.stringify({
          level: 'warn',
          code: 'WELCOME_EMAIL_FAILED',
          userId: result.user.id,
          causeType: error?.name || 'Error'
        }));
      }

      return issueSession(result.user, result.session, material.refreshToken, now);
    },

    async resendVerification({ email }) {
      const normalized = normalizeEmail(email);
      const user = await repository.findUserByEmailForAuth(normalized);
      if (!user || user.emailVerifiedAt) return { accepted: true };

      const now = clock.now();
      const code = createAuthCodeMaterial(now);
      const result = await repository.replaceAuthCode({
        userId: user.id,
        type: 'EMAIL_VERIFY',
        code: code.stored,
        now,
        cooldownMs: VERIFICATION_RESEND_COOLDOWN_MS
      });

      if (result.status === 'CREATED') {
        await sendMailSafely('VERIFICATION_EMAIL_FAILED', user.id, () => emailService.sendVerification({
          to: user.email,
          code: code.code,
          ttlMinutes: AUTH_CODE_TTL_MINUTES,
          idempotencyKey: `verify:${user.id}:${code.stored.codeHash}`
        }));
      }

      return { accepted: true };
    },

    async login(input, meta) {
      const payload = loginSchema.parse(input);
      const user = await repository.findUserByEmailForAuth(payload.email);
      const fallbackHash = await dummyPasswordHash;
      const passwordMatches = await verifyPassword(payload.password, user?.passwordHash ?? fallbackHash);

      if (!user || !user.passwordHash || !passwordMatches) throw invalidCredentials();
      if (!user.emailVerifiedAt) {
        throw new AppError('Confirme seu e-mail antes de entrar.', { statusCode: 403, code: 'EMAIL_NOT_VERIFIED' });
      }
      if (!user.isActive) {
        throw new AppError('Conta inativa.', { statusCode: 403, code: 'ACCOUNT_INACTIVE' });
      }

      if (needsPasswordRehash(user.passwordHash)) {
        user.passwordHash = await hashPassword(payload.password);
        await repository.updatePasswordHash(user.id, user.passwordHash);
      }

      const now = clock.now();
      const material = createSessionMaterial({ now, meta });
      const session = await repository.createSession({ userId: user.id, session: material.stored });
      return issueSession(user, session, material.refreshToken, now);
    },

    async refresh(refreshToken, meta) {
      const now = clock.now();
      const material = createSessionMaterial({ now, meta });
      const result = await repository.rotateSession({
        refreshTokenHash: hashOpaqueToken(refreshToken),
        now,
        replacement: material.stored
      });

      if (result.status === 'REPLAYED') {
        throw new AppError('Reutilização de sessão detectada.', { statusCode: 401, code: 'SESSION_REPLAYED' });
      }
      if (result.status !== 'ROTATED') throw invalidSession();
      return issueSession(result.user, result.session, material.refreshToken, now);
    },

    async logout({ refreshToken }) {
      await repository.revokeSession(hashOpaqueToken(refreshToken), clock.now());
      return { ok: true };
    },

    async logoutAll(userId) {
      await repository.revokeAllSessions(userId, clock.now());
      return { ok: true };
    },

    async requestPasswordReset({ email }) {
      const normalized = normalizeEmail(email);
      const user = await repository.findUserByEmailForAuth(normalized);
      if (!user) return { accepted: true };

      const now = clock.now();
      const code = createAuthCodeMaterial(now);
      await repository.replaceAuthCode({
        userId: user.id,
        type: 'PASSWORD_RESET',
        code: code.stored,
        now,
        cooldownMs: 0
      });
      await sendMailSafely('PASSWORD_RESET_EMAIL_FAILED', user.id, () => emailService.sendPasswordReset({
        to: user.email,
        code: code.code,
        ttlMinutes: AUTH_CODE_TTL_MINUTES,
        idempotencyKey: `password-reset:${user.id}:${code.stored.codeHash}`
      }));
      return { accepted: true };
    },

    async resetPassword(input) {
      const payload = resetPasswordSchema.parse(input);
      const now = clock.now();
      const passwordHash = await hashPassword(payload.password);
      const result = await repository.resetPasswordWithCode({
        email: payload.email,
        codeHash: hashOpaqueToken(payload.code),
        passwordHash,
        now,
        maxAttempts: AUTH_CODE_MAX_ATTEMPTS
      });

      if (result.status !== 'RESET') throw invalidCode();
      return { ok: true };
    }
  };
};

export const authService = createAuthService();
