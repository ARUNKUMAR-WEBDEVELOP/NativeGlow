function getApiBaseOrigin() {
  const apiBase = import.meta.env.VITE_API_BASE || 'https://nativeglow.onrender.com/api';
  try {
    return new URL(apiBase).origin;
  } catch {
    return 'https://nativeglow.onrender.com';
  }
}

export const PRODUCT_FALLBACK_IMAGE = '/fallback-product.svg';

export function applyImageFallback(event, fallbackSrc = PRODUCT_FALLBACK_IMAGE) {
  const img = event?.currentTarget;
  if (!img) {
    return;
  }

  if (img.dataset.fallbackApplied === 'true') {
    return;
  }

  img.dataset.fallbackApplied = 'true';
  img.src = fallbackSrc;
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

  if (trimmed.startsWith('media/')) {
    return `${getApiBaseOrigin()}/${trimmed}`;
  }

  if (trimmed.startsWith('/media/')) {
    return `${getApiBaseOrigin()}${trimmed}`;
  }

  if (trimmed.startsWith('/')) {
    return `${getApiBaseOrigin()}${trimmed}`;
  }

  // Most backend image fields are media-relative paths; handle bare filenames safely.
  if (/\.(png|jpe?g|webp|gif|svg|bmp|avif)$/i.test(trimmed)) {
    return `${getApiBaseOrigin()}/media/${trimmed.replace(/^\/+/, '')}`;
  }

  return `${getApiBaseOrigin()}/${trimmed}`;
}

function extractImageValue(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object') {
    return (
      value.image_url ||
      value.image ||
      value.url ||
      value.src ||
      value.path ||
      value.filename ||
      value.file_name ||
      null
    );
  }

  return null;
}

export function getProductImageUrls(product) {
  if (!product || typeof product !== 'object') {
    return [];
  }

  const candidates = [
    product.primary_image,
    product.image,
    product.image_url,
    product.thumbnail,
  ];

  const collectionFields = [product.images, product.product_images, product.gallery];
  collectionFields.forEach((collection) => {
    if (Array.isArray(collection)) {
      collection.forEach((entry) => {
        candidates.push(extractImageValue(entry));
      });
    }
  });

  const seen = new Set();
  return candidates
    .map((entry) => resolveImageUrl(extractImageValue(entry)))
    .filter((entry) => {
      if (!entry || seen.has(entry)) {
        return false;
      }
      seen.add(entry);
      return true;
    });
}

export function getPrimaryProductImage(product) {
  const images = getProductImageUrls(product);
  return images.length > 0 ? images[0] : null;
}