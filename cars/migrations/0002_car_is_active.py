from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("cars", "0001_initial")]
    operations = [migrations.AddField(
        model_name="car", name="is_active", field=models.BooleanField(default=True),
    )]
