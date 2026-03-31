import { useState } from 'react';
import { theme } from '../../styles/designSystem';
import Button from './Button';

/**
 * Professional 3D product card used across entire NativeGlow platform
 * Features hover effects, pricing display, stock alerts, and quick actions
 * 
 * @component
 * @example
 * <ProductCard3D 
 *   product={productData} 
 *   onOrder={handleOrder}
 *   onWhatsApp={handleWhatsApp}
 *   theme="light"
 * />
 */
const ProductCard3D = ({
  product,
  onOrder = () => {},
  onWhatsApp = () => {},
  theme: cardTheme = 'light',
  isLoading = false,
}) => {
  const [isImageLoaded, setIsImageLoaded] = useState(!isLoading);
  const [hovered, setHovered] = useState(false);

  if (!product) return null;

  const {
    name,
    price,
    discounted_price,
    discount_percent = 0,
    image,
    category,
    is_natural_certified = true,
    product_tag = 'NEW',
    available_quantity = 10,
  } = product;

  // Tag styling
  const tagColors = {
    NEW: { bg: '#3b82f6', label: 'NEW' },
    BESTSELLER: { bg: '#f59e0b', label: '⭐ BESTSELLER' },
    LIMITED: { bg: '#ef4444', label: '⏱ LIMITED' },
    SALE: { bg: theme.colors.primary, label: '🎉 SALE' },
  };

  const tagStyle = tagColors[product_tag] || tagColors.NEW;
  const isLowStock = available_quantity < 5 && available_quantity > 0;
  const isOutOfStock = available_quantity === 0;

  // Skeleton loader
  if (isLoading) {
    return (
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          backgroundColor: cardTheme === 'dark' ? `${theme.colors.charcoal}15` : theme.colors.cream,
        }}
      >
        {/* Image skeleton */}
        <div
          className="aspect-square shimmer rounded-lg"
          style={{ backgroundColor: `${theme.colors.muted}20` }}
        />

        {/* Content skeleton */}
        <div className="p-4 space-y-3">
          <div className="h-4 shimmer rounded" style={{ backgroundColor: `${theme.colors.muted}20` }} />
          <div className="h-4 w-3/4 shimmer rounded" style={{ backgroundColor: `${theme.colors.muted}20` }} />
          <div className="flex gap-2">
            <div className="h-8 flex-1 shimmer rounded-full" style={{ backgroundColor: `${theme.colors.muted}20` }} />
            <div className="h-8 flex-1 shimmer rounded-full" style={{ backgroundColor: `${theme.colors.muted}20` }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="card-3d rounded-2xl overflow-hidden transition-all duration-300"
      style={{
        backgroundColor: cardTheme === 'dark' ? `${theme.colors.charcoal}15` : '#ffffff',
        border: `1px solid ${cardTheme === 'dark' ? `${theme.colors.primary}20` : `${theme.colors.muted}15`}`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image Container */}
      <div
        className="relative aspect-square overflow-hidden bg-gradient-to-br"
        style={{
          backgroundColor: theme.colors.cream,
          backgroundImage: `linear-gradient(135deg, ${theme.colors.cream}, #f5efea)`,
        }}
      >
        {/* Product Tag - Top Left */}
        {product_tag && (
          <div
            className="absolute top-3 left-3 z-10 px-3 py-1.5 rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: tagStyle.bg }}
          >
            {tagStyle.label}
          </div>
        )}

        {/* Discount Badge - Top Right */}
        {discount_percent > 0 && (
          <div
            className="absolute top-3 right-3 z-10 px-3 py-1.5 rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: theme.colors.danger }}
          >
            -{discount_percent}%
          </div>
        )}

        {/* Product Image */}
        <img
          src={image || '/placeholder-product.jpg'}
          alt={name}
          onLoad={() => setIsImageLoaded(true)}
          className="w-full h-full object-cover transition-transform duration-300"
          style={{
            transform: hovered ? 'scale(1.1)' : 'scale(1)',
          }}
        />

        {/* Quick View Overlay - Bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 transition-all duration-300 transform"
          style={{
            transform: hovered ? 'translateY(0)' : 'translateY(100%)',
          }}
        >
          <button
            onClick={() => console.log('Quick view triggered')}
            className="w-full py-2 px-4 rounded-full font-semibold text-white text-sm transition-all"
            style={{
              backgroundColor: `${theme.colors.primaryGlow}dd`,
              border: `1px solid ${theme.colors.primaryGlow}`,
            }}
          >
            Quick View
          </button>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4 space-y-3">
        {/* Natural Certified Badge */}
        {is_natural_certified && (
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: `${theme.colors.primary}15`,
              color: theme.colors.primary,
            }}
          >
            <span>🌿</span>
            <span>100% Natural</span>
          </div>
        )}

        {/* Product Name */}
        <h3
          className="text-base font-bold line-clamp-2"
          style={{ color: theme.colors.charcoal, fontFamily: theme.fonts.heading }}
        >
          {name}
        </h3>

        {/* Category Pill */}
        <div
          className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
          style={{
            backgroundColor: `${theme.colors.primaryLight}20`,
            color: theme.colors.primary,
          }}
        >
          {category}
        </div>

        {/* Divider */}
        <div
          style={{ borderTop: `1px solid ${theme.colors.muted}20` }}
        />

        {/* Pricing */}
        <div className="flex items-center gap-2">
          <span
            className="text-lg font-bold"
            style={{ color: theme.colors.primary }}
          >
            ₹{discounted_price || price}
          </span>
          {discounted_price && (
            <span
              className="text-sm line-through"
              style={{ color: theme.colors.muted }}
            >
              ₹{price}
            </span>
          )}
          {discount_percent > 0 && (
            <span
              className="text-xs font-semibold px-2 py-1 rounded"
              style={{
                backgroundColor: `${theme.colors.danger}20`,
                color: theme.colors.danger,
              }}
            >
              SAVE {discount_percent}%
            </span>
          )}
        </div>

        {/* Divider */}
        <div
          style={{ borderTop: `1px solid ${theme.colors.muted}20` }}
        />

        {/* Stock Status */}
        {isLowStock && (
          <p
            className="text-xs font-semibold"
            style={{ color: theme.colors.warning }}
          >
            ⚠️ Only {available_quantity} left in stock!
          </p>
        )}
        {isOutOfStock && (
          <p
            className="text-xs font-semibold"
            style={{ color: theme.colors.danger }}
          >
            ❌ Out of Stock
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="primary"
            size="sm"
            fullWidth
            disabled={isOutOfStock}
            onClick={() => onOrder(product)}
            className="flex-1"
          >
            Order Now
          </Button>
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            onClick={() => onWhatsApp(product)}
            className="flex-1"
          >
            💬 WhatsApp
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard3D;
