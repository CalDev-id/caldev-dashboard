#!/usr/bin/env python3
"""Serve one batch of dashboard refresh requests on the Ubuntu host."""

import fcntl
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import time


PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
REQUEST_DIR = DATA_DIR / "metric-requests"
RESPONSE_DIR = DATA_DIR / "metric-responses"
SNAPSHOT_PATH = DATA_DIR / "host-metrics.json"
LOCK_PATH = DATA_DIR / ".metrics-refresh.lock"
REQUEST_NAME = re.compile(r"[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\.request")


def write_response(request_id, payload):
    temporary_path = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w", encoding="utf-8", dir=RESPONSE_DIR,
            prefix=".metric-response-", suffix=".tmp", delete=False,
        ) as temporary_file:
            temporary_path = Path(temporary_file.name)
            json.dump({"request_id": request_id, **payload}, temporary_file)
            temporary_file.write("\n")
        os.replace(temporary_path, RESPONSE_DIR / f"{request_id}.json")
    finally:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)


def collect_snapshot():
    started_ns = time.time_ns()
    subprocess.run(
        [sys.executable, str(PROJECT_ROOT / "scripts/collect-host-metrics.py")],
        cwd=PROJECT_ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        check=True, timeout=15,
    )
    if SNAPSHOT_PATH.stat().st_mtime_ns < started_ns:
        raise RuntimeError("Collector did not write a new snapshot")
    snapshot = json.loads(SNAPSHOT_PATH.read_text(encoding="utf-8"))
    if not isinstance(snapshot, dict) or not isinstance(snapshot.get("collected_at"), str):
        raise ValueError("Collector wrote an invalid snapshot")
    return snapshot


def main():
    os.umask(0o077)
    RESPONSE_DIR.mkdir(mode=0o700, parents=True, exist_ok=True)
    with LOCK_PATH.open("a+b") as lock_file:
        fcntl.flock(lock_file, fcntl.LOCK_EX)

        # Responses are small; remove old ones only when another refresh is requested.
        cutoff = time.time() - 3600
        for response in RESPONSE_DIR.glob("*.json"):
            if response.is_file() and response.stat().st_mtime < cutoff:
                response.unlink(missing_ok=True)

        pending = []
        for request in sorted(REQUEST_DIR.glob("*.request")):
            if len(pending) >= 256:
                break
            if request.is_dir() and not request.is_symlink():
                try:
                    request.rmdir()
                except OSError:
                    pass
                continue
            if not REQUEST_NAME.fullmatch(request.name) or request.is_symlink() or not request.is_file():
                request.unlink(missing_ok=True)
                continue
            if request.stat().st_mtime < time.time() - 30:
                request.unlink(missing_ok=True)
                continue
            pending.append(request)
        if not pending:
            return

        try:
            payload = {"snapshot": collect_snapshot()}
        except (OSError, ValueError, RuntimeError, subprocess.SubprocessError):
            payload = {"error": "collection_failed"}
            print("Host metrics collection failed", file=sys.stderr)

        for request in pending:
            try:
                write_response(request.stem, payload)
            finally:
                request.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
