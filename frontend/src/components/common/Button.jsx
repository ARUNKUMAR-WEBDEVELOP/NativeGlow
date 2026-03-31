import { theme } from '../../styles/designSystem';

/**
 * Professional reusable Button component with multiple variants and sizes
 * 
 * @component
 * @example
 * <Button variant="primary" size="lg" loading={isLoading} icon={<ShoppingBag />}>
 *   Order Now
 * </Button>
 */
const Button = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon = null,
  fullWidth = false,
  onClick = null,
  disabled = false,
  children,
  className = '',
  ...props
}) => {
  // Size configurations
  const sizeStyles = {
    sm: 'py-2 px-4 text-sm',
    md: 'py-3 px-6 text-base',
    lg: 'py-4 px-8 text-lg',
    xl: 'py-5 px-10 text-xl',
  };

  // Variant color and style configurations
  const variantStyles = {
    primary: {
      base: 'text-white font-semibold rounded-full transition-all duration-300',
      style: {
        background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.primaryLight})`,
        boxShadow: theme.shadows.glow,
      },
      hover: {
        boxShadow: `0 0 40px rgba(82,183,136,0.7)`,
        transform: 'translateY(-2px)',
      },
      active: {
        transform: 'translateY(0)',
      },
    },
    secondary: {
      base: 'font-semibold rounded-full transition-all duration-300 border-2',
      style: {
        backgroundColor: theme.colors.cream,
        borderColor: theme.colors.primary,
        color: theme.colors.primary,
      },
      hover: {
        backgroundColor: `${theme.colors.primary}10`,
      },
    },
    danger: {
      base: 'text-white font-semibold rounded-full transition-all duration-300',
      style: {
        background: `linear-gradient(135deg, ${theme.colors.danger}, #dc2626)`,
        boxShadow: `0 0 20px rgba(239,68,68,0.4)`,
      },
      hover: {
        boxShadow: `0 0 40px rgba(239,68,68,0.7)`,
        transform: 'translateY(-2px)',
      },
    },
    ghost: {
      base: 'font-semibold rounded-full transition-all duration-300',
      style: {
        backgroundColor: 'transparent',
        color: theme.colors.primary,
      },
      hover: {
        backgroundColor: `${theme.colors.primary}10`,
      },
    },
    white: {
      base: 'font-semibold rounded-full transition-all duration-300',
      style: {
        backgroundColor: '#ffffff',
        color: theme.colors.charcoal,
        boxShadow: theme.shadows.card,
      },
      hover: {
        boxShadow: theme.shadows.hover,
      },
    },
  };

  const config = variantStyles[variant] || variantStyles.primary;

  // Loading spinner component
  const LoadingSpinner = () => (
    <svg
      className="inline-block h-5 w-5 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${config.base}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled || loading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}
        inline-flex items-center justify-center gap-2
        focus:outline-none focus:ring-4
        ${className}
      `}
      style={{
        ...config.style,
        ...(disabled || loading ? {} : {}),
        '--focus-ring-color': `${theme.colors.primaryGlow}30`,
      }}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          Object.assign(e.currentTarget.style, config.hover);
        }
      }}
      onMouseLeave={(e) => {
        Object.assign(e.currentTarget.style, config.style);
      }}
      onMouseDown={(e) => {
        if (!disabled && !loading && config.active) {
          Object.assign(e.currentTarget.style, config.active);
        }
      }}
      onMouseUp={(e) => {
        if (!disabled && !loading) {
          Object.assign(e.currentTarget.style, config.hover);
        }
      }}
      {...props}
    >
      {loading ? (
        <LoadingSpinner />
      ) : icon ? (
        <span className="inline-flex items-center justify-center">{icon}</span>
      ) : null}
      {children && <span>{children}</span>}
    </button>
  );
};

export default Button;
