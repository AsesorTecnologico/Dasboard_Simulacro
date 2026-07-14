/**
 * CONECTOR GOOGLE SHEETS - SISTEMA DE EVALUACION
 * 1. Abra el archivo como Google Sheets.
 * 2. Extensiones > Apps Script.
 * 3. Pegue este codigo.
 * 4. Implementar > Nueva implementacion > Aplicacion web.
 * 5. Ejecutar como: usted. Acceso: usuarios autorizados o cualquiera con el enlace.
 * 6. Copie la URL /exec en GOOGLE_SHEETS_WEB_APP_URL de app.js o use configurarUrlGoogleSheets(url).
 */

const SHEETS = {
  usuarios: 'Usuarios',
  preguntas: 'Preguntas',
  rangosGrado: 'Rangos_Grado',
  rangosCurso: 'Rangos_Curso',
  estudiantes: 'Estudiantes',
  notas: 'Notas',
  resultados: 'Resultados',
  alertas: 'Alertas',
  json: 'Datos_Sistema'
};



function configurarSistema() {
  const estructura = {
    Usuarios: ['ID_USUARIO','USUARIO','CONTRASENA','PERFIL','SEDE','ACTIVO','FECHA_ACTUALIZACION'],
    Preguntas: ['ID_PREGUNTA','GRADO','PREG','CURSO','COMPETENCIA','CLAVE','PESO','ACTIVO'],
    Rangos_Grado: ['GRADO','NIVEL','DESDE','HASTA','ORDEN'],
    Rangos_Curso: ['GRADO','CURSO','MAXIMO','AD_DESDE','A_DESDE','B_DESDE','C_DESDE'],
    Estudiantes: ['ID_ESTUDIANTE','SEDE','GRADO','SECCION','NOMBRE_COMPLETO','ACTIVO','FECHA_CARGA'],
    Notas: ['ID_NOTA','SEDE','GRADO','SECCION','PERIODO','ID_ESTUDIANTE','NOMBRE_COMPLETO','PREG','CURSO','RESPUESTA','PESO','PUNTAJE','FECHA_REGISTRO'],
    Resultados: ['ID_RESULTADO','SEDE','GRADO','SECCION','PERIODO','ID_ESTUDIANTE','NOMBRE_COMPLETO','PUNTAJE_TOTAL','PROMEDIO_GENERAL','NIVEL_GENERAL','FECHA_CALCULO'],
    Alertas: ['ID_ALERTA','SEDE','GRADO','SECCION','PERIODO','ID_ESTUDIANTE','NOMBRE_COMPLETO','TIPO_ALERTA','MENSAJE','FECHA_ALERTA'],
    Datos_Sistema: ['CLAVE','TIPO','PARTE','TOTAL_PARTES','JSON_FRAGMENTO','FECHA_ACTUALIZACION']
  };

  Object.keys(estructura).forEach(nombre => {
    const sh = getOrCreateSheet(nombre, estructura[nombre]);
    sh.setFrozenRows(1);
    sh.getRange(1,1,1,estructura[nombre].length)
      .setFontWeight('bold')
      .setBackground('#15324B')
      .setFontColor('#FFFFFF');
    sh.autoResizeColumns(1, estructura[nombre].length);
  });

  return {ok:true, spreadsheetId:SPREADSHEET_ID, spreadsheetUrl:ss().getUrl()};
}

function probarConexion() {
  const libro = ss();
  return {
    ok: true,
    nombre: libro.getName(),
    id: libro.getId(),
    url: libro.getUrl(),
    fecha: new Date().toISOString()
  };
}

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'snapshot';
    let data;
    if (action === 'snapshot') data = buildSnapshot();
    else if (action === 'ping') data = probarConexion();
    else if (action === 'setup') data = configurarSistema();
    else if (action === 'verifyItem') data = verifyStoredItem(String(e.parameter.key || ''));
    else if (action === 'deleteStudents') {
      const payload = JSON.parse((e.parameter && e.parameter.payload) || '{}');
      data = Object.assign({ok:true}, deleteStudentsFromSystem(payload));
    }
    else if (action === 'updateStudent') {
      const payload = JSON.parse((e.parameter && e.parameter.payload) || '{}');
      data = Object.assign({ok:true}, updateStudentInSystem(payload));
    }
    else data = {ok:false,error:'Accion GET no reconocida'};
    const callback=e&&e.parameter&&e.parameter.callback;
    return callback?jsonpResponse(callback,data):jsonResponse(data);
  } catch(err) {
    const data={ok:false,error:String(err&&err.message||err)};
    const callback=e&&e.parameter&&e.parameter.callback;
    return callback?jsonpResponse(callback,data):jsonResponse(data);
  }
}

