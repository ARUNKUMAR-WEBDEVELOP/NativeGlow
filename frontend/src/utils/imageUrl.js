function getApiBaseOrigin() {
  const apiBase = import.meta.env.VITE_API_BASE || 'https://nativeglow.onrender.com/api';
  try {
    return new URL(apiBase).origin;
  } catch {
    return 'https://nativeglow.onrender.com';
  }
}

export function resolveImageUrl(url) {
  if (!url) {
    return null;
  }

  if (typeof url !== 'string') {
    return null;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  if (trimmed.startsWith('/media/')) {
    return `${getApiBaseOrigin()}${trimmed}`;
  }

  if (trimmed.startsWith('/')) {
    return `${getApiBaseOrigin()}${trimmed}`;
  }

  return `${getApiBaseOrigin()}/${trimmed}`;
}