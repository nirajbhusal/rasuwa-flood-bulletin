import sys,time
from playwright.sync_api import sync_playwright
base=sys.argv[1]; pre=sys.argv[2] if len(sys.argv)>2 else None; cb=f"?cb={int(time.time())}"
UAS={"iphone390":(390,844,"Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"),
     "android360":(360,780,"Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36")}
PAGES=sys.argv[3].split(",") if len(sys.argv)>3 else ["index.html","festival.html","notices.html","budhi-gandaki.html"]
fails=0
with sync_playwright() as p:
  b=p.chromium.launch()
  for tag,(w,h,ua) in UAS.items():
    c=b.new_context(viewport={"width":w,"height":h},user_agent=ua,is_mobile=True,has_touch=True,device_scale_factor=2)
    for pg_ in PAGES:
      pg=c.new_page(); errs=[]; pg.on("pageerror",lambda e:None if "Transition was aborted" in str(e) else errs.append(str(e)))
      pg.goto(base+pg_+cb,wait_until="networkidle")
      pg.tap("#nav-toggle"); pg.wait_for_timeout(400)
      r=pg.evaluate("""()=>{const n=document.getElementById('nav-chips');const r=n.getBoundingClientRect();const cs=getComputedStyle(n);
        const links=[...n.querySelectorAll('a[href]')].filter(a=>{const q=a.getBoundingClientRect();return q.height>0&&q.top>=0&&q.bottom<=innerHeight});
        const t=links.find(a=>!a.href.includes(location.pathname.split('/').pop()||'index.html')&&!a.href.includes('#'))||links[1];if(!t)return {pos:cs.position,top:r.top,vis:0,hitok:false,href:'',x:0,y:0};const q=t.getBoundingClientRect();
        const hit=document.elementFromPoint(q.left+q.width/2,q.top+q.height/2);
        const x=document.querySelector('#nav-chips .nav-drawer-close');const xr=x?x.getBoundingClientRect():null;const xv=!!xr&&xr.top>=0&&xr.bottom<=innerHeight&&xr.width>0&&x.contains(document.elementFromPoint(xr.left+xr.width/2,xr.top+xr.height/2));return {xv:xv,st:n.scrollTop,pos:cs.position,top:r.top,left:r.left,w:r.width,vis:links.length,href:t.href,hitok:t.contains(hit),x:q.left+q.width/2,y:q.top+q.height/2}}""")
      if pre and pg_ in("index.html","festival.html"): pg.screenshot(path=f"{pre}{tag}-{pg_[:-5]}-open.png")
      ok=r.get("xv") and r["pos"]=="fixed" and abs(r["top"])<2 and r["vis"]>3 and r["hitok"]
      # close via close button / Escape
      pg.touchscreen.tap(w-15,h//2)
      pg.wait_for_timeout(400)
      closed=pg.evaluate("document.getElementById('nav-toggle').getAttribute('aria-expanded')!=='true'")
      # reopen and tap to navigate
      pg.tap("#nav-toggle"); pg.wait_for_timeout(400)
      if not r["href"]: fails+=1; print(tag,pg_,"FAIL no visible items",r["pos"],round(r["top"]),"closed",closed); pg.close(); continue
      pg.touchscreen.tap(r["x"],r["y"]); pg.wait_for_load_state("domcontentloaded"); pg.wait_for_timeout(600)
      nav=pg.url.split("?")[0].split("#")[0]==r["href"].split("?")[0].split("#")[0]
      good=ok and closed and nav and not errs; fails+= not good
      print(tag,pg_,"OK" if good else "FAIL","x-visible",r.get("xv"),"scrollTop",r.get("st"),r["pos"],round(r["top"]),r["vis"],"closed",closed,"nav",nav,r["href"].split('/')[-1],errs[:1])
      pg.close()
  b.close()
print("FAILS",fails); sys.exit(1 if fails else 0)
