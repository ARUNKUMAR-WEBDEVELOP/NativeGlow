from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0007_product_product_attributes'),
    ]

    operations = [
        migrations.AlterField(
            model_name='product',
            name='category_type',
            field=models.CharField(choices=[('face_wash', 'Face Wash'), ('soap', 'Soap'), ('serum', 'Serum'), ('moisturizer', 'Moisturizer'), ('hair_oil', 'Hair Oil'), ('body_lotion', 'Body Lotion'), ('clothing', 'Clothing'), ('snacks', 'Snacks'), ('cosmetics', 'Cosmetics'), ('accessories', 'Accessories'), ('other', 'Other')], default='other', max_length=20),
        ),
        migrations.AlterField(
            model_name='product',
            name='product_type',
            field=models.CharField(choices=[('skincare', 'Beauty & Skincare'), ('bodycare', 'Body & Wellness'), ('cosmetics', 'Cosmetics & Makeup'), ('clothing', 'Clothing & Apparel'), ('food', 'Food & Snacks'), ('accessories', 'Accessories'), ('home', 'Home & Lifestyle')], default='skincare', max_length=20),
        ),
        migrations.AlterField(
            model_name='product',
            name='unit',
            field=models.CharField(choices=[('ml', 'ML'), ('gm', 'GM'), ('g', 'G'), ('kg', 'KG'), ('pcs', 'PCS'), ('pack', 'PACK'), ('pair', 'PAIR'), ('box', 'BOX'), ('set', 'SET')], default='pcs', max_length=10),
        ),
    ]