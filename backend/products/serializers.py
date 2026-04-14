from rest_framework import serializers
from django.utils.text import slugify
from uuid import uuid4
import requests
import os
from .models import Category, Product, ProductImage, ProductVariant, ProductVariantImage
from vendors.models import Vendor


PRODUCT_ATTRIBUTE_REQUIREMENTS = {
    'skincare': ['brand_name', 'manufacturer', 'country_of_origin', 'package_contains', 'skin_type', 'concern', 'net_volume', 'usage_instructions'],
    'bodycare': ['brand_name', 'manufacturer', 'country_of_origin', 'package_contains', 'body_area', 'fragrance_profile', 'net_volume', 'usage_instructions'],
    'cosmetics': ['brand_name', 'manufacturer', 'country_of_origin', 'package_contains', 'shade', 'finish', 'skin_type', 'expiry_months'],
    'clothing': ['brand_name', 'manufacturer', 'country_of_origin', 'package_contains', 'gender', 'size_chart', 'material', 'fit', 'color', 'care_instructions'],
    'food': ['brand_name', 'manufacturer', 'country_of_origin', 'package_contains', 'flavor', 'net_weight', 'shelf_life_months', 'allergen_info', 'storage_instructions'],
    'grocery': ['brand_name', 'manufacturer', 'country_of_origin', 'package_contains', 'net_weight', 'shelf_life_months', 'allergen_info', 'storage_instructions'],
    'accessories': ['brand_name', 'manufacturer', 'country_of_origin', 'package_contains', 'material', 'color', 'dimensions'],
    'home': ['brand_name', 'manufacturer', 'country_of_origin', 'package_contains', 'material', 'dimensions', 'care_instructions'],
}

MAX_PRODUCT_IMAGES = 4


def _normalize_variant_image_positions(value):
    if value in (None, ''):
        return []
    if not isinstance(value, list):
        raise serializers.ValidationError('image_positions must be a list of image position numbers.')

    seen = set()
    positions = []
    for item in value:
        try:
            position = int(item)
        except (TypeError, ValueError) as exc:
            raise serializers.ValidationError('image_positions values must be integers.') from exc
        if position < 1 or position > MAX_PRODUCT_IMAGES:
            raise serializers.ValidationError(
                f'image_positions values must be between 1 and {MAX_PRODUCT_IMAGES}.'
            )
        if position in seen:
            continue
        seen.add(position)
        positions.append(position)
    return positions


def _is_missing_value(value):
    if value is None:
        return True
    if isinstance(value, bool):
        return False
    if isinstance(value, (int, float)):
        return False
    if isinstance(value, str):
        return not value.strip()
    if isinstance(value, list):
        return len(value) == 0
    if isinstance(value, dict):
        return len(value) == 0
    return False


def _normalize_json_payload(value, *, field_name):
    if isinstance(value, str):
        import json
        raw = value.strip()
        if not raw:
            return [] if field_name == 'variants_payload' else {}
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise serializers.ValidationError(f'{field_name} must be valid JSON.') from exc
        value = parsed
    if field_name == 'variants_payload':
        if value in (None, ''):
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError('variants_payload must be a list of variant objects.')
        return value
    if value in (None, ''):
        return {}
    if not isinstance(value, dict):
        raise serializers.ValidationError('product_attributes must be an object.')
    return value


def _normalize_color_options_payload(value):
    if isinstance(value, str):
        import json
        raw = value.strip()
        if not raw:
            return []
        try:
            value = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise serializers.ValidationError('color_options must be valid JSON.') from exc
    if value in (None, ''):
        return []
    if not isinstance(value, list):
        raise serializers.ValidationError('color_options must be a list of colors.')

    normalized = []
    seen = set()
    for item in value:
        if isinstance(item, str):
            color_value = item.strip()
            image_positions = []
        elif isinstance(item, dict):
            color_value = str(item.get('value') or item.get('label') or item.get('name') or '').strip()
            image_positions = item.get('image_positions', [])
            if not isinstance(image_positions, list):
                image_positions = []
        else:
            continue

        if not color_value or color_value in seen:
            continue
        seen.add(color_value)
        normalized.append({
            'value': color_value,
            'image_positions': [
                int(position)
                for position in image_positions
                if str(position).isdigit() and int(position) > 0
            ],
        })

    return normalized


