#!/usr/bin/env python3
"""Handshake with every keyless data route of the running engine.

Usage: python3 tools/handshake.py [--base http://localhost:4177] [--flights]

Input contract: the dev server is running.
Output contract: one line per route on stdout (PASS, NEEDS KEY or FAIL),
a report at .tmp/handshake_report.json, exit code 0 when every required
route passes, 1 otherwise.
SOP: architecture/05_checks.md.
"""
import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TIMEOUT_S = 60


def fetch(url):
    request = urllib.request.Request(url, headers={"Accept": "application/json, text/plain, */*"})
    started = time.time()
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_S) as response:
            body = response.read()
            return response.status, body, round(time.time() - started, 2)
    except urllib.error.HTTPError as error:
        return error.code, error.read(), round(time.time() - started, 2)
    except Exception as error:  # connection refused, timeout
        return 0, str(error).encode("utf-8"), round(time.time() - started, 2)


def as_json(body):
    try:
        return json.loads(body.decode("utf-8"))
    except Exception:
        return None


def count_list(key):
    def judge(status, body):
        data = as_json(body)
        if status != 200 or not isinstance(data, dict):
            return False, f"HTTP {status}"
        rows = data.get(key)
        if not isinstance(rows, list) or not rows:
            return False, f"no {key}"
        return True, f"{len(rows)} {key}"
    return judge


def judge_tle(status, body):
    text = body.decode("utf-8", "replace")
    lines = [line for line in text.splitlines() if line.strip()]
    if status != 200 or len(lines) < 3:
        return False, f"HTTP {status}, {len(lines)} lines"
    return True, f"{len(lines) // 3} satellites in group"


def judge_any_json(label):
    def judge(status, body):
        data = as_json(body)
        if status != 200 or data is None:
            return False, f"HTTP {status}"
        if isinstance(data, dict):
            for key in ("results", "ac", "aircraft", "states", "launches"):
                if isinstance(data.get(key), list):
                    return True, f"{len(data[key])} {key}"
            return True, f"{label} ok ({len(data)} fields)"
        return True, f"{label} ok ({len(data)} rows)"
    return judge


def judge_geocode(status, body):
    data = as_json(body)
    if status != 200 or data is None:
        return False, f"HTTP {status}"
    text = json.dumps(data)
    if "Brisbane" in text:
        return True, "found Brisbane"
    return False, "answer has no Brisbane"


ROUTES = [
    ("cameras", "/api/cctv/sources", count_list("sources"), True),
    ("radio", "/api/radio/stations", count_list("stations"), True),
    ("satellites", "/api/celestrak/stations", judge_tle, True),
    ("launches", "/api/launches", judge_any_json("launches"), True),
    ("military flights", "/api/military", judge_any_json("military"), True),
    ("place search", "/api/geocode?q=Brisbane", judge_geocode, True),
    ("key screen", "/api/setup/status", judge_any_json("setup"), True),
]
FLIGHTS = ("flights", "/api/flights?lat=-27.47&lon=153.03", judge_any_json("flights"), True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://localhost:4177")
    parser.add_argument("--flights", action="store_true", help="also spend one OpenSky poll")
    args = parser.parse_args()

    routes = list(ROUTES) + ([FLIGHTS] if args.flights else [])
    results = []
    for name, path, judge, required in routes:
        status, body, seconds = fetch(args.base + path)
        if status == 503 and b"key" in body.lower():
            verdict, detail = "NEEDS KEY", "route answers, key missing"
            ok = not required
        else:
            ok, detail = judge(status, body)
            verdict = "PASS" if ok else "FAIL"
        print(f"{verdict:9}  {name:16} {path:36} {detail} ({seconds}s)")
        results.append({"name": name, "path": path, "verdict": verdict, "detail": detail,
                        "status": status, "seconds": seconds, "required": required})

    report = ROOT / ".tmp" / "handshake_report.json"
    report.parent.mkdir(exist_ok=True)
    report.write_text(json.dumps({"base": args.base, "at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
                                  "results": results}, indent=2), encoding="utf-8")
    failed = [row for row in results if row["verdict"] == "FAIL" and row["required"]]
    print(f"\n{len(results) - len(failed)} of {len(results)} routes answered. Report: {report}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
