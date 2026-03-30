from decimal import Decimal
from urllib.parse import quote
from django.utils import timezone

from rest_framework import serializers
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string

from products.models import Product
from .models import Order, OrderItem
from .payment import create_stub_payment_intent


COUPON_RULES = {
    'NATURAL12': {'type': 'percent', 'value': Decimal('12')},
    'WELCOME5': {'type': 'fixed', 'value': Decimal('5')},
    'GLOW10': {'type': 'percent', 'value': Decimal('10')},
}


class OrderItemReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = (
            'id', 'product', 'product_title', 'product_sku',
            'quantity', 'unit_price', 'line_total',
        )


class OrderReadSerializer(serializers.ModelSerializer):
    items = OrderItemReadSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = (
            'id', 'status', 'full_name', 'email', 'phone',
            'address_line1', 'address_line2', 'city', 'state',
            'pincode', 'country', 'subtotal', 'shipping_fee',
            'discount_total', 'coupon_code', 'total', 'payment_provider',
            'payment_reference', 'payment_status', 'notes', 'items', 'created_at',
        )


class OrderCreateItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)


class OrderCreateSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=20)
    address_line1 = serializers.CharField(max_length=255)
    address_line2 = serializers.CharField(max_length=255, required=False, allow_blank=True)
    city = serializers.CharField(max_length=100)
    state = serializers.CharField(max_length=100)
    pincode = serializers.CharField(max_length=20)
    country = serializers.CharField(max_length=100, default='India')
    notes = serializers.CharField(required=False, allow_blank=True)
    coupon_code = serializers.CharField(max_length=40, required=False, allow_blank=True)
    items = OrderCreateItemSerializer(many=True)

    def create(self, validated_data):
        request = self.context['request']
        items_data = validated_data.pop('items')
        coupon_code = (validated_data.get('coupon_code') or '').strip().upper()
        if coupon_code:
            validated_data['coupon_code'] = coupon_code

        product_ids = [item['product_id'] for item in items_data]
        products_map = {
            product.id: product
            for product in Product.objects.filter(id__in=product_ids, is_active=True)
        }

        if len(products_map) != len(set(product_ids)):
            raise serializers.ValidationError('One or more products are invalid or inactive.')

        subtotal = Decimal('0.00')
        order = Order.objects.create(user=request.user, **validated_data)

        for item in items_data:
            product = products_map[item['product_id']]
            quantity = item['quantity']
            unit_price = Decimal(str(product.price))
            line_total = unit_price * quantity
            subtotal += line_total

            OrderItem.objects.create(
                order=order,
                product=product,
                product_title=product.title,
                product_sku=product.sku,
                quantity=quantity,
                unit_price=unit_price,
                line_total=line_total,
            )

            if product.inventory_qty >= quantity:
                product.inventory_qty -= quantity
                product.save(update_fields=['inventory_qty'])

        shipping_fee = Decimal('0.00') if subtotal >= Decimal('39.00') else Decimal('4.99')
        discount_total = self._get_discount_total(coupon_code, subtotal)
        total = subtotal + shipping_fee - discount_total

        payment_intent = create_stub_payment_intent(order_id=order.id, amount=total)

        order.subtotal = subtotal
        order.shipping_fee = shipping_fee
        order.discount_total = discount_total
        order.total = total
        order.payment_provider = payment_intent['provider']
        order.payment_reference = payment_intent['reference']
        order.payment_status = payment_intent['status']
        order.save(
            update_fields=[
                'subtotal',
                'shipping_fee',
                'discount_total',
                'total',
                'payment_provider',
                'payment_reference',
                'payment_status',
            ]
        )

        return order

    def _get_discount_total(self, coupon_code, subtotal):
        if not coupon_code:
            return Decimal('0.00')
        rule = COUPON_RULES.get(coupon_code)
        if not rule:
            raise serializers.ValidationError({'coupon_code': 'Coupon code is invalid.'})

        if rule['type'] == 'percent':
            discount = (subtotal * rule['value']) / Decimal('100')
        else:
            discount = rule['value']

        return min(discount.quantize(Decimal('0.01')), subtotal)

    def to_representation(self, instance):
        return OrderReadSerializer(instance).data


