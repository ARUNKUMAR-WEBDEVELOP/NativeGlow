import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { api } from '../../api';

const CATEGORY_OPTIONS = [
  { value: 'face_wash', label: 'Face Wash' },
  { value: 'soap', label: 'Soap' },
  { value: 'serum', label: 'Serum' },
  { value: 'moisturizer', label: 'Moisturizer' },
  { value: 'hair_oil', label: 'Hair Oil' },
  { value: 'other', label: 'Other' },
];

const INITIAL_FORM = {
  full_name: '',
  email: '',
  whatsapp_number: '',
  city: '',
  business_name: '',
  product_category: [],
  natural_only_confirmed: false,
  terms_accepted: false,
  upi_id: '',
  bank_account_number: '',
  bank_ifsc: '',
  account_holder_name: '',
  google_token: '',
};

function VendorRegister() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [googleVerified, setGoogleVerified] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState(null);

  const progress = useMemo(() => `${Math.round((step / 3) * 100)}%`, [step]);

  const googleLogin = useGoogleLogin({
    onSuccess: async (codeResponse) => {
      setIsGoogleLoading(true);
      try {
        // Get user info from Google's userinfo endpoint
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo?access_token=' + codeResponse.access_token);
        const userInfo = await userInfoResponse.json();

        // Auto-populate form with Google data
        setForm((prev) => ({
          ...prev,
          email: userInfo.email || prev.email,
          full_name: userInfo.name || prev.full_name,
          google_token: codeResponse.access_token,
        }));

        setGoogleVerified(true);
        setError('');
      } catch (err) {
        setError('Failed to get Google account info. Please try again.');
      } finally {
        setIsGoogleLoading(false);
      }
    },
    onError: () => {
      setError('Google login failed. Please try again.');
      setIsGoogleLoading(false);
    },
    scope: 'profile email',
  });

  const onInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const onCategoryChange = (e) => {
    const selected = Array.from(e.target.selectedOptions, (option) => option.value);
    setForm((prev) => ({ ...prev, product_category: selected }));
  };

  const validateStep = (currentStep) => {
    if (currentStep === 1) {
      // If Google verified, only need whatsapp_number and city
      if (googleVerified) {
        if (!form.whatsapp_number || !form.city) {
          return 'Please enter WhatsApp number and city.';
        }
        return '';
      }
      // Manual entry requires all fields
      if (!form.full_name || !form.email || !form.whatsapp_number || !form.city) {
        return 'Please complete all personal info fields.';
      }
      return '';
    }

    if (currentStep === 2) {
      if (!form.business_name) {
        return 'Business name is required.';
      }
      if (form.product_category.length === 0) {
        return 'Please select at least one product category.';
      }
      if (!form.natural_only_confirmed) {
        return 'Please confirm that you sell only 100% natural cosmetic products.';
      }
      if (!form.terms_accepted) {
        return 'Please accept NativeGlow platform terms and disclaimer.';
      }
      return '';
    }

    if (!form.upi_id || !form.bank_account_number || !form.bank_ifsc || !form.account_holder_name) {
      return 'Please complete all payment details.';
    }
    return '';
  };

  const goNext = () => {
    const validationError = validateStep(step);
    setError(validationError);
    if (validationError) {
      return;
    }
    setStep((prev) => Math.min(3, prev + 1));
  };

  const goBack = () => {
    setError('');
    setStep((prev) => Math.max(1, prev - 1));
  };

  const fillDummyPayment = () => {
    setForm((prev) => ({
      ...prev,
      upi_id: 'demo.vendor@upi',
      bank_account_number: '123456789012',
      bank_ifsc: 'SBIN0001234',
      account_holder_name: 'Demo Vendor',
    }));
    setError('');
  };

  const fillDummyAllSteps = () => {
    const ts = Date.now();
    setForm({
      full_name: 'Demo Vendor',
      email: `demo.vendor.${ts}@nativeglow.test`,
      whatsapp_number: '9876543210',
      city: 'Chennai',
      business_name: 'Demo Herbal Store',
      product_category: ['face_wash', 'serum'],
      natural_only_confirmed: true,
      terms_accepted: true,
      upi_id: 'demo.vendor@upi',
      bank_account_number: '123456789012',
      bank_ifsc: 'SBIN0001234',
      account_holder_name: 'Demo Vendor',
    });
    setStep(3);
    setError('');
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSuccess('');
    const validationError = validateStep(3);
    setError(validationError);
    if (validationError) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        full_name: form.full_name,
        email: form.email,
        whatsapp_number: form.whatsapp_number,
        city: form.city,
        business_name: form.business_name,
        product_category: form.product_category,
        natural_only_confirmed: form.natural_only_confirmed,
        terms_accepted: form.terms_accepted,
        upi_id: form.upi_id,
        bank_account_number: form.bank_account_number,
        bank_ifsc: form.bank_ifsc,
        account_holder_name: form.account_holder_name,
      };

      // Include google_token if user logged in with Google
      if (form.google_token) {
        payload.google_token = form.google_token;
      }

      const response = await api.vendorRegister(payload);

      // Store registration success data (including generated password)
      setRegistrationSuccess({
        email: response?.email || form.email,
        password: response?.login_credentials?.password || '[auto-generated]',
        business_name: response?.business_name || form.business_name,
        vendor_slug: response?.vendor_slug || '',
      });

      // Reset form
      setForm(INITIAL_FORM);
      setStep(1);
      setError('');
      setGoogleVerified(false);
    } catch (err) {
      if (err?.status === 404) {
        setError('Vendor registration endpoint is not deployed on server yet. Please contact admin to deploy latest backend routes.');
        return;
      }
      setError(err.message || 'Registration failed. Please check your details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="max-w-3xl">
      {/* Registration Success Modal */}
      {registrationSuccess ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl border border-emerald-200 bg-white p-6 shadow-lg">
            <div className="rounded-xl bg-emerald-50 p-4 text-center">
              <p className="text-3xl">✓</p>
              <h3 className="mt-2 text-lg font-semibold text-emerald-900">Registration Successful!</h3>
              <p className="mt-1 text-sm text-emerald-700">Your account is pending admin approval.</p>
            </div>

            <div className="mt-4 space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-sm font-semibold text-zinc-800">Your Login Credentials:</p>
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-semibold text-zinc-600">Email:</label>
                  <p className="mt-1 break-all rounded-lg bg-white px-3 py-2 font-mono text-sm text-zinc-900">{registrationSuccess.email}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-600">Password:</label>
                  <p className="mt-1 break-all rounded-lg bg-white px-3 py-2 font-mono text-sm text-zinc-900">{registrationSuccess.password}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <p className="font-semibold">⚠ Important:</p>
              <ul className="mt-1 list-inside list-disc space-y-1">
                <li>Save these credentials securely. Do not share with anyone.</li>
                <li>You can login after admin approval using these credentials.</li>
                <li>You will receive an email notification once approved.</li>
              </ul>
            </div>

            <button
              onClick={() => {
                setRegistrationSuccess(null);
                navigate('/vendor/pending-approval?email=' + encodeURIComponent(registrationSuccess.email), { replace: true });
              }}
              className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Check Approval Status
            </button>
          </div>
        </div>
      ) : null}

      <div className="rounded-3xl border border-sage/20 bg-gradient-to-br from-[#f7f6ee] via-[#ecf0e2] to-[#e5d9c7] p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-sage">Vendor Onboarding</p>
        <h1 className="mt-2 font-display text-5xl leading-[0.95] text-zinc-900 max-md:text-4xl">Become a NativeGlow Vendor</h1>
        <p className="mt-2 text-sm text-zinc-700">Complete all 3 steps to submit your seller registration for admin review.</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={fillDummyAllSteps}
            className="rounded-xl border border-sage/30 bg-white/70 px-3 py-1.5 text-xs font-semibold text-sage hover:bg-white"
          >
            Use Full Dummy Data
          </button>
        </div>

        <div className="mt-5">
          <div className="h-2 w-full rounded-full bg-white/70">
            <div className="h-full rounded-full bg-sage transition-all duration-300" style={{ width: progress }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs font-semibold text-zinc-600">
            <span className={step >= 1 ? 'text-sage' : ''}>Step 1 Personal</span>
            <span className={step >= 2 ? 'text-sage' : ''}>Step 2 Business</span>
            <span className={step >= 3 ? 'text-sage' : ''}>Step 3 Payment</span>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-5 space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        {step === 1 ? (
          <>
            <h2 className="text-lg font-semibold text-zinc-900">Step 1 - Personal Info</h2>

            {/* Google Login Option */}
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-900 mb-3">Quick Registration with Google:</p>
              {googleVerified ? (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                  <span className="text-lg">✓</span>
                  <div>
                    <p className="text-sm font-semibold text-emerald-900">Google Account Verified</p>
                    <p className="text-xs text-emerald-700">{form.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setGoogleVerified(false);
                      setForm((prev) => ({ ...prev, google_token: '' }));
                    }}
                    className="ml-auto text-xs font-semibold text-emerald-700 hover:text-emerald-900"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isGoogleLoading}
                  onClick={() => googleLogin()}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-white border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <path d="M23.745 12.27c0-.79-.07-1.54-.187-2.27H12.03v4.287h6.846c-.29 1.48-1.175 2.725-2.5 3.573v3.16h4.057c2.364-2.183 3.729-5.406 3.729-9.23Z" fill="#4285F4"/>
                    <path d="M12.03 24c3.39 0 6.226-1.129 8.303-3.06l-4.057-3.16c-1.13.754-2.577 1.2-4.246 1.2-3.265 0-6.032-2.21-7.02-5.18H.957v3.266C2.029 21.785 6.934 24 12.03 24Z" fill="#34A853"/>
                    <path d="M5.01 14.8c-.25-.755-.388-1.559-.388-2.4 0-.841.138-1.645.388-2.4V5.734H.957C.347 7.16 0 8.537 0 12c0 3.463.348 4.84.957 6.266l4.053-3.266Z" fill="#FBBC04"/>
                    <path d="M12.03 4.75c1.84 0 3.49.631 4.784 1.87l3.582-3.582C18.246 1.129 15.41 0 12.03 0 6.934 0 2.029 2.215.957 5.734l4.053 3.266c.988-2.97 3.755-5.25 7.02-5.25Z" fill="#EA4335"/>
                  </svg>
                  {isGoogleLoading ? 'Verifying...' : 'Register with Google'}
                </button>
              )}
            </div>

            {/* OR divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-300" />
              <span className="text-xs font-semibold text-gray-500">OR</span>
              <div className="flex-1 h-px bg-gray-300" />
            </div>

            {/* Manual email entry */}
            <p className="text-xs font-semibold text-gray-600">Enter Your Details Manually:</p>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                name="full_name"
                value={form.full_name}
                onChange={onInputChange}
                placeholder="Full name"
                disabled={googleVerified}
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-600"
              />
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={onInputChange}
                placeholder="Email"
                disabled={googleVerified}
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-600"
              />
              <input
                name="whatsapp_number"
                value={form.whatsapp_number}
                onChange={onInputChange}
                placeholder="WhatsApp number"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
              />
              <input
                name="city"
                value={form.city}
                onChange={onInputChange}
                placeholder="City"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
              <p className="font-semibold">ℹ Password Note:</p>
              <p>A secure password will be automatically generated for you during registration using your email and phone number. You'll see it after successful registration.</p>
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <h2 className="text-lg font-semibold text-zinc-900">Step 2 - Business Info</h2>
            <div className="space-y-3">
              <input name="business_name" value={form.business_name} onChange={onInputChange} placeholder="Business name" className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" />

              <div>
                <label htmlFor="product_category" className="mb-1 block text-sm font-semibold text-zinc-800">Product category (multi-select)</label>
                <select
                  id="product_category"
                  multiple
                  value={form.product_category}
                  onChange={onCategoryChange}
                  className="h-36 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-zinc-500">Hold Ctrl or Cmd to select multiple categories.</p>
              </div>

              <label className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-[#f4f7ed] px-3 py-2 text-sm text-zinc-800">
                <input
                  type="checkbox"
                  name="natural_only_confirmed"
                  checked={form.natural_only_confirmed}
                  onChange={onInputChange}
                  className="mt-1 h-4 w-4 rounded border-zinc-300 text-sage focus:ring-sage"
                />
                <span>I confirm I sell only 100% natural cosmetic products</span>
              </label>

              <label className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-[#f8f2e8] px-3 py-2 text-sm text-zinc-800">
                <input
                  type="checkbox"
                  name="terms_accepted"
                  checked={form.terms_accepted}
                  onChange={onInputChange}
                  className="mt-1 h-4 w-4 rounded border-zinc-300 text-sage focus:ring-sage"
                />
                <span>I accept NativeGlow platform terms and disclaimer</span>
              </label>
            </div>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-zinc-900">Step 3 - Payment Details</h2>
              <button
                type="button"
                onClick={fillDummyPayment}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Fill Dummy Payment Data
              </button>
            </div>
            <div className="rounded-xl border border-sage/25 bg-[#eef5ea] px-3 py-2 text-xs font-semibold text-sage">
              Buyers will pay directly to your UPI/Bank. NativeGlow does not process payments.
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <input name="upi_id" value={form.upi_id} onChange={onInputChange} placeholder="UPI ID" className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" />
              <input name="bank_account_number" value={form.bank_account_number} onChange={onInputChange} placeholder="Bank account number" className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" />
              <input name="bank_ifsc" value={form.bank_ifsc} onChange={onInputChange} placeholder="Bank IFSC" className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" />
              <input name="account_holder_name" value={form.account_holder_name} onChange={onInputChange} placeholder="Account holder name" className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" />
            </div>
          </>
        ) : null}

        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 1 || isSubmitting}
            className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Back
          </button>

          {step < 3 ? (
            <button type="button" onClick={goNext} className="rounded-xl bg-sage px-4 py-2 text-sm font-semibold text-white">
              Next
            </button>
          ) : (
            <button type="submit" disabled={isSubmitting} className="rounded-xl bg-sage px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
              {isSubmitting ? 'Submitting...' : 'Submit Registration'}
            </button>
          )}
        </div>
      </form>

      {success ? <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}
      {error ? <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
    </section>
  );
}

export default VendorRegister;
