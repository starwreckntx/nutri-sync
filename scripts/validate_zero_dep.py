#!/usr/bin/env python3
import json
import os
import sys

def test_sheets_schema():
    path = "spark/templates/sheets-schema.json"
    assert os.path.exists(path), f"Missing {path}"
    with open(path) as f:
        data = json.load(f)
    assert "sheets" in data and len(data["sheets"]) == 3
    names = [s["name"] for s in data["sheets"]]
    assert "Profile & Goals" in names
    assert "Daily Log" in names
    assert "Weight Log" in names
    print("PASS: sheets-schema.json valid")

def test_skills_frontmatter():
    skills = ["spark/skills/nutrisync-coach/SKILL.md", "spark/skills/nutrisync-scribe/SKILL.md"]
    for s in skills:
        assert os.path.exists(s), f"Missing {s}"
        with open(s) as f:
            content = f.read()
        assert content.startswith("---"), f"{s} missing YAML frontmatter"
        assert "name:" in content and "description:" in content
    print("PASS: SKILL.md files valid")

if __name__ == "__main__":
    test_sheets_schema()
    test_skills_frontmatter()
    print("ALL ZERO-DEP VALIDATION CHECKS PASSED.")
