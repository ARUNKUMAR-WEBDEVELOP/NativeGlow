from decimal import Decimal

from rest_framework import serializers

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
