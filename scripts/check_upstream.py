"""Find tested, stable official image updates without following mutable latest."""
import argparse
import json
import os
from pathlib import Path
import re
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
STABLE = re.compile(r"^(\d+)\.(\d+)\.(\d+)$")
DIGEST = re.compile(r"^sha256:[0-9a-f]{64}$")


def version_tuple(value):
    match = STABLE.fullmatch(value)
    return tuple(map(int, match.groups())) if match else None


def select_candidate(tags, current):
    installed = version_tuple(current)
    if installed is None:
        raise ValueError("Current upstream version must be stable semver")
    candidates = []
    for tag in tags:
        version = tag.get("name", "")
        parsed = version_tuple(version)
        digest = tag.get("digest", "") or ""
        if parsed and parsed[0] == installed[0] and parsed >= installed and DIGEST.fullmatch(digest):
            candidates.append((parsed, version, digest))
    if not candidates:
        raise RuntimeError("No valid stable image candidates; refusing to publish")
    _, version, digest = max(candidates)
    return version, digest


def packaged_version(existing, upstream):
    match = re.fullmatch(re.escape(upstream) + r"-(\d+)", existing)
    return upstream + "-" + str(int(match.group(1)) + 1 if match else 1)


def main(apply=False):
    metadata_path = ROOT / "dumbpad/upstream.json"
    metadata = json.loads(metadata_path.read_text())
    url = f"https://hub.docker.com/v2/repositories/{metadata['repository']}/tags?page_size=100&ordering=last_updated"
    tags = []
    for _ in range(3):
        request = urllib.request.Request(url, headers={"User-Agent": "ha-dumbpad-update-check"})
        with urllib.request.urlopen(request, timeout=30) as response:
            page = json.load(response)
        tags.extend(page["results"])
        url = page.get("next")
        if not url:
            break
        if not url.startswith("https://hub.docker.com/v2/repositories/dumbwareio/dumbpad/tags?"):
            raise RuntimeError("Unexpected pagination origin")
    version, digest = select_candidate(tags, metadata["version"])
    if version == metadata["version"] and digest == metadata["digest"]:
        print("Already using the newest stable official image")
        return
    print(f"Official image update available: {metadata['version']} -> {version}")
    if not apply:
        return
    config_path = ROOT / "dumbpad/config.json"
    config = json.loads(config_path.read_text())
    config["version"] = packaged_version(config["version"], version)
    dockerfile = ROOT / "dumbpad/Dockerfile"
    text, count = re.subn(r"^FROM dumbwareio/dumbpad@sha256:[0-9a-f]{64}$", "FROM dumbwareio/dumbpad@" + digest, dockerfile.read_text(), count=1, flags=re.M)
    if count != 1:
        raise RuntimeError("Dockerfile image contract changed")
    dockerfile.write_text(text, encoding="utf-8")
    metadata.update(version=version, digest=digest)
    metadata_path.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    config_path.write_text(json.dumps(config, indent=2) + "\n", encoding="utf-8")
    changelog = ROOT / "dumbpad/CHANGELOG.md"
    history = changelog.read_text().removeprefix("# Changelog\n\n")
    changelog.write_text(f"# Changelog\n\n## {config['version']}\n\n- Update official DumbPad to {version}; image build, authentication, data persistence and toolbar checks required before publication.\n\n" + history, encoding="utf-8")
    if os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as output:
            output.write("new_version=" + config["version"] + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    main(parser.parse_args().apply)
