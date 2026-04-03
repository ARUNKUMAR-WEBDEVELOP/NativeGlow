import { useEffect, useMemo, useRef, useState } from 'react';
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

function decodeGoogleCredential(credential) {
  if (!credential || typeof credential !== 'string') {
    return null;
  }

  try {
    const parts = credential.split('.');
    if (parts.length !== 3) {
      return null;
    }
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(payload));
    return {
      name: decoded?.name || '',
      email: decoded?.email || '',
      picture: decoded?.picture || '',
    };
  } catch {
    return null;
  }
}

const STEP_FIELDS = {
  1: ['full_name', 'email', 'password', 'confirm_password', 'whatsapp_number', 'city'],
  2: ['business_name', 'product_category', 'natural_only_confirmed', 'terms_accepted'],
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
  const googleBtnRef = useRef(null);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleIdentity, setGoogleIdentity] = useState(null);
  const [googleToken, setGoogleToken] = useState('');
  const [googleMessage, setGoogleMessage] = useState('');

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

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
    if (!googleClientId) {
      return;
    }

    let mounted = true;

    const initializeGoogle = () => {
      if (!mounted || !window.google?.accounts?.id || !googleBtnRef.current) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          setApiError('');
          setGoogleMessage('');
          const credential = response?.credential || '';
          const decodedProfile = decodeGoogleCredential(credential);

          setGoogleToken(credential);
          setGoogleIdentity(decodedProfile);

          if (decodedProfile?.name) {
            setValue('full_name', decodedProfile.name, { shouldDirty: true, shouldValidate: true });
          }
          if (decodedProfile?.email) {
            setValue('email', decodedProfile.email, { shouldDirty: true, shouldValidate: true });
          }

          setGoogleMessage('Google account verified. Complete the remaining details to submit your vendor request.');
        },
      });

      googleBtnRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        type: 'standard',
        shape: 'pill',
        text: 'continue_with',
        width: 320,
      });
      setGoogleReady(true);
    };

    if (!window.google?.accounts?.id) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogle;
      document.body.appendChild(script);
    } else {
      initializeGoogle();
    }

    return () => {
      mounted = false;
    };
  }, [googleClientId, setValue]);

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
      if (!googleToken) {
        throw new Error('Please verify your account with Google before submitting.');
      }

      const payload = {
        full_name: values.full_name,
        email: values.email,
        password: values.password,
        confirm_password: values.confirm_password,
        business_name: values.business_name,
        whatsapp_number: values.whatsapp_number,
        city: values.city,
        product_category: values.product_category,
        natural_only_confirmed: values.natural_only_confirmed,
        terms_accepted: values.terms_accepted,
        upi_id: values.upi_id,
        bank_account_number: values.bank_account_number,
        bank_ifsc: values.bank_ifsc.toUpperCase(),
        account_holder_name: values.account_holder_name,
        google_token: googleToken,
      };

      const { data } = await registerVendor(payload);
      setSuccess(data || { email: values.email, business_name: values.business_name });
    } catch (err) {
      const payload = err?.response?.data;
      if (payload && typeof payload === 'object') {
        Object.entries(payload).forEach(([name, detail]) => {
          const message = Array.isArray(detail) ? detail[0] : String(detail);
          if (knownFields.has(name)) {
            setError(name, { type: 'server', message });
          }
        });
      }
      setApiError(
        payload?.detail ||
          err?.message ||
          'Registration failed. Please check your form and try again.'
      );
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
          <p className="mt-2 text-sm text-zinc-600">Simple 3-step process. Works well on mobile and desktop.</p>

          <div className="mt-5 rounded-2xl border border-violet-100 bg-white/85 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-violet-600">Google verification</p>
            <p className="mt-1 text-sm text-zinc-600">Vendor registration requires a verified Google account before submission.</p>
            {!googleClientId ? (
              <p className="mt-2 text-xs text-amber-700">Google login is not configured. Set VITE_GOOGLE_CLIENT_ID in the frontend and GOOGLE_CLIENT_ID in the backend.</p>
            ) : (
              <div className="mt-3" ref={googleBtnRef} />
            )}
            {googleClientId && !googleReady ? (
              <p className="mt-2 text-xs text-zinc-500">Preparing Google sign-in...</p>
            ) : null}
            {googleIdentity ? (
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {googleIdentity.picture ? (
                  <img src={googleIdentity.picture} alt={googleIdentity.name || 'Google account'} className="h-9 w-9 rounded-full object-cover" />
                ) : null}
                <div>
                  <p className="font-semibold">{googleIdentity.name || 'Google account verified'}</p>
                  <p className="text-xs">{googleIdentity.email || 'Google email verified'}</p>
                </div>
              </div>
            ) : null}
            {googleMessage ? <p className="mt-2 text-xs text-emerald-700">{googleMessage}</p> : null}
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

            {step === 3 && !googleToken ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Verify your Google account above before submitting this form.
              </p>
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
