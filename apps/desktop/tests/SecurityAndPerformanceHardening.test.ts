import { describe, it, expect } from 'vitest';
import {
  buildContentSecurityPolicy,
  isAllowlistedAction,
  isAllowedNavigationUrl,
  isAllowedPermissionOrigin,
  isValidLocalPort,
  isValidOperatorMode,
  sanitizeFileName,
  validateStringLength
} from '../src/main/ipc/ipcValidation.js';
import {
  computeOptimalWhisperThreads,
  detectHardwareProfile,
  WhisperWorkerProcess
} from '@pulpit-ai/speech-engine';

describe('v1.0.0 Security & Performance Hardening Suite', () => {
  describe('Security: CSP, Navigation & Permission Guards', () => {
    it('builds strict production CSP allowing data:/blob: images while blocking unsafe-inline scripts and objects', () => {
      const prodCsp = buildContentSecurityPolicy(false);
      expect(prodCsp).toContain("img-src 'self' data: blob:");
      expect(prodCsp).toContain("script-src 'self' blob:");
      expect(prodCsp).not.toContain("script-src 'self' 'unsafe-inline'");
      expect(prodCsp).toContain("object-src 'none'");
      expect(prodCsp).toContain("frame-ancestors 'none'");
      expect(prodCsp).toContain("base-uri 'self'");

      const devCsp = buildContentSecurityPolicy(true);
      expect(devCsp).toContain("script-src 'self' 'unsafe-inline' blob:");
    });

    it('blocks remote navigations and unauthorized permission origins while allowing local Electron/Vite origins', () => {
      expect(isAllowedNavigationUrl('file:///app/index.html')).toBe(true);
      expect(isAllowedNavigationUrl('http://localhost:5173/')).toBe(true);
      expect(isAllowedNavigationUrl('https://evil.example.com/phish')).toBe(false);
      expect(isAllowedNavigationUrl('javascript:alert(1)')).toBe(false);

      expect(isAllowedPermissionOrigin('file:///app/index.html')).toBe(true);
      expect(isAllowedPermissionOrigin('http://localhost:5173')).toBe(true);
      expect(isAllowedPermissionOrigin('https://untrusted.site')).toBe(false);
    });
  });

  describe('Security: Runtime IPC Boundary Validation', () => {
    it('enforces strict FreeShow action allowlist at IPC boundary', () => {
      expect(isAllowlistedAction('start_scripture')).toBe(true);
      expect(isAllowlistedAction('show_media')).toBe(true);
      expect(isAllowlistedAction('start_timer')).toBe(true);
      expect(isAllowlistedAction('exec_shell')).toBe(false);
      expect(isAllowlistedAction('__proto__')).toBe(false);
      expect(isAllowlistedAction(null)).toBe(false);
    });

    it('sanitizes filenames against directory traversal attacks', () => {
      expect(sanitizeFileName('../../etc/passwd')).toBe('passwd');
      expect(sanitizeFileName('C:\\Windows\\System32\\flyer.png')).toBe('flyer.png');
      expect(() => sanitizeFileName('..')).toThrow();
      expect(() => sanitizeFileName('')).toThrow();
    });

    it('validates ports, operator modes, and string length limits', () => {
      expect(isValidLocalPort(5510)).toBe(true);
      expect(isValidLocalPort(80)).toBe(false);
      expect(isValidLocalPort(70000)).toBe(false);
      expect(isValidLocalPort('5510')).toBe(false);

      expect(isValidOperatorMode('suggestions')).toBe(true);
      expect(isValidOperatorMode('manual')).toBe(true);
      expect(isValidOperatorMode('auto_override')).toBe(false);

      expect(validateStringLength('hello', 10, 'query')).toBe('hello');
      expect(() => validateStringLength('x'.repeat(20), 10, 'query')).toThrow();
    });
  });

  describe('Performance: Hardware Detection, Thread Allocation & Clean Shutdown', () => {
    it('computes safe whisper.cpp thread counts across low-end and high-end CPUs', () => {
      expect(computeOptimalWhisperThreads(2)).toBe(1);
      expect(computeOptimalWhisperThreads(4)).toBe(3);
      expect(computeOptimalWhisperThreads(8)).toBe(6);
      expect(computeOptimalWhisperThreads(16)).toBe(8);
      expect(computeOptimalWhisperThreads(32)).toBe(8);
    });

    it('detects host hardware profile and shuts down worker cleanly', () => {
      const profile = detectHardwareProfile();
      expect(profile.logicalCores).toBeGreaterThanOrEqual(1);
      expect(profile.optimalWhisperThreads).toBeGreaterThanOrEqual(1);
      expect(profile.totalRamGb).toBeGreaterThan(0);

      const worker = new WhisperWorkerProcess();
      expect(worker.isHealthy()).toBe(true);
      worker.shutdown();
      expect(worker.isHealthy()).toBe(false);
    });
  });
});
