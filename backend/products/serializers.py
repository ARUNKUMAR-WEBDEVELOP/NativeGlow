from rest_framework import serializers
from .models import Category, Product, ProductImage, ProductVariant


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