def _normalize_size_options_payload(value):
    if isinstance(value, str):
        import json
        raw = value.strip()
        if not raw:
            return []
        try:
            value = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise serializers.ValidationError('size_options must be valid JSON.') from exc
    if value in (None, ''):
        return []
    if not isinstance(value, list):
        raise serializers.ValidationError('size_options must be a list of sizes.')

    normalized = []
    seen = set()
    for item in value:
        size_value = str(item.get('value') if isinstance(item, dict) else item).strip()
        if not size_value or size_value in seen:
            continue
        seen.add(size_value)
        normalized.append(size_value)
    return normalized


def _validate_product_attributes(product_type, attributes):
    required_fields = PRODUCT_ATTRIBUTE_REQUIREMENTS.get(product_type or 'skincare', [])
    missing_fields = [field for field in required_fields if _is_missing_value(attributes.get(field))]
    if missing_fields:
        readable = ', '.join(field.replace('_', ' ') for field in missing_fields)
        raise serializers.ValidationError(
            {'product_attributes': f'Missing required fields for {product_type or "product"}: {readable}.'}
        )


def _normalize_variant_item(item):
    if not isinstance(item, dict):
        raise serializers.ValidationError('Each variant must be an object.')
    option_name = str(item.get('option_name', '')).strip()
    option_value = str(item.get('option_value', '')).strip()
    if not option_name or not option_value:
        raise serializers.ValidationError('Each variant requires option_name and option_value.')
    return {
        'option_name': option_name,
        'option_value': option_value,
        'sku_suffix': str(item.get('sku_suffix', '')).strip(),
        'additional_price': item.get('additional_price', 0) or 0,
        'stock': item.get('stock', 0) or 0,
        'image_positions': _normalize_variant_image_positions(item.get('image_positions', [])),
    }


def _absolute_url(request, url):
    if not url:
        return None
    if not request:
        return url
    try:
        return request.build_absolute_uri(url)
    except Exception:
        return url


def _extract_additional_images(request):
    """Read extra image files uploaded as image_1 ... image_3."""
    if not request:
        return []
    extra_files = []
    for key in sorted(request.FILES.keys()):
        if key.startswith('image_'):
            file_obj = request.FILES.get(key)
            if file_obj:
                extra_files.append(file_obj)
    return extra_files[: max(0, MAX_PRODUCT_IMAGES - 1)]


def _count_uploaded_images(request):
    if not request:
        return 0
    count = 1 if request.FILES.get('image') else 0
    count += len([key for key in request.FILES.keys() if key.startswith('image_')])
    return count


def _get_product_images_bucket():
    return (os.environ.get('SUPABASE_PRODUCT_IMAGES_BUCKET', 'vendor-assets') or 'vendor-assets').strip()


def _resolve_public_product_url(storage_path):
    if not storage_path:
        return None
    value = str(storage_path).strip().replace('\\', '/')
    if value.startswith('http://') or value.startswith('https://'):
        return value
    supabase_url = os.environ.get('SUPABASE_URL', '').strip()
    if not supabase_url:
        return value
    bucket = _get_product_images_bucket()
    normalized = value.lstrip('/')
    if normalized.startswith(f'{bucket}/'):
        normalized = normalized[len(bucket) + 1 :]
    if normalized.startswith('products/'):
        normalized = normalized
    else:
        normalized = f'products/{normalized}'
    return f"{supabase_url.rstrip('/')}/storage/v1/object/public/{bucket}/{normalized}"


