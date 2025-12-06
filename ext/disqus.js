(function(){
  const d=document,w=window,e=d.getElementById("disqus_thread");
  if(!e)return;

  e.style.display="none";

  const b=d.createElement("button");
b.style.cssText = "padding:6px 10px;font-size:14px;border:1px solid #ccc;border-radius:6px;background-color:white;cursor:pointer;margin-bottom:12px";

  const c=d.createElement("span");
  c.className="disqus-comment-count";
  c.dataset.disqusIdentifier=location.pathname;
  c.textContent="…";
  b.appendChild(c);

  e.parentNode.insertBefore(b,e);

  function C(){
    const x=d.createElement("script");
    x.src="https://layarkosong.disqus.com/count.js";
    x.async=1;
    x.id="dsq-count-scr";
    d.head.appendChild(x);
  }

  "requestIdleCallback" in w ? requestIdleCallback(C) : setTimeout(C,200);

  let L=0;
  b.onclick=function(){
    if(L)return;
    L=1;

    e.style.display="block";

    w.disqus_config=function(){
      this.page.url=location.href;
      this.page.identifier=location.pathname;
    };

    const x=d.createElement("script");
    x.src="https://layarkosong.disqus.com/embed.js";
    x.setAttribute("data-timestamp",Date.now());
    d.body.appendChild(x);

    b.remove();
  };
})();
