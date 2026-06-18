import React, { useState, useEffect } from 'react';

// 📦 Samakan interface dengan struktur tabel D1 FTS-mu
interface MatchResult {
    title: string;
    id: string; // contoh: nama-artikel.html
    image: string;
    date: string;
    category: string;
    code: string; // contoh: 7-1
    snippet_text?: string;
}

export default function DashboardArtikel() {
    const [query, setQuery] = useState('');
    const [daftarArtikel, setDaftarArtikel] = useState<MatchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // ⚡ MAGIC DEBOUNCE: Mencegah spam request ke server setiap kali jemari ngetik
    useEffect(() => {
        // Kalau kotak kosong, langsung bersihkan layar tanpa nembak server
        if (!query.trim()) {
            setDaftarArtikel([]);
            return;
        }

        // Timer 300ms: Nunggu jarimu berhenti ngetik sebentar, baru nembak API
        const delayDebounceFn = setTimeout(async () => {
            setIsLoading(true);
            try {
                // Tembak ke endpoint /cari tangguh yang sudah kita buat sebelumnya!
                const res = await fetch(`/cari?q=${encodeURIComponent(query)}&limit=24`);
                const data = await res.json();
                
                const matches = data.results || data.data || [];
                setDaftarArtikel(matches);
            } catch (error) {
                console.error("❌ Gagal menarik data:", error);
                setDaftarArtikel([]);
            } finally {
                setIsLoading(false);
            }
        }, 300);

        // Bersihkan timer kalau jemari ngetik lagi sebelum 300ms
        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    // 🔗 Helper untuk merakit URL asli artikel
    const generateUrl = (category: string, id: string) => {
        const catSlug = (category || 'lainnya').toLowerCase().replace(/\s+/g, '-');
        const fileSlug = id ? id.replace('.html', '') : '';
        return `/${catSlug}/${fileSlug}`;
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-8 font-sans">
            <div className="max-w-6xl mx-auto">
                
                {/* --- 🎛️ HEADER & INPUT --- */}
                <div className="mb-10 text-center">
                    <h1 className="text-3xl font-bold mb-2">Layar Kosong <span className="text-blue-500">Live Explorer</span></h1>
                    <p className="text-gray-400 mb-6">Ketik kode (misal: 7-1), kategori, atau judul artikel.</p>
                    
                    <div className="relative max-w-2xl mx-auto">
                        <input 
                            type="text" 
                            value={query} 
                            onChange={(e) => setQuery(e.target.value)}
                            className="w-full p-4 pl-12 rounded-xl bg-gray-800 border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all outline-none text-lg shadow-lg"
                            placeholder="Mulai mengetik untuk mencari..."
                            autoFocus
                        />
                        {/* Ikon Kaca Pembesar */}
                        <svg className="w-6 h-6 absolute left-4 top-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        
                        {/* Indikator Loading Mini */}
                        {isLoading && (
                            <div className="absolute right-4 top-4">
                                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- 🚫 STATE: KOSONG / TIDAK DITEMUKAN --- */}
                {query.trim() !== '' && !isLoading && daftarArtikel.length === 0 && (
                    <div className="text-center py-20 text-gray-500">
                        <p className="text-xl">Tidak ada sinyal untuk <span className="text-white font-bold">"{query}"</span>.</p>
                        <p className="mt-2 text-sm">Coba kata kunci lain atau periksa kembali kodenya.</p>
                    </div>
                )}

                {/* --- 🗂️ GRID HASIL PENCARIAN --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {daftarArtikel.map((artikel) => (
                        <a 
                            key={artikel.id} 
                            href={generateUrl(artikel.category, artikel.id)}
                            className="group flex flex-col bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-blue-500 transition-all hover:shadow-lg hover:shadow-blue-500/20"
                        >
                            {/* Thumbnail */}
                            <div className="relative h-48 overflow-hidden bg-gray-700">
                                <img 
                                    src={artikel.image || '/thumbnail.webp'} 
                                    alt={artikel.title} 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    onError={(e) => (e.currentTarget.src = '/thumbnail.webp')}
                                />
                                {/* Badge Kode Artikel */}
                                <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-sm text-white text-xs font-mono px-2 py-1 rounded shadow">
                                    {artikel.code}
                                </div>
                            </div>

                            {/* Konten Kartu */}
                            <div className="p-5 flex flex-col flex-grow">
                                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mb-2">
                                    {artikel.category.replace(/-/g, ' ')}
                                </span>
                                
                                <h3 className="font-bold text-lg leading-tight mb-3 group-hover:text-blue-400 transition-colors">
                                    {artikel.title}
                                </h3>
                                
                                {/* Snippet Text dengan <mark> FTS
                                    dangerouslySetInnerHTML digunakan agar tag <mark> dari backend ter-render menjadi highlight
                                */}
                                <p 
                                    className="text-sm text-gray-400 mb-4 flex-grow line-clamp-3"
                                    dangerouslySetInnerHTML={{ __html: artikel.snippet_text || '' }}
                                />
                                
                                <div className="mt-auto pt-4 border-t border-gray-700 text-xs text-gray-500 flex justify-between items-center">
                                    <span>
                                        {new Date(artikel.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                    <span className="text-blue-500 group-hover:translate-x-1 transition-transform">
                                        Baca →
                                    </span>
                                </div>
                            </div>
                        </a>
                    ))}
                </div>

            </div>
        </div>
    );
}
