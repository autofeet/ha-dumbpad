"""Exercise a disposable real container. Never use production volumes."""
import http.cookiejar
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request


def main(image):
    with tempfile.TemporaryDirectory(prefix="ha-dumbpad-smoke-") as folder:
        if hasattr(os, "chown"):
            os.chown(folder, 1000, 1000)
        container = subprocess.check_output([
            "docker", "run", "-d", "--rm", "-p", "127.0.0.1::3000",
            "-e", "DUMBPAD_PIN=4123", "-v", f"{folder}:/app/data", image,
        ], text=True).strip()
        try:
            port = subprocess.check_output(["docker", "port", container, "3000"], text=True).strip().rsplit(":", 1)[1]
            base = f"http://127.0.0.1:{port}"
            opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

            def request(path, data=None):
                req = urllib.request.Request(base + path, data=None if data is None else json.dumps(data).encode(), headers={"Content-Type": "application/json"})
                with opener.open(req, timeout=10) as response:
                    return response.read()

            for attempt in range(60):
                try:
                    request("/health")
                    break
                except (OSError, urllib.error.URLError):
                    time.sleep(1)
            else:
                raise RuntimeError("Container did not become healthy")
            try:
                request("/api/notepads")
            except urllib.error.HTTPError as error:
                assert error.code == 401, error.code
            else:
                raise AssertionError("PIN protection is missing")
            assert json.loads(request("/api/verify-pin", {"pin": "4123"}))["success"]
            html = request("/").decode()
            assert 'href="Assets/compact-toolbar.css"' in html and 'src="Assets/compact-toolbar.js"' in html
            for filename in ["compact-toolbar.js", "compact-toolbar.css"]:
                assert len(request("/Assets/" + filename)) > 500
            Path("test-results").mkdir(exist_ok=True)
            Path("test-results/current.html").write_text(html, encoding="utf-8")
            initial = json.loads(request("/api/notepads"))["notepads_list"]
            note = json.loads(request("/api/notepads", {}))
            content = "CI persistence check: 测试笔记\n"
            request("/api/notes/" + note["id"], {"content": content})
            assert json.loads(request("/api/notes/" + note["id"]))["content"] == content
            assert len(json.loads(request("/api/notepads"))["notepads_list"]) == len(initial) + 1
            subprocess.run(["docker", "restart", container], check=True, stdout=subprocess.DEVNULL)
            for attempt in range(60):
                try:
                    assert json.loads(request("/api/notes/" + note["id"]))["content"] == content
                    break
                except (OSError, urllib.error.URLError):
                    time.sleep(1)
            else:
                raise RuntimeError("Persistence failed after restart")
            print("PASS: health, PIN, frontend assets, note write/read and restart persistence")
        finally:
            subprocess.run(["docker", "rm", "-f", container], stdout=subprocess.DEVNULL, check=False)


if __name__ == "__main__":
    main(sys.argv[1])
