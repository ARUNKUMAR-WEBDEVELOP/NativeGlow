import { useCallback, useEffect, useState } from 'react';

const requestDataCache = new Map();
const FRIENDLY_ERROR_MESSAGE = 'Something went wrong. Please try again.';

function readCache(cacheKey, cacheTtlMs) {
  if (!cacheKey) {
    return { hit: false, value: undefined };
  }

  const cached = requestDataCache.get(cacheKey);
  if (!cached) {
    return { hit: false, value: undefined };
  }

  if (Date.now() - cached.timestamp > cacheTtlMs) {
    requestDataCache.delete(cacheKey);
    return { hit: false, value: undefined };
  }

  return { hit: true, value: cached.value };
}

function writeCache(cacheKey, value) {
  if (!cacheKey) {
    return;
  }

  requestDataCache.set(cacheKey, {
    value,
    timestamp: Date.now(),
  });
}

export default function useApiRequest(fetcher, deps = [], options = {}) {
  const {
    immediate = true,
    initialData = null,
    cacheKey = '',
    cacheTtlMs = 60 * 1000,
  } = options;
  const initialCached = readCache(cacheKey, cacheTtlMs);
  const [loading, setLoading] = useState(Boolean(immediate && !initialCached.hit));
  const [error, setError] = useState('');
  const [data, setData] = useState(initialCached.hit ? initialCached.value : initialData);

  const run = useCallback(async (...args) => {
    setLoading(true);
    setError('');

    let lastError = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const result = await fetcher(...args);
        setData(result);
        writeCache(cacheKey, result);
        return result;
      } catch (err) {
        lastError = err;
        if (attempt === 0) {
          continue;
        }
      }
    }

    const message =
      FRIENDLY_ERROR_MESSAGE;
    setError(message);
    throw lastError;
  }, [cacheKey, fetcher]);

  useEffect(() => {
    if (!immediate) {
      return;
    }

    const cached = readCache(cacheKey, cacheTtlMs);
    if (cached.hit) {
      setData(cached.value);
      setLoading(false);
      setError('');
      return;
    }

    let active = true;
    run().catch(() => {
      // Error state is already set in run().
    }).finally(() => {
      if (active) {
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const execute = useCallback(async (...args) => {
    try {
      return await run(...args);
    } finally {
      setLoading(false);
    }
  }, [run]);

  return {
    loading,
    error,
    data,
    setData,
    execute,
  };
}
