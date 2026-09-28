from rest_framework.generics import ListAPIView, RetrieveAPIView

from .filters import *
from .models import *
from .serializers import *
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404


class CarListView(ListAPIView):
    serializer_class = CarSerializer

    def get_queryset(self):
        queryset = Car.objects.filter(is_active=True).order_by("id")
        return filter_cars(queryset, self.request)


class CarDetailView(RetrieveAPIView):
    queryset = Car.objects.filter(is_active=True)
    serializer_class = CarSerializer


class CinematicCarConfigView(APIView):

    def get(self, request, car_id):
        car = get_object_or_404(Car, pk=car_id, is_active=True)
        config = CinematicCarConfig.objects.filter(car=car).first()
        if config:
            return Response(CinematicCarConfigSerializer(config).data)
        categories = set(car.parts.select_related("category").values_list("category__name", flat=True))
        sections = [{"id": "intro", "title": "Introduction"}, {"id": "design", "title": "Design"}]
        if "ENGINE" in categories:
            sections.append({"id": "engine", "title": "Engine and performance", "category": "ENGINE"})
        if "INTERIOR" in categories:
            sections.append({"id": "interior", "title": "Interior", "category": "INTERIOR"})
        sections.extend([{"id": "anatomy", "title": "Anatomy"}, {"id": "specifications", "title": "Specifications"}, {"id": "store", "title": "Store"}])
        return Response({"camera_presets": {}, "story_sections": sections, "background": "light"})


class CarBrandListView(ListAPIView):
    queryset = CarBrand.objects.all().order_by("id")
    serializer_class = CarBrandSerializer


class CarBrandDetailView(RetrieveAPIView):
    queryset = CarBrand.objects.all()
    serializer_class = CarBrandSerializer


class CarModelListView(ListAPIView):
    serializer_class = CarModelSerializer

    def get_queryset(self):
        queryset = CarModel.objects.all().order_by("id")
        return filter_car_models(queryset, self.request)


class CarModelDetailView(RetrieveAPIView):
    queryset = CarModel.objects.all()
    serializer_class = CarModelSerializer


class PartCategoryListView(ListAPIView):
    queryset = PartCategory.objects.all().order_by("id")
    serializer_class = PartCategorySerializer


class PartCategoryDetailView(RetrieveAPIView):
    queryset = PartCategory.objects.all()
    serializer_class = PartCategorySerializer


class CarPartListView(ListAPIView):
    serializer_class = CarPartSerializer

    def get_queryset(self):
        queryset = CarPart.objects.all().order_by("id")
        return filter_car_parts(queryset, self.request)


class CarPartDetailView(RetrieveAPIView):
    queryset = CarPart.objects.all()
    serializer_class = CarPartSerializer


class CarPartByCarListView(ListAPIView):
    serializer_class = CarPartSerializer

    def get_queryset(self):
        return CarPart.objects.filter(car_id=self.kwargs["car_id"]).order_by("id")


class CarPartByComponentDetailView(RetrieveAPIView):
    serializer_class = CarPartSerializer
    lookup_field = "component_id"
    lookup_url_kwarg = "component_id"

    def get_queryset(self):
        return CarPart.objects.filter(car_id=self.kwargs["car_id"])


class PartSpecificationListView(ListAPIView):
    serializer_class = PartSpecificationSerializer

    def get_queryset(self):
        queryset = PartSpecification.objects.all().order_by("id")
        return filter_part_specifications(queryset, self.request)


class PartSpecificationDetailView(RetrieveAPIView):
    queryset = PartSpecification.objects.all()
    serializer_class = PartSpecificationSerializer


class CarPartSpecificationListView(ListAPIView):
    serializer_class = PartSpecificationSerializer

    def get_queryset(self):
        return PartSpecification.objects.filter(
            car_part_id=self.kwargs["car_part_id"]
        ).order_by("id")


class RelatedCarPartListView(ListAPIView):
    serializer_class = RelatedCarPartSerializer

    def get_queryset(self):
        queryset = RelatedCarPart.objects.all().order_by("id")
        return filter_related_car_parts(queryset, self.request)


class RelatedCarPartDetailView(RetrieveAPIView):
    queryset = RelatedCarPart.objects.all()
    serializer_class = RelatedCarPartSerializer


class CarPartRelatedListView(ListAPIView):
    serializer_class = RelatedCarPartSerializer

    def get_queryset(self):
        return RelatedCarPart.objects.filter(
            car_part_id=self.kwargs["car_part_id"]
        ).order_by("id")


class PartSourceListView(ListAPIView):
    serializer_class = PartSourceSerializer

    def get_queryset(self):
        queryset = PartSource.objects.all().order_by("id")
        return filter_part_sources(queryset, self.request)


class PartSourceDetailView(RetrieveAPIView):
    queryset = PartSource.objects.all()
    serializer_class = PartSourceSerializer


class CarPartSourceListView(ListAPIView):
    serializer_class = PartSourceSerializer

    def get_queryset(self):
        return PartSource.objects.filter(
            car_part_id=self.kwargs["car_part_id"]
        ).order_by("id")
