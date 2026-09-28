"""Local catalog search and separate Exa web search."""
import json
import os
from django.conf import settings
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from django.db.models import Q

from cars.models import Car, CarPart
from .models import PartCompatibility, SparePart
from .serializers import ExternalSearchResultSerializer


def _car_name(car):
    return f"{car.car_model.brand.name} {car.car_model.name} {car.year}".strip()


def local_search(query, car_id=None, component_id=None, limit=15):
    terms = query.split()[:8]
    products = SparePart.objects.select_related(
        "brand", "category", "car_part", "car_part__car", "car_part__car__car_model", "car_part__car__car_model__brand"
    ).prefetch_related("compatibilities__car__car_model__brand").filter(is_draft=False)
    parts = CarPart.objects.select_related("car", "car__car_model", "car__car_model__brand", "category")
    cars = Car.objects.select_related("car_model", "car_model__brand").filter(is_active=True)

    product_match = Q()
    part_match = Q()
    car_match = Q()
    for term in terms:
        product_match &= (
            Q(name__icontains=term) | Q(description__icontains=term)
            | Q(sku__icontains=term) | Q(oem_number__icontains=term)
            | Q(brand__name__icontains=term) | Q(category__name__icontains=term)
            | Q(car_part__name__icontains=term) | Q(car_part__component_id__icontains=term)
        )
        part_match &= Q(name__icontains=term) | Q(component_id__icontains=term) | Q(description__icontains=term) | Q(category__name__icontains=term)
        car_match &= Q(car_model__name__icontains=term) | Q(car_model__brand__name__icontains=term) | Q(description__icontains=term)
    if car_id:
        parts = parts.filter(car_id=car_id)
        cars = cars.filter(pk=car_id)
        products = products.filter(Q(compatibilities__car_id=car_id) | Q(car_part__car_id=car_id)).distinct()
    if component_id:
        parts = parts.filter(component_id=component_id)
        products = products.filter(car_part__component_id=component_id)
    if query:
        products, parts, cars = products.filter(product_match), parts.filter(part_match), cars.filter(car_match)

    return {
        "products": [{
            "id": p.pk, "name": p.name, "description": p.description,
            "sku": p.sku, "oem_number": p.oem_number,
            "brand": p.brand.name if p.brand_id else None, "category": p.category.name if p.category_id else None,
            "car_part": p.car_part.component_id if p.car_part_id else None,
            "compatible_cars": [_car_name(link.car) for link in p.compatibilities.all()],
            "url": f"/store/products/{p.pk}",
        } for p in products.order_by("id")[:limit]],
        "components": [{
            "id": p.pk, "component_id": p.component_id, "name": p.name,
            "category": p.category.name, "car_id": p.car_id,
            "car": _car_name(p.car), "url": f"/cars/{p.car_id}/components/{p.component_id}",
        } for p in parts.order_by("id")[:limit]],
        "cars": [{"id": c.pk, "name": _car_name(c), "year": c.year, "url": f"/cars/{c.pk}"}
                 for c in cars.filter(car_match).order_by("id")[:limit]] if query and not car_id else [],
    }


def build_external_query(query, car=None, component=None):
    """Compose search text only from user text and catalog-backed vehicle data."""
    terms = []
    if car:
        terms.extend([car.car_model.brand.name, car.car_model.name])
        if car.year:
            terms.append(str(car.year))
        if car.car_model.generation:
            terms.append(car.car_model.generation)
    if component:
        terms.extend([component.name, component.category.name])
        products = SparePart.objects.filter(
            is_draft=False,
            car_part=component,
            compatibilities__car=car,
        ).distinct().only("sku", "oem_number")[:3] if car else SparePart.objects.none()
        for product in products:
            for number in (product.oem_number, product.sku):
                if number:
                    terms.append(number)
    if query.strip():
        terms.append(query.strip())
    terms.append("replacement part")
    return " ".join(dict.fromkeys(value for value in terms if value)).strip()[:500]


def normalize_exa_results(payload, limit=10):
    normalized = []
    rows = payload.get("results", []) if isinstance(payload, dict) else []
    if not isinstance(rows, list):
        return normalized
    for row in rows:
        if not isinstance(row, dict):
            continue
        title = row.get("title")
        url = row.get("url")
        parsed = urlparse(url) if isinstance(url, str) else None
        if not isinstance(title, str) or not title.strip() or not parsed or parsed.scheme not in {"http", "https"} or not parsed.hostname:
            continue
        highlights = row.get("highlights")
        snippet = next((text.strip() for text in highlights if isinstance(text, str) and text.strip()), "") if isinstance(highlights, list) else ""
        if not snippet and isinstance(row.get("text"), str):
            snippet = row["text"].strip()[:400]
        candidate = {
            "title": title.strip()[:300],
            "url": url,
            "snippet": snippet[:600] if snippet else "",
            "source": parsed.hostname.lower(),
        }
        serializer = ExternalSearchResultSerializer(data=candidate)
        if serializer.is_valid():
            normalized.append(serializer.data)
        if len(normalized) >= limit:
            break
    return normalized


def external_search(query, car=None, component=None):
    api_key = os.environ.get("EXA_API_KEY", getattr(settings, "EXA_API_KEY", "")).strip()
    if not api_key:
        return {"available": False, "provider": "Exa Search", "error_code": "EXTERNAL_SEARCH_NOT_CONFIGURED", "results": []}
    search_query = build_external_query(query, car=car, component=component)
    body = json.dumps({
        "query": search_query,
        "type": "fast",
        "numResults": 10,
        "moderation": True,
        "contents": {"highlights": {"maxCharacters": 1200}},
    }).encode("utf-8")
    try:
        request = Request(
            "https://api.exa.ai/search",
            data=body,
            headers={"x-api-key": api_key, "Content-Type": "application/json", "Accept": "application/json"},
            method="POST",
        )
        with urlopen(request, timeout=8) as response:
            payload = json.loads(response.read(2_000_000))
        return {"available": True, "provider": "Exa Search", "query": search_query, "results": normalize_exa_results(payload)}
    except Exception:
        return {"available": True, "provider": "Exa Search", "error_code": "EXTERNAL_SEARCH_FAILED", "results": [], "error": "External search is temporarily unavailable."}


def external_search_for_vehicle(query, car=None, component=None):
    return external_search(query, car=car, component=component)
