from django.contrib import admin

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


@admin.register(CarBrand)
class CarBrandAdmin(admin.ModelAdmin):
    list_display = ("name", "logo_url")
    search_fields = ("name",)


@admin.register(CarModel)
class CarModelAdmin(admin.ModelAdmin):
    list_display = ("brand", "name")
    list_filter = ("brand",)
    search_fields = ("name", "brand__name")
    list_select_related = ("brand",)


@admin.register(Car)
class CarAdmin(admin.ModelAdmin):
    list_display = ("car_model", "brand", "year")
    list_filter = ("year", "car_model__brand", "car_model")
    search_fields = ("car_model__name", "car_model__brand__name")
    list_select_related = ("car_model__brand",)

    @admin.display(ordering="car_model__brand__name", description="Brand")
    def brand(self, obj):
        return obj.car_model.brand


@admin.register(PartCategory)
class PartCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "description")
    search_fields = ("name",)


class PartSpecificationInline(admin.TabularInline):
    model = PartSpecification
    extra = 0


class PartSourceInline(admin.TabularInline):
    model = PartSource
    extra = 0


@admin.register(CarPart)
class CarPartAdmin(admin.ModelAdmin):
    list_display = ("car", "name", "component_id", "category")
    list_filter = ("category", "car")
    search_fields = (
        "name",
        "component_id",
        "car__car_model__name",
        "car__car_model__brand__name",
    )
    list_select_related = ("car__car_model__brand", "category")
    inlines = (PartSpecificationInline, PartSourceInline)


@admin.register(PartSpecification)
class PartSpecificationAdmin(admin.ModelAdmin):
    list_display = ("car_part", "name", "value")
    search_fields = ("car_part__name", "car_part__component_id", "name", "value")
    list_select_related = ("car_part",)


@admin.register(RelatedCarPart)
class RelatedCarPartAdmin(admin.ModelAdmin):
    list_display = ("car_part", "related_part")
    search_fields = (
        "car_part__name",
        "car_part__component_id",
        "related_part__name",
        "related_part__component_id",
    )
    list_select_related = ("car_part", "related_part")


@admin.register(PartSource)
class PartSourceAdmin(admin.ModelAdmin):
    list_display = ("car_part", "title", "url")
    search_fields = ("car_part__name", "car_part__component_id", "title", "url")
    list_select_related = ("car_part",)
