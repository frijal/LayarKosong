(function(){
  const d=document,w=window,e=d.getElementById("disqus_thread");
  if(!e)return;

  e.style.display="none";

  const s=d.createElement("style");
  s.textContent=
  ":root{--bg:#f5f5f5;--b:#ccc;--t:#222}" +
  "@media(prefers-color-scheme:dark){:root{--bg:#2a2a2a;--b:#555;--t:#eee}}" +
  ".dsq-wrap{text-align:center}" +
  ".dsq-btn{display:inline-block;padding:6px 12px;font-size:14px;" +
  "border:1px solid var(--b);border-radius:6px;background:var(--bg);" +
  "color:var(--t);cursor:pointer;margin-bottom:12px}";
  d.head.appendChild(s);

  const wrap=d.createElement("div");
  wrap.className="dsq-wrap";

  const b=d.createElement("div");
  b.className="dsq-btn";

  const c=d.createElement("span");
  c.className="disqus-comment-count";
  c.dataset.disqusIdentifier=location.pathname;
  c.textContent="…";

  b.appendChild(c);
  wrap.appendChild(b);

  e.parentNode.insertBefore(wrap,e);

  const q=d.createElement("script");
  q.src="https://layarkosong.disqus.com/count.js";
  q.async=1;
  d.head.appendChild(q);

  let L=0;
  b.onclick=function(){
    if(L)return; L=1;
    e.style.display="block";

    w.disqus_config=function(){
      this.page.url=location.href;
      this.page.identifier=location.pathname;
    };

    const x=d.createElement("script");
    x.src="https://layarkosong.disqus.com/embed.js";
    x.setAttribute("data-timestamp",Date.now());
    d.body.appendChild(x);

    wrap.remove();
  };
})();
