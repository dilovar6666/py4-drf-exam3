"""Reusable Blender analysis/export orchestration for staff submitted models."""
import json
import os
import shutil
import struct
import subprocess
from pathlib import Path

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import Car, CarBrand, CarImportJob, CarModel, CarPart, CinematicCarConfig, PartCategory


def _set_stage(job, status, progress, stage):
    job.status = status
    job.progress = progress
    job.current_stage = stage
    job.save(update_fields=["status", "progress", "current_stage"])


def _blender_executable():
    configured = os.environ.get("BLENDER_EXECUTABLE", "").strip()
    if configured and Path(configured).is_file():
        return configured
    found = shutil.which("blender") or shutil.which("blender.exe")
    if found:
        return found
    windows = Path(os.environ.get("ProgramFiles", r"C:\Program Files")) / "Blender Foundation" / "Blender 5.2" / "blender.exe"
    return str(windows) if windows.is_file() else None


def _run_blender(job, reviewed=False):
    executable = _blender_executable()
    if not executable:
        raise RuntimeError("Blender executable is unavailable. Configure BLENDER_EXECUTABLE on the worker host.")
    root = Path(settings.MEDIA_ROOT) / "imports" / "jobs" / str(job.pk)
    root.mkdir(parents=True, exist_ok=True)
    source = Path(job.source_file.path)
    output = root / ("reviewed.glb" if reviewed else "candidate.glb")
    manifest = root / ("reviewed-components.json" if reviewed else "components.json")
    report = root / ("reviewed-report.json" if reviewed else "report.json")
    config_path = root / "job.json"
    config = {"source": str(source), "output": str(output), "manifest": str(manifest), "report": str(report)}
    if reviewed:
        config["review_manifest"] = job.review_manifest
    config_path.write_text(json.dumps(config, ensure_ascii=False), encoding="utf-8")
    script = Path(__file__).with_name("blender_import_pipeline.py")
    log_path = root / ("reviewed-blender.log" if reviewed else "blender.log")
    with log_path.open("w", encoding="utf-8", errors="replace") as log:
        result = subprocess.run(
            [executable, "--background", "--python", str(script), "--", str(config_path)],
            stdout=log, stderr=subprocess.STDOUT, timeout=1800, check=False,
        )
    if result.returncode != 0 or not output.is_file() or not manifest.is_file() or not report.is_file():
        log_text = log_path.read_text(encoding="utf-8", errors="replace")[-3000:]
        raise RuntimeError("Blender import pipeline failed. " + (log_text.strip() or "No worker log was produced."))
    return output, manifest, report


def _validate_glb(path):
    with path.open("rb") as model:
        header = model.read(12)
        if len(header) != 12:
            raise RuntimeError("Exported GLB is truncated.")
        magic, version, declared_size = struct.unpack("<4sII", header)
        if magic != b"glTF" or version != 2 or declared_size != path.stat().st_size:
            raise RuntimeError("Exported file is not a structurally valid GLB 2.0 container.")
        offset = 12
        chunk_types = []
        while offset < declared_size:
            chunk_header = model.read(8)
            if len(chunk_header) != 8:
                raise RuntimeError("GLB has a truncated chunk header.")
            length, chunk_type = struct.unpack("<I4s", chunk_header)
            if length == 0 or offset + 8 + length > declared_size:
                raise RuntimeError("GLB has a damaged chunk length.")
            chunk_types.append(chunk_type)
            model.seek(length, 1)
            offset += 8 + length
        if b"JSON" not in chunk_types or b"BIN\x00" not in chunk_types:
            raise RuntimeError("GLB is missing required JSON or binary geometry data.")
    return {"bytes": path.stat().st_size, "valid_glb_2": True}


