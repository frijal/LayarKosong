-- init.sql
-- Cetak biru untuk tabel Full-Text Search (FTS5) Blog Layar Kosong
DROP TABLE IF EXISTS articles_fts;

CREATE VIRTUAL TABLE articles_fts USING fts5(
    title,
    content,
    id UNINDEXED,
    category UNINDEXED,
    image UNINDEXED,
    date UNINDEXED,
    code UNINDEXED -- Biar klop sama script penomoran kategori yang baru
);
