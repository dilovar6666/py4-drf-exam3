from rest_framework import serializers
from django.core.validators import FileExtensionValidator

from .models import (
    Car,
    CarBrand,
    CarModel,
    CarPart,
    PartCategory,
    PartSource,
    PartSpecification,
    RelatedCarPart,
    CarImportJob,
    CinematicCarConfig,
)


class CarBrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = CarBrand
        fields = "__all__"


class CarModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = CarModel
        fields = "__all__"


class CarSerializer(serializers.ModelSerializer):
    class Meta:
        model = Car
        fields = "__all__"


class CarImportJobCreateSerializer(serializers.ModelSerializer):
    source_file = serializers.FileField(validators=[FileExtensionValidator(["blend", "glb", "gltf", "fbx"])])

    class Meta:
        model = CarImportJob
        fields = ("id", "source_file", "brand", "model", "year", "generation", "description", "specifications")
        read_only_fields = ("id",)

    def validate_source_file(self, value):
        if value.size > 1024 * 1024 * 1024:
            raise serializers.ValidationError("Source model must be 1 GB or smaller.")
        return value

    def validate_specifications(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Specifications must be a JSON object.")
        return value


class CarImportJobSerializer(serializers.ModelSerializer):
    source_file = serializers.FileField(read_only=True)
    candidate_model_url = serializers.SerializerMethodField()

    class Meta:
        model = CarImportJob
        fields = "__all__"
        read_only_fields = [field.name for field in CarImportJob._meta.fields]

    def get_candidate_model_url(self, obj):
        from pathlib import Path
        from django.conf import settings
        path = Path(settings.MEDIA_ROOT) / "imports" / "jobs" / str(obj.pk) / "candidate.glb"
        if not path.is_file():
            return None
        url = f"{settings.MEDIA_URL}imports/jobs/{obj.pk}/candidate.glb"
        request = self.context.get("request")
        return request.build_absolute_uri(url) if request else url


class CinematicCarConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = CinematicCarConfig
        fields = ("camera_presets", "story_sections", "background", "updated_at")
        read_only_fields = fields


class PartCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = PartCategory
        fields = "__all__"


class CarPartSerializer(serializers.ModelSerializer):
    class Meta:
        model = CarPart
        fields = "__all__"


class PartSpecificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PartSpecification
        fields = "__all__"


class RelatedCarPartSerializer(serializers.ModelSerializer):
    class Meta:
        model = RelatedCarPart
        fields = "__all__"


class PartSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = PartSource
        fields = "__all__"
