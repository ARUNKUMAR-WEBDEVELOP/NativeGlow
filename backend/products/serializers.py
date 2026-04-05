from rest_framework import serializers
from .models import Category, Product, ProductImage, ProductVariant
from vendors.models import Vendor


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ('id', 'name', 'slug', 'description')


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ('id', 'image_url', 'alt_text', 'position')


class ProductVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = (
            'id', 'option_name', 'option_value',
            'sku_suffix', 'additional_price', 'stock',
        )


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
        img = obj.images.first()
        if img:
            return img.image_url
        if obj.image:
            return obj.image.url
        return None


class ProductDetailSerializer(serializers.ModelSerializer):
    """Full serializer for product detail page."""
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source='category', write_only=True
    )
    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
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
        return ['Herbal complex', 'Botanical active blend', 'Gentle skin-support base']

    def get_how_it_works(self, obj):
        if obj.product_type == 'clothing':
            return (
                'The fabric structure improves airflow and moisture comfort, '
                'while low-irritation fibers reduce friction during daily wear.'
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

    class Meta:
        model = Product
        fields = (
            'title', 'name', 'description', 'short_description',
            'category_type', 'ingredients', 'price', 'available_quantity',
            'image', 'is_natural_certified', 'sku', 'tags',
            'product_type', 'unit'
        )

    def create(self, validated_data):
        """Create product with vendor from request and auto-approve for active vendors."""
        from django.utils.text import slugify
        from uuid import uuid4
        
        vendor = self.context['request'].vendor  # Vendor extracted from JWT
        
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
        
        # Auto-set inventory_qty from available_quantity
        if not validated_data.get('inventory_qty'):
            validated_data['inventory_qty'] = validated_data.get('available_quantity', 0)
        
        return super().create(validated_data)


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

    def get_image(self, obj):
        request = self.context.get('request')
        if not obj.image:
            return None
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url

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
            'is_natural_certified', 'rejection_reason',
            'created_at', 'updated_at'
        )
        read_only_fields = fields


class VendorProductUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for vendor updating their products.
    PUT /api/vendor/products/<id>/edit/
    """
    class Meta:
        model = Product
        fields = (
            'title', 'name', 'description', 'short_description',
            'category_type', 'ingredients', 'price', 'available_quantity',
            'image', 'is_natural_certified', 'tags', 'unit'
        )

    def update(self, instance, validated_data):
        """Keep vendor-owned product approved after edits for storefront continuity."""
        instance.status = 'approved'
        instance.admin_rejection_reason = ''
        
        # Update all provided fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
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
        instance.save()
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
    vendor_slug = serializers.CharField(source='vendor.vendor_slug', read_only=True)
    primary_image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            'id', 'name', 'slug', 'description', 'price',
            'available_quantity', 'is_natural_certified',
            'category_name', 'vendor_slug',
            'primary_image',
        )

    def get_primary_image(self, obj):
        """Get first image from related ProductImage or fallback to image field."""
        img = obj.images.first()
        if img:
            return img.image_url
        if obj.image:
            return obj.image.url
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
    category = serializers.CharField(source='category_type', read_only=True)
    discounted_price = serializers.SerializerMethodField()
    images = ProductImageSerializer(many=True, read_only=True)
    ingredients_list = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            'id', 'name', 'slug', 'description', 'price',
            'available_quantity', 'is_natural_certified',
            'discount_percent', 'discounted_price',
            'ingredients', 'ingredients_list',
            'category', 'category_name', 'vendor_business_name',
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
        )

    def get_discounted_price(self, obj):
        if (obj.discount_percent or 0) > 0:
            return obj.discounted_price
        return None

    def get_primary_image(self, obj):
        img = obj.images.first()
        if img:
            return img.image_url
        if obj.image:
            return obj.image.url
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
