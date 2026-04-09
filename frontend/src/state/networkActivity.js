let activeRequestCount = 0;
const listeners = new Set();
const RETRYABLE_HTTP_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const RETRY_DELAY_MS = 350;

function notify() {
  for (const listener of listeners) {
    listener(activeRequestCount);
  }
}

function trackStart() {
  activeRequestCount += 1;
  notify();
}

function trackEnd() {
  activeRequestCount = Math.max(0, activeRequestCount - 1);
  notify();
}

function getRequestUrl(input) {
  if (!input) {
    return '';
  }

  if (typeof input === 'string') {
    return input;
  }

  if (typeof input?.url === 'string') {
    return input.url;
  }

  return '';
}

function shouldTrackRequest(input) {
  const url = getRequestUrl(input).toLowerCase();
  return url.includes('/api/');
}

function shouldRetryResponse(response) {
  return RETRYABLE_HTTP_STATUS.has(Number(response?.status));
}

function shouldRetryNetworkError(error) {
  return error instanceof TypeError || String(error?.message || '').toLowerCase().includes('network');
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function fetchWithSingleRetry(originalFetch, args) {
  let lastError = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await originalFetch(...args);
      if (attempt === 0 && shouldRetryResponse(response)) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt === 0 && shouldRetryNetworkError(error)) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error('Network request failed after retry.');
}

export function subscribeNetworkActivity(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getNetworkActivityCount() {
  return activeRequestCount;
}

export function beginNetworkActivity() {
  trackStart();
}

export function endNetworkActivity() {
  trackEnd();
}

export function ensureApiFetchTracking() {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') {
    return;
  }

  if (window.__nativeglowApiFetchTracked) {
    return;
  }

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (...args) => {
    const [input] = args;
    const trackThisRequest = shouldTrackRequest(input);

    if (trackThisRequest) {
      trackStart();
    }

    try {
      if (!trackThisRequest) {
        return await originalFetch(...args);
      }

      return await fetchWithSingleRetry(originalFetch, args);
    } finally {
      if (trackThisRequest) {
        trackEnd();
      }
    }
  };

  window.__nativeglowApiFetchTracked = true;
}
