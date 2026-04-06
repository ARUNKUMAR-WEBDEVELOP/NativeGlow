export function getGoogleAuthOriginHint() {
  return import.meta.env.VITE_GOOGLE_AUTH_ORIGIN || (typeof window !== 'undefined' ? window.location.origin : '');
}

export function isGoogleAuthOriginConfigured() {
  const configuredOrigin = getGoogleAuthOriginHint();
  if (!configuredOrigin || typeof window === 'undefined') {
    return true;
  }
  return window.location.origin === configuredOrigin;
}

export function describeGoogleAuthError(error) {
  const message = String(error?.message || error || '');
  const lower = message.toLowerCase();
  if (lower.includes('origin_mismatch') || lower.includes('origin mismatch')) {
    const configuredOrigin = getGoogleAuthOriginHint();
    return `Google blocked sign-in from ${typeof window !== 'undefined' ? window.location.origin : 'this origin'}. Add this exact origin to Authorized JavaScript origins in Google Cloud Console${configuredOrigin && configuredOrigin !== window.location.origin ? ` or switch the app to ${configuredOrigin}.` : '.'}`;
  }
  return message;
}
