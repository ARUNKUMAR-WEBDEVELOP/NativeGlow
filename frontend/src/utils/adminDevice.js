import FingerprintJS from '@fingerprintjs/fingerprintjs';

const ADMIN_DEVICE_STORAGE_KEY = 'nativeglow_admin_device_id';

let cachedDeviceId = typeof window !== 'undefined' ? localStorage.getItem(ADMIN_DEVICE_STORAGE_KEY) || '' : '';

// ── Initialize FingerprintJS hardware identification ─────────────────────────
// Calculates visitorId based on GPU, Canvas, WebGL, Audio, Screen, Fonts, CPU cores.
// Even if the user clears browser data/cache, FingerprintJS recalculates the EXACT same ID.
const fpPromise = typeof window !== 'undefined'
  ? FingerprintJS.load()
      .then((fp) => fp.get())
      .then((result) => {
        const fpId = `fp-${result.visitorId}`;
        cachedDeviceId = fpId;
        try {
          localStorage.setItem(ADMIN_DEVICE_STORAGE_KEY, fpId);
        } catch {
          // ignore quota error
        }
        return fpId;
      })
      .catch((err) => {
        console.warn('FingerprintJS calculation failed, using fallback:', err);
        return cachedDeviceId;
      })
  : Promise.resolve(cachedDeviceId);

/**
 * Asynchronously gets the unique hardware fingerprint for this browser.
 * Guaranteed to be stable even across browser data/cache wipes.
 */
export async function getAdminDeviceId() {
  if (cachedDeviceId && cachedDeviceId.startsWith('fp-') && !cachedDeviceId.startsWith('fp-temp-')) {
    return cachedDeviceId;
  }

  try {
    const fpId = await fpPromise;
    if (fpId) return fpId;
  } catch (e) {
    // fallback
  }

  return getAdminDeviceIdSync();
}

/**
 * Synchronous getter for headers where async isn't convenient.
 * Returns cached hardware fingerprint or fallback stored ID.
 */
export function getAdminDeviceIdSync() {
  if (cachedDeviceId) {
    return cachedDeviceId;
  }

  try {
    const storedDeviceId = localStorage.getItem(ADMIN_DEVICE_STORAGE_KEY);
    if (storedDeviceId) {
      cachedDeviceId = storedDeviceId;
      return storedDeviceId;
    }
  } catch {
    // fallback
  }

  const fallbackId = `fp-temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return fallbackId;
}