def _upload_product_image_to_supabase(uploaded_file, vendor_id):
    """Upload a product image to Supabase Storage and return (storage_path, public_url)."""
    base_name, extension = os.path.splitext(uploaded_file.name or 'image')
    safe_base_name = slugify(base_name) or 'image'
    safe_extension = (extension or '.jpg').lower()
    vendor_folder = vendor_id or 'unassigned'
    target_path = f"products/{vendor_folder}/{safe_base_name}{safe_extension}"
    supabase_url = os.environ.get('SUPABASE_URL', '').strip()
    service_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '').strip()
    bucket = _get_product_images_bucket()

    if not supabase_url or not service_key:
        raise serializers.ValidationError(
            {'image': 'Supabase storage is not configured for product image uploads. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'}
        )

    upload_url = f"{supabase_url.rstrip('/')}/storage/v1/object/{bucket}/{target_path}"
    content_type = uploaded_file.content_type or 'application/octet-stream'

    try:
        response = requests.post(
            upload_url,
            headers={
                'apikey': service_key,
                'Authorization': f'Bearer {service_key}',
                'Content-Type': content_type,
                'x-upsert': 'true',
            },
            data=uploaded_file.read(),
            timeout=30,
        )
    except requests.RequestException as exc:
        raise serializers.ValidationError({'image': f'Could not upload image to Supabase: {exc}'}) from exc

    if not response.ok:
        detail = response.text
        try:
            payload = response.json()
            detail = payload.get('message') or payload.get('error') or payload.get('detail') or detail
        except Exception:
            pass
        raise serializers.ValidationError({'image': f'Storage upload failed ({response.status_code}). {detail}'})

    return target_path, _resolve_public_product_url(target_path)


def _sync_product_gallery(product, request):
    """Keep ProductImage rows in sync with primary + up to 3 extra images."""
    extra_images = _extract_additional_images(request)
    vendor_id = getattr(product, 'vendor_id', None)
    product.images.all().delete()

    position = 1
    # Create ProductImage for primary image if it exists and has a valid URL
    if product.image:
        try:
            image_url = _resolve_public_product_url(getattr(product.image, 'name', '') or product.image)
            if image_url:  # Only create if URL is not empty
                ProductImage.objects.create(
                    product=product,
                    image_url=image_url,
                    alt_text=product.title,
                    position=position,
                )
                position += 1
        except Exception as e:
            print(f"Warning: Failed to save primary image for product {product.id}: {str(e)}")

    # Create ProductImage entries for extra images
    for uploaded_file in extra_images:
        try:
            _, image_url = _upload_product_image_to_supabase(uploaded_file, vendor_id)
            if image_url:  # Only create if URL is not empty
                ProductImage.objects.create(
                    product=product,
                    image_url=image_url,
                    alt_text=product.title,
                    position=position,
                )
                position += 1
        except Exception as e:
            print(f"Warning: Failed to save extra image for product {product.id}: {str(e)}")


def _sync_variant_image_mappings(product, created_variant_pairs):
    """Attach optional image-position mappings to newly-created variants."""
    ProductVariantImage.objects.filter(variant__product=product).delete()

    if not created_variant_pairs:
        return

    images_by_position = {
        image.position: image
        for image in product.images.all()
    }

    bulk_rows = []
    for variant, normalized_variant_data in created_variant_pairs:
        image_positions = normalized_variant_data.get('image_positions') or []
        for position in image_positions:
            mapped_image = images_by_position.get(position)
            if mapped_image is None:
                continue
            bulk_rows.append(
                ProductVariantImage(variant=variant, product_image=mapped_image)
            )

    if bulk_rows:
        ProductVariantImage.objects.bulk_create(bulk_rows, ignore_conflicts=True)


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ('id', 'name', 'slug', 'description')


class ProductImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ('id', 'image_url', 'alt_text', 'position')

    def get_image_url(self, obj):
        request = self.context.get('request')
        return _absolute_url(request, obj.image_url)


class ProductVariantSerializer(serializers.ModelSerializer):
    image_urls = serializers.SerializerMethodField()
    image_positions = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = (
            'id', 'option_name', 'option_value',
            'sku_suffix', 'additional_price', 'stock',
            'image_urls', 'image_positions',
        )

    def get_image_urls(self, obj):
        request = self.context.get('request')
        rows = obj.image_mappings.select_related('product_image').all()
        return [
            _absolute_url(request, row.product_image.image_url)
            for row in rows
            if getattr(row.product_image, 'image_url', None)
        ]

    def get_image_positions(self, obj):
        rows = obj.image_mappings.select_related('product_image').all()
        return [row.product_image.position for row in rows]


class ProductListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list/collection views."""
    category_name = serializers.CharField(source='category.name', read_only=True)
    vendor_name = serializers.CharField(
        source='vendor.brand_name', read_only=True, default='NativeGlow'
    )
    primary_image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            'id', 'title', 'slug', 'short_description',
            'price', 'compare_price', 'category_name',
            'vendor_name', 'is_bestseller', 'is_new_arrival',
            'is_featured', 'tags', 'primary_image',
        )

    def get_primary_image(self, obj):
        request = self.context.get('request')
        img = obj.images.first()
        if img:
            return _absolute_url(request, img.image_url)
        if obj.image:
            return _absolute_url(request, _resolve_public_product_url(getattr(obj.image, 'name', '') or obj.image))
        return None


class ProductDetailSerializer(serializers.ModelSerializer):
    """Full serializer for product detail page."""
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source='category', write_only=True
    )
    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    product_attributes = serializers.JSONField(required=False)
    vendor_name = serializers.CharField(
        source='vendor.brand_name', read_only=True, default='NativeGlow'
    )
    ingredient_points = serializers.SerializerMethodField()
    how_it_works = serializers.SerializerMethodField()
    benefits = serializers.SerializerMethodField()
    usage_steps = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            'id', 'title', 'slug', 'description', 'short_description',
            'ingredients', 'product_type', 'sku', 'price', 'compare_price',
            'inventory_qty', 'status', 'is_active', 'is_bestseller',
            'is_new_arrival', 'is_featured', 'tags', 'shipping_info',
            'seo_title', 'seo_description',
            'product_attributes',
            'category', 'category_id', 'vendor_name',
            'ingredient_points', 'how_it_works', 'benefits', 'usage_steps',
            'images', 'variants', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

    def get_ingredient_points(self, obj):
        raw = (obj.ingredients or '').strip()
        if raw:
            return [item.strip() for item in raw.split(',') if item.strip()]
        if obj.product_type == 'clothing':
            return ['Breathable cotton base', 'Soft-touch finish', 'Skin-comfort focused weave']
        if obj.product_type == 'food':
            return ['Fresh batch ingredients', 'Packaged for shelf stability', 'Traceable sourcing']
        return ['Herbal complex', 'Botanical active blend', 'Gentle skin-support base']

    def get_how_it_works(self, obj):
        if obj.product_type == 'clothing':
            return (
                'The fabric structure improves airflow and moisture comfort, '
                'while low-irritation fibers reduce friction during daily wear.'
            )
        if obj.product_type == 'food':
            return (
                'The product is prepared with controlled ingredients, packed for freshness, '
                'and stored to preserve flavor and shelf life.'
            )
        return (
            'Plant-derived actives support the skin barrier, calm visible stress, '
            'and maintain hydration balance through routine use.'
        )

    def get_benefits(self, obj):
        if obj.product_type == 'clothing':
            return [
                'Lightweight comfort for long wear',
                'Breathable construction for warm climates',
                'Minimal irritation for sensitive skin',
            ]
        if obj.product_type == 'food':
            return [
                'Convenient everyday consumption',
                'Shelf-stable packaging for storage',
                'Clear ingredient and nutrition visibility',
            ]
        return [
            'Helps maintain healthy-looking skin',
            'Supports hydration and comfort',
            'Designed for daily natural-care routines',
        ]

    def get_usage_steps(self, obj):
        if obj.product_type == 'clothing':
            return [
                'Wear as a breathable daily layer.',
                'Pair with lightweight natural fibers for full comfort.',
                'Machine wash gentle and air dry for longevity.',
            ]
        if obj.product_type == 'food':
            return [
                'Check seal and expiry before opening.',
                'Store in a cool, dry place after use.',
                'Follow serving guidance or nutrition label directions.',
            ]
        return [
            'Apply on clean skin as directed.',
            'Massage in circular motion until absorbed.',
            'Use consistently in morning or night routine.',
        ]


# ============================================================================
# VENDOR PRODUCT MANAGEMENT SERIALIZERS
# ============================================================================

class VendorProductCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for vendor adding new products.
    POST /api/vendor/products/add/
    """
    sku = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    variants_payload = serializers.JSONField(required=False, write_only=True)
    color_options = serializers.JSONField(required=False)
    size_options = serializers.JSONField(required=False)
    image = serializers.ImageField(required=False, allow_null=True, use_url=False)

    class Meta:
        model = Product
        fields = (
            'title', 'name', 'description', 'short_description',
            'category_type', 'ingredients', 'price', 'available_quantity',
            'image', 'is_natural_certified', 'sku', 'tags',
            'product_type', 'unit', 'product_attributes', 'variants_payload',
            'color_options', 'size_options'
        )

    def validate_product_attributes(self, value):
        return _normalize_json_payload(value, field_name='product_attributes')

    def validate_variants_payload(self, value):
        normalized = _normalize_json_payload(value, field_name='variants_payload')
        return [_normalize_variant_item(item) for item in normalized]

    def validate_color_options(self, value):
        return _normalize_color_options_payload(value)

    def validate_size_options(self, value):
        return _normalize_size_options_payload(value)

    def validate(self, attrs):
        product_type = attrs.get('product_type') or 'skincare'
        product_attributes = attrs.get('product_attributes') or {}
        if self.instance is None or attrs.get('product_attributes') is not None:
            _validate_product_attributes(product_type, product_attributes)
        return attrs

    def create(self, validated_data):
        """Create product with vendor from request and auto-approve for active vendors."""
        from django.utils.text import slugify
        from uuid import uuid4
        
        vendor = self.context['request'].vendor  # Vendor extracted from JWT
        request = self.context.get('request')
        image_file = validated_data.pop('image', None)

        uploaded_count = _count_uploaded_images(request)
        if uploaded_count < 1:
            raise serializers.ValidationError({'image': 'Please upload at least 1 product image.'})
        if uploaded_count > MAX_PRODUCT_IMAGES:
            raise serializers.ValidationError({'image': f'Maximum {MAX_PRODUCT_IMAGES} images are allowed.'})
        
        # Auto-generate slug from title
        title = validated_data.get('title', '')
        slug = slugify(title)
        
        # Ensure unique slug
        base_slug = slug
        counter = 2
        while Product.objects.filter(slug=slug).exists():
            slug = f'{base_slug}-{counter}'
            counter += 1
        
        validated_data['slug'] = slug
        if not validated_data.get('sku'):
            sku_base = slug.upper().replace('-', '')[:16] or 'PROD'
            sku = f"{sku_base}-{uuid4().hex[:6].upper()}"
            while Product.objects.filter(sku=sku).exists():
                sku = f"{sku_base}-{uuid4().hex[:6].upper()}"
            validated_data['sku'] = sku
        validated_data['vendor'] = vendor
        validated_data['status'] = 'approved'
        validated_data['admin_rejection_reason'] = ''
        variants_payload = validated_data.pop('variants_payload', [])
        
        # Auto-set inventory_qty from available_quantity
        if not validated_data.get('inventory_qty'):
            validated_data['inventory_qty'] = validated_data.get('available_quantity', 0)

        product = super().create(validated_data)
        
        if image_file:
            storage_path, _ = _upload_product_image_to_supabase(image_file, vendor.id)
            product.image.name = storage_path
            product.save(update_fields=['image'])
        
        _sync_product_gallery(product, request)
        if variants_payload:
            created_variant_pairs = []
            for variant_data in variants_payload:
                image_positions = variant_data.get('image_positions', [])
                variant = ProductVariant.objects.create(
                    product=product,
                    option_name=variant_data.get('option_name', ''),
                    option_value=variant_data.get('option_value', ''),
                    sku_suffix=variant_data.get('sku_suffix', ''),
                    additional_price=variant_data.get('additional_price', 0),
                    stock=variant_data.get('stock', 0),
                )
                created_variant_pairs.append((variant, {'image_positions': image_positions}))
            _sync_variant_image_mappings(product, created_variant_pairs)
        return product


class VendorProductListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for vendor product list.
    GET /api/vendor/products/
    """
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    image = serializers.SerializerMethodField()
    discounted_price = serializers.SerializerMethodField()
    rejection_reason = serializers.CharField(source='admin_rejection_reason', read_only=True)
    available = serializers.BooleanField(source='is_active', read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)

    def get_image(self, obj):
        request = self.context.get('request')
        img = obj.images.first()
        if img:
            return _absolute_url(request, img.image_url)
        if obj.image:
            return _absolute_url(request, _resolve_public_product_url(getattr(obj.image, 'name', '') or obj.image))
        return None

    def get_discounted_price(self, obj):
        if (obj.discount_percent or 0) > 0:
            return obj.discounted_price
        return None
    
    class Meta:
        model = Product
        fields = (
            'id', 'title', 'name', 'description', 'category_type', 'ingredients',
            'price', 'discount_percent', 'discounted_price', 'available_quantity', 'image',
            'status', 'status_display', 'available', 'is_active',
            'is_natural_certified', 'rejection_reason', 'is_visible', 'is_featured',
            'product_type', 'product_attributes', 'unit',
            'variants', 'color_options', 'size_options',
            'created_at', 'updated_at'
        )
        read_only_fields = fields


class VendorProductUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for vendor updating their products.
    PUT /api/vendor/products/<id>/edit/
    """
    variants_payload = serializers.JSONField(required=False, write_only=True)
    color_options = serializers.JSONField(required=False)
    size_options = serializers.JSONField(required=False)
    image = serializers.ImageField(required=False, allow_null=True, use_url=False)

    class Meta:
        model = Product
        fields = (
            'title', 'name', 'description', 'short_description',
            'category_type', 'ingredients', 'price', 'available_quantity',
            'image', 'is_natural_certified', 'tags', 'unit', 'product_type', 'product_attributes',
            'variants_payload', 'color_options', 'size_options'
        )

    def validate_product_attributes(self, value):
        return _normalize_json_payload(value, field_name='product_attributes')

    def validate_variants_payload(self, value):
        normalized = _normalize_json_payload(value, field_name='variants_payload')
        return [_normalize_variant_item(item) for item in normalized]

    def validate_color_options(self, value):
        return _normalize_color_options_payload(value)

    def validate_size_options(self, value):
        return _normalize_size_options_payload(value)

    def validate(self, attrs):
        product_type = attrs.get('product_type') or getattr(self.instance, 'product_type', 'skincare')
        product_attributes = attrs.get('product_attributes') or getattr(self.instance, 'product_attributes', {}) or {}
        if attrs.get('product_attributes') is not None or self.instance is None:
            _validate_product_attributes(product_type, product_attributes)
        return attrs

    def update(self, instance, validated_data):
        """Keep vendor-owned product approved after edits for storefront continuity."""
        instance.status = 'approved'
        instance.admin_rejection_reason = ''
        variants_payload = validated_data.pop('variants_payload', None)
        request = self.context.get('request')
        image_file = validated_data.pop('image', None)
        quantity_provided = 'available_quantity' in validated_data
        if request and request.FILES:
            uploaded_count = _count_uploaded_images(request)
            if uploaded_count > MAX_PRODUCT_IMAGES:
                raise serializers.ValidationError({'image': f'Maximum {MAX_PRODUCT_IMAGES} images are allowed.'})
        
        # Update all provided fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        
        if image_file:
            storage_path, _ = _upload_product_image_to_supabase(image_file, instance.vendor_id)
            instance.image.name = storage_path
            instance.save(update_fields=['image'])
        
        if request and request.FILES:
            _sync_product_gallery(instance, request)
        if quantity_provided:
            instance.is_active = int(instance.available_quantity or 0) > 0
            instance.save(update_fields=['is_active'])
        if variants_payload is not None:
            instance.variants.all().delete()
            created_variant_pairs = []
            for variant_data in variants_payload:
                image_positions = variant_data.get('image_positions', [])
                variant = ProductVariant.objects.create(
                    product=instance,
                    option_name=variant_data.get('option_name', ''),
                    option_value=variant_data.get('option_value', ''),
                    sku_suffix=variant_data.get('sku_suffix', ''),
                    additional_price=variant_data.get('additional_price', 0),
                    stock=variant_data.get('stock', 0),
                )
                created_variant_pairs.append((variant, {'image_positions': image_positions}))
            _sync_variant_image_mappings(instance, created_variant_pairs)
        return instance


