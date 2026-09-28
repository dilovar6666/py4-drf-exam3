import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("cars", "0002_car_is_active"),
        ("accounts", "0003_profile_garage_recently_viewed"),
    ]

    operations = [
        migrations.AddField(model_name="carmodel", name="generation", field=models.CharField(blank=True, max_length=120)),
        migrations.AddField(model_name="car", name="specifications", field=models.JSONField(blank=True, default=dict)),
        migrations.AlterField(model_name="car", name="image_url", field=models.URLField(blank=True)),
        migrations.AlterField(model_name="carpart", name="image_url", field=models.URLField(blank=True)),
        migrations.CreateModel(
            name="CarImportJob",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("source_file", models.FileField(upload_to="imports/sources/", validators=[django.core.validators.FileExtensionValidator(["blend", "glb", "gltf", "fbx"])])),
                ("brand", models.CharField(max_length=100)),
                ("model", models.CharField(max_length=120)),
                ("year", models.PositiveSmallIntegerField()),
                ("generation", models.CharField(blank=True, max_length=120)),
                ("description", models.TextField(blank=True)),
                ("specifications", models.JSONField(blank=True, default=dict)),
                ("status", models.CharField(choices=[("QUEUED", "Queued"), ("ANALYZING", "Analyzing"), ("DECOMPOSING", "Decomposing"), ("CLASSIFYING", "Classifying"), ("EXPORTING", "Exporting"), ("VALIDATING", "Validating"), ("CREATING_DATABASE_RECORDS", "Creating records"), ("READY_FOR_REVIEW", "Ready for review"), ("READY", "Ready"), ("FAILED", "Failed")], default="QUEUED", max_length=32)),
                ("progress", models.PositiveSmallIntegerField(default=0)),
                ("current_stage", models.CharField(blank=True, max_length=80)),
                ("error_message", models.TextField(blank=True)),
                ("report", models.JSONField(blank=True, default=dict)),
                ("component_manifest", models.JSONField(blank=True, default=list)),
                ("review_manifest", models.JSONField(blank=True, default=list)),
                ("celery_task_id", models.CharField(blank=True, max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("started_at", models.DateTimeField(blank=True, null=True)),
                ("finished_at", models.DateTimeField(blank=True, null=True)),
                ("car", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="import_jobs", to="cars.car")),
                ("uploaded_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="car_import_jobs", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="CinematicCarConfig",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("camera_presets", models.JSONField(blank=True, default=dict)),
                ("story_sections", models.JSONField(blank=True, default=list)),
                ("background", models.CharField(default="light", max_length=32)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("car", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="cinematic_config", to="cars.car")),
            ],
        ),
    ]
