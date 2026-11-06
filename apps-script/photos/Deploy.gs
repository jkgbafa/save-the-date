/** Joshua & Lucia guest gallery. Deploy as owner, access: Anyone.
 * Only this app's dedicated folder is listed. Credentials never reach the browser.
 */
var MAX_BYTES = 200 * 1024 * 1024;
var CHUNK_BYTES = 2 * 1024 * 1024;
function json_(value){return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);}
function doGet(e){
  try {return json_({ok:true,result:(e && e.parameter.action==='gallery')?listGallery(e.parameter.pageToken||null):{service:'Joshua & Lucia gallery',ready:!!folder_()}});}
  catch(error){return json_({ok:false,error:error.message});}
}
function doPost(e){
  try {
    if(!e||!e.postData||e.postData.contents.length>2900000)throw new Error('Invalid request.');
    var data=JSON.parse(e.postData.contents),args=data.args||[];
    var actions={beginUpload:beginUpload,uploadChunk:uploadChunk,listGallery:listGallery};
    if(!Object.prototype.hasOwnProperty.call(actions,data.action))throw new Error('Unknown action.');
    return json_({ok:true,result:actions[data.action].apply(null,args)});
  }catch(error){return json_({ok:false,error:error.message});}
}
function setupGallery() {
  var props=PropertiesService.getScriptProperties();
  var id=props.getProperty('FOLDER_ID');
  var folder=id?DriveApp.getFolderById(id):DriveApp.createFolder('Joshua & Lucia — Guest Photos & Videos');
  props.setProperty('FOLDER_ID',folder.getId());
  console.log('Wedding originals: '+folder.getUrl());
  return {folderUrl:folder.getUrl()};
}
function folder_() {
  var id=PropertiesService.getScriptProperties().getProperty('FOLDER_ID');
  if(!id) throw new Error('The gallery is not connected yet. Please try again shortly.');
  return id;
}
function drive_(url,options) {
  options=options||{}; options.headers=options.headers||{};
  options.headers.Authorization='Bearer '+ScriptApp.getOAuthToken();
  options.muteHttpExceptions=true;
  var r=UrlFetchApp.fetch(url,options),code=r.getResponseCode();
  if(code>=400) {console.error('Drive request failed: '+code);throw new Error(code===403?'Google Drive is temporarily unavailable or full. Please try later.':'The upload was interrupted. Please retry.');}
  return r;
}
function clean_(s,n){return String(s||'').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,n);}
function beginUpload(meta) {
  folder_();
  if(!meta || meta.consent!==true || meta.website)throw new Error('Please confirm that you want to share in the gallery.');
  var type=clean_(meta.type,80).toLowerCase();
  if(!/^(image\/(jpeg|png|webp|gif|heic|heif)|video\/(mp4|quicktime|webm|3gpp))$/.test(type))throw new Error('Please choose a photo or video (JPG, PNG, HEIC, WEBP, GIF, MP4, MOV or WEBM).');
  var size=Number(meta.size);
  if(!Number.isSafeInteger(size)||size<1||size>MAX_BYTES)throw new Error('Please choose a file smaller than 200 MB.');
  var lock=LockService.getScriptLock();lock.waitLock(20000);
  try {
    var p=PropertiesService.getScriptProperties(),all=p.getProperties(),now=Date.now();
    Object.keys(all).forEach(function(k){if(k.indexOf('upload_')===0){try{if(JSON.parse(all[k]).expires<now)p.deleteProperty(k);}catch(e){p.deleteProperty(k);}}});
    var day=Utilities.formatDate(new Date(),'UTC','yyyy-MM-dd');
    var meter=JSON.parse(p.getProperty('meter')||'{}');
    if(meter.day!==day)meter={day:day,count:0,bytes:0};
    if(meter.count>=1500 || meter.bytes+size>60*1024*1024*1024)throw new Error('Uploads have reached today’s limit. Please keep your files and try again tomorrow.');
    var name=clean_(meta.name,80)||'Anonymous';
    var caption=clean_(meta.caption,240);
    var original=clean_(meta.filename,100).replace(/[<>:"/\\|?*]/g,'_');
    var id=Utilities.getUuid(),secret=Utilities.getUuid();
    var description=JSON.stringify({gallery:'jl-v1',name:name,caption:caption,uploaded:new Date().toISOString()});
    var res=drive_('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id',{
      method:'post',contentType:'application/json',headers:{'X-Upload-Content-Type':type,'X-Upload-Content-Length':String(size)},
      payload:JSON.stringify({name:new Date().toISOString().slice(0,10)+'_'+original,mimeType:type,parents:[folder_()],description:description})
    });
    var headers=res.getAllHeaders(),location=headers.Location||headers.location;
    if(!location || !/^https:\/\/www.googleapis.com\//.test(location))throw new Error('Could not start the upload. Please try again.');
    p.setProperty('upload_'+id,JSON.stringify({secret:secret,url:location,size:size,type:type,offset:0,expires:now+86400000}));
    meter.count++;meter.bytes+=size;p.setProperty('meter',JSON.stringify(meter));
    return {id:id,secret:secret,chunkSize:CHUNK_BYTES};
  } finally{lock.releaseLock();}
}
function uploadChunk(id,secret,offset,base64) {
  if(!/^[a-f0-9-]{36}$/.test(String(id)))throw new Error('Invalid upload.');
  if(typeof base64!=='string'||base64.length>Math.ceil(CHUNK_BYTES/3)*4+8)throw new Error('Upload chunk is too large.');
  var lock=LockService.getScriptLock();lock.waitLock(25000);
  try {
    var p=PropertiesService.getScriptProperties(),key='upload_'+id,s=JSON.parse(p.getProperty(key)||'null');
    if(!s||s.secret!==secret||s.expires<Date.now())throw new Error('This upload has expired. Please choose the file again.');
    if(s.fileId)return {done:true,id:s.fileId,offset:s.size};
    if(Number(offset)!==s.offset)return {done:false,offset:s.offset};
    var bytes=Utilities.base64Decode(base64);
    if(!bytes.length||bytes.length>CHUNK_BYTES||s.offset+bytes.length>s.size || (s.offset+bytes.length<s.size && bytes.length%262144!==0))throw new Error('Invalid upload chunk.');
    // Inspect the server position first on retries after an uncertain request.
    if(s.uncertain){
      var status=drive_(s.url,{method:'put',headers:{'Content-Range':'bytes */'+s.size},payload:[],followRedirects:false});
      if(status.getResponseCode()===200||status.getResponseCode()===201){return finish_(s,key,JSON.parse(status.getContentText()).id);}
      var rh=status.getAllHeaders(),range=rh.Range||rh.range;
      s.offset=range?Number(String(range).split('-')[1])+1:0;s.uncertain=false;p.setProperty(key,JSON.stringify(s));
      if(Number(offset)!==s.offset)return {done:false,offset:s.offset};
    }
    s.uncertain=true;p.setProperty(key,JSON.stringify(s));
    var r=drive_(s.url,{method:'put',contentType:s.type,headers:{'Content-Range':'bytes '+s.offset+'-'+(s.offset+bytes.length-1)+'/'+s.size},payload:bytes,followRedirects:false});
    if(r.getResponseCode()===200||r.getResponseCode()===201)return finish_(s,key,JSON.parse(r.getContentText()).id);
    if(r.getResponseCode()!==308)throw new Error('Upload interrupted. Please retry.');
    var h=r.getAllHeaders(),range=h.Range||h.range;
    s.offset=range?Number(String(range).split('-')[1])+1:s.offset;s.uncertain=false;p.setProperty(key,JSON.stringify(s));
    return {done:false,offset:s.offset};
  } finally{lock.releaseLock();}
}
function finish_(s,key,fileId){
  // Only newly uploaded media are shared. The parent folder stays private.
  drive_('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(fileId)+'/permissions',{method:'post',contentType:'application/json',payload:JSON.stringify({type:'anyone',role:'reader',allowFileDiscovery:false})});
  s.fileId=fileId;s.offset=s.size;s.uncertain=false;PropertiesService.getScriptProperties().setProperty(key,JSON.stringify(s));
  CacheService.getScriptCache().remove('gallery-first');
  return {done:true,id:fileId,offset:s.size};
}
function listGallery(pageToken){
  var cache=CacheService.getScriptCache(),cached=!pageToken&&cache.get('gallery-first');if(cached)return JSON.parse(cached);
  var url='https://www.googleapis.com/drive/v3/files?q='+encodeURIComponent("'"+folder_()+"' in parents and trashed = false and (mimeType contains 'image/' or mimeType contains 'video/')")+'&orderBy=createdTime%20desc&pageSize=60&fields=nextPageToken,files(id,name,mimeType,description,createdTime,shared)';
  if(pageToken)url+='&pageToken='+encodeURIComponent(String(pageToken).slice(0,2048));
  var data=JSON.parse(drive_(url).getContentText());
  var items=(data.files||[]).filter(function(f){return f.shared;}).map(function(f){
    var d={};try{d=JSON.parse(f.description||'{}');}catch(e){}
    return {id:f.id,type:f.mimeType.indexOf('video/')===0?'video':'photo',name:clean_(d.name,80)||'Anonymous',caption:clean_(d.caption,240),date:f.createdTime};
  });
  var result={items:items,nextPageToken:data.nextPageToken||null};
  if(!pageToken)cache.put('gallery-first',JSON.stringify(result),15);
  return result;
}