class PaymentIntentSerializer(serializers.Serializer):
    order_id = serializers.IntegerField()
    client_secret = serializers.CharField()
    reference = serializers.CharField()
    provider = serializers.CharField()
    amount = serializers.CharField()
    currency = serializers.CharField()


class PublicOrderPlaceSerializer(serializers.ModelSerializer):
    """
    POST /api/order/place/
    Public order placement without authentication.
    Accepts: vendor_slug, product_id, buyer_name, buyer_phone, buyer_address,
             buyer_pincode, quantity, payment_method, payment_reference
    """
    buyer_name = serializers.CharField(max_length=255, required=True)
    buyer_phone = serializers.CharField(max_length=20, required=True)
    buyer_address = serializers.CharField(required=True)
    buyer_pincode = serializers.CharField(max_length=20, required=True)
    payment_reference = serializers.CharField(max_length=120, required=True)
    product_id = serializers.IntegerField(write_only=True)
    vendor_slug = serializers.CharField(max_length=255, write_only=True, required=False)

    class Meta:
        model = Order
        fields = (
            'id',
            'order_code',
            'product_id',
            'vendor_slug',
            'buyer_name',
            'buyer_phone',
            'buyer_address',
            'buyer_pincode',
            'quantity',
            'payment_method',
            'payment_reference',
            'total_amount',
            'order_status',
            'created_at',
        )
        read_only_fields = ('id', 'order_code', 'total_amount', 'order_status', 'created_at')

    def validate_buyer_phone(self, value):
        """Validate phone is 10 digits."""
        # Remove any non-digit characters
        phone_digits = ''.join(filter(str.isdigit, value))
        if len(phone_digits) != 10:
            raise serializers.ValidationError('Phone number must be 10 digits.')
        return value

    def validate_payment_reference(self, value):
        """Ensure payment_reference is not blank."""
        if not value or not value.strip():
            raise serializers.ValidationError('Please enter payment reference (UTR/Transaction ID).')
        return value.strip()

    def validate_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError('Quantity must be at least 1.')
        return value

    def validate(self, attrs):
        product_id = attrs.get('product_id')
        quantity = attrs.get('quantity')
        vendor_slug = attrs.get('vendor_slug')

        # Get product with all validations
        product = Product.objects.filter(
            id=product_id,
            status='approved',
            is_active=True,
            available_quantity__gt=0
        ).first()

        if not product:
            raise serializers.ValidationError({
                'product_id': 'Product not found or is unavailable.'
            })

        # If vendor_slug provided, validate it matches
        if vendor_slug:
            if not product.vendor or product.vendor.vendor_slug != vendor_slug:
                raise serializers.ValidationError({
                    'vendor_slug': 'Vendor does not sell this product.'
                })

        if not product.vendor_id:
            raise serializers.ValidationError({
                'product_id': 'This product is not attached to a vendor.'
            })

        if product.available_quantity < quantity:
            raise serializers.ValidationError({
                'quantity': f'Only {product.available_quantity} items available.'
            })

        attrs['product_obj'] = product
        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        buyer = getattr(request, 'buyer', None) if request else None

        product = validated_data.pop('product_obj')
        validated_data.pop('product_id', None)
        validated_data.pop('vendor_slug', None)

        if buyer and buyer.vendor_id != product.vendor_id:
            raise serializers.ValidationError(
                {'vendor_slug': 'Buyer account does not belong to this vendor store.'}
            )

        quantity = validated_data['quantity']
        total_amount = Decimal(str(product.price)) * quantity

        order = Order.objects.create(
            vendor=product.vendor,
            product=product,
            buyer=buyer,
            full_name=validated_data['buyer_name'],
            email='',
            phone=validated_data['buyer_phone'],
            address_line1=validated_data['buyer_address'],
            city=product.vendor.city or 'NA',
            state='NA',
            pincode=validated_data.get('buyer_pincode', '000000'),
            country='India',
            total_amount=total_amount,
            total=total_amount,
            subtotal=total_amount,
            order_status='pending',
            status='pending',
            **validated_data,
        )

        # Reduce stock immediately on order placement
        product.available_quantity -= quantity
        product.inventory_qty = max(product.inventory_qty - quantity, 0)
        if product.available_quantity <= 0:
            product.available_quantity = 0
            product.is_active = False
        product.save(update_fields=['available_quantity', 'inventory_qty', 'is_active'])

        return order

    def to_representation(self, instance):
        """
        Return custom response with order_code and whatsapp confirmation URL.
        
        Generates:
        1. WhatsApp wa.me URL with pre-filled order details for buyer
        """
        vendor = instance.vendor
        product = instance.product
        
        # Generate WhatsApp message with pre-filled text
        whatsapp_message = (
            f"Hi {vendor.business_name if vendor else 'Vendor'},\n\n"
            f"I placed an order on NativeGlow.\n"
            f"Order Code: {instance.order_code}\n"
            f"Product: {product.name if product else 'N/A'} x {instance.quantity}\n"
            f"Amount Paid: ₹{instance.total_amount}\n"
            f"Payment Ref: {instance.payment_reference}\n\n"
            f"Buyer Details:\n"
            f"Name: {instance.buyer_name}\n"
            f"Phone: {instance.buyer_phone}\n"
            f"Address: {instance.buyer_address}"
        )
        
        # Create wa.me URL (encode message for URL and remove newlines for compact format)
        whatsapp_number = vendor.whatsapp_number if vendor else ''
        whatsapp_text = quote(whatsapp_message)
        whatsapp_confirm_url = f"https://wa.me/{whatsapp_number}?text={whatsapp_text}"
        
        vendor_whatsapp = vendor.whatsapp_number if vendor else ''
        
        return {
            'order_code': instance.order_code,
            'order_id': str(instance.order_id),
            'total_amount': str(instance.total_amount),
            'payment_reference': instance.payment_reference,
            'payment_method': instance.payment_method,
            'vendor_whatsapp': vendor_whatsapp,
            'whatsapp_confirm_url': whatsapp_confirm_url,
            'message': f'Order {instance.order_code} placed successfully. Please share this code with vendor {vendor.business_name if vendor else ""}. Click the WhatsApp link to confirm order details with vendor.'
        }



class VendorOrderListSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_image = serializers.SerializerMethodField()

    def get_product_image(self, obj):
        product = getattr(obj, 'product', None)
        if not product:
            return None

        first_gallery_image = product.images.first()
        if first_gallery_image:
            return first_gallery_image.image_url

        product_image = getattr(product, 'image', None)
        if product_image:
            try:
                return product_image.url
            except Exception:
                return None
        return None

    class Meta:
        model = Order
        fields = (
            'id',
            'order_code',
            'buyer_name',
            'buyer_phone',
            'buyer_address',
            'buyer_pincode',
            'quantity',
            'total_amount',
            'payment_method',
            'payment_reference',
            'order_status',
            'tracking_id',
            'courier_name',
            'confirmed_at',
            'shipped_at',
            'delivered_at',
            'cancelled_at',
            'tracking_info',
            'cancel_reason',
            'created_at',
            'product',
            'product_name',
            'product_image',
        )


class VendorOrderStatusUpdateSerializer(serializers.ModelSerializer):
    tracking_id = serializers.CharField(required=False, allow_blank=True)
    courier_name = serializers.CharField(required=False, allow_blank=True)
    tracking_info = serializers.CharField(required=False, allow_blank=True)
    cancel_reason = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Order
        fields = ('order_status', 'tracking_id', 'courier_name', 'tracking_info', 'cancel_reason')

    def validate(self, attrs):
        new_status = attrs.get('order_status', getattr(self.instance, 'order_status', None))
        cancel_reason = attrs.get('cancel_reason', '')

        if new_status == 'cancelled' and not cancel_reason.strip():
            raise serializers.ValidationError({'cancel_reason': 'Cancellation reason is required.'})

        return attrs

    def update(self, instance, validated_data):
        new_status = validated_data.get('order_status', instance.order_status)
        tracking_id = validated_data.get('tracking_id')
        courier_name = validated_data.get('courier_name')
        tracking_info = validated_data.get('tracking_info')
        cancel_reason = validated_data.get('cancel_reason')
        previous_status = instance.order_status

        instance.order_status = new_status
        instance.status = new_status

        now = timezone.now()
        if new_status == 'confirmed':
            instance.confirmed_at = now
        if new_status == 'shipped':
            instance.shipped_at = now
        if new_status == 'delivered':
            instance.delivered_at = now
        if new_status == 'cancelled':
            instance.cancelled_at = now

        if tracking_id is not None:
            instance.tracking_id = tracking_id.strip()
        if courier_name is not None:
            instance.courier_name = courier_name.strip()

        if tracking_info is not None:
            instance.tracking_info = tracking_info.strip()

        if new_status == 'shipped' and tracking_info is None:
            info_parts = []
            next_courier = (courier_name if courier_name is not None else instance.courier_name) or ''
            next_tracking_id = (tracking_id if tracking_id is not None else instance.tracking_id) or ''
            if next_courier.strip():
                info_parts.append(f"Courier: {next_courier.strip()}")
            if next_tracking_id.strip():
                info_parts.append(f"Tracking ID: {next_tracking_id.strip()}")
            instance.tracking_info = ' | '.join(info_parts)

        if cancel_reason is not None:
            instance.cancel_reason = cancel_reason.strip()

        if new_status != 'cancelled' and cancel_reason is None:
            instance.cancel_reason = ''
            instance.cancelled_at = None

        if new_status != 'shipped' and tracking_info is None:
            instance.tracking_info = ''
            if tracking_id is None:
                instance.tracking_id = ''
            if courier_name is None:
                instance.courier_name = ''

        # Restore stock if order moves to cancelled for the first time.
        if new_status == 'cancelled' and previous_status != 'cancelled' and instance.product:
            product = instance.product
            qty = int(instance.quantity or 0)
            product.available_quantity = (product.available_quantity or 0) + qty
            product.inventory_qty = (product.inventory_qty or 0) + qty
            if product.available_quantity > 0:
                product.is_active = True
            product.save(update_fields=['available_quantity', 'inventory_qty', 'is_active'])

        self._send_buyer_status_email(instance)

        instance.save(update_fields=[
            'order_status',
            'status',
            'tracking_id',
            'courier_name',
            'tracking_info',
            'cancel_reason',
            'confirmed_at',
            'shipped_at',
            'delivered_at',
            'cancelled_at',
            'updated_at',
        ])
        return instance

    def _send_buyer_status_email(self, order):
        buyer_email = order.email
        if not buyer_email:
            return

        status_label = str(order.order_status).replace('_', ' ').title()
        vendor_name = order.vendor.business_name if order.vendor else 'the seller'
        vendor_contact = ''
        if order.vendor:
            vendor_contact = getattr(order.vendor, 'whatsapp_number', '') or getattr(order.vendor, 'whatsapp', '') or ''

        message_lines = [
            f"Your order {order.order_code} is now {status_label}.",
            '',
            f"Product: {order.product.name if order.product else 'N/A'}",
            f"Quantity: {order.quantity}",
            f"Amount: Rs {order.total_amount}",
        ]

        if order.order_status == 'shipped':
            if order.courier_name:
                message_lines.append(f"Courier: {order.courier_name}")
            if order.tracking_id:
                message_lines.append(f"Tracking ID: {order.tracking_id}")
        if order.order_status == 'cancelled' and order.cancel_reason:
            message_lines.append(f"Cancellation reason: {order.cancel_reason}")

        message_lines += [
            '',
            f"Vendor: {vendor_name}",
            f"Vendor contact: {vendor_contact or 'Available in your order page'}",
            '',
            'Thank you for shopping with NativeGlow.',
        ]

        send_mail(
            subject=f"Your order {order.order_code} is now {status_label}",
            message='\n'.join(message_lines),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[buyer_email],
            fail_silently=True,
        )


class BuyerConfirmDeliverySerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True)
    rating = serializers.IntegerField(required=False, min_value=1, max_value=5)


class BuyerOrderListSerializer(serializers.ModelSerializer):
    product = serializers.CharField(source='product.name', read_only=True)
    status = serializers.CharField(source='order_status', read_only=True)
    product_image = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            'order_code',
            'product',
            'product_image',
            'status',
            'buyer_confirmed_delivery',
            'buyer_confirmed_at',
            'delivery_rating',
            'payment_reference',
            'quantity',
            'total_amount',
            'created_at',
        )
        read_only_fields = fields

    def get_product_image(self, obj):
        product = getattr(obj, 'product', None)
        if not product:
            return None

        first_gallery_image = product.images.first()
        if first_gallery_image:
            return first_gallery_image.image_url

        product_image = getattr(product, 'image', None)
        if product_image:
            try:
                return product_image.url
            except Exception:
                return None
        return None


# ============================================================================
# PUBLIC ORDER TRACKING SERIALIZERS
# ============================================================================

class PublicOrderTrackingSerializer(serializers.ModelSerializer):
    """
    GET /api/order/track/?phone=9876543210
    List all orders for a phone number (no login required).
    """
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_image = serializers.SerializerMethodField()
    vendor_name = serializers.CharField(source='vendor.business_name', read_only=True)
    confirmed_at = serializers.DateTimeField(read_only=True)
    shipped_at = serializers.DateTimeField(read_only=True)
    delivered_at = serializers.DateTimeField(read_only=True)
    cancelled_at = serializers.DateTimeField(read_only=True)
    tracking_id = serializers.CharField(read_only=True)
    courier_name = serializers.CharField(read_only=True)
    tracking_info = serializers.CharField(read_only=True)
    cancel_reason = serializers.CharField(read_only=True)

    def get_product_image(self, obj):
        product = getattr(obj, 'product', None)
        if not product:
            return None

        first_gallery_image = product.images.first()
        if first_gallery_image:
            return first_gallery_image.image_url

        product_image = getattr(product, 'image', None)
        if product_image:
            try:
                return product_image.url
            except Exception:
                return None
        return None

    class Meta:
        model = Order
        fields = (
            'order_code',
            'product_name',
            'product_image',
            'vendor_name',
            'quantity',
            'total_amount',
            'order_status',
            'confirmed_at',
            'shipped_at',
            'delivered_at',
            'cancelled_at',
            'tracking_id',
            'courier_name',
            'tracking_info',
            'cancel_reason',
            'created_at',
        )
        read_only_fields = fields


