import type { AppTheme } from '../../styles/theme';
export const installStyles = (theme: AppTheme) => `
.tl-install{font-family:${theme.typography.regular},sans-serif;color:${theme.colors.foreground};font-size:16px;line-height:1.6;min-width:0}
.tl-install *{box-sizing:border-box}.tl-install p{margin:0 0 24px;color:${theme.colors.mutedForeground}}
.tl-install-platforms{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:24px}.tl-install-platforms button{font:inherit;font-family:${theme.typography.medium};font-size:14px;min-height:48px;padding:8px 16px;border:1px solid ${theme.colors.outline};border-radius:${theme.radius.pill}px;color:${theme.colors.foreground};background:${theme.colors.surface};cursor:pointer}
.tl-install-platforms button[aria-pressed=true]{background:${theme.colors.primarySoft};border-color:${theme.colors.primary};color:${theme.colors.foreground}}
.tl-install ol{padding-left:24px;margin:0 0 24px}.tl-install li{padding-left:8px;margin-bottom:16px;overflow-wrap:anywhere}
.tl-install :focus-visible,.tl-install-action :focus-visible{outline:2px solid ${theme.colors.primary};outline-offset:3px}
.tl-install-note{padding-top:16px;border-top:1px solid ${theme.colors.outline};font-size:14px}.tl-install-status{font-size:14px;color:${theme.colors.success}!important}
.tl-install-url{display:block;color:${theme.colors.foreground};overflow-wrap:anywhere;user-select:text;margin:16px 0;font-size:14px}
.tl-install-sheet{box-sizing:border-box;border:1px solid ${theme.colors.outline};border-bottom:0;border-radius:24px 24px 0 0;padding:0;margin:auto auto 0;width:100%;max-width:560px;max-height:90%;background:${theme.colors.background};color:${theme.colors.foreground};font-family:${theme.typography.regular};overflow:auto;overscroll-behavior:contain}
.tl-install-sheet::backdrop{background:${theme.colors.overlay}}.tl-install-sheet[open]{animation:tl-install-enter 180ms ease-out}.tl-install-sheet-inner{padding:0 max(24px,env(safe-area-inset-right)) max(24px,env(safe-area-inset-bottom)) max(24px,env(safe-area-inset-left))}
.tl-install-handle{width:38px;height:4px;border-radius:999px;background:${theme.colors.outline};margin:12px auto}
.tl-install-header{position:sticky;top:0;z-index:1;background:${theme.colors.background};display:flex;align-items:center;gap:16px;justify-content:space-between;margin-bottom:24px;padding-top:12px;padding-bottom:12px}.tl-install-header h2{font:22px/1.4 ${theme.typography.bold};margin:0;overflow-wrap:anywhere}
.tl-install-close{font:24px ${theme.typography.regular};width:48px;height:48px;flex-shrink:0;border:0;border-radius:999px;cursor:pointer;background:${theme.colors.surface};color:${theme.colors.foreground}}
@supports(height:100dvh){.tl-install-sheet{max-height:calc(100dvh - max(24px,env(safe-area-inset-top)))}}
@keyframes tl-install-enter{from{transform:translateY(32px);opacity:0}to{transform:translateY(0);opacity:1}}
@media(prefers-reduced-motion:reduce){.tl-install-sheet[open]{animation:none}}
`;
