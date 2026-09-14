#!/usr/bin/env python3
"""Build reproducible unsigned extension and public source archives (stdlib only)."""
from __future__ import annotations

import hashlib
import json
import argparse
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--output", type=Path, default=ROOT / "dist",
                    help="output directory (default: repository dist/)")
DESTINATION = parser.parse_args().output.resolve()
DESTINATION.mkdir(parents=True, exist_ok=True)
VERSION = json.loads((ROOT / "extension/manifest.json").read_text())["version"]


def archive(path: Path, files: list[tuple[Path, str]]) -> None:
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as output:
        for source, name in sorted(files, key=lambda item: item[1]):
            info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            output.writestr(info, source.read_bytes(), compresslevel=9)


extension_files = [(p, p.relative_to(ROOT / "extension").as_posix())
                   for p in (ROOT / "extension").rglob("*") if p.is_file()]
extension_files.append((ROOT / "LICENSE", "LICENSE"))
source_entries = [ROOT / name for name in (
    ".gitignore", "LICENSE", "README.md", "LOCAL-INSTALL.md", "PRIVACY.md",
    "RELEASE.md", "RESEARCH.md", "TESTING.md", "extension", "scripts", "tests"
)]
source_files = []
for entry in source_entries:
    candidates = entry.rglob("*") if entry.is_dir() else [entry]
    for p in candidates:
        if p.is_file() and not any(part == "__pycache__" or part == ".DS_Store"
                                   for part in p.relative_to(ROOT).parts):
            source_files.append((p, "still/" + p.relative_to(ROOT).as_posix()))

packages = [DESTINATION / f"still-{VERSION}-unsigned.zip",
            DESTINATION / f"still-{VERSION}-source.zip",
            DESTINATION / f"still-{VERSION}-unsigned.xpi"]
archive(packages[0], extension_files)
archive(packages[1], source_files)
packages[2].write_bytes(packages[0].read_bytes())
checksums = "".join(f"{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.name}\n" for p in packages)
(DESTINATION / "SHA256SUMS.txt").write_text(checksums)
for package in packages:
    print(f"{package.name}: {package.stat().st_size:,} bytes")
print(checksums, end="")
