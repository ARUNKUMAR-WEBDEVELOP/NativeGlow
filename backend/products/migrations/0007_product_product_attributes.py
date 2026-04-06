from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0006_alter_product_options_product_discount_percent_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='product_attributes',
            field=models.JSONField(blank=True, default=dict),
        ),
    ]