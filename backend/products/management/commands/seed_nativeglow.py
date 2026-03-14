from decimal import Decimal

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils.text import slugify

from products.models import Category, Product, ProductImage
from vendors.models import Vendor


class Command(BaseCommand):
    help = 'Seed NativeGlow categories and multi-brand launch catalog.'

    def _upsert_vendor(self, username, email, brand_name, product_types, city, state):
        user, _ = User.objects.get_or_create(
            username=username,
            defaults={'email': email},
        )
        if not user.email:
            user.email = email
            user.save(update_fields=['email'])
        if user.has_usable_password():
            user.set_unusable_password()
            user.save(update_fields=['password'])

        vendor, _ = Vendor.objects.update_or_create(
            user=user,
            defaults={
                'brand_name': brand_name,
                'slug': slugify(brand_name),
                'description': f'{brand_name} verified natural product partner.',
                'product_types': product_types,
                'city': city,
                'state': state,
                'phone': '+91-9000000000',
                'contact_email': email,
                'is_natural_certified': True,
                'status': 'approved',
            },
        )
        return vendor

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

        vendors = {
            'nativeglow': None,
            'siddha-botanics': self._upsert_vendor(
                username='vendor_siddha_botanics',
                email='hello@siddhabotanics.example',
                brand_name='Siddha Botanics',
                product_types='Herbal skincare, oils, powders',
                city='Chennai',
                state='Tamil Nadu',
            ),
            'earthloom': self._upsert_vendor(
                username='vendor_earthloom',
                email='care@earthloom.example',
                brand_name='EarthLoom Naturals',
                product_types='Natural dyed clothing, cotton wear, linen wear',
                city='Coimbatore',
                state='Tamil Nadu',
            ),
        }

        legacy_skus = [
            'NG-SK-000',
            'NG-SK-001',
            'NG-SK-002',
            'NG-SK-003',
            'NG-SK-004',
            'NG-CL-001',
            'NG-CL-002',
            'NG-CL-003',
            'NG-SK-1000',
            'NG-SK-1001',
            'NG-SK-1002',
            'NG-SK-1003',
            'NG-SK-1004',
            'NG-CL-1001',
            'NG-CL-1002',
            'NG-CL-1003',
        ]
        Product.objects.filter(sku__in=legacy_skus).delete()

        products = [
            {
                'vendor': 'nativeglow',
                'title': 'Herbal Turmeric Face Pack',
                'category': 'herbal-skincare',
                'product_type': 'skincare',
                'description': 'A brightening turmeric-rich herbal face pack for tan reduction and healthy glow. How to use: Mix with rose water, apply for 10-12 minutes, rinse gently.',
                'short_description': 'Turmeric herbal pack for glow, clarity, and tan care.',
                'ingredients': 'Wild turmeric, Sandalwood, Rose petals, Vetiver, Green gram',
                'sku': 'NG-SK-100',
                'price': Decimal('12.99'),
                'compare_price': Decimal('17.99'),
                'inventory_qty': 70,
                'tags': 'nativeglow,herbal,turmeric,face-pack,glow',
                'is_bestseller': True,
                'is_featured': True,
                'seo_title': 'Herbal Turmeric Face Pack | NativeGlow',
                'seo_description': 'Natural turmeric face pack for brighter skin and reduced dullness.',
                'gallery': [
                    'https://placehold.co/1200x900/f6ead6/374151?text=Herbal+Turmeric+Face+Pack',
                    'https://placehold.co/1200x900/f8f0e3/374151?text=Turmeric+Sandalwood+Rose',
                ],
            },
            {
                'vendor': 'nativeglow',
                'title': 'Neem & Tulsi Face Wash',
                'category': 'herbal-skincare',
                'product_type': 'skincare',
                'description': 'Gentle daily herbal cleanser for acne-prone and oily skin. How to use: Massage on wet face for 30 seconds and rinse.',
                'short_description': 'Neem-Tulsi cleanser for acne control and fresh skin.',
                'ingredients': 'Neem extract, Tulsi extract, Aloe base, Licorice, Tea tree',
                'sku': 'NG-SK-101',
                'price': Decimal('10.99'),
                'compare_price': Decimal('14.99'),
                'inventory_qty': 90,
                'tags': 'nativeglow,herbal,face-wash,neem,tulsi',
                'is_bestseller': True,
                'is_featured': True,
                'seo_title': 'Neem & Tulsi Face Wash | NativeGlow',
                'seo_description': 'Natural neem and tulsi face wash for acne-prone skin and oil control.',
                'gallery': [
                    'https://placehold.co/1200x900/e7f2df/374151?text=Neem+Tulsi+Face+Wash',
                    'https://placehold.co/1200x900/f1f8eb/374151?text=Daily+Acne+Control+Cleanse',
                ],
            },
            {
                'vendor': 'nativeglow',
                'title': 'Sandalwood Glow Cream',
                'category': 'herbal-skincare',
                'product_type': 'skincare',
                'description': 'Rich sandalwood cream that supports soft, radiant skin and even tone. How to use: Apply a thin layer after cleansing, morning and night.',
                'short_description': 'Sandalwood hydration cream for smooth radiant skin.',
                'ingredients': 'Sandalwood extract, Saffron, Aloe vera, Almond oil, Shea butter',
                'sku': 'NG-SK-102',
                'price': Decimal('15.99'),
                'compare_price': Decimal('21.99'),
                'inventory_qty': 65,
                'tags': 'nativeglow,sandalwood,glow-cream,hydration,skincare',
                'is_bestseller': True,
                'seo_title': 'Sandalwood Glow Cream | NativeGlow',
                'seo_description': 'Sandalwood glow cream for hydration, softness, and brighter-looking skin.',
                'gallery': [
                    'https://placehold.co/1200x900/f5e9dc/374151?text=Sandalwood+Glow+Cream',
                    'https://placehold.co/1200x900/faefe5/374151?text=Sandalwood+Saffron+Aloe',
                ],
            },
            {
                'vendor': 'siddha-botanics',
                'title': 'Herbal Hair Growth Oil',
                'category': 'herbal-skincare',
                'product_type': 'bodycare',
                'description': 'Traditional scalp oil blend crafted to nourish roots and reduce dryness. How to use: Apply to scalp, massage for 3-5 minutes, leave overnight and wash.',
                'short_description': 'Root-nourishing herbal hair oil for healthier growth.',
                'ingredients': 'Bhringraj, Amla, Fenugreek, Hibiscus, Coconut oil',
                'sku': 'SB-SK-201',
                'price': Decimal('13.99'),
                'compare_price': Decimal('18.99'),
                'inventory_qty': 80,
                'tags': 'siddha-botanics,herbal,hair-oil,growth,scalp-care',
                'is_featured': True,
                'seo_title': 'Herbal Hair Growth Oil | Siddha Botanics',
                'seo_description': 'Natural hair growth oil with bhringraj and amla for stronger roots.',
                'gallery': [
                    'https://placehold.co/1200x900/e6efe2/374151?text=Herbal+Hair+Growth+Oil',
                    'https://placehold.co/1200x900/f0f6ee/374151?text=Bhringraj+Amla+Hibiscus',
                ],
            },
            {
                'vendor': 'siddha-botanics',
                'title': 'Aloe Vera Skin Gel',
                'category': 'herbal-skincare',
                'product_type': 'skincare',
                'description': 'Cooling aloe gel for hydration, after-sun calm, and lightweight daily moisture. How to use: Apply on clean skin and leave on.',
                'short_description': 'Cooling aloe gel for instant hydration and calm skin.',
                'ingredients': 'Aloe vera juice, Cucumber extract, Vitamin E, Basil water',
                'sku': 'SB-SK-202',
                'price': Decimal('8.99'),
                'compare_price': Decimal('12.99'),
                'inventory_qty': 110,
                'tags': 'siddha-botanics,aloe-vera,skin-gel,hydration,soothing',
                'is_new_arrival': True,
                'seo_title': 'Aloe Vera Skin Gel | Siddha Botanics',
                'seo_description': 'Soothing aloe vera gel for hydration and skin comfort.',
                'gallery': [
                    'https://placehold.co/1200x900/e8f7ec/374151?text=Aloe+Vera+Skin+Gel',
                    'https://placehold.co/1200x900/f2fbf5/374151?text=Hydrate+Calm+Refresh',
                ],
            },
            {
                'vendor': 'earthloom',
                'title': 'Organic Cotton Daily T-Shirt',
                'category': 'everyday-clothing',
                'product_type': 'clothing',
                'description': 'Breathable organic cotton tee designed for all-day comfort. How to use: Style as a daily base layer and machine wash on gentle cycle.',
                'short_description': 'Organic cotton t-shirt for breathable daily wear.',
                'ingredients': 'Organic combed cotton, enzyme-soft finish, breathable knit',
                'sku': 'EL-CL-301',
                'price': Decimal('19.99'),
                'compare_price': Decimal('26.99'),
                'inventory_qty': 120,
                'tags': 'earthloom,organic-cotton,tshirt,daily-wear,clothing',
                'is_bestseller': True,
                'seo_title': 'Organic Cotton Daily T-Shirt | EarthLoom Naturals',
                'seo_description': 'Organic cotton daily t-shirt built for comfort and breathability.',
                'gallery': [
                    'https://placehold.co/1200x900/e8eef2/374151?text=Organic+Cotton+Daily+T-Shirt',
                    'https://placehold.co/1200x900/f1f6f9/374151?text=Breathable+Organic+Cotton',
                ],
            },
            {
                'vendor': 'earthloom',
                'title': 'Natural Dye Cotton Shirt',
                'category': 'everyday-clothing',
                'product_type': 'clothing',
                'description': 'Natural-dye cotton shirt for minimal styling and skin-friendly wear. How to use: Wear casually or semi-formally; wash in cold water.',
                'short_description': 'Natural dye cotton shirt with soft breathable feel.',
                'ingredients': 'Cotton fabric, plant-based dyes, low-irritation finish',
                'sku': 'EL-CL-302',
                'price': Decimal('24.99'),
                'compare_price': Decimal('32.99'),
                'inventory_qty': 75,
                'tags': 'earthloom,natural-dye,cotton-shirt,minimal,clothing',
                'seo_title': 'Natural Dye Cotton Shirt | EarthLoom Naturals',
                'seo_description': 'Plant-dyed cotton shirt for breathable comfort and natural style.',
                'gallery': [
                    'https://placehold.co/1200x900/e6ece8/374151?text=Natural+Dye+Cotton+Shirt',
                    'https://placehold.co/1200x900/f0f5f2/374151?text=Plant+Dyed+Cotton+Texture',
                ],
            },
            {
                'vendor': 'earthloom',
                'title': 'Herbal Dyed Kurta',
                'category': 'everyday-clothing',
                'product_type': 'clothing',
                'description': 'Traditional-inspired kurta made with herbal dyes and breathable fabric. How to use: Pair with cotton bottoms for daily or festive wear.',
                'short_description': 'Herbal dyed kurta for natural comfort and style.',
                'ingredients': 'Cotton-linen weave, herbal dye bath, soft finish',
                'sku': 'EL-CL-303',
                'price': Decimal('29.99'),
                'compare_price': Decimal('39.99'),
                'inventory_qty': 55,
                'tags': 'earthloom,herbal-dye,kurta,ethnic,clothing',
                'is_new_arrival': True,
                'seo_title': 'Herbal Dyed Kurta | EarthLoom Naturals',
                'seo_description': 'Herbal dyed breathable kurta for natural everyday comfort.',
                'gallery': [
                    'https://placehold.co/1200x900/ece6df/374151?text=Herbal+Dyed+Kurta',
                    'https://placehold.co/1200x900/f5f0eb/374151?text=Breathable+Kurta+Fabric',
                ],
            },
            {
                'vendor': 'earthloom',
                'title': 'Minimal Cotton Hoodie',
                'category': 'everyday-clothing',
                'product_type': 'clothing',
                'description': 'Clean-design cotton hoodie with soft brushed interior for everyday layering. How to use: Wear over tees or kurtas in cool weather.',
                'short_description': 'Minimal cotton hoodie with soft cozy comfort.',
                'ingredients': 'Cotton fleece, brushed lining, breathable rib cuffs',
                'sku': 'EL-CL-304',
                'price': Decimal('31.99'),
                'compare_price': Decimal('42.99'),
                'inventory_qty': 48,
                'tags': 'earthloom,cotton-hoodie,minimal,casual,clothing',
                'is_featured': True,
                'seo_title': 'Minimal Cotton Hoodie | EarthLoom Naturals',
                'seo_description': 'Minimal cotton hoodie for cozy, breathable everyday layering.',
                'gallery': [
                    'https://placehold.co/1200x900/e7ebef/374151?text=Minimal+Cotton+Hoodie',
                    'https://placehold.co/1200x900/f1f4f7/374151?text=Soft+Brushed+Cotton+Fleece',
                ],
            },
        ]

        created_or_updated = 0
        for p in products:
            defaults = {
                'title': p['title'],
                'category': category_map[p['category']],
                'product_type': p['product_type'],
                'description': p['description'],
                'short_description': p['short_description'],
                'ingredients': p['ingredients'],
                'price': p['price'],
                'compare_price': p['compare_price'],
                'inventory_qty': p['inventory_qty'],
                'vendor': vendors.get(p.get('vendor', 'nativeglow')),
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
