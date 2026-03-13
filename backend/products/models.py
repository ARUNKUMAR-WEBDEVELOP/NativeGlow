from django.db import models


class Category(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='categories/', blank=True, null=True)

    class Meta:
        verbose_name_plural = 'Categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class Product(models.Model):
    """A product listed on NativeGlow by NativeGlow or an approved vendor."""

    vendor = models.ForeignKey(
        'vendors.Vendor',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products',
        help_text='Leave blank for NativeGlow own products.'
    )
    category = models.ForeignKey(
        Category, on_delete=models.SET_NULL, null=True, related_name='products'
    )
    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    description = models.TextField()
    short_description = models.CharField(max_length=500, blank=True)
    ingredients = models.TextField(
        blank=True,
        help_text='List key natural ingredients. Important for chemical-free verification.'
    )
    product_type = models.CharField(
        max_length=20,
        choices=[
            ('skincare', 'Herbal Skincare'),
            ('clothing', 'Everyday Clothing'),
            ('bodycare', 'Body Care'),
        ],
        default='skincare',
    )
    tags = models.CharField(max_length=300, blank=True)
    price = models.DecimalField(max_digits=8, decimal_places=2)
    compare_price = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True
    )
    sku = models.CharField(max_length=50, unique=True)
    inventory_qty = models.PositiveIntegerField(default=0)
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=[
            ('active', 'Active'),
            ('draft', 'Draft'),
            ('out_of_stock', 'Out of Stock'),
        ],
        default='active',
    )
    is_active = models.BooleanField(default=True)
    is_bestseller = models.BooleanField(default=False)
    is_new_arrival = models.BooleanField(default=False)
    is_featured = models.BooleanField(default=False)
    shipping_info = models.CharField(
        max_length=255,
        blank=True,
        default='Processing 1-2 days, delivery 5-8 business days'
    )
    seo_title = models.CharField(max_length=255, blank=True)
    seo_description = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class ProductImage(models.Model):
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name='images'
    )
    image_url = models.URLField()
    alt_text = models.CharField(max_length=255, blank=True)
    position = models.PositiveSmallIntegerField(default=1)

    class Meta:
        ordering = ['position']

    def __str__(self):
        return f"{self.product.title} - Image {self.position}"


class ProductVariant(models.Model):
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name='variants'
    )
    option_name = models.CharField(
        max_length=100, help_text='e.g. Size, Volume, Color'
    )
    option_value = models.CharField(
        max_length=100, help_text='e.g. M, 30ml, Green'
    )
    sku_suffix = models.CharField(max_length=50, blank=True)
    additional_price = models.DecimalField(
        max_digits=10, decimal_places=2, default=0
    )
    stock = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.product.title} - {self.option_name}: {self.option_value}"
