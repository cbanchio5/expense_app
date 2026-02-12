from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("receipts", "0002_householdsession_receipt_household"),
    ]

    operations = [
        migrations.AddField(
            model_name="receipt",
            name="is_saved",
            field=models.BooleanField(db_index=True, default=False),
        ),
    ]
