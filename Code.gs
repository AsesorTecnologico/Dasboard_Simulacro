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
    Datos_Sistema: ['CLAVE','TIPO','JSON','FECHA_ACTUALIZACION']
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
    else if (action === 'deleteStudents') {
      const payload = JSON.parse((e.parameter && e.parameter.payload) || '{}');
      data = Object.assign({ok:true}, deleteStudentsFromSystem(payload));
    }
    else if (action === 'updateStudent') {
      const payload = JSON.parse((e.parameter && e.parameter.payload) || '{}');
      data = Object.assign({ok:true}, updateStudentInSystem(payload));
    }
    else data = {ok: false, error: 'Accion GET no reconocida'};

    const callback = e && e.parameter && e.parameter.callback;
    return callback ? jsonpResponse(callback, data) : jsonResponse(data);
  } catch (err) {
    const data = {ok: false, error: String(err && err.message || err)};
    const callback = e && e.parameter && e.parameter.callback;
    return callback ? jsonpResponse(callback, data) : jsonResponse(data);
  }
}

function doPost(e) {
  try {
    let raw = (e && e.postData && e.postData.contents) || '';
    if (!raw && e && e.parameter && e.parameter.payload) raw = e.parameter.payload;
    const body = JSON.parse(raw || '{}');

    if (body.action === 'setItem') {
      saveLocalStorageItem(body.key, body.value);
      return jsonResponse({ok: true, key: body.key});
    }
    if (body.action === 'bulkSync') {
      Object.keys(body.items || {}).forEach(key => saveLocalStorageItem(key, body.items[key]));
      return jsonResponse({ok: true, synced: Object.keys(body.items || {}).length});
    }
    if (body.action === 'deleteItem') {
      deleteSystemItem(body.key);
      return jsonResponse({ok: true, deleted: body.key});
    }
    if (body.action === 'deleteStudents') {
      const result = deleteStudentsFromSystem(body);
      return jsonResponse(Object.assign({ok:true}, result));
    }
    if (body.action === 'updateStudent') {
      const result = updateStudentInSystem(body);
      return jsonResponse(Object.assign({ok:true}, result));
    }
    return jsonResponse({ok: false, error: 'Accion POST no reconocida'});
  } catch (err) {
    return jsonResponse({ok: false, error: String(err && err.message || err)});
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

function saveJsonBackup(key, value) {
  const headers = ['CLAVE', 'TIPO', 'JSON', 'FECHA_ACTUALIZACION'];
  const sh = getOrCreateSheet(SHEETS.json, headers);
  const values = sh.getDataRange().getValues();
  let row = 0;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === key) { row = i + 1; break; }
  }
  const tipo = key.indexOf('notas_') === 0 ? 'REGISTRO_NOTAS' : key;
  const record = [[key, tipo, value, new Date()]];
  if (row) sh.getRange(row, 1, 1, 4).setValues(record);
  else sh.getRange(sh.getLastRow() + 1, 1, 1, 4).setValues(record);
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
  const sh = getOrCreateSheet(SHEETS.json, ['CLAVE','TIPO','JSON','FECHA_ACTUALIZACION']);
  const values = sh.getDataRange().getValues();
  for (let i=values.length-1;i>=1;i--) if (String(values[i][0]) === key) sh.deleteRow(i+1);
}

function buildSnapshot() {
  const sh = getOrCreateSheet(SHEETS.json, ['CLAVE','TIPO','JSON','FECHA_ACTUALIZACION']);
  const values = sh.getDataRange().getValues();
  const items = {};
  values.slice(1).forEach(r => { if (r[0]) items[String(r[0])] = String(r[2]); });
  return {ok:true, items:items, timestamp:new Date().toISOString()};
}


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

  const shJson = getOrCreateSheet(SHEETS.json, ['CLAVE','TIPO','JSON','FECHA_ACTUALIZACION']);
  if (shJson.getLastRow() > 1) {
    const data = shJson.getRange(2,1,shJson.getLastRow()-1,4).getValues();
    data.forEach((row, index) => {
      const key = String(row[0] || '');
      if (key.indexOf('notas_') !== 0) return;
      try {
        const registro = JSON.parse(String(row[2] || '{}'));
        const coincide = registro.sede === sede && registro.grado === grado && registro.seccion === seccion &&
          (alcance === 'AULA_COMPLETA' || registro.periodo === periodo);
        if (!coincide) return;
        registro.alumnos = (registro.alumnos || []).filter(a => !nombreSet[normalizeStudentName_(a.nombre)]);
        shJson.getRange(index + 2, 3, 1, 2).setValues([[JSON.stringify(registro), new Date()]]);
        jsonActualizados++;
      } catch (_) {}
    });
  }

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

  const shJson = getOrCreateSheet(SHEETS.json, ['CLAVE','TIPO','JSON','FECHA_ACTUALIZACION']);
  if (shJson.getLastRow() > 1) {
    const data = shJson.getRange(2,1,shJson.getLastRow()-1,4).getValues();
    data.forEach((row,index)=>{
      const key=String(row[0]||'');
      if (key.indexOf('notas_')!==0) return;
      try {
        const registro=JSON.parse(String(row[2]||'{}'));
        if (registro.sede!==sede || registro.grado!==grado || registro.seccion!==seccion) return;
        let changed=false;
        (registro.alumnos||[]).forEach(a=>{
          if (normalizeStudentName_(a.nombre)===oldNorm) { a.nombre=nuevoNombre; changed=true; }
        });
        if (changed) {
          shJson.getRange(index+2,3,1,2).setValues([[JSON.stringify(registro),new Date()]]);
          jsonActualizados++;
        }
      } catch (_) {}
    });
  }
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
