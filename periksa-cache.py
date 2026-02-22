import os
import yaml # Jika belum ada, jalankan: pip install pyyaml

workflow_dir = ".github/workflows/"

print(f"🔍 Memulai audit cache di {workflow_dir}...\n")

for filename in os.listdir(workflow_dir):
    if filename.endswith(".yml") or filename.endswith(".yaml"):
        with open(os.path.join(workflow_dir, filename), 'r') as f:
            try:
                data = yaml.safe_load(f)
                jobs = data.get('jobs', {})
                
                for job_name, job_data in jobs.items():
                    steps = job_data.get('steps', [])
                    for step in steps:
                        uses = step.get('uses', '')
                        if 'actions/cache' in uses:
                            name = step.get('name', 'Unnamed Step')
                            key = step.get('with', {}).get('key', 'NO KEY FOUND')
                            
                            print(f"📄 File: {filename}")
                            print(f"👷 Job: {job_name}")
                            print(f"📦 Step: {name}")
                            print(f"🔑 Key: {key}")
                            
                            # Deteksi masalah umum
                            if "${{ github.sha }}" in key or "${{ github.run_id }}" in key:
                                print("⚠️  BAHAYA: Key mengandung SHA atau Run ID. Ini penyebab cache bengkak!")
                            if "node" in key.lower() and "cargo" not in key.lower():
                                print("💡 INFO: Ini cache Node.js lama. Bisa dihapus jika sudah full Rust.")
                            print("-" * 30)
            except Exception as e:
                print(f"❌ Gagal membaca {filename}: {e}")

print("\n✅ Audit Selesai.")
