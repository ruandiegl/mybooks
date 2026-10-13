import { AppError } from '../../shared/errors/AppError.js';
import { authService } from './auth.service.js';
import {
  forgotPasswordSchema,
  changePasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema
} from './auth.schemas.js';
import { usersService } from '../users/users.service.js';
import {
  clearRefreshCookie,
  isCookieSessionRequest,
  readRefreshCookie,
  webCookieSessionResponse
} from './auth.web-session.js';
import { hashOpaqueToken } from './auth.crypto.js';
import { settingsCorrelation, settingsSessionChanged } from './auth.actor.js';

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

function terminalCorrelation(req, browser = false) {
  const cookieTransport = browser || isCookieSessionRequest(req);
  const refreshToken = cookieTransport ? (browser ? readCookie(req, BROWSER_REFRESH_COOKIE).value : readRefreshCookie(req)) : null;
  if (cookieTransport && !refreshToken) throw settingsSessionChanged();
  const supplied = settingsCorrelation(req, refreshToken ? hashOpaqueToken(refreshToken) : undefined);
  return supplied ?? (cookieTransport ? { ownerId: req.currentUser.id, anchorSessionId: req.identity.sessionId, cookieHash: hashOpaqueToken(refreshToken) } : undefined);
}

const missingBrowserSession = () => new AppError('Sessão inválida ou expirada.', {
  statusCode: 401,
  code: 'INVALID_SESSION'
});
const invalidCookieSession = missingBrowserSession;

export function createAuthController({ service = authService, getMe = usersService.getMe.bind(usersService) } = {}) {
  return {
    register: async (req, res) => res.status(201).json({
      data: await service.register(registerSchema.parse(req.body), metadata(req))
    }),
    verifyEmail: async (req, res) => webCookieSessionResponse(
      req,
      res,
      200,
      await service.verifyEmail(verifyEmailSchema.parse(req.body), metadata(req))
    ),
    resendVerification: async (req, res) => res.status(200).json({
      data: await service.resendVerification({ email: forgotPasswordSchema.parse(req.body).email })
    }),
    login: async (req, res) => webCookieSessionResponse(
      req,
      res,
      200,
      await service.login(loginSchema.parse(req.body), metadata(req))
    ),
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
        const session = await service.refresh(parsedRefresh.data.refreshToken, metadata(req), settingsCorrelation(req));
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
      const correlation = settingsCorrelation(req);
      if (!refreshToken && correlation) throw settingsSessionChanged();
      if (refreshToken) await service.logout(refreshSchema.parse({ refreshToken }), correlation);
      clearBrowserRefreshCookie(res);
      return res.status(200).json({ data: { ok: true } });
    },
    browserRebind: async (req, res) => {
      preventBrowserSessionCaching(res);
      const cookie = readCookie(req, BROWSER_REFRESH_COOKIE);
      if (!cookie.value) throw missingBrowserSession();
      const correlation = settingsCorrelation(req);
      if (!correlation) throw settingsSessionChanged();
      const parsed = refreshSchema.safeParse({ refreshToken: cookie.value });
      if (!parsed.success) throw missingBrowserSession();
      const session = await service.rebind(parsed.data.refreshToken, correlation);
      return res.status(200).json({ data: browserSessionPayload(session) });
    },
    refresh: async (req, res) => {
      const cookieTransport = isCookieSessionRequest(req);
      const refreshToken = cookieTransport
        ? readRefreshCookie(req)
        : refreshSchema.parse(req.body).refreshToken;

      if (!refreshToken) {
        if (cookieTransport) clearRefreshCookie(res);
        throw invalidCookieSession();
      }

      try {
        return webCookieSessionResponse(
          req,
          res,
          200,
          await service.refresh(refreshToken, metadata(req), settingsCorrelation(req))
        );
      } catch (error) {
        if (cookieTransport && error?.statusCode === 401) clearRefreshCookie(res);
        throw error;
      }
    },
    logout: async (req, res) => {
      if (!isCookieSessionRequest(req)) {
        return res.status(200).json({ data: await service.logout(refreshSchema.parse(req.body), settingsCorrelation(req)) });
      }

      const refreshToken = readRefreshCookie(req);
      const correlation = settingsCorrelation(req);
      if (!refreshToken && correlation) throw settingsSessionChanged();
      if (refreshToken) await service.logout({ refreshToken }, correlation);
      clearRefreshCookie(res);
      return res.status(200).json({ data: { ok: true } });
    },
    logoutAll: async (req, res) => {
      preventBrowserSessionCaching(res);
      const data = await service.logoutAll(req.currentUser.id, { sessionId: req.identity?.sessionId, correlation: terminalCorrelation(req) });
      if (isCookieSessionRequest(req)) clearRefreshCookie(res);
      return res.status(200).json({ data });
    },
    browserLogoutAll: async (req, res) => {
      preventBrowserSessionCaching(res);
      const data = await service.logoutAll(req.currentUser.id, { sessionId: req.identity.sessionId, correlation: terminalCorrelation(req, true) });
      clearBrowserRefreshCookie(res);
      return res.status(200).json({ data });
    },
    changePassword: async (req, res) => {
      preventBrowserSessionCaching(res);
      const data = await service.changePassword(req.currentUser.id, req.identity.sessionId, changePasswordSchema.parse(req.body), terminalCorrelation(req));
      if (isCookieSessionRequest(req)) clearRefreshCookie(res);
      return res.status(200).json({ data });
    },
    browserChangePassword: async (req, res) => {
      preventBrowserSessionCaching(res);
      const data = await service.changePassword(req.currentUser.id, req.identity.sessionId, changePasswordSchema.parse(req.body), terminalCorrelation(req, true));
      clearBrowserRefreshCookie(res);
      return res.status(200).json({ data });
    },
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
