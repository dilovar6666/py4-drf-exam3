def filter_cars(queryset, request):
    brand = request.query_params.get("brand")
    model = request.query_params.get("model")
    year = request.query_params.get("year")

    if brand:
        queryset = queryset.filter(car_model__brand_id=brand)

    if model:
        queryset = queryset.filter(car_model_id=model)

    if year:
        queryset = queryset.filter(year=year)

    return queryset


def filter_car_models(queryset, request):
    brand = request.query_params.get("brand")

    if brand:
        queryset = queryset.filter(brand_id=brand)

    return queryset


def filter_car_parts(queryset, request):
    car = request.query_params.get("car")
    category = request.query_params.get("category")
    component_id = request.query_params.get("component_id")

    if car:
        queryset = queryset.filter(car_id=car)

    if category:
        queryset = queryset.filter(category_id=category)

    if component_id:
        queryset = queryset.filter(component_id=component_id)

    return queryset


def filter_part_specifications(queryset, request):
    car_part = request.query_params.get("car_part")

    if car_part:
        queryset = queryset.filter(car_part_id=car_part)

    return queryset


def filter_related_car_parts(queryset, request):
    car_part = request.query_params.get("car_part")

    if car_part:
        queryset = queryset.filter(car_part_id=car_part)

    return queryset


def filter_part_sources(queryset, request):
    car_part = request.query_params.get("car_part")

    if car_part:
        queryset = queryset.filter(car_part_id=car_part)

    return queryset