function doPost(e) {
  const lock=LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    let raw=(e&&e.postData&&e.postData.contents)||'';
    if(e&&e.parameter&&e.parameter.payload)raw=e.parameter.payload;
    const body=JSON.parse(raw||'{}');
    let result;
    if(body.action==='setItem'){
      saveLocalStorageItem(body.key,body.value);
      result={ok:true,key:body.key};
    }else if(body.action==='bulkSync'){
      Object.keys(body.items||{}).forEach(key=>saveLocalStorageItem(key,body.items[key]));
      result={ok:true,synced:Object.keys(body.items||{}).length};
    }else if(body.action==='bulkStudents'){
      const items=body.items||{};
      Object.keys(items).forEach(key=>saveLocalStorageItem(key,items[key]));
      result={ok:true,synced:Object.keys(items).length,action:'bulkStudents'};
    }else if(body.action==='deleteItem'){
      deleteSystemItem(body.key);
      result={ok:true,deleted:body.key};
    }else if(body.action==='deleteStudents'){
      result=Object.assign({ok:true},deleteStudentsFromSystem(body));
    }else if(body.action==='updateStudent'){
      result=Object.assign({ok:true},updateStudentInSystem(body));
    }else result={ok:false,error:'Accion POST no reconocida'};
    SpreadsheetApp.flush();
    return jsonResponse(result);
  }catch(err){
    return jsonResponse({ok:false,error:String(err&&err.message||err)});
  }finally{
    try{lock.releaseLock()}catch(_){}
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonpResponse(callback, data) {
  const safeCallback = String(callback || '').replace(/[^a-zA-Z0-9_.$]/g, '');
  return ContentService.createTextOutput(safeCallback + '(' + JSON.stringify(data) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

const SPREADSHEET_ID = '1nKwAcJ7xsg8TA8TraNTUebRcZM1_QtYbfGG580sOd98';

function ss() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getOrCreateSheet(name, headers) {
  let sh = ss().getSheetByName(name);
  if (!sh) sh = ss().insertSheet(name);
  if (headers && sh.getLastRow() === 0) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  return sh;
}

function saveLocalStorageItem(key, rawValue) {
  const value = typeof rawValue === 'string' ? rawValue : JSON.stringify(rawValue);
  saveJsonBackup(key, value);

  let parsed;
  try { parsed = JSON.parse(value); } catch (_) { return; }

  if (key === 'usuariosSistema') return saveUsuarios(parsed);
  if (key === 'preguntasPorGrado') return savePreguntas(parsed);
  if (key === 'rangosGrado') return saveRangosGrado(parsed);
  if (key === 'rangosCurso') return saveRangosCurso(parsed);
  if (key.indexOf('notas_') === 0) return saveRegistroNotas(key, parsed);
}

function ensureJsonSheet() {
  const headers=['CLAVE','TIPO','PARTE','TOTAL_PARTES','JSON_FRAGMENTO','FECHA_ACTUALIZACION'];
  let sh=ss().getSheetByName(SHEETS.json);
  if(!sh)sh=ss().insertSheet(SHEETS.json);
  const current=sh.getLastColumn()?sh.getRange(1,1,1,Math.max(sh.getLastColumn(),1)).getValues()[0]:[];
  if(String(current[2]||'')==='JSON'){
    const old=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,4).getValues():[];
    sh.clearContents();
    sh.getRange(1,1,1,headers.length).setValues([headers]);
    const rows=[];
    old.forEach(r=>{
      if(!r[0])return;
      const text=String(r[2]||'');
      const chunks=splitJsonChunks_(text);
      chunks.forEach((chunk,i)=>rows.push([r[0],r[1]||'',i+1,chunks.length,chunk,r[3]||new Date()]));
    });
    if(rows.length)sh.getRange(2,1,rows.length,headers.length).setValues(rows);
  }else if(sh.getLastRow()===0||String(current[0]||'')!=='CLAVE'){
    sh.clearContents();
    sh.getRange(1,1,1,headers.length).setValues([headers]);
  }
  return sh;
}

function splitJsonChunks_(text){
  const size=40000, chunks=[];
  text=String(text||'');
  if(!text.length)return [''];
  for(let i=0;i<text.length;i+=size)chunks.push(text.substring(i,i+size));
  return chunks;
}

function saveJsonBackup(key,value){
  const sh=ensureJsonSheet();
  deleteJsonRowsByKey_(sh,key);
  const tipo=String(key).indexOf('notas_')===0?'REGISTRO_NOTAS':String(key);
  const chunks=splitJsonChunks_(value);
  const rows=chunks.map((chunk,i)=>[key,tipo,i+1,chunks.length,chunk,new Date()]);
  sh.getRange(sh.getLastRow()+1,1,rows.length,6).setValues(rows);
}

function deleteJsonRowsByKey_(sh,key){
  if(sh.getLastRow()<2)return;
  const keys=sh.getRange(2,1,sh.getLastRow()-1,1).getValues();
  for(let i=keys.length-1;i>=0;i--)if(String(keys[i][0])===String(key))sh.deleteRow(i+2);
}

function getStoredItem(key){
  const sh=ensureJsonSheet();
  if(sh.getLastRow()<2)return null;
  const data=sh.getRange(2,1,sh.getLastRow()-1,6).getValues();
  const rows=data.filter(r=>String(r[0])===String(key)).sort((a,b)=>Number(a[2])-Number(b[2]));
  if(!rows.length)return null;
  return rows.map(r=>String(r[4]||'')).join('');
}

function fnv1aHash_(text){
  let hash=0x811c9dc5;
  text=String(text||'');
  for(let i=0;i<text.length;i++){
    hash^=text.charCodeAt(i);
    hash=Math.imul(hash,0x01000193);
  }
  return ('00000000'+(hash>>>0).toString(16)).slice(-8);
}

function verifyStoredItem(key){
  const value=getStoredItem(key);
  return value===null
    ? {ok:true,exists:false,key:key}
    : {ok:true,exists:true,key:key,length:value.length,hash:fnv1aHash_(value)};
}

function saveUsuarios(users) {
  const headers = ['ID_USUARIO','USUARIO','CONTRASENA','PERFIL','SEDE','ACTIVO','FECHA_ACTUALIZACION'];
  const sh = getOrCreateSheet(SHEETS.usuarios, headers);
  sh.clearContents();
  sh.getRange(1,1,1,headers.length).setValues([headers]);
  const rows = (users || []).map((u, i) => [
    'USR-' + String(i + 1).padStart(3, '0'), u.usuario || '', u.password || '',
    u.perfil === 'general' ? 'Administrador Academico' : (u.perfil || ''),
    u.sede || 'TODAS', 'SI', new Date()
  ]);
  if (rows.length) sh.getRange(2,1,rows.length,headers.length).setValues(rows);
}

function savePreguntas(data) {
  const headers = ['ID_PREGUNTA','GRADO','PREG','CURSO','COMPETENCIA','CLAVE','PESO','ACTIVO'];
  const sh = getOrCreateSheet(SHEETS.preguntas, headers);
  sh.clearContents();
  sh.getRange(1,1,1,headers.length).setValues([headers]);
  const rows = [];
  Object.keys(data || {}).forEach(grado => {
    (data[grado] || []).forEach(q => rows.push([
      grado + '-' + String(q.preg).padStart(3,'0'), grado, q.preg, q.curso,
      q.competencia || '', q.clave || '', Number(q.peso || 1), 'SI'
    ]));
  });
  if (rows.length) sh.getRange(2,1,rows.length,headers.length).setValues(rows);
}

function saveRangosGrado(data) {
  const headers = ['GRADO','NIVEL','DESDE','HASTA','ORDEN'];
  const sh = getOrCreateSheet(SHEETS.rangosGrado, headers);
  sh.clearContents();
  sh.getRange(1,1,1,headers.length).setValues([headers]);
  const rows = [];
  const order = {AD:4,A:3,B:2,C:1};
  Object.keys(data || {}).forEach(grado => {
    ['AD','A','B','C'].forEach(nivel => {
      const r = data[grado] && data[grado][nivel];
      if (r) rows.push([grado,nivel,Number(r.d),Number(r.h),order[nivel]]);
    });
  });
  if (rows.length) sh.getRange(2,1,rows.length,headers.length).setValues(rows);
}

function saveRangosCurso(data) {
  const headers = ['GRADO','CURSO','MAXIMO','AD_DESDE','A_DESDE','B_DESDE','C_DESDE'];
  const sh = getOrCreateSheet(SHEETS.rangosCurso, headers);
  sh.clearContents();
  sh.getRange(1,1,1,headers.length).setValues([headers]);
  const rows = [];
  Object.keys(data || {}).forEach(grado => {
    Object.keys(data[grado] || {}).forEach(curso => {
      const r = data[grado][curso];
      rows.push([grado,curso,'',Number(r.AD),Number(r.A),Number(r.B),Number(r.C)]);
    });
  });
  if (rows.length) sh.getRange(2,1,rows.length,headers.length).setValues(rows);
}

function saveRegistroNotas(key, registro) {
  if (!registro || !registro.sede) return;
  const ctx = [registro.sede, registro.grado, registro.seccion, registro.periodo];
  const estudiantesHeaders = ['ID_ESTUDIANTE','SEDE','GRADO','SECCION','NOMBRE_COMPLETO','ACTIVO','FECHA_CARGA'];
  const notasHeaders = ['ID_NOTA','SEDE','GRADO','SECCION','PERIODO','ID_ESTUDIANTE','NOMBRE_COMPLETO','PREG','CURSO','RESPUESTA','PESO','PUNTAJE','FECHA_REGISTRO'];
  const resultadosHeaders = ['ID_RESULTADO','SEDE','GRADO','SECCION','PERIODO','ID_ESTUDIANTE','NOMBRE_COMPLETO','PUNTAJE_TOTAL','PROMEDIO_GENERAL','NIVEL_GENERAL','FECHA_CALCULO'];

  const shE = getOrCreateSheet(SHEETS.estudiantes, estudiantesHeaders);
  const shN = getOrCreateSheet(SHEETS.notas, notasHeaders);
  const shR = getOrCreateSheet(SHEETS.resultados, resultadosHeaders);

  deleteRowsByContext(shN, 2, ctx, [2,3,4,5]);
  deleteRowsByContext(shR, 2, ctx, [2,3,4,5]);

  const studentRows = [];
  const noteRows = [];
  const resultRows = [];
  const questions = getQuestionsForGrade(registro.grado);
  const qMap = {};
  questions.forEach(q => qMap[String(q.curso) + '_' + String(q.preg)] = q);

  (registro.alumnos || []).forEach((a, i) => {
    const studentId = makeStudentId(registro.sede, registro.grado, registro.seccion, a.nombre);
    studentRows.push([studentId, registro.sede, registro.grado, registro.seccion, a.nombre, 'SI', new Date()]);

    Object.keys(a.respuestas || {}).forEach(respKey => {
      const q = qMap[respKey] || {};
      const raw = String(a.respuestas[respKey]);
      const score = raw === '1' ? Number(q.peso || 1) : 0;
      noteRows.push([
        key + '-' + studentId + '-' + respKey, registro.sede, registro.grado, registro.seccion,
        registro.periodo, studentId, a.nombre, q.preg || '', q.curso || respKey.split('_')[0],
        raw === '1' ? 'CORRECTA' : 'INCORRECTA', Number(q.peso || 1), score, new Date()
      ]);
    });

    resultRows.push([
      key + '-' + studentId, registro.sede, registro.grado, registro.seccion, registro.periodo,
      studentId, a.nombre, Number(a.total || 0), Number(a.promedio || 0), a.nivelFinal || '', new Date()
    ]);
  });

  upsertStudents(shE, studentRows);
  if (noteRows.length) shN.getRange(shN.getLastRow()+1,1,noteRows.length,notasHeaders.length).setValues(noteRows);
  if (resultRows.length) shR.getRange(shR.getLastRow()+1,1,resultRows.length,resultadosHeaders.length).setValues(resultRows);
}

function getQuestionsForGrade(grado) {
  const sh = getOrCreateSheet(SHEETS.preguntas, ['ID_PREGUNTA','GRADO','PREG','CURSO','COMPETENCIA','CLAVE','PESO','ACTIVO']);
  const data = sh.getDataRange().getValues();
  return data.slice(1).filter(r => String(r[1]) === String(grado)).map(r => ({preg:r[2],curso:r[3],competencia:r[4],clave:r[5],peso:r[6]}));
}

function deleteRowsByContext(sh, startRow, ctx, cols) {
  if (sh.getLastRow() < startRow) return;
  const data = sh.getRange(startRow,1,sh.getLastRow()-startRow+1,sh.getLastColumn()).getValues();
  for (let i=data.length-1; i>=0; i--) {
    const match = cols.every((col, j) => String(data[i][col-1]) === String(ctx[j]));
    if (match) sh.deleteRow(startRow+i);
  }
}

function upsertStudents(sh, rows) {
  const data = sh.getDataRange().getValues();
  const ids = {};
  for (let i=1;i<data.length;i++) ids[String(data[i][0])] = i+1;
  rows.forEach(r => {
    if (ids[r[0]]) sh.getRange(ids[r[0]],1,1,r.length).setValues([r]);
    else sh.getRange(sh.getLastRow()+1,1,1,r.length).setValues([r]);
  });
}

function makeStudentId(sede, grado, seccion, nombre) {
  const text = [sede,grado,seccion,nombre].join('|').toUpperCase();
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, text);
  return 'EST-' + bytes.map(b => ('0' + ((b + 256) % 256).toString(16)).slice(-2)).join('').slice(0,12).toUpperCase();
}

function deleteSystemItem(key) {
  const sh=ensureJsonSheet();
  deleteJsonRowsByKey_(sh,key);
  if(String(key).indexOf('notas_')===0){
    const parts=String(key).substring(6).split('_');
    // La eliminación normalizada se realiza mediante operaciones administrativas cuando aplica.
  }
}

function buildSnapshot() {
  const backupItems = readJsonBackupItems_();
  const normalized = buildNormalizedItems_();
  const items = Object.assign({}, backupItems, normalized.items);
  return {ok:true,items:items,sources:normalized.sources,itemCount:Object.keys(items).length,timestamp:new Date().toISOString()};
}

function readJsonBackupItems_() {
  const sh=ensureJsonSheet(),items={};
  if(sh.getLastRow()<2)return items;
  const data=sh.getRange(2,1,sh.getLastRow()-1,6).getValues(),grouped={};
  data.forEach(r=>{const key=String(r[0]||'').trim();if(!key)return;if(!grouped[key])grouped[key]=[];grouped[key].push({part:Number(r[2]||0),fragment:String(r[4]||'')});});
  Object.keys(grouped).forEach(key=>items[key]=grouped[key].sort((a,b)=>a.part-b.part).map(x=>x.fragment).join(''));
  return items;
}

function buildNormalizedItems_() {
  const items={},sources={};
  const users=readUsersFromSheet_();if(users.found){items.usuariosSistema=JSON.stringify(users.value);sources.usuariosSistema=users.sheet;}
  const questions=readQuestionsFromSheet_();if(questions.found){items.preguntasPorGrado=JSON.stringify(questions.value);sources.preguntasPorGrado=questions.sheet;}
  const gradeRanges=readGradeRangesFromSheet_();if(gradeRanges.found){items.rangosGrado=JSON.stringify(gradeRanges.value);sources.rangosGrado=gradeRanges.sheet;}
  const courseRanges=readCourseRangesFromSheet_();if(courseRanges.found){items.rangosCurso=JSON.stringify(courseRanges.value);sources.rangosCurso=courseRanges.sheet;}
  const records=readEvaluationRecordsFromSheets_();
  Object.keys(records.value).forEach(key=>{items[key]=JSON.stringify(records.value[key]);sources[key]=records.sources.join(', ');});
  return {items:items,sources:sources};
}

function normalizeHeader_(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim().replace(/[^A-Z0-9]+/g,'_').replace(/^_|_$/g,'');}
function readTableByAliases_(aliases){for(let i=0;i<aliases.length;i++){const sh=ss().getSheetByName(aliases[i]);if(!sh||sh.getLastRow()<1||sh.getLastColumn()<1)continue;const values=sh.getDataRange().getValues();if(!values.length)continue;const headers=values[0].map(normalizeHeader_),map={};headers.forEach((h,idx)=>{if(h&&map[h]===undefined)map[h]=idx;});return {found:values.length>1,sheet:sh.getName(),headers:headers,map:map,rows:values.slice(1)};}return {found:false,sheet:'',headers:[],map:{},rows:[]};}
function cellByNames_(table,row,names,fallback){for(let i=0;i<names.length;i++){const idx=table.map[normalizeHeader_(names[i])];if(idx!==undefined)return row[idx];}return fallback;}
function isActiveRow_(table,row){const norm=normalizeHeader_(cellByNames_(table,row,['ACTIVO','ESTADO'],'SI'));return !['NO','INACTIVO','FALSO','FALSE','0','ELIMINADO'].includes(norm);}

function readUsersFromSheet_(){const t=readTableByAliases_(['Usuarios','USUARIOS']);if(!t.found)return {found:false,value:[],sheet:t.sheet};const value=[];t.rows.forEach(row=>{if(!isActiveRow_(t,row))return;const usuario=String(cellByNames_(t,row,['USUARIO','USERNAME'],'')||'').trim(),password=String(cellByNames_(t,row,['CONTRASENA','CONTRASEÑA','PASSWORD','CLAVE'],'')||'').trim();if(!usuario||!password)return;const raw=normalizeHeader_(cellByNames_(t,row,['PERFIL','ROL'],'SEDE'));let perfil='sede';if(raw.indexOf('ACADEM')>=0||raw==='GENERAL')perfil='general';else if(raw.indexOf('ADMIN')>=0)perfil='admin';const sede=perfil==='sede'?String(cellByNames_(t,row,['SEDE','SEDE_ASIGNADA'],'')||'').trim():'TODAS';value.push({usuario:usuario,password:password,perfil:perfil,sede:sede||'TODAS'});});return {found:value.length>0,value:value,sheet:t.sheet};}
function readQuestionsFromSheet_(){const t=readTableByAliases_(['Preguntas','Configuración_Preguntas','Configuracion_Preguntas','Banco_Preguntas']);if(!t.found)return {found:false,value:{},sheet:t.sheet};const value={};t.rows.forEach(row=>{if(!isActiveRow_(t,row))return;const grado=String(cellByNames_(t,row,['GRADO'],'')||'').trim(),curso=String(cellByNames_(t,row,['CURSO','ASIGNATURA'],'')||'').trim(),preg=Number(cellByNames_(t,row,['PREG','PREGUNTA','NRO_PREGUNTA'],0));if(!grado||!curso||!preg)return;if(!value[grado])value[grado]=[];value[grado].push({preg:preg,curso:curso,competencia:String(cellByNames_(t,row,['COMPETENCIA'],'')||'').trim(),clave:String(cellByNames_(t,row,['CLAVE','RESPUESTA'],'')||'').trim(),peso:Number(cellByNames_(t,row,['PESO','PUNTAJE'],1))||1});});Object.keys(value).forEach(g=>value[g].sort((a,b)=>a.preg-b.preg));return {found:Object.keys(value).length>0,value:value,sheet:t.sheet};}
function readGradeRangesFromSheet_(){const t=readTableByAliases_(['Rangos_Grado','Rangos Grado']);if(!t.found)return {found:false,value:{},sheet:t.sheet};const value={};t.rows.forEach(row=>{const grado=String(cellByNames_(t,row,['GRADO'],'')||'').trim(),nivel=String(cellByNames_(t,row,['NIVEL','NIVEL_LOGRO'],'')||'').trim().toUpperCase();if(!grado||!['AD','A','B','C'].includes(nivel))return;if(!value[grado])value[grado]={};value[grado][nivel]={d:Number(cellByNames_(t,row,['DESDE','MINIMO'],0))||0,h:Number(cellByNames_(t,row,['HASTA','MAXIMO'],0))||0};});return {found:Object.keys(value).length>0,value:value,sheet:t.sheet};}
function readCourseRangesFromSheet_(){const t=readTableByAliases_(['Rangos_Curso','Rangos Curso']);if(!t.found)return {found:false,value:{},sheet:t.sheet};const value={};t.rows.forEach(row=>{const grado=String(cellByNames_(t,row,['GRADO'],'')||'').trim(),curso=String(cellByNames_(t,row,['CURSO'],'')||'').trim();if(!grado||!curso)return;if(!value[grado])value[grado]={};value[grado][curso]={AD:Number(cellByNames_(t,row,['AD_DESDE','AD'],0))||0,A:Number(cellByNames_(t,row,['A_DESDE','A'],0))||0,B:Number(cellByNames_(t,row,['B_DESDE','B'],0))||0,C:Number(cellByNames_(t,row,['C_DESDE','C'],0))||0};});return {found:Object.keys(value).length>0,value:value,sheet:t.sheet};}
function normalizePeriod_(value){const text=String(value||'').trim(),norm=normalizeHeader_(text);if(norm.indexOf('1')>=0)return '1.er Bimestre';if(norm.indexOf('2')>=0)return '2.º Bimestre';if(norm.indexOf('3')>=0)return '3.er Bimestre';if(norm.indexOf('4')>=0)return '4.º Bimestre';return text||'1.er Bimestre';}
function contextKey_(sede,grado,seccion,periodo){return 'notas_'+[sede,grado,seccion,normalizePeriod_(periodo)].join('_');}
function getOrCreateRecord_(records,sede,grado,seccion,periodo){const key=contextKey_(sede,grado,seccion,periodo);if(!records[key])records[key]={sede:sede,grado:grado,seccion:seccion,periodo:normalizePeriod_(periodo),alumnos:[],fecha:new Date().toISOString()};return {key:key,record:records[key]};}
function getOrCreateStudent_(record,id,name){const normalizedName=String(name||'').trim();let student=record.alumnos.find(a=>(id&&String(a.id||'')===String(id))||normalizeStudentName_(a.nombre)===normalizeStudentName_(normalizedName));if(!student){student={id:id||'',nombre:normalizedName,respuestas:{},total:0,promedio:0,nivelFinal:''};record.alumnos.push(student);}return student;}
function readEvaluationRecordsFromSheets_(){const records={},sourceNames=[],evaluations=readTableByAliases_(['Evaluaciones','EVALUACIONES']),students=readTableByAliases_(['Estudiantes','ESTUDIANTES']),notes=readTableByAliases_(['Notas','Respuestas','RESPUESTAS']),results=readTableByAliases_(['Resultados','Resultados_Generales','RESULTADOS_GENERALES']);[evaluations,students,notes,results].forEach(t=>{if(t.found&&t.sheet)sourceNames.push(t.sheet);});
 evaluations.rows.forEach(row=>{const sede=String(cellByNames_(evaluations,row,['SEDE'],'')||'').trim(),grado=String(cellByNames_(evaluations,row,['GRADO'],'')||'').trim(),seccion=String(cellByNames_(evaluations,row,['SECCION','SECCIÓN'],'')||'').trim(),periodo=cellByNames_(evaluations,row,['PERIODO','BIMESTRE'],'1.er Bimestre');if(sede&&grado&&seccion)getOrCreateRecord_(records,sede,grado,seccion,periodo);});
 results.rows.forEach(row=>{const sede=String(cellByNames_(results,row,['SEDE'],'')||'').trim(),grado=String(cellByNames_(results,row,['GRADO'],'')||'').trim(),seccion=String(cellByNames_(results,row,['SECCION','SECCIÓN'],'')||'').trim(),periodo=cellByNames_(results,row,['PERIODO','BIMESTRE'],'1.er Bimestre'),id=String(cellByNames_(results,row,['ID_ESTUDIANTE','CODIGO','ID'],'')||'').trim(),name=String(cellByNames_(results,row,['NOMBRE_COMPLETO','ALUMNO','ESTUDIANTE'],'')||'').trim();if(!sede||!grado||!seccion||!name)return;const a=getOrCreateStudent_(getOrCreateRecord_(records,sede,grado,seccion,periodo).record,id,name);a.total=Number(cellByNames_(results,row,['PUNTAJE_TOTAL','TOTAL'],0))||0;a.promedio=Number(cellByNames_(results,row,['PROMEDIO_GENERAL','PROMEDIO','NOTA'],0))||0;a.nivelFinal=String(cellByNames_(results,row,['NIVEL_GENERAL','NIVEL'],'')||'').trim().toUpperCase();});
 notes.rows.forEach(row=>{const sede=String(cellByNames_(notes,row,['SEDE'],'')||'').trim(),grado=String(cellByNames_(notes,row,['GRADO'],'')||'').trim(),seccion=String(cellByNames_(notes,row,['SECCION','SECCIÓN'],'')||'').trim(),periodo=cellByNames_(notes,row,['PERIODO','BIMESTRE'],'1.er Bimestre'),id=String(cellByNames_(notes,row,['ID_ESTUDIANTE','CODIGO','ID'],'')||'').trim(),name=String(cellByNames_(notes,row,['NOMBRE_COMPLETO','ALUMNO','ESTUDIANTE'],'')||'').trim(),curso=String(cellByNames_(notes,row,['CURSO','ASIGNATURA'],'')||'').trim(),preg=String(cellByNames_(notes,row,['PREG','PREGUNTA'],'')||'').trim();if(!sede||!grado||!seccion||!name||!curso||!preg)return;const a=getOrCreateStudent_(getOrCreateRecord_(records,sede,grado,seccion,periodo).record,id,name),raw=normalizeHeader_(cellByNames_(notes,row,['RESPUESTA','CORRECTA','VALOR'],'')),score=Number(cellByNames_(notes,row,['PUNTAJE'],0))||0;a.respuestas[curso+'_'+preg]=['1','SI','TRUE','CORRECTA','CORRECTO','OK'].includes(raw)||score>0?'1':'0';});
 students.rows.forEach(row=>{if(!isActiveRow_(students,row))return;const sede=String(cellByNames_(students,row,['SEDE'],'')||'').trim(),grado=String(cellByNames_(students,row,['GRADO'],'')||'').trim(),seccion=String(cellByNames_(students,row,['SECCION','SECCIÓN'],'')||'').trim(),periodoRaw=cellByNames_(students,row,['PERIODO','BIMESTRE'],''),id=String(cellByNames_(students,row,['ID_ESTUDIANTE','CODIGO','ID'],'')||'').trim(),name=String(cellByNames_(students,row,['NOMBRE_COMPLETO','ALUMNO','ESTUDIANTE'],'')||'').trim();if(!sede||!grado||!seccion||!name)return;let targets=[];if(String(periodoRaw||'').trim())targets=[getOrCreateRecord_(records,sede,grado,seccion,periodoRaw).record];else{targets=Object.keys(records).map(k=>records[k]).filter(r=>r.sede===sede&&r.grado===grado&&r.seccion===seccion);if(!targets.length)targets=[getOrCreateRecord_(records,sede,grado,seccion,'1.er Bimestre').record];}targets.forEach(record=>getOrCreateStudent_(record,id,name));});
 Object.keys(records).forEach(key=>records[key].alumnos.sort((a,b)=>a.nombre.localeCompare(b.nombre,'es')));return {value:records,sources:sourceNames};}



/** Elimina alumnos, notas y resultados desde el perfil Administrador. */
function deleteStudentsFromSystem(body) {
  const sede = String(body.sede || '');
  const grado = String(body.grado || '');
  const seccion = String(body.seccion || '');
  const periodo = String(body.periodo || '');
  const alcance = String(body.alcance || 'PERIODO');
  const nombres = (body.nombres || []).map(normalizeStudentName_);
  if (!sede || !grado || !seccion || !nombres.length) throw new Error('Datos insuficientes para eliminar alumnos.');

  const nombreSet = {};
  nombres.forEach(n => nombreSet[n] = true);
  let notas = 0, resultados = 0, estudiantes = 0, jsonActualizados = 0;

  notas += deleteStudentRows_(getOrCreateSheet(SHEETS.notas, []), sede, grado, seccion, periodo, alcance, nombreSet, 2, 3, 4, 5, 7);
  resultados += deleteStudentRows_(getOrCreateSheet(SHEETS.resultados, []), sede, grado, seccion, periodo, alcance, nombreSet, 2, 3, 4, 5, 7);

  if (alcance === 'AULA_COMPLETA') {
    estudiantes += deleteStudentRows_(getOrCreateSheet(SHEETS.estudiantes, []), sede, grado, seccion, '', alcance, nombreSet, 2, 3, 4, 0, 5);
  } else {
    estudiantes += removeStudentsWithoutResults_(sede, grado, seccion, nombreSet);
  }

  const snapshot=buildSnapshot().items;
  Object.keys(snapshot).filter(key=>key.indexOf('notas_')===0).forEach(key=>{
    try{
      const registro=JSON.parse(snapshot[key]||'{}');
      const coincide=registro.sede===sede&&registro.grado===grado&&registro.seccion===seccion&&
        (alcance==='AULA_COMPLETA'||registro.periodo===periodo);
      if(!coincide)return;
      registro.alumnos=(registro.alumnos||[]).filter(a=>!nombreSet[normalizeStudentName_(a.nombre)]);
      saveJsonBackup(key,JSON.stringify(registro));
      jsonActualizados++;
    }catch(_){}
  });

  return {deletedStudents: estudiantes, deletedNotes: notas, deletedResults: resultados, updatedRecords: jsonActualizados};
}


/** Actualiza el nombre de un alumno en todos los bimestres del aula. */
function updateStudentInSystem(body) {
  const sede = String(body.sede || '');
  const grado = String(body.grado || '');
  const seccion = String(body.seccion || '');
  const nombreActual = String(body.nombreActual || '').trim();
  const nuevoNombre = String(body.nuevoNombre || '').trim();
  if (!sede || !grado || !seccion || !nombreActual || !nuevoNombre) {
    throw new Error('Datos insuficientes para actualizar el alumno.');
  }

  const oldNorm = normalizeStudentName_(nombreActual);
  let estudiantes = 0, notas = 0, resultados = 0, jsonActualizados = 0;
  estudiantes += renameStudentRows_(getOrCreateSheet(SHEETS.estudiantes, []), sede, grado, seccion, oldNorm, nuevoNombre, 2,3,4,5,1);
  notas += renameStudentRows_(getOrCreateSheet(SHEETS.notas, []), sede, grado, seccion, oldNorm, nuevoNombre, 2,3,4,7,6);
  resultados += renameStudentRows_(getOrCreateSheet(SHEETS.resultados, []), sede, grado, seccion, oldNorm, nuevoNombre, 2,3,4,7,6);

  const snapshot=buildSnapshot().items;
  Object.keys(snapshot).filter(key=>key.indexOf('notas_')===0).forEach(key=>{
    try{
      const registro=JSON.parse(snapshot[key]||'{}');
      if(registro.sede!==sede||registro.grado!==grado||registro.seccion!==seccion)return;
      let changed=false;
      (registro.alumnos||[]).forEach(a=>{
        if(normalizeStudentName_(a.nombre)===oldNorm){a.nombre=nuevoNombre;changed=true;}
      });
      if(changed){saveJsonBackup(key,JSON.stringify(registro));jsonActualizados++;}
    }catch(_){}
  });
  return {updatedStudents:estudiantes,updatedNotes:notas,updatedResults:resultados,updatedRecords:jsonActualizados};
}

function renameStudentRows_(sh,sede,grado,seccion,oldNorm,nuevoNombre,colSede,colGrado,colSeccion,colNombre,colId){
  if (!sh || sh.getLastRow()<2) return 0;
  const range=sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn());
  const values=range.getValues();
  let count=0;
  for (let i=0;i<values.length;i++) {
    const row=values[i];
    if (String(row[colSede-1])!==sede || String(row[colGrado-1])!==grado || String(row[colSeccion-1])!==seccion) continue;
    if (normalizeStudentName_(row[colNombre-1])!==oldNorm) continue;
    row[colNombre-1]=nuevoNombre;
    if (colId) row[colId-1]=makeStudentId(sede,grado,seccion,nuevoNombre);
    count++;
  }
  if (count) range.setValues(values);
  return count;
}

