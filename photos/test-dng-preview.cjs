const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context={Blob,DataView,Set,Number,Array,Error};vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/dng-preview.js','utf8'),context);
function fixture(little=true){
 const bytes=new Uint8Array(92),v=new DataView(bytes.buffer);v.setUint16(0,little?0x4949:0x4d4d);v.setUint16(2,42,little);v.setUint32(4,8,little);v.setUint16(8,6,little);
 [[256,4,100],[257,4,200],[259,3,7],[273,4,86],[274,3,6],[279,4,6]].forEach(([tag,type,value],i)=>{const at=10+i*12;v.setUint16(at,tag,little);v.setUint16(at+2,type,little);v.setUint32(at+4,1,little);type===3?v.setUint16(at+8,value,little):v.setUint32(at+8,value,little);});
 bytes.set([255,216,1,2,255,217],86);return new Blob([bytes]);
}
(async()=>{for(const endian of [true,false]){const result=await context.extractDngPreview(fixture(endian));assert.equal(result.orientation,6);assert.deepEqual([...new Uint8Array(await result.blob.arrayBuffer())],[255,216,1,2,255,217]);}
assert.equal(await context.extractDngPreview(new Blob(['not a raw image'])),null);await assert.rejects(()=>context.extractDngPreview(new Blob(['II'])));console.log('PASS: little/big endian JPEG preview extraction, orientation, invalid and truncated DNG files.');})();
