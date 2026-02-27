#!/usr/bin/env python3
import os
import re
import json
import argparse
from collections import Counter
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

def find_local_action_uses(uses_value):
    if isinstance(uses_value, str) and (uses_value.startswith("./") or uses_value.startswith("/")):
        return uses_value
    return None

def inspect_local_action(action_path):
    candidates = []
    base = action_path.lstrip("/") if action_path.startswith("/") else action_path
    base = base.rstrip("/")
    candidates.append(os.path.join(base, "action.yml"))
    candidates.append(os.path.join(base, "action.yaml"))
    for cand in candidates:
        if os.path.isfile(cand):
            data = safe_load_yaml(cand)
            runs = data.get("runs", {}) or {}
            if isinstance(runs, dict):
                steps = runs.get("steps", []) or []
                for step in steps:
                    uses = normalize_str(step.get("uses", ""))
                    if CACHE_ACTION_SUBSTR in uses:
                        return True, cand
            try:
                with open(cand, "r", encoding="utf-8") as f:
                    txt = f.read()
                    if CACHE_ACTION_SUBSTR in txt:
                        return True, cand
            except Exception:
                pass
    return False, None

def analyze_workflow(path, summary, details):
    data = safe_load_yaml(path)
    if "__yaml_error__" in data:
        details["errors"].append({"file": path, "error": data["__yaml_error__"]})
        return

    jobs = data.get("jobs", {})
    for job_name, job_data in (jobs.items() if isinstance(jobs, dict) else []):
        steps = job_data.get("steps", []) or []
        for step in steps:
            uses = step.get("uses")
            uses_str = normalize_str(uses)
            found_direct = False
            found_via_local = False
            local_action_file = None

            if CACHE_ACTION_SUBSTR in uses_str:
                found_direct = True

            local_path = find_local_action_uses(uses if isinstance(uses, str) else "")
            if local_path:
                workflow_dir = os.path.dirname(path)
                resolved = os.path.normpath(os.path.join(workflow_dir, local_path))
                found_via_local, local_action_file = inspect_local_action(resolved)

            if found_direct or found_via_local:
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

                details["cache_steps"].append({
                    "file": path,
                    "job": job_name,
                    "step_id": step_id,
                    "name": name,
                    "uses": uses_str,
                    "found_via_local_action": bool(found_via_local),
                    "local_action_file": local_action_file,
                    "key": key,
                    "restore_keys": restore_keys,
                    "paths": paths
                })

                summary["unique_keys"].add(key)
                for rk in restore_keys:
                    summary["restore_keys_counter"][rk] += 1
                for p in paths:
                    summary["paths_counter"][p] += 1

                for pat in RISKY_KEY_PATTERNS:
                    if re.search(pat, key):
                        summary["risky_keys"].append({"file": path, "job": job_name, "step": name, "key": key})
                expr_count = len(re.findall(r"\$\{\{.*?\}\}", key))
                if expr_count >= 2:
                    summary["suspicious_keys"].append({"file": path, "job": job_name, "step": name, "key": key})

    text = ""
    try:
        with open(path, "r", encoding="utf-8") as f:
            text = f.read()
    except Exception:
        text = ""
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
        for filename in os.listdir(root_dir):
            if filename.endswith((".yml", ".yaml")):
                full = os.path.join(root_dir, filename)
                summary["workflow_files_scanned"] += 1
                analyze_workflow(full, summary, details)

    summary["unique_keys"] = list(summary["unique_keys"])
    summary["most_common_restore_keys"] = summary["restore_keys_counter"].most_common(10)
    summary["most_common_paths"] = summary["paths_counter"].most_common(20)
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
    print("\n📄 Contoh langkah cache yang ditemukan (maks 20):")
    for item in details["cache_steps"][:20]:
        via = "direct" if not item.get("found_via_local_action") else f"via local action ({item.get('local_action_file')})"
        print(f"  - {item['file']} | job: {item['job']} | step: {item['name']} | key: {item['key']} | source: {via}")
    if details["errors"]:
        print("\n❌ File dengan error parsing YAML:")
        for e in details["errors"]:
            print(f"  - {e['file']}: {e['error']}")

def ensure_dir(path):
    os.makedirs(path, exist_ok=True)

def find_repo_root(start_path=None):
    """
    Naik ke atas sampai menemukan .git atau .github/workflows.
    Kembalikan path root (folder yang berisi .git atau .github/workflows),
    atau None jika tidak ditemukan.
    """
    if start_path is None:
        start_path = os.getcwd()
    cur = os.path.abspath(start_path)
    while True:
        if os.path.isdir(os.path.join(cur, ".git")) or os.path.isdir(os.path.join(cur, ".github", "workflows")):
            return cur
        parent = os.path.dirname(cur)
        if parent == cur:
            return None
        cur = parent

def main():
    parser = argparse.ArgumentParser(description="Audit GitHub Actions cache usage (Bun/Node/Rust).")
    parser.add_argument("--workflows", "-w", default=None, help="Folder workflows (default: auto-detect .github/workflows in repo root)")
    parser.add_argument("--no-recursive", action="store_true", help="Jangan scan secara rekursif")
    parser.add_argument("--output", "-o", default=None, help="File JSON output (default: mini/cache_audit_report.json in repo root)")
    args = parser.parse_args()

    repo_root = find_repo_root()
    if repo_root is None:
        print("⚠️  Repo root tidak ditemukan (tidak ada .git atau .github/workflows di atas).")
        print("Jalankan script dari dalam repo atau gunakan --workflows untuk menunjuk folder workflows.")
        return

    # default workflows dir and output relative to repo root
    workflows_dir = args.workflows if args.workflows else os.path.join(repo_root, ".github", "workflows")
    if not os.path.isabs(workflows_dir):
        workflows_dir = os.path.normpath(os.path.join(os.getcwd(), workflows_dir)) if args.workflows else os.path.join(repo_root, ".github", "workflows")

    default_output = os.path.join(repo_root, "mini", "cache_audit_report.json")
    output_file = args.output if args.output else default_output
    if not os.path.isabs(output_file):
        output_file = os.path.normpath(os.path.join(os.getcwd(), output_file)) if args.output else default_output

    if not os.path.isdir(workflows_dir):
        print(f"Folder workflows tidak ditemukan di: {workflows_dir}")
        return

    # ensure output folder exists (relative to repo root if default)
    out_dir = os.path.dirname(output_file) or "."
    ensure_dir(out_dir)

    summary, details = scan_workflows(workflows_dir, recursive=not args.no_recursive)
    print_human_summary(summary, details)

    report = {"summary": summary, "details": details}
    with open(output_file, "w", encoding="utf-8") as out:
        json.dump(report, out, ensure_ascii=False, indent=2)
    print(f"\n✅ Laporan disimpan ke {output_file}")

if __name__ == "__main__":
    main()
