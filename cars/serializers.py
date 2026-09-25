from rest_framework import serializers

from .models import (
    Car,
    CarBrand,
    CarModel,
    CarPart,
    PartCategory,
    PartSource,
    PartSpecification,
    RelatedCarPart,
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
