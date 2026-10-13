const test=require('node:test');const assert=require('node:assert');const fs=require('fs');const path=require('path');
for (const f of ['bulletin.css','bulletin.min.css']) {
  test(`${f}: mobile nav drawer stays position:fixed`,()=>{
    const css=fs.readFileSync(path.join(__dirname,'..',f),'utf8');
    const re=/\.chips-inner\.nav-drawer-panel\s*\{([^}]*)\}/g;let m,found=0;
    while((m=re.exec(css))){ if(!/position\s*:/.test(m[1]))continue; found++;
      const pos=[...m[1].matchAll(/position\s*:\s*([a-z]+)/g)].map(x=>x[1]);
      assert.strictEqual(pos[pos.length-1],'fixed',`drawer rule ends with position:${pos.at(-1)}`);}
    assert.ok(found>0,'drawer rule with position found');
  });
}
test('nav-menu.js wires toggle, drawer class and close',()=>{
  const js=fs.readFileSync(path.join(__dirname,'..','nav-menu.js'),'utf8');
  for (const k of ['nav-toggle','nav-drawer-panel','aria-expanded','nav-drawer-open']) assert.ok(js.includes(k),k);
});
