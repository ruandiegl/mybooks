import { AppError } from '../../shared/errors/AppError.js';
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
import {
  clearRefreshCookie,
  isCookieSessionRequest,
  readRefreshCookie,
  webCookieSessionResponse
} from './auth.web-session.js';

const metadata = (req) => ({
  userAgent: req.get('user-agent') || null,
  ip: req.ip || null
});

const invalidCookieSession = () => new AppError('Sessão inválida ou expirada.', {
  statusCode: 401,
  code: 'INVALID_SESSION'
});

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
          await service.refresh(refreshToken, metadata(req))
        );
      } catch (error) {
        if (cookieTransport && error?.statusCode === 401) clearRefreshCookie(res);
        throw error;
      }
    },
    logout: async (req, res) => {
      if (!isCookieSessionRequest(req)) {
        return res.status(200).json({ data: await service.logout(refreshSchema.parse(req.body)) });
      }

      const refreshToken = readRefreshCookie(req);
      if (refreshToken) await service.logout({ refreshToken });
      clearRefreshCookie(res);
      return res.status(200).json({ data: { ok: true } });
    },
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
