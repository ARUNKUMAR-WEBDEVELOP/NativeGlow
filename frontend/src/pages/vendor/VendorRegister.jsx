import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';

import { registerVendor } from '../../services/vendorService';
import NeoButton from '../../components/ui/NeoButton';
import NeoInput from '../../components/ui/NeoInput';

const CATEGORY_OPTIONS = [
  { label: 'Face Wash', value: 'face_wash' },
  { label: 'Soap', value: 'soap' },
  { label: 'Serum', value: 'serum' },
  { label: 'Moisturizer', value: 'moisturizer' },
  { label: 'Hair Oil', value: 'hair_oil' },
  { label: 'Other', value: 'other' },
];

const STEP_FIELDS = {
  1: ['full_name', 'email', 'password', 'confirm_password', 'whatsapp_number', 'city'],
  2: ['business_name', 'product_category', 'social_media_url', 'natural_only_confirmed', 'terms_accepted'],
  3: ['upi_id', 'account_holder_name', 'bank_account_number', 'bank_ifsc'],
};

const schema = yup.object({
  full_name: yup.string().trim().min(2, 'Enter full name').required('Full name is required'),
  email: yup.string().trim().email('Enter a valid email').required('Email is required'),
  password: yup.string().min(8, 'Minimum 8 characters').required('Password is required'),
  confirm_password: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Confirm password is required'),
  whatsapp_number: yup
    .string()
    .matches(/^\d{10}$/, 'Enter a 10 digit number')
    .required('WhatsApp number is required'),
  city: yup.string().trim().min(2, 'Enter city').required('City is required'),
  business_name: yup.string().trim().min(2, 'Enter business name').required('Business name is required'),
  product_category: yup.array().min(1, 'Select at least one category').required(),
  social_media_url: yup
    .string()
    .trim()
    .test('valid-social-media', 'Enter a valid Instagram or YouTube URL or handle', function(value) {
      if (!value) return false;
      const lower = value.toLowerCase();
      const isHandle = /^@[a-zA-Z0-9_]+$/.test(value);
      const isYoutube = lower.includes('youtube.com') || lower.includes('youtu.be');
      const isInstagram = lower.includes('instagram.com');
      return isHandle || isYoutube || isInstagram;
    })
    .required('Instagram or YouTube URL/handle is required for vendor verification'),
  natural_only_confirmed: yup.boolean().oneOf([true], 'You must confirm this'),
  terms_accepted: yup.boolean().oneOf([true], 'You must accept terms'),
  upi_id: yup.string().trim().required('UPI ID is required'),
  account_holder_name: yup.string().trim().min(2, 'Enter account holder name').required('Account holder name is required'),
  bank_account_number: yup.string().trim().required('Bank account number is required'),
  bank_ifsc: yup
    .string()
    .trim()
    .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Enter a valid IFSC')
    .required('IFSC is required'),
});

const inputClass = '';

function FieldError({ message }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-rose-600">{message}</p>;
}

