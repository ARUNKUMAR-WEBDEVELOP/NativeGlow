from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0009_alter_product_category_type_alter_product_product_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='color_options',
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='List of available color options. E.g.: ["Red", "Blue", "Green"]',
            ),
        ),
        migrations.AddField(
            model_name='product',
            name='size_options',
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='List of available size options based on category. E.g.: ["S", "M", "L", "XL"] or ["28", "30", "32"] for pants',
            ),
        ),
    ]