class VendorProductStatusSerializer(serializers.Serializer):
    """
    Serializer for toggling product availability.
    PATCH /api/vendor/products/<id>/status/
    """
    is_available = serializers.BooleanField()

    def update(self, instance, validated_data):
        """Toggle is_active status."""
        instance.is_active = validated_data.get('is_available', instance.is_active)
        instance.save()
        return instance


class VendorProductQuantitySerializer(serializers.Serializer):
    """
    Serializer for updating product quantity.
    PATCH /api/vendor/products/<id>/quantity/
    """
    available_quantity = serializers.IntegerField(min_value=0)

    def update(self, instance, validated_data):
        """Update available_quantity and sync inventory_qty."""
        qty = validated_data.get('available_quantity')
        instance.available_quantity = qty
        instance.inventory_qty = qty  # Keep in sync
        instance.is_active = qty > 0
        if qty <= 0:
            instance.status = 'out_of_stock'
        elif instance.status == 'out_of_stock':
            instance.status = 'approved'
        instance.save(update_fields=['available_quantity', 'inventory_qty', 'is_active', 'status', 'updated_at'])
        return instance


class VendorProductDiscountSerializer(serializers.Serializer):
    """Serializer for updating product discount percentage."""
    discount_percent = serializers.IntegerField(min_value=0, max_value=90)


