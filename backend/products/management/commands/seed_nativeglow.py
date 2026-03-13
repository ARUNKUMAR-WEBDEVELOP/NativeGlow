from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils.text import slugify

from products.models import Category, Product, ProductImage


class Command(BaseCommand):
    help = 'Seed NativeGlow categories and premium 8-product launch catalog.'

    def handle(self, *args, **options):
        categories = [
            {
                'name': 'Herbal Skincare',
                'slug': 'herbal-skincare',
                'description': 'Traditional herb-inspired skincare essentials.',
            },
            {
                'name': 'Everyday Clothing',
                'slug': 'everyday-clothing',
                'description': 'Comfort-focused cotton and linen daily wear.',
            },
        ]

        category_map = {}
        for cat in categories:
            obj, _ = Category.objects.get_or_create(
                slug=cat['slug'],
                defaults={
                    'name': cat['name'],
                    'description': cat['description'],
                },
            )
            if obj.name != cat['name'] or obj.description != cat['description']:
                obj.name = cat['name']
                obj.description = cat['description']
                obj.save(update_fields=['name', 'description'])
            category_map[cat['slug']] = obj

        products = [
            {
                'title': 'Siddha Glow Face Powder',
                'category': 'herbal-skincare',
                'product_type': 'skincare',
                'description': 'Natural herbal face powder made from traditional Siddha ingredients to brighten skin and reduce dullness.',
                'short_description': 'Traditional Siddha herbal glow powder for daily skin clarity.',
                'ingredients': 'Green gram, Vetiver, Rose petals, Kasthuri turmeric, Sandalwood',
                'sku': 'NG-SK-000',
                'price': Decimal('16.99'),
                'compare_price': Decimal('22.99'),
                'inventory_qty': 55,
                'tags': 'siddha,herbal,face-powder,glow,premium,featured',
                'is_bestseller': True,
                'is_featured': True,
                'seo_title': 'Siddha Glow Face Powder | NativeGlow',
                'seo_description': 'Premium Siddha-inspired herbal face powder for brighter and healthier-looking skin.',
                'gallery': [
                    'https://placehold.co/1200x900/f0e8dd/374151?text=Siddha+Glow+Face+Powder',
                    'https://placehold.co/1200x900/f6efe5/374151?text=Siddha+Ingredients+Blend',
                ],
            },
            {
                'title': 'Herbal Acne Control Oil',
                'category': 'herbal-skincare',
                'product_type': 'skincare',
                'description': 'A herbal oil blend designed to help reduce acne and soothe irritated skin.',
                'short_description': 'Helps calm acne-prone skin with herbal care.',
                'ingredients': 'Neem oil, Tea tree oil, Tulsi extract, Vetiver, Licorice root',
                'sku': 'NG-SK-001',
                'price': Decimal('14.99'),
                'compare_price': Decimal('19.99'),
                'inventory_qty': 50,
                'tags': 'herbal,skincare,acne-care,bestseller',
                'is_bestseller': True,
                'is_featured': True,
                'seo_title': 'Herbal Acne Control Oil | NativeGlow',
                'seo_description': 'Herbal acne control oil for calmer-looking skin and everyday natural care.',
                'gallery': [
                    'https://placehold.co/1200x900/e8f2df/374151?text=Herbal+Acne+Control+Oil',
                    'https://placehold.co/1200x900/f3f8ec/374151?text=Neem+Tea+Tree+Tulsi',
                ],
            },
            {
                'title': 'Rose Water Skin Mist',
                'category': 'herbal-skincare',
                'product_type': 'skincare',
                'description': 'A refreshing natural toner made with rose water to hydrate and calm the skin.',
                'short_description': 'Refreshing hydration mist for daily use.',
                'ingredients': 'Steam-distilled Rose water, Aloe vera extract, Cucumber hydrosol',
                'sku': 'NG-SK-002',
                'price': Decimal('11.99'),
                'compare_price': Decimal('15.99'),
                'inventory_qty': 60,
                'tags': 'herbal,skincare,rose-water,hydration,new',
                'is_new_arrival': True,
                'seo_title': 'Rose Water Skin Mist | NativeGlow',
                'seo_description': 'Natural rose water mist for hydrating and calming skin.',
                'gallery': [
                    'https://placehold.co/1200x900/f9e7ec/374151?text=Rose+Water+Skin+Mist',
                    'https://placehold.co/1200x900/fff3f7/374151?text=Rose+Aloe+Cucumber',
                ],
            },
            {
                'title': 'Herbal Bath Powder',
                'category': 'herbal-skincare',
                'product_type': 'bodycare',
                'description': 'Traditional herbal bathing powder with green gram, turmeric, and herbs.',
                'short_description': 'Traditional powder cleanser for gentle body care.',
                'ingredients': 'Green gram, Kasthuri turmeric, Neem leaves, Rose petals, Avarampoo',
                'sku': 'NG-SK-003',
                'price': Decimal('9.99'),
                'compare_price': Decimal('13.99'),
                'inventory_qty': 45,
                'tags': 'herbal,body-care,bath-powder,traditional',
                'seo_title': 'Herbal Bath Powder | NativeGlow',
                'seo_description': 'Traditional herbal bath powder for natural cleansing.',
                'gallery': [
                    'https://placehold.co/1200x900/efe7d5/374151?text=Herbal+Bath+Powder',
                    'https://placehold.co/1200x900/f7efdf/374151?text=Green+Gram+Turmeric+Herbs',
                ],
            },
            {
                'title': 'Kumkumadi Night Serum',
                'category': 'herbal-skincare',
                'product_type': 'skincare',
                'description': 'A nourishing night serum inspired by traditional herbal formulations for skin repair and glow.',
                'short_description': 'Nourishing overnight serum for glow care.',
                'ingredients': 'Saffron infused oil, Licorice, Sandalwood, Lotus extract, Vetiver',
                'sku': 'NG-SK-004',
                'price': Decimal('18.99'),
                'compare_price': Decimal('24.99'),
                'inventory_qty': 40,
                'tags': 'herbal,skincare,night-serum,glow,bestseller',
                'is_bestseller': True,
                'is_featured': True,
                'seo_title': 'Kumkumadi Night Serum | NativeGlow',
                'seo_description': 'Nourishing night serum inspired by traditional herbal care.',
                'gallery': [
                    'https://placehold.co/1200x900/f9eedf/374151?text=Kumkumadi+Night+Serum',
                    'https://placehold.co/1200x900/fff6e8/374151?text=Saffron+Lotus+Sandalwood',
                ],
            },
            {
                'title': 'Pure Cotton Everyday Wear',
                'category': 'everyday-clothing',
                'product_type': 'clothing',
                'description': 'Simple cotton clothing designed for daily comfort and breathable wear.',
                'short_description': 'Breathable cotton essential for everyday comfort.',
                'ingredients': '100% combed cotton, breathable weave, pre-softened finish',
                'sku': 'NG-CL-001',
                'price': Decimal('22.99'),
                'compare_price': Decimal('29.99'),
                'inventory_qty': 35,
                'tags': 'clothing,cotton,daily-wear,bestseller',
                'is_bestseller': True,
                'seo_title': 'Pure Cotton Everyday Wear | NativeGlow',
                'seo_description': 'Pure cotton daily wear designed for breathable comfort.',
                'gallery': [
                    'https://placehold.co/1200x900/eaf1f5/374151?text=Pure+Cotton+Everyday+Wear',
                    'https://placehold.co/1200x900/f3f8fb/374151?text=Breathable+Cotton+Fabric',
                ],
            },
            {
                'title': 'Simple Linen Shirts',
                'category': 'everyday-clothing',
                'product_type': 'clothing',
                'description': 'Lightweight linen shirts for a minimal and natural lifestyle look.',
                'short_description': 'Minimal linen shirts for relaxed styling.',
                'ingredients': 'Linen blend fabric, lightweight weave, anti-stiff finish',
                'sku': 'NG-CL-002',
                'price': Decimal('26.99'),
                'compare_price': Decimal('34.99'),
                'inventory_qty': 30,
                'tags': 'clothing,linen,shirts,minimal',
                'seo_title': 'Simple Linen Shirts | NativeGlow',
                'seo_description': 'Lightweight linen shirts for simple everyday style.',
                'gallery': [
                    'https://placehold.co/1200x900/e8eceb/374151?text=Simple+Linen+Shirts',
                    'https://placehold.co/1200x900/f1f5f4/374151?text=Lightweight+Linen+Texture',
                ],
            },
            {
                'title': 'Comfortable Home Wear Set',
                'category': 'everyday-clothing',
                'product_type': 'clothing',
                'description': 'Soft and relaxed clothing designed for comfort at home.',
                'short_description': 'Comfort-focused home wear set for daily routines.',
                'ingredients': 'Cotton jersey blend, soft-touch lining, stretch comfort knit',
                'sku': 'NG-CL-003',
                'price': Decimal('27.99'),
                'compare_price': Decimal('36.99'),
                'inventory_qty': 25,
                'tags': 'clothing,home-wear,comfort,new',
                'is_new_arrival': True,
                'seo_title': 'Comfortable Home Wear Set | NativeGlow',
                'seo_description': 'Soft home wear set designed for relaxed indoor comfort.',
                'gallery': [
                    'https://placehold.co/1200x900/e9e7ef/374151?text=Comfortable+Home+Wear+Set',
                    'https://placehold.co/1200x900/f3f2f8/374151?text=Soft+Relaxed+Home+Comfort',
                ],
            },
        ]

        created_or_updated = 0
        for p in products:
            defaults = {
                'category': category_map[p['category']],
                'product_type': p['product_type'],
                'description': p['description'],
                'short_description': p['short_description'],
                'ingredients': p['ingredients'],
                'price': p['price'],
                'compare_price': p['compare_price'],
                'inventory_qty': p['inventory_qty'],
                'status': 'active',
                'is_active': True,
                'is_bestseller': p.get('is_bestseller', False),
                'is_new_arrival': p.get('is_new_arrival', False),
                'is_featured': p.get('is_featured', False),
                'tags': p['tags'],
                'shipping_info': 'Processing 1-2 days, delivery 5-8 business days',
                'seo_title': p['seo_title'],
                'seo_description': p['seo_description'],
                'slug': slugify(p['title']),
            }
            product, _ = Product.objects.update_or_create(sku=p['sku'], defaults=defaults)
            if p.get('gallery'):
                ProductImage.objects.filter(product=product).delete()
                for idx, image_url in enumerate(p['gallery'], start=1):
                    ProductImage.objects.create(
                        product=product,
                        image_url=image_url,
                        alt_text=f"{product.title} image {idx}",
                        position=idx,
                    )
            created_or_updated += 1

        self.stdout.write(self.style.SUCCESS(f'Seed complete: {created_or_updated} products ready.'))
