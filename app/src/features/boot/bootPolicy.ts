export type BootPhase = 'resources' | 'session' | 'navigation';
export type BootIssue = 'resource-error' | 'resource-timeout' | 'session-slow';
export const RESOURCE_FEEDBACK_MS = 8_000;
export const SESSION_FEEDBACK_MS = 10_000;
