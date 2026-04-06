from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0008_alter_product_category_type_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='product',
            name='category_type',
            field=models.CharField(
                choices=[
                    ('face_wash', 'Face Wash'),
                    ('soap', 'Soap'),
                    ('serum', 'Serum'),
                    ('moisturizer', 'Moisturizer'),
                    ('hair_oil', 'Hair Oil'),
                    ('body_lotion', 'Body Lotion'),
                    ('clothing', 'Clothing'),
                    ('snacks', 'Snacks'),
                    ('groceries', 'Groceries'),
                    ('cosmetics', 'Cosmetics'),
                    ('accessories', 'Accessories'),
                    ('other', 'Other'),
                ],
                default='other',
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name='product',
            name='product_type',
            field=models.CharField(
                choices=[
                    ('skincare', 'Beauty & Skincare'),
                    ('bodycare', 'Body & Wellness'),
                    ('cosmetics', 'Cosmetics & Makeup'),
                    ('clothing', 'Clothing & Apparel'),
                    ('food', 'Food & Snacks'),
                    ('grocery', 'Groceries & Essentials'),
                    ('accessories', 'Accessories'),
                    ('home', 'Home & Lifestyle'),
                ],
                default='skincare',
                max_length=20,
            ),
        ),
    ]
