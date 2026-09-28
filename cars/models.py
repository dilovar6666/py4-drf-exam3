from django.conf import settings
from django.core.validators import FileExtensionValidator
from django.db import models


class CarBrand(models.Model):
    name = models.CharField(max_length=100)
    logo_url = models.URLField()

    def __str__(self):
        return self.name


class CarModel(models.Model):
    brand = models.ForeignKey(
        CarBrand,
        on_delete=models.CASCADE,
        related_name="models",
    )
    name = models.CharField(max_length=100)
    generation = models.CharField(max_length=120, blank=True)

    def __str__(self):
        return f"{self.brand} {self.name}"


class Car(models.Model):
    is_active = models.BooleanField(default=True)
    car_model = models.ForeignKey(
        CarModel,
        on_delete=models.CASCADE,
        related_name="cars",
    )
    year = models.PositiveIntegerField()
    description = models.TextField()
    model_url = models.URLField()
    image_url = models.URLField(blank=True)
    specifications = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"{self.car_model} ({self.year})"


class PartCategory(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()

    def __str__(self):
        return self.name


class CarPart(models.Model):
    car = models.ForeignKey(
        Car,
        on_delete=models.CASCADE,
        related_name="parts",
    )
    category = models.ForeignKey(
        PartCategory,
        on_delete=models.CASCADE,
        related_name="car_parts",
    )
    name = models.CharField(max_length=150)
    component_id = models.CharField(max_length=100)
    description = models.TextField()
    function = models.TextField()
    image_url = models.URLField(blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["car", "component_id"],
                name="unique_car_component_id",
            )
        ]

    def __str__(self):
        return f"{self.car}: {self.name}"


class CarImportJob(models.Model):
    class Status(models.TextChoices):
        QUEUED = "QUEUED", "Queued"
        ANALYZING = "ANALYZING", "Analyzing"
        DECOMPOSING = "DECOMPOSING", "Decomposing"
        CLASSIFYING = "CLASSIFYING", "Classifying"
        EXPORTING = "EXPORTING", "Exporting"
        VALIDATING = "VALIDATING", "Validating"
        CREATING_DATABASE_RECORDS = "CREATING_DATABASE_RECORDS", "Creating records"
        READY_FOR_REVIEW = "READY_FOR_REVIEW", "Ready for review"
        READY = "READY", "Ready"
        FAILED = "FAILED", "Failed"

    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="car_import_jobs")
    source_file = models.FileField(upload_to="imports/sources/", validators=[FileExtensionValidator(["blend", "glb", "gltf", "fbx"])])
    brand = models.CharField(max_length=100)
    model = models.CharField(max_length=120)
    year = models.PositiveSmallIntegerField()
    generation = models.CharField(max_length=120, blank=True)
    description = models.TextField(blank=True)
    specifications = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.QUEUED)
    progress = models.PositiveSmallIntegerField(default=0)
    current_stage = models.CharField(max_length=80, blank=True)
    error_message = models.TextField(blank=True)
    report = models.JSONField(default=dict, blank=True)
    component_manifest = models.JSONField(default=list, blank=True)
    review_manifest = models.JSONField(default=list, blank=True)
    car = models.ForeignKey("cars.Car", null=True, blank=True, on_delete=models.SET_NULL, related_name="import_jobs")
    celery_task_id = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.brand} {self.model} import #{self.pk}"


class CinematicCarConfig(models.Model):
    car = models.OneToOneField(Car, on_delete=models.CASCADE, related_name="cinematic_config")
    camera_presets = models.JSONField(default=dict, blank=True)
    story_sections = models.JSONField(default=list, blank=True)
    background = models.CharField(max_length=32, default="light")
    updated_at = models.DateTimeField(auto_now=True)


class PartSpecification(models.Model):
    car_part = models.ForeignKey(
        CarPart,
        on_delete=models.CASCADE,
        related_name="specifications",
    )
    name = models.CharField(max_length=100)
    value = models.CharField(max_length=255)

    def __str__(self):
        return f"{self.car_part}: {self.name} = {self.value}"


class RelatedCarPart(models.Model):
    car_part = models.ForeignKey(
        CarPart,
        on_delete=models.CASCADE,
        related_name="related_part_links",
    )
    related_part = models.ForeignKey(
        CarPart,
        on_delete=models.CASCADE,
        related_name="incoming_related_part_links",
    )

    def __str__(self):
        return f"{self.car_part} -> {self.related_part}"


class PartSource(models.Model):
    car_part = models.ForeignKey(
        CarPart,
        on_delete=models.CASCADE,
        related_name="sources",
    )
    title = models.CharField(max_length=200)
    url = models.URLField()

    def __str__(self):
        return self.title
