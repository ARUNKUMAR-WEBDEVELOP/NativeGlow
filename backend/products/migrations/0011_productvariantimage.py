from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0010_product_color_options_product_size_options'),
    ]

    operations = [
        migrations.CreateModel(
            name='ProductVariantImage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                (
                    'product_image',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='variant_mappings',
                        to='products.productimage',
                    ),
                ),
                (
                    'variant',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='image_mappings',
                        to='products.productvariant',
                    ),
                ),
            ],
            options={
                'unique_together': {('variant', 'product_image')},
            },
        ),
    ]
