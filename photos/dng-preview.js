/* Read only the embedded JPEG preview; the original RAW file is never changed. */
(function(root){
 'use strict';
 async function extractDngPreview(file){
  async function read(offset,length){if(!Number.isSafeInteger(offset)||offset<0||length<0||offset+length>file.size)throw new Error('Invalid DNG offset');return new DataView(await file.slice(offset,offset+length).arrayBuffer());}
  const head=await read(0,8),order=head.getUint16(0),little=order===0x4949;
  if((!little&&order!==0x4d4d)||head.getUint16(2,little)!==42)return null;
  const todo=[head.getUint32(4,little)],seen=new Set();let best=null;
  while(todo.length&&seen.size<24){
   const offset=todo.shift();if(!offset||seen.has(offset))continue;seen.add(offset);
   const count=(await read(offset,2)).getUint16(0,little);if(count>1024)continue;
   const table=await read(offset+2,count*12+4),tags={};
   for(let i=0;i<count;i++){
    const pos=i*12,tag=table.getUint16(pos,little),type=table.getUint16(pos+2,little),n=table.getUint32(pos+4,little);
    if(![256,257,259,273,274,279,330,513,514].includes(tag)||![3,4,13].includes(type)||!n||n>24)continue;
    const size=type===3?2:4,bytes=n*size,view=bytes<=4?new DataView(table.buffer,table.byteOffset+pos+8,4):await read(table.getUint32(pos+8,little),bytes);
    tags[tag]=Array.from({length:n},(_,j)=>size===2?view.getUint16(j*size,little):view.getUint32(j*size,little));
   }
   todo.push(table.getUint32(count*12,little),...(tags[330]||[]));
   const jpegOffset=tags[513]?.[0]??(tags[259]?.[0]===7&&tags[273]?.length===1?tags[273][0]:null);
   const jpegLength=tags[514]?.[0]??tags[279]?.[0];
   if(jpegOffset==null||!jpegLength||jpegLength>24*1024*1024||jpegOffset+jpegLength>file.size)continue;
   const magic=await read(jpegOffset,2);if(magic.getUint16(0)!==0xffd8)continue;
   const area=(tags[256]?.[0]||1)*(tags[257]?.[0]||1);
   if(!best||area>best.area)best={offset:jpegOffset,length:jpegLength,area,orientation:tags[274]?.[0]||1};
  }
  return best?{blob:file.slice(best.offset,best.offset+best.length,'image/jpeg'),orientation:best.orientation}:null;
 }
 async function dngThumbnail(file){
  const preview=await extractDngPreview(file);if(!preview)return null;
  const url=URL.createObjectURL(preview.blob);
  try{
   const image=new Image();image.src=url;await image.decode();
   const scale=Math.min(1,1600/Math.max(image.naturalWidth,image.naturalHeight));const w=Math.round(image.naturalWidth*scale),h=Math.round(image.naturalHeight*scale);
   const orientation=preview.orientation,swap=orientation>=5&&orientation<=8,canvas=document.createElement('canvas');canvas.width=swap?h:w;canvas.height=swap?w:h;
   const ctx=canvas.getContext('2d');const transforms={2:[-1,0,0,1,w,0],3:[-1,0,0,-1,w,h],4:[1,0,0,-1,0,h],5:[0,1,1,0,0,0],6:[0,1,-1,0,h,0],7:[0,-1,-1,0,h,w],8:[0,-1,1,0,0,w]};
   if(transforms[orientation])ctx.transform(...transforms[orientation]);ctx.drawImage(image,0,0,w,h);
   const data=canvas.toDataURL('image/jpeg',.82).split(',')[1];return data.length<=1400000?data:null;
  }finally{URL.revokeObjectURL(url);}
 }
 root.extractDngPreview=extractDngPreview;root.dngThumbnail=dngThumbnail;
})(typeof window!=='undefined'?window:globalThis);
