from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0008_order_buyer_order_buyer_confirmation_note_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='selected_color',
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name='order',
            name='selected_size',
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name='order',
            name='selected_variant_label',
            field=models.CharField(blank=True, max_length=255),
        ),
    ]