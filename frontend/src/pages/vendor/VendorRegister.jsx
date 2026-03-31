import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { theme } from '../../styles/designSystem';
import Button from '../../components/common/Button';

// Validation Schema
const validationSchema = yup.object().shape({
  // Step 1
  full_name: yup.string().min(2, 'Name must be at least 2 characters').required('Full name is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().min(8, 'Password must be at least 8 characters').required('Password is required'),
  confirm_password: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Confirm password is required'),
  whatsapp_number: yup
    .string()
    .matches(/^[0-9]{10}$/, 'WhatsApp number must be 10 digits')
    .required('WhatsApp number is required'),
  city: yup.string().min(2, 'City is required').required('City is required'),

  // Step 2
  business_name: yup.string().min(2, 'Business name must be valid').required('Business name is required'),
  product_categories: yup
    .array()
    .min(1, 'Select at least one category')
    .required('Product categories are required'),
  where_you_sell: yup.array().min(1, 'Select at least one platform').required('Selling platforms are required'),
  natural_only_confirmed: yup.boolean().oneOf([true], 'You must confirm you sell only natural products'),
  terms_accepted: yup.boolean().oneOf([true], 'You must accept terms'),

  // Step 3
  upi_id: yup.string().required('UPI ID is required'),
  account_holder_name: yup.string().min(2, 'Account holder name is required').required(),
  bank_account_number: yup.string().required('Bank account number is required'),
  bank_ifsc: yup.string().matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code').required(),
  bank_name: yup.string().required('Bank name is required'),
});

const PRODUCT_CATEGORIES = [
  'Face Wash',
  'Soap',
  'Serum',
  'Toner',
  'Moisturizer',
  'Hair Care',
  'Body Care',
  'Other',
];

const SELLING_PLATFORMS = [
  'WhatsApp',
  'Instagram',
  'YouTube',
  'Facebook',
  'Local Market',
  'Other',
];

/**
 * Modern split-screen vendor registration form
 * Left: Decorative side with testimonial
 * Right: Multi-step form with validation
 */
const VendorRegister = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      confirm_password: '',
      whatsapp_number: '',
      city: '',
      business_name: '',
      product_categories: [],
      where_you_sell: [],
      natural_only_confirmed: false,
      terms_accepted: false,
      upi_id: '',
      account_holder_name: '',
      bank_account_number: '',
      bank_ifsc: '',
      bank_name: '',
    },
  });

  const watchProductCategories = watch('product_categories');
  const watchPlatforms = watch('where_you_sell');

  const onSubmit = async (data) => {
    if (step < 3) {
      setStep(step + 1);
      return;
    }

    setIsLoading(true);
    try {
      // API call would go here
      // const response = await vendorService.registerVendor(data);
      setSubmitted(true);
    } catch (err) {
      console.error('Registration failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  // â”€â”€â”€ LEFT PANEL: DECORATIVE SIDE â”€â”€â”€
  const LeftPanel = () => (
    <div
      className="hidden lg:flex fixed left-0 top-0 w-2/5 h-screen flex-col items-center justify-between p-8"
      style={{
        background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.primaryLight} 100%)`,
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2" style={{ fontFamily: theme.fonts.heading }}>
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
          style={{ backgroundColor: theme.colors.primaryGlow }}
        >
          ðŸŒ¿
        </div>
        <span className="text-2xl font-bold text-white">NativeGlow</span>
      </div>

      {/* Phone Mockup */}
      <div
        className="float relative"
        style={{
          width: '220px',
          backgroundColor: '#000000',
          borderRadius: '40px',
          padding: '12px',
          boxShadow: `0 0 60px ${theme.colors.primaryGlow}40`,
        }}
      >
        <div
          style={{
            backgroundColor: theme.colors.cream,
            borderRadius: '32px',
            aspectRatio: '9/20',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.colors.muted,
            fontSize: '11px',
            fontWeight: 'bold',
          }}
        >
          <div style={{ marginBottom: '8px' }}>Your Store</div>
          <div style={{ fontSize: '10px', opacity: 0.6 }}>Live in minutes</div>
        </div>
      </div>

      {/* Step Indicators */}
      <div className="flex gap-3">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className="rounded-full transition-all duration-300"
            style={{
              width: '12px',
              height: '12px',
              backgroundColor: s <= step ? theme.colors.primaryGlow : 'rgba(255,255,255,0.3)',
            }}
          />
        ))}
      </div>

      {/* Testimonial Card */}
      <div
        className="glass rounded-2xl p-6 max-w-sm text-center"
        style={{ maxWidth: '280px' }}
      >
        <p className="text-sm text-white mb-4 leading-relaxed">
          "I was taking orders on WhatsApp notes. Now everything is managed automatically."
        </p>
        <p className="text-sm font-semibold text-white">â€” Priya S, Chennai</p>
      </div>
    </div>
  );

  // â”€â”€â”€ SUCCESS SCREEN â”€â”€â”€
  const SuccessScreen = () => (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: `linear-gradient(135deg, ${theme.colors.primary}20, ${theme.colors.primaryGlow}20)` }}
    >
      <div className="text-center space-y-6 max-w-md mx-auto">
        <div>
          <p className="text-6xl mb-4 animate-bounce">ðŸŽ‰</p>
          <h2
            className="text-4xl font-bold"
            style={{ color: theme.colors.charcoal, fontFamily: theme.fonts.heading }}
          >
            Registration Submitted!
          </h2>
        </div>

        <p style={{ color: theme.colors.muted }} className="text-lg">
          Our admin team will review your details. You'll receive an email with your store link within 24 hours.
        </p>

        <Button
          variant="primary"
          size="lg"
          onClick={() => navigate('/')}
          fullWidth
        >
          Back to Home
        </Button>
      </div>
    </div>
  );

  if (submitted) {
    return <SuccessScreen />;
  }

  return (
    <div className="min-h-screen flex">
      <LeftPanel />

      {/* RIGHT PANEL: FORM AREA */}
      <div className="w-full lg:w-3/5 lg:ml-2/5 bg-white">
        <div className="max-w-2xl mx-auto px-6 md:px-8 py-12">
          {/* Progress Bar */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold" style={{ color: theme.colors.muted }}>
                Step {step} of 3
              </p>
              <p className="text-sm font-semibold" style={{ color: theme.colors.muted }}>
                {Math.round((step / 3) * 100)}%
              </p>
            </div>
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: `${theme.colors.muted}15` }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${(step / 3) * 100}%`,
                  backgroundColor: theme.colors.primary,
                }}
              />
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* STEP 1: PERSONAL INFO */}
            {step === 1 && (
              <div className="space-y-6">
                <h1
                  className="text-4xl font-bold"
                  style={{ color: theme.colors.charcoal, fontFamily: theme.fonts.heading }}
                >
                  Let's get started
                </h1>

                {/* Full Name */}
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: theme.colors.charcoal }}>
                    Full Name
                  </label>
                  <Controller
                    name="full_name"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        placeholder="Your full name"
                        className="w-full px-4 py-3 rounded-xl border-2 transition-all"
                        style={{
                          borderColor: errors.full_name ? theme.colors.danger : `${theme.colors.muted}20`,
                          color: theme.colors.charcoal,
                        }}
                      />
                    )}
                  />
                  {errors.full_name && (
                    <p className="text-sm mt-1" style={{ color: theme.colors.danger }}>
                      {errors.full_name.message}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: theme.colors.charcoal }}>
                    Email Address
                  </label>
                  <Controller
                    name="email"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="email"
                        placeholder="your@email.com"
                        className="w-full px-4 py-3 rounded-xl border-2 transition-all"
                        style={{
                          borderColor: errors.email ? theme.colors.danger : `${theme.colors.muted}20`,
                          color: theme.colors.charcoal,
                        }}
                      />
                    )}
                  />
                  {errors.email && (
                    <p className="text-sm mt-1" style={{ color: theme.colors.danger }}>
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: theme.colors.charcoal }}>
                    Password
                  </label>
                  <div className="relative">
                    <Controller
                      name="password"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Min 8 characters"
                          className="w-full px-4 py-3 rounded-xl border-2 transition-all pr-12"
                          style={{
                            borderColor: errors.password ? theme.colors.danger : `${theme.colors.muted}20`,
                            color: theme.colors.charcoal,
                          }}
                        />
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-sm font-semibold"
                      style={{ color: theme.colors.muted }}
                    >
                      {showPassword ? 'ðŸ‘ï¸' : 'ðŸ‘ï¸â€ðŸ—¨ï¸'}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm mt-1" style={{ color: theme.colors.danger }}>
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: theme.colors.charcoal }}>
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Controller
                      name="confirm_password"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Re-enter your password"
                          className="w-full px-4 py-3 rounded-xl border-2 transition-all pr-12"
                          style={{
                            borderColor: errors.confirm_password ? theme.colors.danger : `${theme.colors.muted}20`,
                            color: theme.colors.charcoal,
                          }}
                        />
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-sm font-semibold"
                      style={{ color: theme.colors.muted }}
                    >
                      {showConfirmPassword ? 'ðŸ‘ï¸' : 'ðŸ‘ï¸â€ðŸ—¨ï¸'}
                    </button>
                  </div>
                  {errors.confirm_password && (
                    <p className="text-sm mt-1" style={{ color: theme.colors.danger }}>
                      {errors.confirm_password.message}
                    </p>
                  )}
                </div>

                {/* WhatsApp */}
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: theme.colors.charcoal }}>
                    WhatsApp Number
                  </label>
                  <div className="flex">
                    <div
                      className="px-4 py-3 rounded-l-xl border-2 font-semibold"
                      style={{
                        borderColor: `${theme.colors.muted}20`,
                        backgroundColor: `${theme.colors.muted}05`,
                        color: theme.colors.charcoal,
                      }}
                    >
                      +91
                    </div>
                    <Controller
                      name="whatsapp_number"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="tel"
                          placeholder="10-digit number"
                          maxLength="10"
                          className="flex-1 px-4 py-3 rounded-r-xl border-2 transition-all"
                          style={{
                            borderColor: errors.whatsapp_number ? theme.colors.danger : `${theme.colors.muted}20`,
                            color: theme.colors.charcoal,
                          }}
                        />
                      )}
                    />
                  </div>
                  {errors.whatsapp_number && (
                    <p className="text-sm mt-1" style={{ color: theme.colors.danger }}>
                      {errors.whatsapp_number.message}
                    </p>
                  )}
                </div>

                {/* City */}
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: theme.colors.charcoal }}>
                    City
                  </label>
                  <Controller
                    name="city"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        placeholder="Your city"
                        className="w-full px-4 py-3 rounded-xl border-2 transition-all"
                        style={{
                          borderColor: errors.city ? theme.colors.danger : `${theme.colors.muted}20`,
                          color: theme.colors.charcoal,
                        }}
                      />
                    )}
                  />
                  {errors.city && (
                    <p className="text-sm mt-1" style={{ color: theme.colors.danger }}>
                      {errors.city.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: BUSINESS INFO */}
            {step === 2 && (
              <div className="space-y-6">
                <h1
                  className="text-4xl font-bold"
                  style={{ color: theme.colors.charcoal, fontFamily: theme.fonts.heading }}
                >
                  About your business
                </h1>

                {/* Business Name */}
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: theme.colors.charcoal }}>
                    Business / Brand Name
                  </label>
                  <Controller
                    name="business_name"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        placeholder="Your brand name"
                        className="w-full px-4 py-3 rounded-xl border-2 transition-all"
                        style={{
                          borderColor: errors.business_name ? theme.colors.danger : `${theme.colors.muted}20`,
                          color: theme.colors.charcoal,
                        }}
                      />
                    )}
                  />
                  {errors.business_name && (
                    <p className="text-sm mt-1" style={{ color: theme.colors.danger }}>
                      {errors.business_name.message}
                    </p>
                  )}
                </div>

                {/* Product Categories */}
                <div>
                  <label className="block text-sm font-semibold mb-3" style={{ color: theme.colors.charcoal }}>
                    Product Categories
                  </label>
                  <Controller
                    name="product_categories"
                    control={control}
                    render={({ field }) => (
                      <div className="flex flex-wrap gap-2">
                        {PRODUCT_CATEGORIES.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              const updated = watchProductCategories.includes(cat)
                                ? watchProductCategories.filter((c) => c !== cat)
                                : [...watchProductCategories, cat];
                              field.onChange(updated);
                            }}
                            className="px-4 py-2 rounded-full font-semibold border-2 transition-all"
                            style={{
                              borderColor: watchProductCategories.includes(cat)
                                ? theme.colors.primary
                                : `${theme.colors.muted}20`,
                              backgroundColor: watchProductCategories.includes(cat)
                                ? `${theme.colors.primary}15`
                                : 'transparent',
                              color: watchProductCategories.includes(cat)
                                ? theme.colors.primary
                                : theme.colors.muted,
                            }}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    )}
                  />
                  {errors.product_categories && (
                    <p className="text-sm mt-2" style={{ color: theme.colors.danger }}>
                      {errors.product_categories.message}
                    </p>
                  )}
                </div>

                {/* Selling Platforms */}
                <div>
                  <label className="block text-sm font-semibold mb-3" style={{ color: theme.colors.charcoal }}>
                    Where do you currently sell?
                  </label>
                  <Controller
                    name="where_you_sell"
                    control={control}
                    render={({ field }) => (
                      <div className="flex flex-wrap gap-2">
                        {SELLING_PLATFORMS.map((platform) => (
                          <button
                            key={platform}
                            type="button"
                            onClick={() => {
                              const updated = watchPlatforms.includes(platform)
                                ? watchPlatforms.filter((p) => p !== platform)
                                : [...watchPlatforms, platform];
                              field.onChange(updated);
                            }}
                            className="px-4 py-2 rounded-full font-semibold border-2 transition-all"
                            style={{
                              borderColor: watchPlatforms.includes(platform)
                                ? theme.colors.primary
                                : `${theme.colors.muted}20`,
                              backgroundColor: watchPlatforms.includes(platform)
                                ? `${theme.colors.primary}15`
                                : 'transparent',
                              color: watchPlatforms.includes(platform)
                                ? theme.colors.primary
                                : theme.colors.muted,
                            }}
                          >
                            {platform}
                          </button>
                        ))}
                      </div>
                    )}
                  />
                  {errors.where_you_sell && (
                    <p className="text-sm mt-2" style={{ color: theme.colors.danger }}>
                      {errors.where_you_sell.message}
                    </p>
                  )}
                </div>

                {/* Natural Products Confirmation */}
                <div>
                  <Controller
                    name="natural_only_confirmed"
                    control={control}
                    render={({ field }) => (
                      <label
                        className="flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all"
                        style={{
                          borderColor: field.value ? theme.colors.primary : `${theme.colors.muted}20`,
                          backgroundColor: field.value ? `${theme.colors.primary}10` : 'transparent',
                        }}
                      >
                        <input
                          {...field}
                          type="checkbox"
                          className="w-5 h-5 rounded cursor-pointer"
                          style={{ accentColor: theme.colors.primary }}
                        />
                        <span style={{ color: theme.colors.charcoal }}>
                          I sell only 100% natural cosmetic products
                        </span>
                      </label>
                    )}
                  />
                  {errors.natural_only_confirmed && (
                    <p className="text-sm mt-2" style={{ color: theme.colors.danger }}>
                      {errors.natural_only_confirmed.message}
                    </p>
                  )}
                </div>

                {/* Terms Acceptance */}
                <div>
                  <Controller
                    name="terms_accepted"
                    control={control}
                    render={({ field }) => (
                      <label
                        className="flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all"
                        style={{
                          borderColor: field.value ? theme.colors.primary : `${theme.colors.muted}20`,
                          backgroundColor: field.value ? `${theme.colors.primary}10` : 'transparent',
                        }}
                      >
                        <input
                          {...field}
                          type="checkbox"
                          className="w-5 h-5 rounded cursor-pointer"
                          style={{ accentColor: theme.colors.primary }}
                        />
                        <span style={{ color: theme.colors.charcoal }}>
                          I accept NativeGlow platform terms and disclaimer
                        </span>
                      </label>
                    )}
                  />
                  {errors.terms_accepted && (
                    <p className="text-sm mt-2" style={{ color: theme.colors.danger }}>
                      {errors.terms_accepted.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: PAYMENT DETAILS */}
            {step === 3 && (
              <div className="space-y-6">
                <h1
                  className="text-4xl font-bold"
                  style={{ color: theme.colors.charcoal, fontFamily: theme.fonts.heading }}
                >
                  How buyers will pay you
                </h1>

                {/* Info Box */}
                <div
                  className="rounded-xl border-2 p-4"
                  style={{
                    borderColor: theme.colors.info,
                    backgroundColor: `${theme.colors.info}15`,
                    color: theme.colors.info,
                  }}
                >
                  <p className="text-sm font-semibold">
                    Buyers will pay directly to your UPI or Bank. NativeGlow does not collect or hold payments.
                  </p>
                </div>

                {/* UPI ID */}
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: theme.colors.charcoal }}>
                    UPI ID
                  </label>
                  <Controller
                    name="upi_id"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        placeholder="yourname@upi"
                        className="w-full px-4 py-3 rounded-xl border-2 transition-all"
                        style={{
                          borderColor: errors.upi_id ? theme.colors.danger : `${theme.colors.muted}20`,
                          color: theme.colors.charcoal,
                        }}
                      />
                    )}
                  />
                  {errors.upi_id && (
                    <p className="text-sm mt-1" style={{ color: theme.colors.danger }}>
                      {errors.upi_id.message}
                    </p>
                  )}
                </div>

                {/* Account Holder */}
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: theme.colors.charcoal }}>
                    Account Holder Name
                  </label>
                  <Controller
                    name="account_holder_name"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        placeholder="Name on bank account"
                        className="w-full px-4 py-3 rounded-xl border-2 transition-all"
                        style={{
                          borderColor: errors.account_holder_name ? theme.colors.danger : `${theme.colors.muted}20`,
                          color: theme.colors.charcoal,
                        }}
                      />
                    )}
                  />
                  {errors.account_holder_name && (
                    <p className="text-sm mt-1" style={{ color: theme.colors.danger }}>
                      {errors.account_holder_name.message}
                    </p>
                  )}
                </div>

                {/* Bank Account Number */}
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: theme.colors.charcoal }}>
                    Bank Account Number
                  </label>
                  <Controller
                    name="bank_account_number"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        placeholder="Your bank account number"
                        className="w-full px-4 py-3 rounded-xl border-2 transition-all"
                        style={{
                          borderColor: errors.bank_account_number ? theme.colors.danger : `${theme.colors.muted}20`,
                          color: theme.colors.charcoal,
                        }}
                      />
                    )}
                  />
                  {errors.bank_account_number && (
                    <p className="text-sm mt-1" style={{ color: theme.colors.danger }}>
                      {errors.bank_account_number.message}
                    </p>
                  )}
                </div>

                {/* IFSC Code */}
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: theme.colors.charcoal }}>
                    IFSC Code
                  </label>
                  <Controller
                    name="bank_ifsc"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        placeholder="SBIN0001234"
                        className="w-full px-4 py-3 rounded-xl border-2 transition-all uppercase"
                        style={{
                          borderColor: errors.bank_ifsc ? theme.colors.danger : `${theme.colors.muted}20`,
                          color: theme.colors.charcoal,
                        }}
                      />
                    )}
                  />
                  {errors.bank_ifsc && (
                    <p className="text-sm mt-1" style={{ color: theme.colors.danger }}>
                      {errors.bank_ifsc.message}
                    </p>
                  )}
                </div>

                {/* Bank Name */}
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: theme.colors.charcoal }}>
                    Bank Name
                  </label>
                  <Controller
                    name="bank_name"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        placeholder="State Bank of India"
                        className="w-full px-4 py-3 rounded-xl border-2 transition-all"
                        style={{
                          borderColor: errors.bank_name ? theme.colors.danger : `${theme.colors.muted}20`,
                          color: theme.colors.charcoal,
                        }}
                      />
                    )}
                  />
                  {errors.bank_name && (
                    <p className="text-sm mt-1" style={{ color: theme.colors.danger }}>
                      {errors.bank_name.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 pt-8 border-t" style={{ borderColor: `${theme.colors.muted}20` }}>
              <Button
                variant="ghost"
                size="lg"
                onClick={handleBack}
                disabled={step === 1}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                variant="primary"
                size="lg"
                type="submit"
                loading={isLoading}
                className="flex-1"
              >
                {step === 3 ? 'Submit Registration' : 'Continue â†’'}
              </Button>
            </div>
          </form>

          {/* Mobile device indicator */}
          <div className="lg:hidden text-center mt-12">
            <p style={{ color: theme.colors.muted }} className="text-sm">
              For better experience, open on a larger screen
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorRegister;
