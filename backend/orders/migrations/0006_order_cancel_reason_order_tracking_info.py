from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0005_order_order_code'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='cancel_reason',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='order',
            name='tracking_info',
            field=models.CharField(blank=True, max_length=255),
        ),
    ]