class PublicOrderTrackingDetailSerializer(serializers.ModelSerializer):
    """
    GET /api/order/track/<order_code>/
    Get single order detail by order code (no login required).
    Includes vendor contact details for communication.
    """
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_image = serializers.SerializerMethodField()
    product_description = serializers.CharField(source='product.description', read_only=True)
    product_price = serializers.DecimalField(
        source='product.price', max_digits=10, decimal_places=2, read_only=True
    )
    vendor_name = serializers.CharField(source='vendor.business_name', read_only=True)
    vendor_whatsapp = serializers.CharField(source='vendor.whatsapp_number', read_only=True)
    vendor_city = serializers.CharField(source='vendor.city', read_only=True)
    confirmed_at = serializers.DateTimeField(read_only=True)
    shipped_at = serializers.DateTimeField(read_only=True)
    delivered_at = serializers.DateTimeField(read_only=True)
    cancelled_at = serializers.DateTimeField(read_only=True)
    tracking_id = serializers.CharField(read_only=True)
    courier_name = serializers.CharField(read_only=True)
    tracking_info = serializers.CharField(read_only=True)
    cancel_reason = serializers.CharField(read_only=True)

    def get_product_image(self, obj):
        product = getattr(obj, 'product', None)
        if not product:
            return None

        first_gallery_image = product.images.first()
        if first_gallery_image:
            return first_gallery_image.image_url

        product_image = getattr(product, 'image', None)
        if product_image:
            try:
                return product_image.url
            except Exception:
                return None
        return None

    class Meta:
        model = Order
        fields = (
            'order_code',
            'order_id',
            'buyer_name',
            'buyer_phone',
            'buyer_address',
            'buyer_pincode',
            'product_name',
            'product_image',
            'product_description',
            'product_price',
            'quantity',
            'total_amount',
            'payment_method',
            'payment_reference',
            'order_status',
            'confirmed_at',
            'shipped_at',
            'delivered_at',
            'cancelled_at',
            'tracking_id',
            'courier_name',
            'tracking_info',
            'cancel_reason',
            'vendor_name',
            'vendor_whatsapp',
            'vendor_city',
            'created_at',
            'updated_at',
        )
        read_only_fields = fields