class VendorProductVisibilitySerializer(serializers.Serializer):
    """Serializer for toggling storefront visibility."""
    is_visible = serializers.BooleanField()


class VendorProductFeatureSerializer(serializers.Serializer):
    """Serializer for marking product as featured."""
    is_featured = serializers.BooleanField()


class VendorProductReorderItemSerializer(serializers.Serializer):
    id = serializers.IntegerField(min_value=1)
    position = serializers.IntegerField(min_value=0)


class VendorProductReorderSerializer(serializers.Serializer):
    """Serializer for bulk product reordering."""
    order = VendorProductReorderItemSerializer(many=True)


# ============================================================================
# PUBLIC BUYER STORE APIS - NO AUTHENTICATION REQUIRED
# ============================================================================

class PublicProductSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for products in public store.
    Includes vendor slug for navigation.
    """
    category_name = serializers.CharField(source='category.name', read_only=True)
    category = serializers.CharField(source='category_type', read_only=True)
    vendor_slug = serializers.CharField(source='vendor.vendor_slug', read_only=True)
    primary_image = serializers.SerializerMethodField()
    discounted_price = serializers.SerializerMethodField()
    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = (
            'id', 'name', 'slug', 'description', 'price',
            'available_quantity', 'is_natural_certified',
            'category_name', 'category', 'vendor_slug',
            'discount_percent', 'discounted_price',
            'primary_image', 'images', 'product_attributes', 'product_type',
            'variants', 'color_options', 'size_options',
        )

    def get_primary_image(self, obj):
        request = self.context.get('request')
        """Get first image from related ProductImage or fallback to image field."""
        img = obj.images.first()
        if img:
            return _absolute_url(request, img.image_url)
        if obj.image:
            return _absolute_url(request, _resolve_public_product_url(getattr(obj.image, 'name', '') or obj.image))
        return None

    def get_discounted_price(self, obj):
        if (obj.discount_percent or 0) > 0:
            return obj.discounted_price
        return None


class PublicVendorSerializer(serializers.ModelSerializer):
    """
    Serialize vendor public profile for store page.
    GET /api/store/<vendor_slug>/
    """
    total_products = serializers.SerializerMethodField()
    member_since = serializers.SerializerMethodField()

    class Meta:
        model = Vendor
        fields = (
            'business_name', 'city', 'whatsapp_number',
            'total_products', 'member_since',
        )

    def get_total_products(self, obj):
        """Count: approved + available products from this vendor."""
        from django.db.models import Q
        return obj.products.filter(
            Q(status='approved') & 
            Q(available_quantity__gt=0) &
            Q(is_active=True)
        ).count()

    def get_member_since(self, obj):
        """Return year when vendor joined."""
        return obj.created_at.year


class PublicProductDetailSerializer(serializers.ModelSerializer):
    """
    Full product detail with vendor payment info.
    GET /api/store/<vendor_slug>/products/<product_id>/
    """
    category_name = serializers.CharField(source='category.name', read_only=True)
    vendor_business_name = serializers.CharField(
        source='vendor.business_name', read_only=True, default='NativeGlow'
    )
    vendor_whatsapp = serializers.CharField(
        source='vendor.whatsapp_number', read_only=True, default=None
    )
    vendor_upi = serializers.CharField(
        source='vendor.upi_id', read_only=True, default=None
    )
    vendor_slug = serializers.CharField(source='vendor.vendor_slug', read_only=True, default='')
    category = serializers.CharField(source='category_type', read_only=True)
    discounted_price = serializers.SerializerMethodField()
    images = ProductImageSerializer(many=True, read_only=True)
    ingredients_list = serializers.SerializerMethodField()
    product_attributes = serializers.JSONField(read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = (
            'id', 'name', 'slug', 'description', 'price',
            'available_quantity', 'is_natural_certified',
            'discount_percent', 'discounted_price',
            'ingredients', 'ingredients_list',
            'product_attributes',
            'variants', 'color_options', 'size_options',
            'category', 'category_name', 'vendor_slug', 'vendor_business_name',
            'vendor_whatsapp', 'vendor_upi',
            'images', 'created_at',
        )

    def get_discounted_price(self, obj):
        if (obj.discount_percent or 0) > 0:
            return obj.discounted_price
        return None

    def get_ingredients_list(self, obj):
        """Parse ingredients string into list."""
        if obj.ingredients:
            return [item.strip() for item in obj.ingredients.split(',') if item.strip()]
        return []


class StoreCategoryWithCountSerializer(serializers.Serializer):
    """
    Serialize category with product count.
    GET /api/store/categories/
    """
    category = serializers.CharField()
    count = serializers.IntegerField()


class SiteProductSerializer(serializers.ModelSerializer):
    """Serializer for public vendor website product listing."""
    category = serializers.CharField(source='category_type', read_only=True)
    discounted_price = serializers.SerializerMethodField()
    primary_image = serializers.SerializerMethodField()
    product_attributes = serializers.JSONField(read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = (
            'id',
            'name',
            'title',
            'slug',
            'description',
            'price',
            'available_quantity',
            'is_natural_certified',
            'discount_percent',
            'discounted_price',
            'category',
            'product_tag',
            'is_featured',
            'primary_image',
            'product_attributes',
            'variants',
            'color_options',
            'size_options',
        )

    def get_discounted_price(self, obj):
        if (obj.discount_percent or 0) > 0:
            return obj.discounted_price
        return None

    def get_primary_image(self, obj):
        request = self.context.get('request')
        img = obj.images.first()
        if img:
            return _absolute_url(request, img.image_url)
        if obj.image:
            return _absolute_url(request, obj.image.url)
        return None


class SiteVendorSerializer(serializers.Serializer):
    business_name = serializers.CharField()
    about_vendor = serializers.CharField(allow_blank=True)
    city = serializers.CharField(allow_blank=True)
    site_theme = serializers.CharField(allow_blank=True)
    site_banner_image = serializers.CharField(allow_blank=True)
    site_logo = serializers.CharField(allow_blank=True)
    youtube_url = serializers.CharField(allow_blank=True)
    instagram_url = serializers.CharField(allow_blank=True)
    whatsapp_number = serializers.CharField(allow_blank=True, allow_null=True)
    member_since = serializers.IntegerField()
    total_products = serializers.IntegerField()


class SiteAboutSerializer(serializers.Serializer):
    business_name = serializers.CharField()
    about_vendor = serializers.CharField(allow_blank=True)
    site_logo = serializers.CharField(allow_blank=True)
    site_banner_image = serializers.CharField(allow_blank=True)
    youtube_url = serializers.CharField(allow_blank=True)
    instagram_url = serializers.CharField(allow_blank=True)
    member_since = serializers.IntegerField()
    product_count = serializers.IntegerField()
    total_orders_delivered = serializers.IntegerField()
