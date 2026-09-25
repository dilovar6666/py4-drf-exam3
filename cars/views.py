from rest_framework.generics import ListAPIView, RetrieveAPIView

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
from .serializers import (
    CarBrandSerializer,
    CarModelSerializer,
    CarPartSerializer,
    CarSerializer,
    PartCategorySerializer,
    PartSourceSerializer,
    PartSpecificationSerializer,
    RelatedCarPartSerializer,
)


class CarListView(ListAPIView):
    queryset = Car.objects.all()
    serializer_class = CarSerializer


class CarDetailView(RetrieveAPIView):
    queryset = Car.objects.all()
    serializer_class = CarSerializer


class CarBrandListView(ListAPIView):
    queryset = CarBrand.objects.all()
    serializer_class = CarBrandSerializer


class CarBrandDetailView(RetrieveAPIView):
    queryset = CarBrand.objects.all()
    serializer_class = CarBrandSerializer


class CarModelListView(ListAPIView):
    queryset = CarModel.objects.all()
    serializer_class = CarModelSerializer


class CarModelDetailView(RetrieveAPIView):
    queryset = CarModel.objects.all()
    serializer_class = CarModelSerializer


class PartCategoryListView(ListAPIView):
    queryset = PartCategory.objects.all()
    serializer_class = PartCategorySerializer


class PartCategoryDetailView(RetrieveAPIView):
    queryset = PartCategory.objects.all()
    serializer_class = PartCategorySerializer


class CarPartListView(ListAPIView):
    queryset = CarPart.objects.all()
    serializer_class = CarPartSerializer


class CarPartDetailView(RetrieveAPIView):
    queryset = CarPart.objects.all()
    serializer_class = CarPartSerializer


class CarPartByCarListView(ListAPIView):
    serializer_class = CarPartSerializer

    def get_queryset(self):
        return CarPart.objects.filter(car_id=self.kwargs["car_id"])


class CarPartByComponentDetailView(RetrieveAPIView):
    serializer_class = CarPartSerializer
    lookup_field = "component_id"
    lookup_url_kwarg = "component_id"

    def get_queryset(self):
        return CarPart.objects.filter(car_id=self.kwargs["car_id"])


class PartSpecificationListView(ListAPIView):
    queryset = PartSpecification.objects.all()
    serializer_class = PartSpecificationSerializer


class PartSpecificationDetailView(RetrieveAPIView):
    queryset = PartSpecification.objects.all()
    serializer_class = PartSpecificationSerializer


class CarPartSpecificationListView(ListAPIView):
    serializer_class = PartSpecificationSerializer

    def get_queryset(self):
        return PartSpecification.objects.filter(
            car_part_id=self.kwargs["car_part_id"]
        )


class RelatedCarPartListView(ListAPIView):
    queryset = RelatedCarPart.objects.all()
    serializer_class = RelatedCarPartSerializer


class RelatedCarPartDetailView(RetrieveAPIView):
    queryset = RelatedCarPart.objects.all()
    serializer_class = RelatedCarPartSerializer


class CarPartRelatedListView(ListAPIView):
    serializer_class = RelatedCarPartSerializer

    def get_queryset(self):
        return RelatedCarPart.objects.filter(car_part_id=self.kwargs["car_part_id"])


class PartSourceListView(ListAPIView):
    queryset = PartSource.objects.all()
    serializer_class = PartSourceSerializer


class PartSourceDetailView(RetrieveAPIView):
    queryset = PartSource.objects.all()
    serializer_class = PartSourceSerializer


class CarPartSourceListView(ListAPIView):
    serializer_class = PartSourceSerializer

    def get_queryset(self):
        return PartSource.objects.filter(car_part_id=self.kwargs["car_part_id"])
