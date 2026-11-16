#!/usr/bin/env python3
"""Collect a one-time snapshot of Ubuntu host metrics into data/host-metrics.json."""

import json
import os
from pathlib import Path
import re
import shutil
import socket
import subprocess
import tempfile
import time
from datetime import datetime


PROJECT_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_PATH = PROJECT_ROOT / "data" / "host-metrics.json"


def read_text(path):
    try:
        return Path(path).read_text(encoding="utf-8")
    except (OSError, UnicodeError):
        return None


def cpu_times():
    content = read_text("/proc/stat")
    if content is None:
        return None
    try:
        fields = content.splitlines()[0].split()
        if fields[0] != "cpu":
            return None
        # The first eight counters exclude guest time, already included in user/nice.
        counters = [int(value) for value in fields[1:9]]
        return sum(counters), counters[3] + counters[4]
    except (IndexError, ValueError):
        return None


def cpu_usage_percent():
    first = cpu_times()
    time.sleep(0.2)
    second = cpu_times()
    if first is None or second is None:
        return None
    total_delta = second[0] - first[0]
    idle_delta = second[1] - first[1]
    if total_delta <= 0 or idle_delta < 0:
        return None
    return round(100 * (total_delta - idle_delta) / total_delta, 1)


def memory_metrics():
    content = read_text("/proc/meminfo")
    if content is None:
        return None
    values = {}
    for line in content.splitlines():
        match = re.fullmatch(r"(MemTotal|MemAvailable):\s+(\d+) kB", line)
        if match:
            values[match.group(1)] = int(match.group(2)) * 1024
    total = values.get("MemTotal")
    available = values.get("MemAvailable")
    if not total or available is None or available > total:
        return None
    used = total - available
    return {
        "total_bytes": total,
        "used_bytes": used,
        "available_bytes": available,
        "usage_percent": round(100 * used / total, 1),
    }


def storage_metrics():
    try:
        total, used, available = shutil.disk_usage("/")
    except OSError:
        return None
    if total <= 0:
        return None
    return {
        "total_bytes": total,
        "used_bytes": used,
        "available_bytes": available,
        "usage_percent": round(100 * used / total, 1),
    }


def operating_system():
    content = read_text("/etc/os-release")
    if content is None:
        return None
    for line in content.splitlines():
        if line.startswith("PRETTY_NAME="):
            return line.partition("=")[2].strip().strip('"') or None
    return None


def processor_model():
    content = read_text("/proc/cpuinfo")
    if content is None:
        return None
    for line in content.splitlines():
        if line.startswith("model name"):
            return line.partition(":")[2].strip() or None
    return None


def uptime_seconds():
    content = read_text("/proc/uptime")
    if content is None:
        return None
    try:
        return round(float(content.split()[0]), 2)
    except (IndexError, ValueError):
        return None


def cpu_temperature_celsius():
    try:
        devices = sorted(Path("/sys/class/hwmon").glob("hwmon*"))
        for device in devices:
            name = read_text(device / "name")
            if name is None or name.strip() != "coretemp":
                continue
            sensors = sorted(device.glob("temp*_input"))
            # Prefer package temperature over an individual core when available.
            sensors.sort(key=lambda path: "package" not in (read_text(path.with_name(path.name.replace("_input", "_label"))) or "").lower())
            for sensor in sensors:
                value = read_text(sensor)
                if value is None:
                    continue
                try:
                    return round(int(value.strip()) / 1000, 1)
                except ValueError:
                    continue
    except OSError:
        return None
    return None


def process_count():
    try:
        with os.scandir("/proc") as entries:
            count = 0
            for entry in entries:
                if not entry.name.isdigit():
                    continue
                try:
                    count += entry.is_dir(follow_symlinks=False)
                except OSError:
                    continue
            return count
    except OSError:
        return None


def wifi_ipv4():
    try:
        result = subprocess.run(
            ["ip", "-4", "-o", "addr", "show", "dev", "wlp58s0"],
            capture_output=True, text=True, timeout=3, check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    if result.returncode != 0:
        return None
    match = re.search(r"\binet\s+(\d{1,3}(?:\.\d{1,3}){3})/\d+", result.stdout)
    return match.group(1) if match else None


def service_status(unit):
    try:
        result = subprocess.run(
            ["systemctl", "is-active", unit],
            capture_output=True, text=True, timeout=3, check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    status = result.stdout.strip()
    return status if status in {"active", "inactive", "failed", "activating", "deactivating", "reloading"} else None


def write_json_atomically(metrics):
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w", encoding="utf-8", dir=OUTPUT_PATH.parent,
            prefix=".host-metrics-", suffix=".tmp", delete=False,
        ) as temporary_file:
            temporary_path = Path(temporary_file.name)
            json.dump(metrics, temporary_file, indent=2)
            temporary_file.write("\n")
        os.replace(temporary_path, OUTPUT_PATH)
    finally:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)


def main():
    try:
        hostname = socket.gethostname() or None
    except OSError:
        hostname = None
    metrics = {
        "collected_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "hostname": hostname,
        "os": operating_system(),
        "cpu_model": processor_model(),
        "cpu_usage_percent": cpu_usage_percent(),
        "cpu_temperature_celsius": cpu_temperature_celsius(),
        "memory": memory_metrics(),
        "storage": storage_metrics(),
        "uptime_seconds": uptime_seconds(),
        "process_count": process_count(),
        "wifi_ipv4": wifi_ipv4(),
        "cloudflared_status": service_status("cloudflared.service"),
        "ssh_status": service_status("ssh.service"),
        "docker_status": service_status("docker.service"),
    }
    write_json_atomically(metrics)
    print(OUTPUT_PATH)


if __name__ == "__main__":
    main()
