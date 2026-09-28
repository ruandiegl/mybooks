import { authService } from './auth.service.js';
import {
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema
} from './auth.schemas.js';
import { usersService } from '../users/users.service.js';
import { AppError } from '../../shared/errors/AppError.js';

export const BROWSER_REFRESH_COOKIE = '__Host-trocalivros_refresh';
const BROWSER_REFRESH_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

const metadata = (req) => ({
  userAgent: req.get('user-agent') || null,
  ip: req.ip || null
});

function readCookie(req, name) {
  const cookieHeader = req.get('cookie');
  if (typeof cookieHeader !== 'string') return { present: false, value: null };

  for (const cookie of cookieHeader.split(';')) {
    const trimmedCookie = cookie.trim();
    const separator = cookie.indexOf('=');
    const cookieName = (separator < 0 ? trimmedCookie : cookie.slice(0, separator)).trim();
    if (cookieName !== name) continue;
    if (separator < 0) return { present: true, value: null };
    try {
      const value = decodeURIComponent(cookie.slice(separator + 1).trim());
      return { present: true, value: value || null };
    } catch {
      return { present: true, value: null };
    }
  }

  return { present: false, value: null };
}

function browserSessionPayload(session) {
  const { refreshToken, ...publicSession } = session;
  return publicSession;
}

function setBrowserRefreshCookie(res, refreshToken) {
  res.append('Set-Cookie', `${BROWSER_REFRESH_COOKIE}=${encodeURIComponent(refreshToken)}; Max-Age=${BROWSER_REFRESH_MAX_AGE_SECONDS}; Path=/; HttpOnly; Secure; SameSite=Lax`);
}

function clearBrowserRefreshCookie(res) {
  res.append('Set-Cookie', `${BROWSER_REFRESH_COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`);
}

function preventBrowserSessionCaching(res) {
  res.set('Cache-Control', 'no-store');
}

const missingBrowserSession = () => new AppError('Sessão inválida ou expirada.', {
  statusCode: 401,
  code: 'INVALID_SESSION'
});

export function createAuthController({ service = authService, getMe = usersService.getMe.bind(usersService) } = {}) {
  return {
    register: async (req, res) => res.status(201).json({
      data: await service.register(registerSchema.parse(req.body), metadata(req))
    }),
    verifyEmail: async (req, res) => res.status(200).json({
      data: await service.verifyEmail(verifyEmailSchema.parse(req.body), metadata(req))
    }),
    resendVerification: async (req, res) => res.status(200).json({
      data: await service.resendVerification({ email: forgotPasswordSchema.parse(req.body).email })
    }),
    login: async (req, res) => res.status(200).json({
      data: await service.login(loginSchema.parse(req.body), metadata(req))
    }),
    browserLogin: async (req, res) => {
      preventBrowserSessionCaching(res);
      const session = await service.login(loginSchema.parse(req.body), metadata(req));
      setBrowserRefreshCookie(res, session.refreshToken);
      return res.status(200).json({ data: browserSessionPayload(session) });
    },
    browserVerifyEmail: async (req, res) => {
      preventBrowserSessionCaching(res);
      const session = await service.verifyEmail(verifyEmailSchema.parse(req.body), metadata(req));
      setBrowserRefreshCookie(res, session.refreshToken);
      return res.status(200).json({ data: browserSessionPayload(session) });
    },
    browserRefresh: async (req, res) => {
      preventBrowserSessionCaching(res);
      const cookie = readCookie(req, BROWSER_REFRESH_COOKIE);
      if (!cookie.present) throw missingBrowserSession();
      if (!cookie.value) {
        clearBrowserRefreshCookie(res);
        throw missingBrowserSession();
      }
      const parsedRefresh = refreshSchema.safeParse({ refreshToken: cookie.value });
      if (!parsedRefresh.success) {
        clearBrowserRefreshCookie(res);
        throw missingBrowserSession();
      }
      try {
        const session = await service.refresh(parsedRefresh.data.refreshToken, metadata(req));
        setBrowserRefreshCookie(res, session.refreshToken);
        return res.status(200).json({ data: browserSessionPayload(session) });
      } catch (error) {
        if (error?.code === 'INVALID_SESSION' || error?.code === 'SESSION_REPLAYED') {
          clearBrowserRefreshCookie(res);
        }
        throw error;
      }
    },
    browserLogout: async (req, res) => {
      preventBrowserSessionCaching(res);
      const { value: refreshToken } = readCookie(req, BROWSER_REFRESH_COOKIE);
      try {
        if (refreshToken) await service.logout(refreshSchema.parse({ refreshToken }));
      } finally {
        clearBrowserRefreshCookie(res);
      }
      return res.status(200).json({ data: { ok: true } });
    },
    refresh: async (req, res) => {
      const { refreshToken } = refreshSchema.parse(req.body);
      return res.status(200).json({ data: await service.refresh(refreshToken, metadata(req)) });
    },
    logout: async (req, res) => res.status(200).json({
      data: await service.logout(refreshSchema.parse(req.body))
    }),
    logoutAll: async (req, res) => res.status(200).json({
      data: await service.logoutAll(req.currentUser.id)
    }),
    forgotPassword: async (req, res) => res.status(200).json({
      data: await service.requestPasswordReset(forgotPasswordSchema.parse(req.body))
    }),
    resetPassword: async (req, res) => res.status(200).json({
      data: await service.resetPassword(resetPasswordSchema.parse(req.body))
    }),
    me: async (req, res) => res.status(200).json({ data: await getMe(req.currentUser.id) })
  };
}

export const authController = createAuthController();
