/** Public photo interactions. JSON records remain private in the owner's Drive. */
function interactionPhoto_(id) {
  if(!/^[A-Za-z0-9_-]{10,100}$/.test(String(id)))throw new Error('Invalid photo.');
  var cache=CacheService.getScriptCache(),raw=cache.get('interaction-photo-ids');
  if(!raw){
    var response=UrlFetchApp.fetch('https://joshualucia.com/photos/wedding/manifest.json');
    if(response.getResponseCode()!==200)throw new Error('The photo album is temporarily unavailable.');
    raw=JSON.stringify(JSON.parse(response.getContentText()).photos.filter(function(p){return p.ok&&!p.hidden;}).map(function(p){return p.id;}));
    cache.put('interaction-photo-ids',raw,60);
  }
  if(JSON.parse(raw).indexOf(id)<0)throw new Error('This photo is no longer in the album.');
  return id;
}
function interactionClient_(clientId) {
  if(!/^[a-f0-9-]{36}$/i.test(String(clientId)))throw new Error('Please refresh the page and try again.');
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(clientId)).map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2);}).join('');
}
function interactionFolder_(create) {
  var props=PropertiesService.getScriptProperties(),id=props.getProperty('INTERACTIONS_FOLDER_ID');
  if(id)return DriveApp.getFolderById(id);
  if(!create)return null;
  var folder=DriveApp.getFolderById(folder_()).createFolder('Photo comments and hearts');
  props.setProperty('INTERACTIONS_FOLDER_ID',folder.getId());return folder;
}
function interactionRead_(name,fallback) {
  var folder=interactionFolder_(false);if(!folder)return fallback;
  var files=folder.getFilesByName(name);return files.hasNext()?JSON.parse(files.next().getBlob().getDataAsString()):fallback;
}
function interactionWrite_(name,value) {
  var folder=interactionFolder_(true),files=folder.getFilesByName(name),text=JSON.stringify(value);
  if(files.hasNext())files.next().setContent(text);else folder.createFile(name,text,'application/json');
}
function interactionMeter_(client,kind,perMinute,perDay) {
  var cache=CacheService.getScriptCache(),key='interaction-'+kind+'-'+client,minute=JSON.parse(cache.get(key)||'null'),now=Date.now();
  if(!minute||now-minute.start>=60000)minute={start:now,count:0};
  if(minute.count>=perMinute)throw new Error('Please wait a moment before trying again.');
  var props=PropertiesService.getScriptProperties(),day=Utilities.formatDate(new Date(),'UTC','yyyy-MM-dd'),meter=JSON.parse(props.getProperty('interaction-meter-'+kind)||'{}');
  if(meter.day!==day)meter={day:day,count:0};
  if(meter.count>=perDay)throw new Error('Please try again tomorrow.');
  minute.count++;meter.count++;cache.put(key,JSON.stringify(minute),60);props.setProperty('interaction-meter-'+kind,JSON.stringify(meter));
}
function listPhotoComments(photoId) {
  interactionPhoto_(photoId);var items=interactionRead_('comments-'+photoId+'.json',[]);
  return {items:items};
}
function addPhotoComment(photoId,meta) {
  interactionPhoto_(photoId);
  if(!meta||meta.website)throw new Error('Invalid comment.');
  var client=interactionClient_(meta.clientId),id=String(meta.requestId||''),text=String(meta.text||'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').trim();
  if(!/^[a-f0-9-]{36}$/i.test(id)||!text||text.length>1000)throw new Error('Please write a comment of up to 1,000 characters.');
  var lock=LockService.getScriptLock();lock.waitLock(20000);
  try {
    var name='comments-'+photoId+'.json',items=interactionRead_(name,[]),existing=items.filter(function(item){return item.id===id;})[0];
    if(existing)return existing;
    if(items.length>=200)throw new Error('This photo has reached its comment limit.');
    interactionMeter_(client,'comments',5,2500);
    var item={id:id,name:clean_(meta.name,80)||'Anonymous',text:text,date:new Date().toISOString()};
    items.push(item);interactionWrite_(name,items);return item;
  }finally{lock.releaseLock();}
}
function heartSummary_(hearts,client) {
  var counts={},liked=[];
  Object.keys(hearts).forEach(function(photoId){var voters=hearts[photoId];counts[photoId]=Object.keys(voters).length;if(voters[client])liked.push(photoId);});
  return {counts:counts,liked:liked};
}
function listPhotoHearts(clientId) {
  var client=interactionClient_(clientId);return heartSummary_(interactionRead_('hearts.json',{}),client);
}
function setPhotoHeart(photoId,clientId,wanted) {
  interactionPhoto_(photoId);var client=interactionClient_(clientId);
  if(typeof wanted!=='boolean')throw new Error('Invalid heart.');
  var lock=LockService.getScriptLock();lock.waitLock(20000);
  try {
    var hearts=interactionRead_('hearts.json',{}),voters=hearts[photoId]||{};
    if(!!voters[client]!==wanted){
      interactionMeter_(client,'hearts',30,10000);
      if(wanted)voters[client]=true;else delete voters[client];
      if(Object.keys(voters).length)hearts[photoId]=voters;else delete hearts[photoId];
      interactionWrite_('hearts.json',hearts);
    }
    return {count:Object.keys(voters).length,liked:!!voters[client]};
  }finally{lock.releaseLock();}
}
