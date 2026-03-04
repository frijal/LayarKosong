import { expect, test, describe } from "bun:test";
import { existsSync } from "node:fs";
import pkg from "../package.json";

describe("Cek Kesehatan Repositori Layar Kosong", () => {
  
  test("File manifest package.json harus ada", () => {
    expect(existsSync("./package.json")).toBe(true);
  });

  test("Pastikan sudah migrasi total ke bun.lock (Bukan lockfile lama)", () => {
    // Memastikan bun.lock ada
    expect(existsSync("./bun.lock")).toBe(true);
    
    // Memastikan tidak ada jejak lockfile lama yang tertinggal
    expect(existsSync("./package-lock.json")).toBe(false);
    expect(existsSync("./yarn.lock")).toBe(false);
    expect(existsSync("./pnpm-lock.yaml")).toBe(false);
  });

  test("Manifest package.json tidak boleh kosong", () => {
    expect(pkg.name).toBeDefined();
    expect(Object.keys(pkg.dependencies || {}).length + Object.keys(pkg.devDependencies || {}).length).toBeGreaterThan(0);
  });

  test("Struktur folder dapur harus lengkap", () => {
    expect(existsSync("./dapur/sapu-bersih.ts")).toBe(true);
  });

});
