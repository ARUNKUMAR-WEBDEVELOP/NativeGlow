import { useEffect, useState } from 'react';
import { api } from '../../api';
import BuyerGoogleLogin from '../vendorsite/BuyerGoogleLogin';
import { BuyerAuthProvider, useBuyerAuth } from '../vendorsite/BuyerAuthContext';
import platformContent from '../../content/platformContent';

function OrderModalContent({ product, vendor, quantity, onClose, onSuccess, vendorSlug }) {
  const { buyer, isLoggedIn } = useBuyerAuth();
  const { vendor_site: vendorSiteContent } = platformContent;
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [prefillLoading, setPrefillLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [orderResponse, setOrderResponse] = useState(null);
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [showCopySuccess, setShowCopySuccess] = useState(false);

  const [formData, setFormData] = useState({
    buyerName: '',
    buyerPhone: '',
    buyerAddress: '',
    buyerPincode: '',
    quantity: quantity || 1,
    paymentMethod: 'upi',
    paymentReference: ''
  });

  const totalAmount = product.price * formData.quantity;

  useEffect(() => {
    if (isLoggedIn) {
      setStep(1);
      return;
    }
    setStep(0);
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn || !buyer?.accessToken) {
      return;
    }

    let mounted = true;

    async function prefillBuyerProfile() {
      setPrefillLoading(true);
      try {
        const profile = await api.getBuyerProfile(buyer.accessToken);
        if (!mounted) {
          return;
        }
        setFormData((prev) => ({
          ...prev,
          buyerName: prev.buyerName || profile?.full_name || buyer?.buyerName || '',
          buyerPhone: prev.buyerPhone || String(profile?.phone || '').replace(/\D/g, '').slice(0, 10),
          buyerAddress: prev.buyerAddress || profile?.default_address || '',
          buyerPincode: prev.buyerPincode || String(profile?.default_pincode || '').replace(/\D/g, '').slice(0, 6),
        }));
      } catch {
        if (!mounted) {
          return;
        }
        setFormData((prev) => ({
          ...prev,
          buyerName: prev.buyerName || buyer?.buyerName || '',
        }));
      } finally {
        if (mounted) {
          setPrefillLoading(false);
        }
      }
    }

    prefillBuyerProfile();

    return () => {
      mounted = false;
    };
  }, [isLoggedIn, buyer]);

  // Validate step 1
  const validateStep1 = () => {
    const newErrors = {};
    
    if (!formData.buyerName.trim()) newErrors.buyerName = 'Name is required';
    if (!formData.buyerPhone || formData.buyerPhone.length !== 10) {
      newErrors.buyerPhone = 'Enter a valid 10-digit phone number';
    }
    if (!formData.buyerAddress.trim()) newErrors.buyerAddress = 'Address is required';
    if (!formData.buyerPincode || formData.buyerPincode.length !== 6) {
      newErrors.buyerPincode = 'Enter a valid 6-digit pincode';
    }
    if (formData.quantity < 1 || formData.quantity > product.available_quantity) {
      newErrors.quantity = `Quantity must be between 1 and ${product.available_quantity}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate step 2
  const validateStep2 = () => {
    const newErrors = {};
    
    if (!formData.paymentReference.trim()) {
      newErrors.paymentReference = 'Payment reference is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle step 1 submit
  const handleStep1Submit = (e) => {
    e.preventDefault();
    if (validateStep1()) {
      setErrors({});
      setStep(2);
    }
  };

  // Handle step 2 submit (place order)
  const handleStep2Submit = async (e) => {
    e.preventDefault();
    if (!validateStep2()) return;

    setLoading(true);
    setErrors({});

    try {
      const response = await api.placeOrder({
        product_id: product.id,
        vendor_slug: vendorSlug,
        buyer_name: formData.buyerName,
        buyer_phone: formData.buyerPhone,
        buyer_address: formData.buyerAddress,
        buyer_pincode: formData.buyerPincode,
        quantity: parseInt(formData.quantity),
        payment_method: formData.paymentMethod,
        payment_reference: formData.paymentReference
      }, isLoggedIn ? buyer?.accessToken : null);

      setOrderResponse(response);
      setStep(3);
      if (onSuccess) onSuccess(response);
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to place order';
      setErrors({ submit: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text, type = 'text') => {
    navigator.clipboard.writeText(text);
    setShowCopySuccess(true);
    setTimeout(() => setShowCopySuccess(false), 2000);
  };

  // Handle WhatsApp confirm
  const handleWhatsAppConfirm = () => {
    if (orderResponse?.whatsapp_confirm_url) {
      window.open(orderResponse.whatsapp_confirm_url, '_blank');
    }
  };

  // Handle track order
  const handleTrackOrder = () => {
    const phoneQuery = formData.buyerPhone ? `?phone=${encodeURIComponent(formData.buyerPhone)}` : '';
    window.location.hash = `#/track${phoneQuery}`;
    onClose();
  };

  const stepHeading =
    step === 0
      ? 'Sign In'
      : step === 1
        ? 'Delivery Details'
        : step === 2
          ? 'Payment Details'
          : 'Order Confirmed';

  const sellerContact = vendor?.whatsapp || vendor?.whatsapp_number || 'N/A';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">{stepHeading}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
            disabled={loading}
          >
            ×
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`flex-1 h-2 rounded-full transition ${
                s <= Math.max(step, 0) ? 'bg-emerald-600' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* STEP 0: Google Login / Guest Choice */}
        {step === 0 && (
          <div className="space-y-4 text-center">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-900">Login is required before placing an order.</p>
            </div>

            <div className="flex items-center justify-center">
              <BuyerGoogleLogin vendorSlug={vendorSlug} showLogout={false} />
            </div>
          </div>
        )}

        {/* STEP 1: Delivery Details */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-4">
            {isLoggedIn ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                {prefillLoading
                  ? 'Loading your saved delivery details...'
                  : `Signed in as ${buyer?.buyerName || 'Buyer'}. Delivery details are pre-filled where available.`}
              </div>
            ) : null}

            {/* Buyer Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={formData.buyerName}
                onChange={(e) => setFormData({ ...formData, buyerName: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                  errors.buyerName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="John Doe"
              />
              {errors.buyerName && <p className="text-xs text-red-600 mt-1">{errors.buyerName}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number (10 digits) *
              </label>
              <input
                type="tel"
                value={formData.buyerPhone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setFormData({ ...formData, buyerPhone: val });
                }}
                maxLength="10"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                  errors.buyerPhone ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="9876543210"
              />
              {errors.buyerPhone && <p className="text-xs text-red-600 mt-1">{errors.buyerPhone}</p>}
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Address *
              </label>
              <textarea
                value={formData.buyerAddress}
                onChange={(e) => setFormData({ ...formData, buyerAddress: e.target.value })}
                rows="3"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                  errors.buyerAddress ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Street address, apartment, etc."
              />
              {errors.buyerAddress && <p className="text-xs text-red-600 mt-1">{errors.buyerAddress}</p>}
            </div>

            {/* Pincode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pincode (6 digits) *
              </label>
              <input
                type="text"
                value={formData.buyerPincode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setFormData({ ...formData, buyerPincode: val });
                }}
                maxLength="6"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                  errors.buyerPincode ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="123456"
              />
              {errors.buyerPincode && <p className="text-xs text-red-600 mt-1">{errors.buyerPincode}</p>}
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity *
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({
                    ...formData,
                    quantity: Math.max(1, formData.quantity - 1)
                  })}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  −
                </button>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                  min="1"
                  max={product.available_quantity}
                  className="w-16 px-3 py-2 text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setFormData({
                    ...formData,
                    quantity: Math.min(product.available_quantity, formData.quantity + 1)
                  })}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  +
                </button>
              </div>
              {errors.quantity && <p className="text-xs text-red-600 mt-1">{errors.quantity}</p>}
            </div>

            {/* Total Amount */}
            <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-3xl font-bold text-emerald-600">₹{totalAmount.toFixed(0)}</p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition"
            >
              Proceed to Payment →
            </button>
          </form>
        )}

        {/* STEP 2: Payment Instructions */}
        {step === 2 && (
          <form onSubmit={handleStep2Submit} className="space-y-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm leading-6 text-blue-800">{vendorSiteContent.payment_note}</p>
            </div>

            {/* Payment Instruction Box */}
            <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-lg">
              <p className="text-center text-2xl font-bold text-amber-900 mb-4">
                💳 Pay ₹{totalAmount.toFixed(0)}
              </p>
              <p className="text-center text-sm text-amber-800">to complete your order</p>
            </div>

            {/* UPI ID */}
            {vendor.upi_id && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">UPI ID</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-50 p-3 rounded-lg border border-gray-200 font-mono text-sm">
                    {vendor.upi_id}
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(vendor.upi_id)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition"
                    title="Copy to clipboard"
                  >
                    {showCopySuccess ? '✓' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            {/* Bank Details */}
            {vendor.bank_account || vendor.bank_ifsc ? (
              <div>
                <button
                  type="button"
                  onClick={() => setShowBankDetails(!showBankDetails)}
                  className="w-full flex items-center justify-between p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  <span className="text-sm font-medium text-gray-700">Bank Transfer Details</span>
                  <span className="text-lg">{showBankDetails ? '−' : '+'}</span>
                </button>
                {showBankDetails && (
                  <div className="mt-3 bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
                    {vendor.bank_account && (
                      <div>
                        <p className="text-gray-600">Account Number</p>
                        <p className="font-mono font-semibold">{vendor.bank_account}</p>
                      </div>
                    )}
                    {vendor.bank_ifsc && (
                      <div>
                        <p className="text-gray-600">IFSC Code</p>
                        <p className="font-mono font-semibold">{vendor.bank_ifsc}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}

            {/* Security Warning */}
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
              <p className="text-sm text-red-800">
                <strong>⚠️ Important:</strong> Pay ONLY to the UPI ID or bank details shown above.
                <br />
                NativeGlow never asks for direct payment.
              </p>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method *
              </label>
              <div className="space-y-2">
                {['upi', 'bank_transfer'].map(method => (
                  <label key={method} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method}
                      checked={formData.paymentMethod === method}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">
                      {method === 'upi' ? 'UPI / PhonePe / Google Pay' : 'Bank Transfer'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Payment Reference */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Reference (UTR/Transaction ID) *
              </label>
              <input
                type="text"
                value={formData.paymentReference}
                onChange={(e) => setFormData({ ...formData, paymentReference: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                  errors.paymentReference ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., UTR123456789 or TXN-ID"
              />
              {errors.paymentReference && (
                <p className="text-xs text-red-600 mt-1">{errors.paymentReference}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Copy the transaction ID from your payment app
              </p>
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                <p className="text-sm text-red-800">{errors.submit}</p>
              </div>
            )}

            {/* Order Summary */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">{product.name}</span>
                  <span className="font-semibold">×{formData.quantity}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-300">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-emerald-600">₹{totalAmount.toFixed(0)}</span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition disabled:bg-gray-400"
            >
              {loading ? 'Placing Order...' : 'Place Order →'}
            </button>
          </form>
        )}

        {/* STEP 3: Order Confirmation */}
        {step === 3 && orderResponse && (
          <div className="text-center space-y-6">
            {/* Success Animation */}
            <div className="flex justify-center">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 bg-green-100 rounded-full animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl">✓</span>
                </div>
              </div>
            </div>

            {/* Success Message */}
            <div>
              <h3 className="text-2xl font-bold text-green-700 mb-2">
                Order Placed Successfully! 🎉
              </h3>
              <p className="text-gray-600">
                Your order has been confirmed. Save your order code to track your order.
              </p>
            </div>

            {/* Order Code */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Order Code</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-emerald-50 p-4 rounded-lg border-2 border-emerald-600 font-mono text-xl font-bold text-emerald-700">
                  {orderResponse.order_code}
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(orderResponse.order_code)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition"
                  title="Copy order code"
                >
                  {showCopySuccess ? '✓' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Seller Contact Info */}
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-left">
              <p className="text-sm text-blue-900 font-medium mb-2">Seller Information</p>
              <p className="text-sm text-blue-800">
                <strong>Business:</strong> {vendor.business_name}
                <br />
                <strong>Contact:</strong> {sellerContact}
              </p>
            </div>

            {isLoggedIn ? (
              <p className="text-sm text-emerald-700 font-medium">
                We&apos;ll notify you to confirm delivery once shipped.
              </p>
            ) : null}

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* WhatsApp Button */}
              <button
                onClick={handleWhatsAppConfirm}
                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
              >
                📲 Send Order Details to Seller on WhatsApp
              </button>

              {/* Track Order Button */}
              <button
                onClick={handleTrackOrder}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition"
              >
                🔍 Track My Order
              </button>

              {/* Continue Shopping */}
              <button
                onClick={onClose}
                className="w-full py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Continue Shopping
              </button>
            </div>

            {/* Footer Note */}
            <p className="text-xs text-gray-500 text-center">
              A confirmation email has been sent to your phone number.
              <br />
              Seller will contact you shortly.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function OrderModal(props) {
  const { vendor, product } = props;
  const vendorSlug = vendor?.vendor_slug || vendor?.slug || product?.vendor_slug || '';

  return (
    <BuyerAuthProvider vendorSlug={vendorSlug}>
      <OrderModalContent {...props} vendorSlug={vendorSlug} />
    </BuyerAuthProvider>
  );
}

export default OrderModal;
