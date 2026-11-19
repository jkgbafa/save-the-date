'use strict';
(async()=>{
 const images=[...document.querySelectorAll('#preview img')],pause=document.getElementById('pause');let photos=[],featuredCount=0,cursor=0,paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function button(){pause.textContent=paused?'Play slideshow':'Pause slideshow';pause.setAttribute('aria-pressed',String(paused));pause.setAttribute('aria-label',paused?'Play changing photos':'Pause changing photos');}button();pause.onclick=()=>{paused=!paused;button();};
 try{const r=await fetch('/photos/wedding/manifest.json',{cache:'no-cache'});if(!r.ok)throw Error('Album unavailable');const data=await r.json();photos=data.photos.filter(p=>p.ok&&!p.hidden);const featured=data.featured||[];featuredCount=featured.length||Math.min(photos.length,12);photos.sort((a,b)=>{const ai=featured.indexOf(a.id),bi=featured.indexOf(b.id);return (ai<0?999:ai)-(bi<0?999:bi);});cursor=3;}catch(e){pause.hidden=true;}
 setInterval(async()=>{if(paused||document.hidden||photos.length<4)return;const slot=images[cursor%3],photo=photos[cursor%Math.max(featuredCount,3)];cursor++;const next=new Image();next.src='/photos/wedding/'+photo.file;try{await next.decode();slot.classList.add('changing');setTimeout(()=>{slot.src=next.src;slot.classList.remove('changing');},400);}catch(e){/* Preserve the last successful image. */}},4500);
})();
