/**
 * Runtime feature switches for systems that must remain deployable but should
 * be dormant on the current public event site.
 *
 * Registration is deliberately opt-in: an absent, misspelled, or unexpected
 * value stays disabled. Changing REGISTRATION_ENABLED requires a redeploy on
 * Vercel, which keeps the server and statically rendered UI in agreement.
 */
export function isRegistrationEnabled(value = process.env.REGISTRATION_ENABLED): boolean {
  return value?.trim().toLowerCase() === 'true';
}

export function isPortalEnabled(value = process.env.PORTAL_ENABLED ?? 'true'): boolean {
  return value?.trim().toLowerCase() !== 'false';
}

export const features = Object.freeze({
  registration: isRegistrationEnabled(),
  portal: isPortalEnabled(),
});

/** Return before rate limits, request parsing, database access, storage, or mail. */
export function registrationApiGuard(): Response | null {
  if (features.registration) return null;

  return Response.json(
    { error: 'Not found' },
    {
      status: 404,
      headers: {
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    }
  );
}

/** Return before rate limits, request parsing, database access, storage, or mail for portal routes. */
export function portalApiGuard(): Response | null {
  if (features.portal || features.registration) return null;

  return Response.json(
    { error: 'Not found' },
    {
      status: 404,
      headers: {
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    }
  );
}
