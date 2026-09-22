import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { isRegistrationEnabled } from '@/lib/features';

const root = path.resolve(__dirname, '..');

const guardedApiRoutes = [
  'src/app/api/admin/config/route.ts',
  'src/app/api/admin/payment-proof/route.ts',
  'src/app/api/admin/registrations/route.ts',
  'src/app/api/admin/session/route.ts',
  'src/app/api/auth/team/reset/route.ts',
  'src/app/api/auth/team/reset/verify/route.ts',
  'src/app/api/cron/payment-reminders/route.ts',
  'src/app/api/private-files/route.ts',
  'src/app/api/registrations/count/route.ts',
  'src/app/api/registrations/route.ts',
  'src/app/api/status/route.ts',
  'src/app/api/team/payment/route.ts',
  'src/app/api/team/portal/route.ts',
  'src/app/api/team/resubmission/route.ts',
  'src/app/api/team/submission/route.ts',
];

const portalApiRoutes = [
  'src/app/api/auth/team/forgot/route.ts',
  'src/app/api/auth/team/route.ts',
];

describe('registration feature flag', () => {
  it('enables registration only for an explicit true value', () => {
    expect(isRegistrationEnabled(undefined)).toBe(false);
    expect(isRegistrationEnabled('false')).toBe(false);
    expect(isRegistrationEnabled('1')).toBe(false);
    expect(isRegistrationEnabled('TRUE')).toBe(true);
    expect(isRegistrationEnabled(' true ')).toBe(true);
  });

  it('guards every private registration-system API before expensive work', () => {
    for (const relativePath of guardedApiRoutes) {
      const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
      const guardIndex = source.indexOf('registrationApiGuard()');
      expect(guardIndex, `${relativePath} is missing registrationApiGuard()`).toBeGreaterThan(-1);

      const expensiveIndexes = [
        source.indexOf('checkRateLimit('),
        source.indexOf('serverStore.'),
        source.indexOf('request.formData('),
        source.indexOf('request.json('),
      ].filter(index => index >= 0);

      if (expensiveIndexes.length > 0) {
        expect(guardIndex, `${relativePath} performs work before its feature guard`).toBeLessThan(
          Math.min(...expensiveIndexes)
        );
      }
    }
  });

  it('guards portal authentication APIs before expensive work', () => {
    for (const relativePath of portalApiRoutes) {
      const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
      const guardIndex = source.indexOf('portalApiGuard()');
      expect(guardIndex, `${relativePath} is missing portalApiGuard()`).toBeGreaterThan(-1);

      const expensiveIndexes = [
        source.indexOf('checkRateLimit('),
        source.indexOf('serverStore.'),
        source.indexOf('request.formData('),
        source.indexOf('request.json('),
      ].filter(index => index >= 0);

      if (expensiveIndexes.length > 0) {
        expect(guardIndex, `${relativePath} performs work before its feature guard`).toBeLessThan(
          Math.min(...expensiveIndexes)
        );
      }
    }
  });

  it('server-guards the portal and admin route trees', () => {
    for (const relativePath of ['src/app/portal/layout.tsx', 'src/app/admin/layout.tsx']) {
      const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
      expect(source).toContain('features.registration');
      expect(source).toContain('notFound()');
    }
  });

  it('does not call registration APIs from the disabled public homepage bundle', () => {
    const source = fs.readFileSync(path.join(root, 'src/app/page.tsx'), 'utf8');
    expect(source).not.toContain('/api/registrations/count');
    expect(source).toContain('features.registration');

    const publicHome = fs.readFileSync(path.join(root, 'src/components/home/PublicHome.tsx'), 'utf8');
    expect(publicHome.indexOf('if (!registrationEnabled) return')).toBeLessThan(
      publicHome.indexOf("fetch('/api/registrations/count')")
    );
  });

  it('keeps the public Google Form registration CTA independent from the internal flag', () => {
    for (const relativePath of [
      'src/components/common/Navbar.tsx',
      'src/components/sections/HeroSection.tsx',
      'src/components/sections/Footer.tsx',
    ]) {
      const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
      expect(source).toContain('GOOGLE_FORM_REGISTRATION_URL');
    }
  });
});
