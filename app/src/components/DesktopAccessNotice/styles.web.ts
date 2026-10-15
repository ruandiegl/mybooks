import type { AppTheme } from '../../styles/theme';
export const noticeStyles = (theme: AppTheme) => `
.tl-desktop{box-sizing:border-box;min-height:100%;display:flex;align-items:center;justify-content:center;padding:max(32px,env(safe-area-inset-top)) max(24px,env(safe-area-inset-right)) max(32px,env(safe-area-inset-bottom)) max(24px,env(safe-area-inset-left));font-family:${theme.typography.regular},sans-serif}
.tl-desktop-layout{width:100%;max-width:960px;display:grid;grid-template-columns:minmax(0,1fr) 272px;gap:64px;align-items:center}
.tl-desktop-brand{font-family:${theme.typography.extraBold};font-size:24px;letter-spacing:-1px;margin-bottom:48px;color:${theme.colors.primary}}
.tl-desktop h1{font-family:${theme.typography.bold};font-size:clamp(32px,4vw,48px);line-height:1.2;letter-spacing:-1.4px;margin:0 0 24px;max-width:540px}
.tl-desktop p{font-size:16px;line-height:1.6;color:${theme.colors.mutedForeground};margin:0 0 24px;max-width:52ch}
.tl-desktop-qr{padding:24px;background:${theme.colors.surface};border:1px solid ${theme.colors.outline};border-radius:${theme.radius.lg}px;display:flex;flex-direction:column;align-items:center;gap:16px;min-width:0}
.tl-desktop-qr p{font-size:14px;text-align:center;margin:0}.tl-desktop-url{font-size:13px;line-height:1.6;color:${theme.colors.foreground};overflow-wrap:anywhere;user-select:text;text-align:center}
.tl-desktop-actions{display:flex;gap:12px;flex-wrap:wrap}.tl-desktop-small{font-size:13px!important;margin-top:24px!important}
.tl-desktop :is(button,a,[role=button]):focus-visible{outline:2px solid ${theme.colors.primary};outline-offset:4px}
@media(max-width:700px){.tl-desktop-layout{grid-template-columns:minmax(0,1fr);gap:32px}.tl-desktop-brand{margin-bottom:24px}.tl-desktop-qr{justify-self:center;max-width:272px;width:100%;box-sizing:border-box}}
`;
