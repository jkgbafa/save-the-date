'use strict';
(async()=>{
 const viewport=document.getElementById('preview'),track=document.getElementById('carousel-track'),pause=document.getElementById('pause'),motion=matchMedia('(prefers-reduced-motion: reduce)');
 let paused=motion.matches,hovered=false,focused=false,offset=0,width=0,last=0,drag=null,dragged=false;
 const button=()=>{pause.textContent=paused?'Play photos':'Pause photos';pause.setAttribute('aria-pressed',String(paused));pause.setAttribute('aria-label',paused?'Play moving photos':'Pause moving photos');};button();
 pause.onclick=()=>{paused=!paused;button();};motion.addEventListener('change',()=>{paused=motion.matches;button();});
 let group=track.firstElementChild;
 try{const r=await fetch('/photos/wedding/manifest.json',{cache:'no-cache'});if(!r.ok)throw Error('Album unavailable');const data=await r.json(),byID=new Map(data.photos.filter(p=>p.ok&&!p.hidden).map(p=>[p.id,p]));const featured=(data.featured||[]).map(id=>byID.get(id)).filter(Boolean);if(featured.length){group.replaceChildren(...featured.map((p,i)=>{const link=document.createElement('a'),img=document.createElement('img');link.href='/photos/gallery/?photo='+encodeURIComponent(p.id);img.src='/photos/wedding/'+p.file+(p.lightroomExportSHA256?'?edit='+p.lightroomExportSHA256.slice(0,12):'');img.alt='Joshua and Lucia’s wedding · highlight '+(i+1);img.style.objectPosition=p.focus||'50% 20%';img.loading=i<4?'eager':'lazy';link.append(img);return link;}));}}
 catch(e){/* Keep the initial highlights if the album cannot be reached. */}
 const clone=group.cloneNode(true);clone.setAttribute('aria-hidden','true');clone.querySelectorAll('a').forEach(a=>a.tabIndex=-1);track.append(clone);
 const measure=()=>{width=group.getBoundingClientRect().width;};new ResizeObserver(measure).observe(group);measure();
 const draw=()=>{if(width)offset=((offset%width)+width)%width;track.style.transform='translate3d('+(-offset)+'px,0,0)';};
 viewport.addEventListener('pointerenter',()=>hovered=true);viewport.addEventListener('pointerleave',()=>hovered=false);
 viewport.addEventListener('focusin',()=>focused=true);viewport.addEventListener('focusout',()=>focused=false);
 viewport.addEventListener('pointerdown',e=>{if(drag)return;drag={id:e.pointerId,x:e.clientX,start:offset};dragged=false;});
 viewport.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const dx=e.clientX-drag.x;if(Math.abs(dx)>8){dragged=true;viewport.setPointerCapture(e.pointerId);offset=drag.start-dx;draw();}});
 const release=()=>{drag=null;};viewport.addEventListener('pointerup',release);viewport.addEventListener('pointercancel',release);
 viewport.addEventListener('click',e=>{if(dragged){e.preventDefault();dragged=false;}},true);
 viewport.addEventListener('keydown',e=>{if(e.target!==viewport||!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();offset+=e.key==='ArrowRight'?260:-260;draw();});
 function animate(now){const elapsed=last?Math.min(now-last,50):0;last=now;if(!paused&&!focused&&!drag&&!document.hidden){offset+=elapsed*(hovered?20:52)/1000;draw();}requestAnimationFrame(animate);}requestAnimationFrame(animate);
})();
