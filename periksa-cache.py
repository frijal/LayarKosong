#!/usr/bin/env python3
import os
import re
import json
import argparse
from collections import Counter, defaultdict
import yaml  # pip install pyyaml

CACHE_ACTION_SUBSTR = "actions/cache"
RISKY_KEY_PATTERNS = [r"\$\{\{\s*github\.sha\s*\}\}", r"\$\{\{\s*github\.run_id\s*\}\}"]
CACHE_HIT_REGEX = re.compile(r"cache-?hit", re.IGNORECASE)
STEP_OUTPUT_CACHE_HIT_REGEX = re.compile(r"steps\.[\w-]+\.outputs\.cache-?hit", re.IGNORECASE)

def safe_load_yaml(path):
    with open(path, "r", encoding="utf-8") as f:
        try:
            return yaml.safe_load(f) or {}
        except Exception as e:
            return {"__yaml_error__": str(e)}

def normalize_str(v):
    if v is None:
        return ""
    if isinstance(v, str):
        return v
    return json.dumps(v, ensure_ascii=False)

def analyze_workflow(path, summary, details):
    data = safe_load_yaml(path)
    if "__yaml_error__" in data:
        details["errors"].append({"file": path, "error": data["__yaml_error__"]})
        return

    jobs = data.get("jobs", {})
    for job_name, job_data in (jobs.items() if isinstance(jobs, dict) else []):
        steps = job_data.get("steps", []) or []
        for step in steps:
            uses = normalize_str(step.get("uses", ""))
            if CACHE_ACTION_SUBSTR in uses:
                summary["cache_steps_total"] += 1
                step_id = step.get("id") or step.get("name") or "unnamed"
                name = step.get("name", step_id)
                with_block = step.get("with", {}) or {}
                key = normalize_str(with_block.get("key", "NO KEY FOUND"))
                restore_keys = with_block.get("restore-keys", [])
                if isinstance(restore_keys, str):
                    restore_keys = [restore_keys]
                paths = with_block.get("path", with_block.get("paths", []))
                if isinstance(paths, str):
                    paths = [paths]

                # record details
                details["cache_steps"].append({
                    "file": path,
                    "job": job_name,
                    "step_id": step_id,
                    "name": name,
                    "uses": uses,
                    "key": key,
                    "restore_keys": restore_keys,
                    "paths": paths
                })

                # metrics
                summary["unique_keys"].add(key)
                for rk in restore_keys:
                    summary["restore_keys_counter"][rk] += 1
                for p in paths:
                    summary["paths_counter"][p] += 1

                # risky key detection
                for pat in RISKY_KEY_PATTERNS:
                    if re.search(pat, key):
                        summary["risky_keys"].append({"file": path, "job": job_name, "step": name, "key": key})
                # heuristics: key too dynamic (many expressions)
                expr_count = len(re.findall(r"\$\{\{.*?\}\}", key))
                if expr_count >= 2:
                    summary["suspicious_keys"].append({"file": path, "job": job_name, "step": name, "key": key})

    # detect cache-hit usage elsewhere in the workflow (ifs, run, uses)
    text = ""
    try:
        with open(path, "r", encoding="utf-8") as f:
            text = f.read()
    except Exception:
        text = ""
    # count occurrences of cache-hit patterns
    hits = len(CACHE_HIT_REGEX.findall(text))
    step_output_hits = len(STEP_OUTPUT_CACHE_HIT_REGEX.findall(text))
    if hits or step_output_hits:
        details["cache_hit_usages"].append({"file": path, "occurrences": hits, "step_output_refs": step_output_hits})
        summary["cache_hit_total_refs"] += hits + step_output_hits

