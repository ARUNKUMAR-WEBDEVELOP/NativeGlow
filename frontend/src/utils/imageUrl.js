function getApiBaseOrigin() {
  const apiBase = import.meta.env.VITE_API_BASE || 'https://nativeglow.onrender.com/api';
  try {
    return new URL(apiBase).origin;
  } catch {
    return 'https://nativeglow.onrender.com';
  }
}

function getSupabaseProductsPublicBase() {
  const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  if (!rawUrl) {
    return '';
  }
  const bucket = (import.meta.env.VITE_SUPABASE_PRODUCT_BUCKET || 'vendor-assets').trim() || 'vendor-assets';
  return `${rawUrl.replace(/\/+$/, '')}/storage/v1/object/public/${bucket}`;
}

function mapLegacyAbsoluteProductUrlToSupabase(urlValue) {
  const supabaseProductsPublicBase = getSupabaseProductsPublicBase();
  if (!supabaseProductsPublicBase) {
    return null;
  }

  try {
    const parsed = new URL(urlValue);
    const path = parsed.pathname || '';

    if (path.startsWith('/products/')) {
      return `${supabaseProductsPublicBase}${path}`;
    }

    // Handle older media-style absolute links like /media/products/{vendor}/{file}.
    if (path.startsWith('/media/products/')) {
      return `${supabaseProductsPublicBase}/${path.slice('/media/'.length)}`;
    }
  } catch {
    return null;
  }

  return null;
}

export function applyImageFallback(event) {
  const target = event?.currentTarget || event?.target;
  if (!target || typeof target !== 'object') {
    return;
  }

  const currentSrc = String(target.src || '');

  // Retry once with alternate Supabase object path shape:
  // - /public/{bucket}/products/{vendor}/{file}
  // - /public/{bucket}/{vendor}/{file}
  if (currentSrc && !target.dataset?.supabasePathRetried) {
    const bucket = (import.meta.env.VITE_SUPABASE_PRODUCT_BUCKET || 'vendor-assets').trim() || 'vendor-assets';
    const prefixedShape = `/storage/v1/object/public/${bucket}/products/`;
    const plainShape = `/storage/v1/object/public/${bucket}/`;

    if (currentSrc.includes(prefixedShape)) {
      const retriedSrc = currentSrc.replace(
        prefixedShape,
        plainShape
      );
      if (retriedSrc !== currentSrc) {
        target.dataset.supabasePathRetried = '1';
        target.src = retriedSrc;
        return;
      }
    }

    if (currentSrc.includes(plainShape)) {
      const retriedSrc = currentSrc.replace(
        plainShape,
        prefixedShape
      );
      if (retriedSrc !== currentSrc) {
        target.dataset.supabasePathRetried = '1';
        target.src = retriedSrc;
        return;
      }
    }
  }

  // Prevent infinite loops if the fallback image also fails.
  target.onerror = null;
  target.src = '/placeholder-product.svg';
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

  // Some records can carry Windows-style separators from legacy paths.
  const normalized = trimmed.replace(/\\/g, '/');

  if (/^https?:\/\//i.test(normalized)) {
    const remapped = mapLegacyAbsoluteProductUrlToSupabase(normalized);
    return remapped || normalized;
  }

  if (normalized.startsWith('data:') || normalized.startsWith('blob:')) {
    return normalized;
  }

  if (normalized.startsWith('products/')) {
    const supabaseProductsPublicBase = getSupabaseProductsPublicBase();
    if (supabaseProductsPublicBase) {
      return `${supabaseProductsPublicBase}/${normalized}`;
    }
  }

  if (normalized.startsWith('/products/')) {
    const supabaseProductsPublicBase = getSupabaseProductsPublicBase();
    if (supabaseProductsPublicBase) {
      return `${supabaseProductsPublicBase}${normalized}`;
    }
  }

  if (normalized.startsWith('media/')) {
    return `${getApiBaseOrigin()}/${normalized}`;
  }

  if (normalized.startsWith('/media/')) {
    return `${getApiBaseOrigin()}${normalized}`;
  }

  if (normalized.startsWith('/')) {
    return `${getApiBaseOrigin()}${normalized}`;
  }

  // Most backend image fields are media-relative paths; handle bare filenames safely.
  if (/\.(png|jpe?g|webp|gif|svg|bmp|avif)$/i.test(normalized)) {
    return `${getApiBaseOrigin()}/media/${normalized.replace(/^\/+/, '')}`;
  }

  return `${getApiBaseOrigin()}/${normalized}`;
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
      value.product_image_url ||
      value.primary_image ||
      value.image ||
      value.product_image ||
      value.url ||
      value.src ||
      value.media_url ||
      value.file_url ||
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
    product.product_image,
    product.product_image_url,
    product.image,
    product.image_url,
    product.media_url,
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