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

const metadata = (req) => ({
  userAgent: req.get('user-agent') || null,
  ip: req.ip || null
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