def scan_workflows(root_dir, recursive=True):
    summary = {
        "workflow_files_scanned": 0,
        "cache_steps_total": 0,
        "unique_keys": set(),
        "restore_keys_counter": Counter(),
        "paths_counter": Counter(),
        "risky_keys": [],
        "suspicious_keys": [],
        "cache_hit_total_refs": 0
    }
    details = {
        "cache_steps": [],
        "cache_hit_usages": [],
        "errors": []
    }

    if recursive:
        for dirpath, _, filenames in os.walk(root_dir):
            for filename in filenames:
                if filename.endswith((".yml", ".yaml")):
                    full = os.path.join(dirpath, filename)
                    summary["workflow_files_scanned"] += 1
                    analyze_workflow(full, summary, details)
    else:
        try:
            for filename in os.listdir(root_dir):
                if filename.endswith((".yml", ".yaml")):
                    full = os.path.join(root_dir, filename)
                    summary["workflow_files_scanned"] += 1
                    analyze_workflow(full, summary, details)
        except FileNotFoundError:
            raise

    # finalize summary
    summary["unique_keys"] = list(summary["unique_keys"])
    summary["most_common_restore_keys"] = summary["restore_keys_counter"].most_common(10)
    summary["most_common_paths"] = summary["paths_counter"].most_common(20)
    # convert counters to dict for JSON
    summary["restore_keys_counter"] = dict(summary["restore_keys_counter"])
    summary["paths_counter"] = dict(summary["paths_counter"])
    return summary, details

def print_human_summary(summary, details):
    print("🔍 Audit cache GitHub Workflows - Ringkasan")
    print(f"• Workflow files scanned: {summary['workflow_files_scanned']}")
    print(f"• Total cache steps found: {summary['cache_steps_total']}")
    print(f"• Unique cache keys found: {len(summary['unique_keys'])}")
    print(f"• Total cache-hit references found: {summary['cache_hit_total_refs']}")
    print(f"• Restore-keys unique count: {len(summary['restore_keys_counter'])}")
    print(f"• Paths unique count: {len(summary['paths_counter'])}")
    print()
    if summary["risky_keys"]:
        print("⚠️  Keys berisiko (mengandung github.sha atau run_id):")
        for r in summary["risky_keys"]:
            print(f"  - {r['file']} | job: {r['job']} | step: {r['step']} | key: {r['key']}")
    if summary["suspicious_keys"]:
        print("⚠️  Keys mencurigakan (mengandung banyak ekspresi):")
        for r in summary["suspicious_keys"]:
            print(f"  - {r['file']} | job: {r['job']} | step: {r['step']} | key: {r['key']}")
    if details["cache_hit_usages"]:
        print("\n🔎 Deteksi penggunaan cache-hit di workflow (ifs atau referensi outputs):")
        for ch in details["cache_hit_usages"]:
            print(f"  - {ch['file']}: occurrences={ch['occurrences']}, step_output_refs={ch['step_output_refs']}")
    print("\n📄 Contoh langkah cache yang ditemukan (maks 10):")
    for item in details["cache_steps"][:10]:
        print(f"  - {item['file']} | job: {item['job']} | step: {item['name']} | key: {item['key']}")
    if details["errors"]:
        print("\n❌ File dengan error parsing YAML:")
        for e in details["errors"]:
            print(f"  - {e['file']}: {e['error']}")

def main():
    parser = argparse.ArgumentParser(description="Audit GitHub Actions cache usage (Bun/Node/Rust).")
    parser.add_argument("--workflows", "-w", default=".github/workflows", help="Folder workflows (default: .github/workflows)")
    parser.add_argument("--no-recursive", action="store_true", help="Jangan scan secara rekursif")
    parser.add_argument("--output", "-o", default="cache_audit_report.json", help="File JSON output")
    args = parser.parse_args()

    if not os.path.isdir(args.workflows):
        print(f"Folder {args.workflows} tidak ditemukan. Pastikan Anda menjalankan script di root repo.")
        return

    summary, details = scan_workflows(args.workflows, recursive=not args.no_recursive)
    # print human summary
    print_human_summary(summary, details)

    # save JSON report
    report = {"summary": summary, "details": details}
    with open(args.output, "w", encoding="utf-8") as out:
        json.dump(report, out, ensure_ascii=False, indent=2)
    print(f"\n✅ Laporan disimpan ke {args.output}")

if __name__ == "__main__":
    main()
