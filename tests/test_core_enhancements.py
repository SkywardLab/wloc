import pathlib
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


class CoreEnhancementTests(unittest.TestCase):
    def test_loon_has_prepare_rule_for_identity_encoding(self):
        loon = read("modules/wloc.lpx")
        script_lines = []
        in_script_section = False

        for line in loon.splitlines():
            line = line.strip()
            if line.startswith("#"):
                continue
            if line == "[Script]":
                in_script_section = True
                continue
            if in_script_section and line.startswith("["):
                break
            if in_script_section and line:
                script_lines.append(line.replace("\\/", "/"))

        required_tokens = [
            "http-request",
            "/clls/wloc",
            "wloc.js",
            "tag=Apple WLOC Prepare",
        ]
        self.assertTrue(
            any(all(token in line for token in required_tokens) for line in script_lines),
            f"missing single Loon prepare-rule line containing: {required_tokens}",
        )

    def test_response_bundle_supports_unified_location_fields(self):
        bundle = read("dist/wloc.js")

        for token in [
            "enabled:false",
            "verticalAccuracy:30",
            "altitude:0",
            "motionActivityType:63",
            "motionActivityConfidence:467",
            '$request.headers["Accept-Encoding"]="identity"',
        ]:
            self.assertIn(token, bundle, f"missing response bundle token: {token}")

    def test_settings_bundle_supports_canonical_fields_and_aliases(self):
        bundle = read("dist/wloc-settings.js")

        for token in [
            '"enabled"',
            '"longitude"',
            '"latitude"',
            '"accuracy"',
            '"verticalAccuracy"',
            '"altitude"',
            '"lon"',
            '"lat"',
            '"acc"',
            "enabled:",
            "longitude:",
            "latitude:",
            "accuracy:",
            "verticalAccuracy:",
            "altitude:",
        ]:
            self.assertIn(token, bundle, f"missing settings bundle token: {token}")

    def test_readme_documents_unified_fields(self):
        readme = read("README.md")

        for token in [
            "enabled",
            "verticalAccuracy",
            "altitude",
            "enabled=false",
        ]:
            self.assertIn(token, readme, f"missing README token: {token}")


if __name__ == "__main__":
    unittest.main()
