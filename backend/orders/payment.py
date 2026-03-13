from uuid import uuid4


def create_stub_payment_intent(*, order_id, amount, currency='USD'):
    """Return a predictable payment intent payload for UI and API wiring."""
    ref = f'NGPAY-{order_id}-{uuid4().hex[:10].upper()}'
    return {
        'provider': 'nativeglow_stub',
        'reference': ref,
        'status': 'pending',
        'client_secret': f'stub_secret_{uuid4().hex}',
        'amount': str(amount),
        'currency': currency,
    }
