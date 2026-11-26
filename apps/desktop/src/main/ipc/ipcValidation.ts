import { basename } from 'node:path';
import { ALLOWLISTED_FREESHOW_ACTIONS, AllowlistedAction, OperatorMode } from '@pulpit-ai/shared-types';

const ALLOWLIST_SET = new Set<string>(ALLOWLISTED_FREESHOW_ACTIONS);

export const MAX_IPC_AUDIO_CHUNK_BYTES = 256 * 1024; // 256 KB per audio frame
export const MAX_IPC_BASE64_FILE_CHARS = 35 * 1024 * 1024; // ~26 MB decoded binary cap
export const MAX_IPC_TEXT_CHARS = 512 * 1024; // 512 KB pasted lyrics cap
export const MAX_IPC_QUERY_CHARS = 256;
export const MAX_IPC_TRANSCRIPT_CHARS = 2000;

export function isAllowlistedAction(action: unknown): action is AllowlistedAction {
  return typeof action === 'string' && ALLOWLIST_SET.has(action);
}

export function isValidOperatorMode(mode: unknown): mode is OperatorMode {
  return mode === 'suggestions' || mode === 'manual';
}

export function isValidLocalPort(port: unknown): port is number {
  return typeof port === 'number' && Number.isInteger(port) && port >= 1024 && port <= 65535;
}

export function sanitizeFileName(rawName: unknown): string {
  if (typeof rawName !== 'string' || !rawName.trim()) {
    throw new Error('Invalid file name');
  }
  // Strip any path traversal components (../, drive letters, directory separators)
  const base = basename(rawName.replace(/\\/g, '/')).trim();
  if (!base || base === '.' || base === '..') {
    throw new Error('Unsafe file name rejected');
  }
  return base.slice(0, 200);
}

export function validateStringLength(value: unknown, maxLen: number, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }
  if (value.length > maxLen) {
    throw new Error(`${fieldName} exceeds maximum length of ${maxLen} characters`);
  }
  return value;
}

export function isAllowedPermissionOrigin(origin: string | undefined): boolean {
  if (!origin) return true; // Electron file:// renderer windows often report empty or file:// origin
  return (
    origin.startsWith('file://') ||
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:')
  );
}

export function isAllowedNavigationUrl(targetUrl: string): boolean {
  return (
    targetUrl.startsWith('file://') ||
    targetUrl.startsWith('http://localhost:') ||
    targetUrl.startsWith('http://127.0.0.1:')
  );
}

export function validatePositiveInteger(value: unknown, fieldName: string, min = 1, max = 100000): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
    throw new Error(`${fieldName} must be an integer`);
  }
  if (value < min || value > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max}`);
  }
  return value;
}

export function validateSafeObject(value: unknown, fieldName: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${fieldName} must be a non-null object`);
  }
  return value as Record<string, unknown>;
}

export function buildContentSecurityPolicy(isDev: boolean): string {
  const scriptSrc = isDev ? "'self' 'unsafe-inline' blob:" : "'self' blob:";
  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "worker-src 'self' blob:",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' ws://localhost:* http://localhost:* ws://127.0.0.1:* http://127.0.0.1:*",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'"
  ].join('; ') + ';';
}