function normalizeStudentName_(value) {
  return String(value || '').trim().toLowerCase();
}

function deleteStudentRows_(sh, sede, grado, seccion, periodo, alcance, nombreSet, colSede, colGrado, colSeccion, colPeriodo, colNombre) {
  if (!sh || sh.getLastRow() < 2) return 0;
  const values = sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).getValues();
  let count = 0;
  for (let i = values.length - 1; i >= 0; i--) {
    const row = values[i];
    const coincideContexto = String(row[colSede-1]) === sede && String(row[colGrado-1]) === grado && String(row[colSeccion-1]) === seccion;
    const coincidePeriodo = alcance === 'AULA_COMPLETA' || !colPeriodo || String(row[colPeriodo-1]) === periodo;
    const coincideNombre = nombreSet[normalizeStudentName_(row[colNombre-1])];
    if (coincideContexto && coincidePeriodo && coincideNombre) {
      sh.deleteRow(i+2);
      count++;
    }
  }
  return count;
}

function removeStudentsWithoutResults_(sede, grado, seccion, nombreSet) {
  const shR = getOrCreateSheet(SHEETS.resultados, []);
  const resultData = shR.getLastRow() > 1 ? shR.getRange(2,1,shR.getLastRow()-1,shR.getLastColumn()).getValues() : [];
  const shE = getOrCreateSheet(SHEETS.estudiantes, []);
  if (shE.getLastRow() < 2) return 0;
  const studentData = shE.getRange(2,1,shE.getLastRow()-1,shE.getLastColumn()).getValues();
  let count = 0;
  for (let i=studentData.length-1;i>=0;i--) {
    const row = studentData[i];
    const nombre = normalizeStudentName_(row[4]);
    if (String(row[1]) !== sede || String(row[2]) !== grado || String(row[3]) !== seccion || !nombreSet[nombre]) continue;
    const sigueConResultados = resultData.some(r => String(r[1])===sede && String(r[2])===grado && String(r[3])===seccion && normalizeStudentName_(r[6])===nombre);
    if (!sigueConResultados) { shE.deleteRow(i+2); count++; }
  }
  return count;
}
