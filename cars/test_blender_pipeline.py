import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

from django.test import SimpleTestCase

from .import_pipeline import _blender_executable, _validate_glb


@unittest.skipUnless(_blender_executable(), "Blender is not installed on this test host")
class BlenderImportPipelineTests(SimpleTestCase):
    def test_blend_source_is_unchanged_and_disconnected_islands_export(self):
        blender = _blender_executable()
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "fixture.blend"
            fixture_script = root / "fixture.py"
            fixture_script.write_text(
                "import bpy\n"
                "bpy.ops.object.select_all(action='SELECT')\n"
                "bpy.ops.object.delete(use_global=False)\n"
                "bpy.ops.mesh.primitive_cube_add(location=(-2,0,0))\n"
                "a=bpy.context.object\n"
                "bpy.ops.mesh.primitive_cube_add(location=(2,0,0))\n"
                "b=bpy.context.object\n"
                "bpy.ops.object.select_all(action='DESELECT')\n"
                "a.select_set(True); b.select_set(True); bpy.context.view_layer.objects.active=a\n"
                "bpy.ops.object.join(); bpy.context.object.name='Body'\n"
                "collection=bpy.data.collections.new('Hidden parts')\n"
                "bpy.context.scene.collection.children.link(collection)\n"
                "bpy.ops.mesh.primitive_uv_sphere_add(location=(0,0,2))\n"
                "hidden=bpy.context.object; hidden.name='Hidden trim'\n"
                "for c in list(hidden.users_collection): c.objects.unlink(hidden)\n"
                "collection.objects.link(hidden); hidden.hide_set(True); hidden.hide_render=True\n"
                f"bpy.ops.wm.save_as_mainfile(filepath={str(source)!r})\n",
                encoding="utf-8",
            )
            created = subprocess.run([blender, "--background", "--python", str(fixture_script)], capture_output=True, text=True, timeout=180)
            self.assertEqual(created.returncode, 0, created.stderr[-2000:])
            source_bytes = source.read_bytes()
            output, manifest, report = root / "candidate.glb", root / "components.json", root / "report.json"
            config = root / "config.json"
            config.write_text(json.dumps({"source": str(source), "output": str(output), "manifest": str(manifest), "report": str(report)}), encoding="utf-8")
            pipeline = Path(__file__).with_name("blender_import_pipeline.py")
            result = subprocess.run([blender, "--background", "--python", str(pipeline), "--", str(config)], capture_output=True, text=True, timeout=300)
            self.assertEqual(result.returncode, 0, result.stderr[-3000:])
            self.assertTrue(output.is_file(), result.stdout[-5000:] + result.stderr[-3000:])
            self.assertEqual(source.read_bytes(), source_bytes)
            self.assertTrue(_validate_glb(output)["valid_glb_2"])
            components = json.loads(manifest.read_text(encoding="utf-8"))
            report_data = json.loads(report.read_text(encoding="utf-8"))
            self.assertEqual(len(components), 3)
            self.assertGreaterEqual(report_data["triangle_count"], 24)
            self.assertIn("Hidden trim", report_data["hidden_objects"])