def analyze_import(job_id):
    job = CarImportJob.objects.get(pk=job_id)
    job.started_at = timezone.now()
    job.save(update_fields=["started_at"])
    try:
        _set_stage(job, CarImportJob.Status.ANALYZING, 5, "Scene inventory")
        _set_stage(job, CarImportJob.Status.DECOMPOSING, 25, "Safe disconnected-island pass")
        output, manifest, report_path = _run_blender(job)
        _set_stage(job, CarImportJob.Status.CLASSIFYING, 70, "Initial name-based candidate classification")
        components = json.loads(manifest.read_text(encoding="utf-8"))
        report = json.loads(report_path.read_text(encoding="utf-8"))
        glb = _validate_glb(output)
        if report.get("exported_triangle_count", 0) <= 0 or not components:
            raise RuntimeError("The scene contains no exportable mesh geometry.")
        report["candidate_glb"] = glb
        report["pipeline"] = "Blender scene inventory, disconnected-island separation, human semantic review required"
        job.component_manifest = components
        job.review_manifest = components
        job.report = report
        job.status = CarImportJob.Status.READY_FOR_REVIEW
        job.progress = 85
        job.current_stage = "Component review"
        job.finished_at = timezone.now()
        job.save(update_fields=["component_manifest", "review_manifest", "report", "status", "progress", "current_stage", "finished_at"])
        return job
    except Exception as exc:
        job.status = CarImportJob.Status.FAILED
        job.error_message = str(exc)[:10000]
        job.current_stage = "Failed"
        job.finished_at = timezone.now()
        job.save(update_fields=["status", "error_message", "current_stage", "finished_at"])
        raise


def publish_reviewed_import(job_id):
    job = CarImportJob.objects.get(pk=job_id)
    if job.status not in (CarImportJob.Status.READY_FOR_REVIEW, CarImportJob.Status.QUEUED) or not job.review_manifest:
        raise RuntimeError("The import must complete analysis and review before publishing.")
    try:
        _set_stage(job, CarImportJob.Status.EXPORTING, 90, "Export reviewed runtime GLB")
        output, manifest_path, report_path = _run_blender(job, reviewed=True)
        final_info = _validate_glb(output)
        final_dir = Path(settings.MEDIA_ROOT) / "imports" / "models"
        final_dir.mkdir(parents=True, exist_ok=True)
        final_file = final_dir / f"vehicle-import-{job.pk}.glb"
        shutil.copy2(output, final_file)
        job.report = json.loads(report_path.read_text(encoding="utf-8"))
        job.report["final_glb"] = final_info
        job.report["final_path"] = str(final_file.relative_to(settings.MEDIA_ROOT)).replace("\\", "/")
        _set_stage(job, CarImportJob.Status.CREATING_DATABASE_RECORDS, 96, "Create catalog and component records")
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        with transaction.atomic():
            brand, _ = CarBrand.objects.get_or_create(name=job.brand, defaults={"logo_url": ""})
            model, _ = CarModel.objects.get_or_create(brand=brand, name=job.model, generation=job.generation)
            car = Car.objects.create(
                car_model=model, year=job.year, description=job.description,
                model_url=f"{settings.MEDIA_URL}imports/models/{final_file.name}",
                image_url="", specifications=job.specifications, is_active=True,
            )
            category_rows = {}
            grouped = {}
            for item in manifest:
                if item.get("disabled"):
                    continue
                component_id = item["component_id"]
                group = grouped.setdefault(component_id, {**item, "source_nodes": []})
                group["source_nodes"].extend(item.get("source_nodes", []))
            for component_id, item in grouped.items():
                category_name = item.get("category", "UNKNOWN") or "UNKNOWN"
                if category_name not in category_rows:
                    category_rows[category_name], _ = PartCategory.objects.get_or_create(name=category_name, defaults={"description": "Reviewed semantic vehicle system category."})
                CarPart.objects.create(
                    car=car, category=category_rows[category_name],
                    component_id=component_id, name=item.get("name") or component_id,
                    description=item.get("reason", "Reviewed source geometry component."),
                    function="", image_url="",
                )
            categories = sorted(category_rows)
            sections = [{"id": "intro", "title": "Introduction"}, {"id": "design", "title": "Design"}]
            if "ENGINE" in categories:
                sections.append({"id": "engine", "title": "Engine and performance", "category": "ENGINE"})
            if "INTERIOR" in categories:
                sections.append({"id": "interior", "title": "Interior", "category": "INTERIOR"})
            sections += [{"id": "anatomy", "title": "Anatomy"}, {"id": "specifications", "title": "Specifications"}, {"id": "store", "title": "Store"}]
            CinematicCarConfig.objects.create(car=car, story_sections=sections)
            job.car = car
            job.status = CarImportJob.Status.READY
            job.progress = 100
            job.current_stage = "Published"
            job.finished_at = timezone.now()
            job.component_manifest = manifest
            job.save(update_fields=["report", "car", "status", "progress", "current_stage", "finished_at", "component_manifest"])
        return job
    except Exception as exc:
        job.status = CarImportJob.Status.FAILED
        job.error_message = str(exc)[:10000]
        job.current_stage = "Failed"
        job.finished_at = timezone.now()
        job.save(update_fields=["status", "error_message", "current_stage", "finished_at"])
        raise
