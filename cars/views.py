from rest_framework.generics import ListAPIView, RetrieveAPIView

from .filters import (
    filter_car_models,
    filter_car_parts,
    filter_cars,
    filter_part_sources,
    filter_part_specifications,
    filter_related_car_parts,
)
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
    serializer_class = CarSerializer

    def get_queryset(self):
        queryset = Car.objects.all()
        return filter_cars(queryset, self.request)


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
    serializer_class = CarModelSerializer

    def get_queryset(self):
        queryset = CarModel.objects.all()
        return filter_car_models(queryset, self.request)


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
    serializer_class = CarPartSerializer

    def get_queryset(self):
        queryset = CarPart.objects.all()
        return filter_car_parts(queryset, self.request)


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
    serializer_class = PartSpecificationSerializer

    def get_queryset(self):
        queryset = PartSpecification.objects.all()
        return filter_part_specifications(queryset, self.request)


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
    serializer_class = RelatedCarPartSerializer

    def get_queryset(self):
        queryset = RelatedCarPart.objects.all()
        return filter_related_car_parts(queryset, self.request)


class RelatedCarPartDetailView(RetrieveAPIView):
    queryset = RelatedCarPart.objects.all()
    serializer_class = RelatedCarPartSerializer


class CarPartRelatedListView(ListAPIView):
    serializer_class = RelatedCarPartSerializer

    def get_queryset(self):
        return RelatedCarPart.objects.filter(car_part_id=self.kwargs["car_part_id"])


class PartSourceListView(ListAPIView):
    serializer_class = PartSourceSerializer

    def get_queryset(self):
        queryset = PartSource.objects.all()
        return filter_part_sources(queryset, self.request)


class PartSourceDetailView(RetrieveAPIView):
    queryset = PartSource.objects.all()
    serializer_class = PartSourceSerializer


class CarPartSourceListView(ListAPIView):
    serializer_class = PartSourceSerializer

    def get_queryset(self):
        return PartSource.objects.filter(car_part_id=self.kwargs["car_part_id"])
