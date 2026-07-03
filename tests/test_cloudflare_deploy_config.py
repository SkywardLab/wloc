import json
import pathlib
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[1]


def load_json(testcase: unittest.TestCase, path: pathlib.Path):
    testcase.assertTrue(path.exists(), f"{path.name} must exist at repository root")
    return json.loads(path.read_text(encoding="utf-8"))


class CloudflareDeployConfigTests(unittest.TestCase):
    def test_root_wrangler_config_supports_cloudflare_deploy_button(self):
        config = load_json(self, ROOT / "wrangler.jsonc")

        self.assertEqual(config["name"], "wloc-spoofer")
        self.assertEqual(config["main"], "worker/src/index.js")
        self.assertTrue(config["compatibility_date"])

    def test_root_package_manifest_provides_worker_dependencies_for_root_deploy(self):
        manifest = load_json(self, ROOT / "package.json")

        self.assertEqual(manifest["type"], "module")
        self.assertEqual(manifest["scripts"]["deploy"], "wrangler deploy --minify")
        self.assertIn("hono", manifest["dependencies"])
        self.assertIn("wrangler", manifest["devDependencies"])


if __name__ == "__main__":
    unittest.main()
