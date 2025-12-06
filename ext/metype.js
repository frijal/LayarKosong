// File: /ext/metype.js
// Menggunakan Account ID: 1004249

// --- KONFIGURASI METYPE ---
const METYPE_ACCOUNT_ID = '1004249'; // <-- ID Metype Anda yang dikonfirmasi
const METYPE_HOST = 'https://www.metype.com/';
const CONTAINER_ID = 'metype'; // ID kontainer yang Anda gunakan: metype

// Fungsi Antrian Global Metype (talktype)
window.talktype = window.talktype || function(f) {
  if (talktype.loaded)
    f();
  else
    (talktype.q = talktype.q || []).push(arguments);
};

// Fungsi untuk memuat Metype SDK secara asinkron
function loadMetypeSDK() {
  if (document.querySelector('script[src*="metype.js"]')) return;
  const script = document.createElement('script');
  script.src = METYPE_HOST + '/quintype-metype/assets/metype.js';
  script.async = true;
  document.head.appendChild(script);
}

// Panggil SDK Loader segera setelah DOM siap
"requestIdleCallback" in window ? requestIdleCallback(loadMetypeSDK) : setTimeout(loadMetypeSDK, 200);


// Logika Lazy-Loading Utama (Memuat saat tombol diklik)
(function() {
  const d = document, w = window, e = d.getElementById(CONTAINER_ID); 
  if (!e) return;

  e.style.display = "none";

  // Buat tombol pemuat
  const b = d.createElement("button");
  b.style.cssText = "padding:6px 10px;font-size:14px;border:1px solid #ccc;border-radius:6px;background-color:white;cursor:pointer;margin-bottom:12px";
  b.textContent = "Lihat Komentar"; 
  
  e.parentNode.insertBefore(b,e);

  let L=0;
  b.onclick=function(){
    if(L)return;
    L=1;

    e.style.display="block";
    
    // --- METYPE INITIATION LOGIC ---
    talktype(function() {
        // 1. Tentukan kontainer dan atur atribut wajib
        e.className = 'iframe-container';
        e.setAttribute('data-metype-account-id', METYPE_ACCOUNT_ID);
        e.setAttribute('data-metype-host', METYPE_HOST);
        
        // 2. Tentukan URL Mapping (ID Permanen)
        // Ambil dari data-metype-page-url di HTML, atau gunakan URL halaman saat ini
        let pageUrl = e.getAttribute("data-metype-page-url") || w.location.href;
        e.setAttribute('data-metype-page-url', pageUrl); 
        
        // 3. Render Widget
        talktype.commentWidgetIframe(e);
    });

    b.remove(); // Hapus tombol
  };
})();
