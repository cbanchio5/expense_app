from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("receipts", "0004_alter_receipt_image"),
    ]

    operations = [
        migrations.AddField(
            model_name="receipt",
            name="settled_at",
            field=models.DateTimeField(blank=True, db_index=True, null=True),
        ),
        migrations.CreateModel(
            name="HouseholdNotification",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("user_code", models.CharField(choices=[("user_1", "User 1"), ("user_2", "User 2")], max_length=16)),
                ("message", models.CharField(max_length=255)),
                ("read", models.BooleanField(db_index=True, default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "household",
                    models.ForeignKey(on_delete=models.deletion.CASCADE, related_name="notifications", to="receipts.householdsession"),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