export default function VendorRegister() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState(null);

  const {
    control,
    setValue,
    trigger,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      confirm_password: '',
      whatsapp_number: '',
      city: '',
      business_name: '',
      product_category: [],
      social_media_url: '',
      natural_only_confirmed: false,
      terms_accepted: false,
      upi_id: '',
      account_holder_name: '',
      bank_account_number: '',
      bank_ifsc: '',
    },
  });

  const progress = useMemo(() => Math.round((step / 3) * 100), [step]);
  const knownFields = useMemo(() => new Set(Object.values(STEP_FIELDS).flat()), []);

  useEffect(() => {
    try {
      const profile = JSON.parse(localStorage.getItem('nativeglow_google_profile') || 'null');
      if (profile?.name) {
        setValue('full_name', profile.name, { shouldDirty: false, shouldValidate: false });
      }
      if (profile?.email) {
        setValue('email', profile.email, { shouldDirty: false, shouldValidate: false });
      }
    } catch {
      return;
    }
  }, [setValue]);

  const goNext = async () => {
    const valid = await trigger(STEP_FIELDS[step]);
    if (valid) {
      setApiError('');
      setStep((prev) => Math.min(prev + 1, 3));
    }
  };

  const goBack = () => {
    setApiError('');
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const onSubmit = async (values) => {
    setSubmitting(true);
    setApiError('');
    try {
      const payload = {
        full_name: values.full_name,
        email: values.email,
        password: values.password,
        confirm_password: values.confirm_password,
        business_name: values.business_name,
        whatsapp_number: values.whatsapp_number,
        city: values.city,
        product_category: values.product_category,
        social_media_url: values.social_media_url,
        natural_only_confirmed: values.natural_only_confirmed,
        terms_accepted: values.terms_accepted,
        upi_id: values.upi_id,
        bank_account_number: values.bank_account_number,
        bank_ifsc: values.bank_ifsc.toUpperCase(),
        account_holder_name: values.account_holder_name,
      };

      const { data } = await registerVendor(payload);
      setSuccess(data || { email: values.email, business_name: values.business_name });
    } catch (err) {
      const payload = err?.response?.data;
      
      // Handle field-specific errors from backend
      if (payload && typeof payload === 'object') {
        const errorSummary = [];
        Object.entries(payload).forEach(([name, detail]) => {
          const message = Array.isArray(detail) ? detail[0] : String(detail);
          if (knownFields.has(name)) {
            setError(name, { type: 'server', message });
            errorSummary.push(`• ${name}: ${message}`);
          }
        });
        
        // If we found field errors, show them together with a helpful message
        if (errorSummary.length > 0) {
          setApiError(
            `Please fix these issues before continuing:\n${errorSummary.join('\n')}`
          );
        } else {
          // Show generic error if no specific fields were identified
          setApiError(
            payload?.detail ||
              'Registration failed. Please check all required fields are filled correctly.'
          );
        }
      } else {
        setApiError(
          err?.message ||
          'Registration failed. Please check your connection and try again.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-brand-soft">
        <header className="border-b border-white/70 bg-white/65 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
            <Link to="/" className="text-xl font-bold text-emerald-700">NativeGlow</Link>
            <NeoButton variant="secondary" onClick={() => navigate('/vendor/login')} className="px-3 py-2 text-sm">Vendor Login</NeoButton>
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
          <section className="rounded-2xl border border-violet-200/70 bg-white/80 p-6 shadow-sm backdrop-blur sm:p-8">
            <h1 className="text-2xl font-bold text-zinc-900">Registration Submitted</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Your vendor account request has been received. Admin review is required before activation.
            </p>

            <div className="mt-6 rounded-xl border border-violet-100 bg-white/80 p-4 text-sm">
              <p><span className="font-semibold">Business:</span> {success.business_name}</p>
              <p><span className="font-semibold">Email:</span> {success.email}</p>
              {success?.login_credentials?.password ? (
                <p><span className="font-semibold">Password:</span> {success.login_credentials.password}</p>
              ) : null}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <NeoButton type="button" onClick={() => navigate('/vendor/login')}>Go to Vendor Login</NeoButton>
              <NeoButton type="button" variant="secondary" onClick={() => navigate('/')}>Back to Home</NeoButton>
            </div>
          </section>
        </main>

        <footer className="border-t bg-white">
          <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-zinc-500 sm:px-6">NativeGlow vendor onboarding</div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-soft">
      <header className="border-b border-white/70 bg-white/65 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="text-xl font-bold text-violet-700">NativeGlow</Link>
          <Link to="/vendor/login" className="rounded-xl border border-violet-200 bg-white/80 px-3 py-2 text-sm font-semibold text-violet-700 transition duration-300 hover:bg-white">Already a vendor? Login</Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-2xl border border-violet-100 bg-white/80 p-5 shadow-sm backdrop-blur">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Vendor Registration</p>
          <h2 className="mt-2 text-xl font-bold text-zinc-900">Create your store account</h2>
          <p className="mt-2 text-sm text-zinc-600">Sign in to NativeGlow first, and your account details will be used here automatically.</p>

          <div className="mt-5 rounded-2xl border border-violet-100 bg-white/85 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-violet-600">Connected account</p>
            <p className="mt-1 text-sm text-zinc-600">This form pulls your logged-in NativeGlow profile if you already signed in.</p>
            <p className="mt-2 text-xs text-zinc-500">If you are not signed in yet, go to Google Login first and come back here.</p>
          </div>

          <div className="mt-5 h-2 w-full rounded-full bg-zinc-200">
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-xs font-semibold text-zinc-600">Step {step} of 3</p>

          <ul className="mt-4 space-y-2 text-sm">
            <li className={step === 1 ? 'font-semibold text-violet-700' : 'text-zinc-500'}>1. Personal details</li>
            <li className={step === 2 ? 'font-semibold text-violet-700' : 'text-zinc-500'}>2. Business details</li>
            <li className={step === 3 ? 'font-semibold text-violet-700' : 'text-zinc-500'}>3. Payment setup</li>
          </ul>
        </aside>

        <section className="rounded-2xl border border-violet-100 bg-white/80 p-5 shadow-sm backdrop-blur sm:p-7">
          {apiError ? (
            <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{apiError}</p>
          ) : null}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {step === 1 ? (
              <>
                <h1 className="text-2xl font-bold text-zinc-900">Personal Details</h1>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-semibold text-zinc-700">Full name</label>
                    <Controller name="full_name" control={control} render={({ field }) => <NeoInput {...field} className={inputClass} placeholder="Your full name" />} />
                    <FieldError message={errors.full_name?.message} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-semibold text-zinc-700">Email</label>
                    <Controller name="email" control={control} render={({ field }) => <NeoInput {...field} type="email" className={inputClass} placeholder="you@example.com" />} />
                    <FieldError message={errors.email?.message} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-zinc-700">Password</label>
                    <Controller name="password" control={control} render={({ field }) => <NeoInput {...field} type="password" className={inputClass} />} />
                    <FieldError message={errors.password?.message} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-zinc-700">Confirm password</label>
                    <Controller name="confirm_password" control={control} render={({ field }) => <NeoInput {...field} type="password" className={inputClass} />} />
                    <FieldError message={errors.confirm_password?.message} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-zinc-700">WhatsApp number</label>
                    <Controller name="whatsapp_number" control={control} render={({ field }) => <NeoInput {...field} inputMode="numeric" maxLength={10} className={inputClass} placeholder="10 digit number" />} />
                    <FieldError message={errors.whatsapp_number?.message} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-zinc-700">City</label>
                    <Controller name="city" control={control} render={({ field }) => <NeoInput {...field} className={inputClass} placeholder="Your city" />} />
                    <FieldError message={errors.city?.message} />
                  </div>
                </div>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <h1 className="text-2xl font-bold text-zinc-900">Business Details</h1>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-zinc-700">Business name</label>
                  <Controller name="business_name" control={control} render={({ field }) => <NeoInput {...field} className={inputClass} placeholder="Brand or business name" />} />
                  <FieldError message={errors.business_name?.message} />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-zinc-700">Product categories</label>
                  <Controller
                    name="product_category"
                    control={control}
                    render={({ field }) => (
                      <div className="flex flex-wrap gap-2">
                        {CATEGORY_OPTIONS.map((cat) => {
                          const selected = field.value.includes(cat.value);
                          return (
                            <button
                              key={cat.value}
                              type="button"
                              onClick={() => {
                                const next = selected
                                  ? field.value.filter((v) => v !== cat.value)
                                  : [...field.value, cat.value];
                                field.onChange(next);
                              }}
                              className={`rounded-full border px-3 py-1.5 text-sm ${selected ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'}`}
                            >
                              {cat.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  />
                  <FieldError message={errors.product_category?.message} />
                </div>

                <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-900">📱 Vendor Verification Required</p>
                  <p className="mt-1 text-xs text-amber-800">Add either your Instagram or YouTube profile so customers can verify your existing brand presence. Admin will review this before approval.</p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-zinc-700">Social Media Profile (Instagram or YouTube)</label>
                  <p className="mb-2 text-xs text-zinc-500">Enter your Instagram handle (@yourhandle), Instagram URL, YouTube channel handle (@channel), or YouTube URL</p>
                  <Controller name="social_media_url" control={control} render={({ field }) => <NeoInput {...field} className={inputClass} placeholder="@yourhandle or https://instagram.com/yourshop" />} />
                  <FieldError message={errors.social_media_url?.message} />
                </div>

                <div className="space-y-2 rounded-xl border border-violet-100 bg-white/80 p-3">
                  <Controller
                    name="natural_only_confirmed"
                    control={control}
                    render={({ field }) => (
                      <label className="flex items-start gap-2 text-sm text-zinc-700">
                        <input type="checkbox" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} className="mt-0.5 h-4 w-4" />
                        I confirm I sell only natural cosmetic products.
                      </label>
                    )}
                  />
                  <FieldError message={errors.natural_only_confirmed?.message} />

                  <Controller
                    name="terms_accepted"
                    control={control}
                    render={({ field }) => (
                      <label className="flex items-start gap-2 text-sm text-zinc-700">
                        <input type="checkbox" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} className="mt-0.5 h-4 w-4" />
                        I accept NativeGlow vendor terms and policies.
                      </label>
                    )}
                  />
                  <FieldError message={errors.terms_accepted?.message} />
                </div>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <h1 className="text-2xl font-bold text-zinc-900">Payment Details</h1>
                <p className="text-sm text-zinc-600">Payments go directly to your account.</p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-semibold text-zinc-700">UPI ID</label>
                    <Controller name="upi_id" control={control} render={({ field }) => <NeoInput {...field} className={inputClass} placeholder="yourname@upi" />} />
                    <FieldError message={errors.upi_id?.message} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-semibold text-zinc-700">Account holder name</label>
                    <Controller name="account_holder_name" control={control} render={({ field }) => <NeoInput {...field} className={inputClass} />} />
                    <FieldError message={errors.account_holder_name?.message} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-zinc-700">Bank account number</label>
                    <Controller name="bank_account_number" control={control} render={({ field }) => <NeoInput {...field} className={inputClass} />} />
                    <FieldError message={errors.bank_account_number?.message} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-zinc-700">IFSC</label>
                    <Controller name="bank_ifsc" control={control} render={({ field }) => <NeoInput {...field} className={`${inputClass} uppercase`} placeholder="SBIN0001234" />} />
                    <FieldError message={errors.bank_ifsc?.message} />
                  </div>
                </div>
              </>
            ) : null}

            <div className="flex flex-wrap justify-between gap-3 border-t border-zinc-200 pt-4">
              <NeoButton
                type="button"
                onClick={goBack}
                disabled={step === 1 || submitting}
                variant="secondary"
              >
                Back
              </NeoButton>

              {step < 3 ? (
                <NeoButton
                  type="button"
                  onClick={goNext}
                >
                  Continue
                </NeoButton>
              ) : (
                <NeoButton
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Registration'}
                </NeoButton>
              )}
            </div>
          </form>
        </section>
      </main>

      <footer className="border-t border-white/70 bg-white/60 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-zinc-500 sm:px-6">
          NativeGlow vendor onboarding
        </div>
      </footer>
    </div>
  );
}
