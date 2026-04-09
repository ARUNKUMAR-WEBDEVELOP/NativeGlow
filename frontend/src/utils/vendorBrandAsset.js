function getApiBaseCandidates() {
  const rawBase =
    import.meta.env.VITE_API_BASE ||
    (import.meta.env.DEV ? 'http://127.0.0.1:8000/api' : 'https://nativeglow.onrender.com/api');

  const trimmed = String(rawBase || '').replace(/\/+$/, '');
  if (!trimmed) {
    return [];
  }

  if (trimmed.endsWith('/api')) {
    return [trimmed];
  }

  return [`${trimmed}/api`, trimmed];
}

export async function uploadVendorBrandAsset(file, token, folder = 'brand') {
  if (!file) {
    throw new Error('Please choose an image file first.');
  }

  if (!token) {
    throw new Error('Vendor login session expired. Please login again.');
  }

  const bases = [...new Set(getApiBaseCandidates())].filter(Boolean);
  if (bases.length === 0) {
    throw new Error('API base URL is not configured.');
  }

  const body = new FormData();
  body.append('file', file);
  body.append('folder', folder);

  let lastError = null;

  for (const base of bases) {
    try {
      const res = await fetch(`${base}/vendor/brand-assets/upload/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body,
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        const detail = payload?.detail || payload?.error || `Image upload failed (${res.status}).`;
        throw new Error(detail);
      }

      const imageUrl = payload?.url || '';
      if (!imageUrl) {
        throw new Error('Upload succeeded but image URL was missing in response.');
      }

      return imageUrl;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Image upload failed. Please try again.');
}
