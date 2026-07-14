const sedes=["BELISARIO","BELLAVISTA","BELLIDO","CANTA CALLAO","CARRIZALES","CIPRESES ELIO","EL AGUSTINO","EL ROSARIO","HUARAL","HUAYCÁN","INGENIEROS","JULIACA","LA VICTORIA","MIGUEL IGLESIAS","MONTESSORI","NARANJAL","PUCALLPA","PUENTE PIEDRA","QUILCA","SALAMANCA","SAN CARLOS","SAN LUIS","SAN MIGUEL","SANTA ANITA","VENTANILLA"];
const grados=["1.º Secundaria","2.º Secundaria","3.º Secundaria","4.º Secundaria","5.º Secundaria","4.º Pre","5.º Pre"];
const cursos=["RAZ. VERBAL","RAZ. MATEMÁTICO","ARITMÉTICA","ÁLGEBRA","GEOMETRÍA","TRIGONOMETRÍA","FÍSICA","QUÍMICA","BIOLOGÍA","LENGUAJE","LITERATURA","HISTORIA DEL PERÚ Y EL MUNDO","GEOGRAFÍA","INGLÉS","CULTURA GENERAL"];
let currentUser=null,alumnos=[],barChart=null,pieChart=null,contextoAnterior=null;
let sheetsInitialLoadPromise=Promise.resolve();

function defaultUsers(){return[
 {usuario:"admin",password:"admin123",perfil:"admin",sede:"TODAS"},
 {usuario:"general",password:"general123",perfil:"general",sede:"TODAS"},
 {usuario:"belisario",password:"sede123",perfil:"sede",sede:"BELISARIO"},
 {usuario:"bellavista",password:"sede123",perfil:"sede",sede:"BELLAVISTA"},
 {usuario:"ingenieros",password:"sede123",perfil:"sede",sede:"INGENIEROS"}]}
function getUsers(){return JSON.parse(localStorage.getItem("usuariosSistema")||"null")||defaultUsers()}
async function login(){
  try{
    await sheetsInitialLoadPromise;
    const u=loginUser.value.trim();
    const p=loginPassword.value;
    const usuarios=getUsers();
    const encontrado=usuarios.find(x=>x.usuario===u&&x.password===p);

    if(!encontrado){
      loginError.style.display="block";
      loginError.textContent="Usuario o contraseña incorrectos.";
      return;
    }

    currentUser=encontrado;
    loginError.style.display="none";
    loginScreen.classList.add("hidden");
    app.classList.remove("hidden");
    aplicarPermisos();
    actualizarDashboard();
  }catch(error){
    console.error("Error al iniciar sesión:",error);
    loginError.style.display="block";
    loginError.textContent="Ocurrió un error al iniciar sesión. Revise el archivo actualizado.";
  }
}
function logout(){currentUser=null;app.classList.add("hidden");loginScreen.classList.remove("hidden");loginPassword.value=""}
function aplicarPermisos(){
 currentUserBadge.textContent=`${currentUser.usuario} · ${currentUser.perfil==="general"?"ADMINISTRADOR ACADÉMICO":currentUser.perfil.toUpperCase()}${currentUser.perfil==="sede"?" · "+currentUser.sede:""}`;
 headerScope.textContent=currentUser.perfil==="sede"?`Acceso limitado a ${currentUser.sede}`:"Acceso institucional";
 document.querySelectorAll(".admin-only").forEach(x=>x.style.display=currentUser.perfil==="admin"?"inline-block":"none");
 sede.innerHTML='<option value="">Seleccione sede</option>'+sedes.map(s=>`<option>${s}</option>`).join("");
 if(currentUser.perfil==="sede"){sede.value=currentUser.sede;sede.disabled=true}else sede.disabled=false;inicializarFiltrosDashboard();inicializarFiltrosSeguimiento();inicializarGestionAlumnos();limpiarCargaMasivaAlumnos();alumnos=[];contextoAnterior=null;renderCargaPreguntas();updateSummary();
}
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".view").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.getElementById(b.dataset.view).classList.add("active");if(b.dataset.view==="dashboard"){actualizarOpcionesAula();actualizarDashboard();}if(b.dataset.view==="seguimiento"){actualizarSeguimiento();}if(b.dataset.view==="gestionAlumnos"){cargarAlumnosAdministracion();}if(b.dataset.view==="cargaMasivaAlumnos"){renderVistaPreviaCargaMasiva();}if(b.dataset.view==="preguntas")renderPreguntasConfig();if(b.dataset.view==="rangos"){cargarRangosGrado();renderRangosCurso()}if(b.dataset.view==="usuarios")renderUsers()}));

function plantillaBase(){
 const bloques=[["RAZ. VERBAL",6],["RAZ. MATEMÁTICO",6],["ARITMÉTICA",4],["ÁLGEBRA",4],["GEOMETRÍA",4],["TRIGONOMETRÍA",4],["FÍSICA",4],["QUÍMICA",4],["BIOLOGÍA",4],["LENGUAJE",4],["LITERATURA",4],["HISTORIA DEL PERÚ Y EL MUNDO",4],["GEOGRAFÍA",4],["INGLÉS",4],["CULTURA GENERAL",2]];
 let n=1,res=[];bloques.forEach(([curso,cant])=>{for(let i=1;i<=cant;i++)res.push({preg:n++,curso,competencia:"",clave:"A",peso:1})});return res
}
function getPreguntas(gradoSel){const all=JSON.parse(localStorage.getItem("preguntasPorGrado")||"{}");return all[gradoSel]||plantillaBase()}
function savePreguntas(gradoSel,data){const all=JSON.parse(localStorage.getItem("preguntasPorGrado")||"{}");all[gradoSel]=data;localStorage.setItem("preguntasPorGrado",JSON.stringify(all))}
function renderPreguntasConfig(){
 const data=getPreguntas(gradoConfig.value);preguntasBody.innerHTML="";
 data.forEach((q,i)=>{const tr=document.createElement("tr");tr.innerHTML=`
 <td><input class="q-preg" type="number" value="${q.preg}"></td>
 <td><select class="q-curso">${cursos.map(c=>`<option ${c===q.curso?"selected":""}>${c}</option>`).join("")}</select></td>
 <td><input class="q-comp" value="${q.competencia||""}"></td>
 <td><input class="q-clave" value="${q.clave||""}"></td>
 <td><input class="q-peso" type="number" step="0.01" value="${q.peso??1}"></td>
 <td><button class="btn-red" onclick="eliminarPregunta(${i})">Eliminar</button></td>`;preguntasBody.appendChild(tr)})
}
function agregarPregunta(){const data=leerPreguntasConfig();data.push({preg:data.length+1,curso:cursos[0],competencia:"",clave:"A",peso:1});savePreguntas(gradoConfig.value,data);renderPreguntasConfig()}
function eliminarPregunta(i){const d=leerPreguntasConfig();d.splice(i,1);d.forEach((q,j)=>q.preg=j+1);savePreguntas(gradoConfig.value,d);renderPreguntasConfig()}
function leerPreguntasConfig(){return[...preguntasBody.querySelectorAll("tr")].map(r=>({preg:Number(r.querySelector(".q-preg").value),curso:r.querySelector(".q-curso").value,competencia:r.querySelector(".q-comp").value,clave:r.querySelector(".q-clave").value,peso:Number(r.querySelector(".q-peso").value)||1}))}
async function guardarPreguntas(){
  savePreguntas(gradoConfig.value,leerPreguntasConfig());
  pregStatus.style.display="block";
  pregStatus.textContent="Guardando configuración y sincronizando...";
  const synced=await sincronizarClaveAhora("preguntasPorGrado");
  pregStatus.textContent=synced?"Configuración guardada y sincronizada correctamente.":"Configuración guardada localmente; sincronización pendiente.";
  renderRangosCurso();
}
function cargarPlantillaBase(){savePreguntas(gradoConfig.value,plantillaBase());renderPreguntasConfig()}


function contextoActualCompleto(){
  return Boolean(sede.value && grado.value && seccion.value && periodo.value);
}

function claveContextoActual(){
  if(!contextoActualCompleto()) return null;
  return `notas_${sede.value}_${grado.value}_${seccion.value}_${periodo.value}`;
}

function guardarBorradorContexto(){
  const key=claveContextoActual();
  if(!key || !alumnos.length) return;
  sessionStorage.setItem("borrador_"+key,JSON.stringify(alumnos));
}

function cargarListaDelContexto(){
  const key=claveContextoActual();

  if(!key){
    alumnos=[];
    renderCargaPreguntas();
    updateSummary();
    showStatus("Seleccione sede, grado, sección y periodo para cargar una lista independiente.",false);
    return;
  }

  const guardado=localStorage.getItem(key);
  const borrador=sessionStorage.getItem("borrador_"+key);

  if(guardado){
    const data=JSON.parse(guardado);
    alumnos=data.alumnos||[];
    renderCargaPreguntas();
    updateSummary();
    showStatus(`Se cargó el registro de ${sede.value} - ${grado.value} - Sección ${seccion.value}.`);
    return;
  }

  if(borrador){
    alumnos=JSON.parse(borrador)||[];
    renderCargaPreguntas();
    updateSummary();
    showStatus(`Se recuperó la lista en edición de ${grado.value} - Sección ${seccion.value}.`);
    return;
  }

  alumnos=[];
  renderCargaPreguntas();
  updateSummary();
  showStatus(`Lista nueva e independiente para ${sede.value} - ${grado.value} - Sección ${seccion.value} - ${periodo.value}. Importe los estudiantes por CSV.`);
}

function cambiarContextoCarga(){
  const nuevoContexto=claveContextoActual();

  if(contextoAnterior && contextoAnterior!==nuevoContexto && alumnos.length){
    sessionStorage.setItem("borrador_"+contextoAnterior,JSON.stringify(alumnos));
  }

  contextoAnterior=nuevoContexto;
  alumnos=[];
  cargarListaDelContexto();
}

csvInput.addEventListener("change",e=>{
 const f=e.target.files[0];
 if(!f)return;
 if(!contextoActualCompleto()){
   showStatus("Primero seleccione sede, grado, sección y periodo.",true);
   e.target.value="";
   return;
 }const r=new FileReader();r.onload=x=>{alumnos=[];x.target.result.split(/\r?\n/).filter(Boolean).forEach((line,i)=>{const n=(line.includes(";")?line.split(";"):line.split(","))[0].replace(/^"|"$/g,"").trim();if(i===0&&/nombre|alumno|estudiante/i.test(n))return;if(n)alumnos.push({nombre:n,respuestas:{}})});contextoAnterior=claveContextoActual();renderCargaPreguntas();guardarBorradorContexto();showStatus(`Alumnos importados para ${grado.value} - Sección ${seccion.value} - ${periodo.value}.`);e.target.value=""};r.readAsText(f,"UTF-8")});

function renderCargaPreguntas(){
 if(!grado.value||!alumnos.length){cargaContainer.innerHTML='<p class="note">Seleccione un grado e importe alumnos para comenzar.</p>';return}
 const qs=getPreguntas(grado.value),agr={};qs.forEach(q=>{if(!agr[q.curso])agr[q.curso]=[];agr[q.curso].push(q)});
 cargaContainer.innerHTML="";
 Object.entries(agr).forEach(([curso,list])=>{
   const block=document.createElement("div");block.className="course-block";
   block.innerHTML=`<div class="course-title"><span>${curso}</span><span class="course-summary">${list.length} preguntas · ${list.reduce((a,q)=>a+Number(q.peso||1),0)} puntos</span></div>`;
   const wrap=document.createElement("div");wrap.className="table-wrap";
   const table=document.createElement("table");table.style.minWidth=(350+list.length*90)+"px";
   const thead=document.createElement("thead");
   const hr=document.createElement("tr");hr.innerHTML="<th>N.º</th><th>Alumno</th>"+list.map(q=>`<th>P${q.preg}<br><small>${q.competencia||""}</small></th>`).join("")+"<th>Total curso</th><th>Nivel curso</th>";
   thead.appendChild(hr);table.appendChild(thead);
   const tbody=document.createElement("tbody");
   alumnos.forEach((a,idx)=>{
      const tr=document.createElement("tr");tr.dataset.alumno=idx;tr.dataset.curso=curso;
      tr.innerHTML=`<td>${idx+1}</td><td class="student-name">${a.nombre}</td>`;
      list.forEach(q=>{
        const td=document.createElement("td");
        const s=document.createElement("select");s.className="answer-select";s.dataset.preg=q.preg;s.dataset.curso=curso;
        s.innerHTML='<option value=""></option><option value="1">Correcta</option><option value="0">Incorrecta</option>';
        const key=`${curso}_${q.preg}`;s.value=a.respuestas[key]??"";
        s.addEventListener("change",()=>{a.respuestas[key]=s.value;applyAnswerClass(s);recalcularFilaCurso(tr,list);recalcularResumenFinal();updateSummary();guardarBorradorContexto()});
        applyAnswerClass(s);td.appendChild(s);tr.appendChild(td)
      });
      const tdT=document.createElement("td");tdT.className="total-curso";tdT.textContent="0";tr.appendChild(tdT);
      const tdN=document.createElement("td");tdN.className="nivel-curso";tr.appendChild(tdN);
      tbody.appendChild(tr);recalcularFilaCurso(tr,list)
   });
   table.appendChild(tbody);wrap.appendChild(table);block.appendChild(wrap);cargaContainer.appendChild(block)
 });
 const final=document.createElement("div");final.className="panel";final.innerHTML=`<h3>Resumen general por estudiante</h3><div class="table-wrap"><table class="compact-table"><thead><tr><th>Alumno</th><th>Puntaje total</th><th>Promedio general</th><th>Nivel general por puntaje total</th></tr></thead><tbody id="resumenFinalBody"></tbody></table></div>`;
 cargaContainer.appendChild(final);recalcularResumenFinal();updateSummary()
}
function applyAnswerClass(s){s.classList.remove("ok","bad");if(s.value==="1")s.classList.add("ok");if(s.value==="0")s.classList.add("bad")}
function rangosCurso(gradoSel,curso,max){
 const all=JSON.parse(localStorage.getItem("rangosCurso")||"{}");const r=all[gradoSel]?.[curso];
 return r||{AD:max*.9,A:max*.7,B:max*.5,C:0}
}
function nivelPorRango(valor,r){if(valor>=r.AD)return"AD";if(valor>=r.A)return"A";if(valor>=r.B)return"B";return"C"}
function recalcularFilaCurso(tr,list){
 let total=0;[...tr.querySelectorAll(".answer-select")].forEach((s,i)=>{if(s.value==="1")total+=Number(list[i].peso||1)});
 tr.querySelector(".total-curso").textContent=total.toFixed(2);
 const max=list.reduce((a,q)=>a+Number(q.peso||1),0),r=rangosCurso(grado.value,tr.dataset.curso,max),nivel=nivelPorRango(total,r),c=tr.querySelector(".nivel-curso");
 c.textContent=nivel;c.className="nivel-curso grade-"+nivel;recalcularResumenFinal()
}
function getRangosGrado(g){
  const all=JSON.parse(localStorage.getItem("rangosGrado")||"{}");
  if(all[g]) return all[g];

  const preguntas=getPreguntas(g);
  const maximoTotal=preguntas.reduce((s,q)=>s+Number(q.peso||1),0);

  return{
    AD:{d:Number((maximoTotal*0.85).toFixed(2)),h:maximoTotal},
    A:{d:Number((maximoTotal*0.70).toFixed(2)),h:Number((maximoTotal*0.8499).toFixed(2))},
    B:{d:Number((maximoTotal*0.50).toFixed(2)),h:Number((maximoTotal*0.6999).toFixed(2))},
    C:{d:0,h:Number((maximoTotal*0.4999).toFixed(2))}
  };
}
function nivelGeneralPorGrado(totalPuntos,gradoSeleccionado){
  const r=getRangosGrado(gradoSeleccionado);
  for(const n of ["AD","A","B","C"]){
    if(totalPuntos>=r[n].d && totalPuntos<=r[n].h) return n;
  }
  return "";
}

function nivelGeneral(totalPuntos){
  const r=getRangosGrado(grado.value);
  for(const n of ["AD","A","B","C"]){
    if(totalPuntos>=r[n].d && totalPuntos<=r[n].h) return n;
  }
  return "";
}
function recalcularResumenFinal(){
  const body=document.getElementById("resumenFinalBody");
  if(!body)return;

  body.innerHTML="";

  alumnos.forEach((a,idx)=>{
    const totals=[...document.querySelectorAll(`tr[data-alumno="${idx}"] .total-curso`)]
      .map(x=>Number(x.textContent)||0);

    const total=totals.reduce((x,y)=>x+y,0);
    const promedio=totals.length?total/totals.length:0;
    const nivel=nivelGeneral(total);

    a.total=total;
    a.promedio=promedio;
    a.nivelFinal=nivel;

    const tr=document.createElement("tr");
    tr.innerHTML=`
      <td>${a.nombre}</td>
      <td>${total.toFixed(2)}</td>
      <td>${promedio.toFixed(2)}</td>
      <td class="grade-${nivel}">${nivel}</td>`;
    body.appendChild(tr);
  });

  updateSummary();
}

function updateSummary(){
  const niveles=alumnos.map(a=>a.nivelFinal||"");
  totalStudents.textContent=alumnos.length;
  totalAD.textContent=niveles.filter(x=>x==="AD").length;
  totalA.textContent=niveles.filter(x=>x==="A").length;
  totalB.textContent=niveles.filter(x=>x==="B").length;
  totalC.textContent=niveles.filter(x=>x==="C").length;
}

function contextKey(){
 if(!contextoActualCompleto()){
   showStatus("Seleccione sede, grado, sección y periodo.",true);
   return null;
 }
 if(currentUser.perfil==="sede"&&sede.value!==currentUser.sede){
   showStatus("No tiene acceso a otra sede.",true);
   return null;
 }
 return claveContextoActual();
}
async function guardarNotas(){
  const k=contextKey();
  if(!k)return;

  if(!alumnos.length){
    showStatus("No existen estudiantes cargados para guardar.",true);
    return;
  }

  recalcularResumenFinal();

  const registro={
    sede:sede.value,
    grado:grado.value,
    seccion:seccion.value,
    periodo:periodo.value,
    alumnos:alumnos,
    fecha:new Date().toISOString()
  };

  try{
    localStorage.setItem(k,JSON.stringify(registro));
    sessionStorage.removeItem("borrador_"+k);
    contextoAnterior=k;
    showStatus(`Guardando notas y sincronizando con Google Sheets...`);
    const synced=await sincronizarClaveAhora(k);
    showStatus(synced
      ? `Notas guardadas y sincronizadas para ${grado.value} - Sección ${seccion.value} - ${periodo.value}.`
      : `Notas guardadas localmente. La sincronización quedó pendiente y se reintentará automáticamente.`,
      !synced);
    actualizarDashboard();
  }catch(error){
    showStatus("No fue posible guardar las notas en el navegador.",true);
    console.error(error);
  }
}
function cargarRegistro(){
 const k=contextKey();if(!k)return;
 const s=localStorage.getItem(k);
 if(!s){showStatus("No existe un registro guardado para esta sede, grado, sección y periodo.",true);return}
 alumnos=JSON.parse(s).alumnos||[];
 contextoAnterior=k;
 renderCargaPreguntas();
 updateSummary();
 showStatus("Registro cargado correctamente.");
}
function limpiarTabla(){
 const k=claveContextoActual();
 alumnos=[];
 if(k)sessionStorage.removeItem("borrador_"+k);
 renderCargaPreguntas();
 updateSummary();
 showStatus("Se limpió únicamente la lista del contexto seleccionado.");
}
function showStatus(m,e=false){status.style.display="block";status.style.background=e?"#fee2e2":"#eef6ff";status.style.color=e?"#991b1b":"#15324b";status.textContent=m}

async function exportarExcelPerfil(soloAulaActual=false){
  if(typeof ExcelJS==="undefined"){
    alert("No se pudo cargar el generador de Excel. Verifique la conexión a internet e intente nuevamente.");
    return;
  }

  let registros=[];
  if(soloAulaActual){
    const key=contextKey();
    if(!key)return;
    const guardado=localStorage.getItem(key);
    if(guardado){
      registros=[JSON.parse(guardado)];
    }else if(alumnos.length){
      recalcularResumenFinal();
      registros=[{
        sede:sede.value,
        grado:grado.value,
        seccion:seccion.value,
        periodo:periodo.value,
        alumnos:alumnos,
        fecha:new Date().toISOString()
      }];
    }
  }else{
    registros=registrosFiltradosDashboard();
  }

  if(!registros.length){
    alert("No existen registros para exportar con los filtros seleccionados.");
    return;
  }

  const wb=new ExcelJS.Workbook();
  wb.creator="Sistema de Evaluación";
  wb.created=new Date();
  wb.modified=new Date();

  const colores={
    navy:"15324B",blue:"2563EB",green:"16A34A",amber:"F59E0B",red:"DC2626",
    lightBlue:"DBEAFE",lightGreen:"DCFCE7",lightAmber:"FEF3C7",lightRed:"FEE2E2",
    white:"FFFFFF",gray:"E5E7EB",lightGray:"F8FAFC",text:"1F2937"
  };

  const nivelFill={AD:colores.lightBlue,A:colores.lightGreen,B:colores.lightAmber,C:colores.lightRed};
  const nivelFont={AD:"1D4ED8",A:"166534",B:"92400E",C:"991B1B"};

  function estiloTitulo(ws,rango,texto){
    ws.mergeCells(rango);
    const c=ws.getCell(rango.split(":")[0]);
    c.value=texto;
    c.font={bold:true,size:18,color:{argb:colores.white}};
    c.fill={type:"pattern",pattern:"solid",fgColor:{argb:colores.navy}};
    c.alignment={horizontal:"center",vertical:"middle"};
    ws.getRow(c.row).height=30;
  }

  function estiloCabecera(row){
    row.eachCell(cell=>{
      cell.font={bold:true,color:{argb:colores.white}};
      cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:colores.navy}};
      cell.alignment={horizontal:"center",vertical:"middle",wrapText:true};
      cell.border={
        top:{style:"thin",color:{argb:colores.gray}},
        left:{style:"thin",color:{argb:colores.gray}},
        bottom:{style:"thin",color:{argb:colores.gray}},
        right:{style:"thin",color:{argb:colores.gray}}
      };
    });
    row.height=28;
  }

  function estiloNivel(cell,nivel){
    if(!nivelFill[nivel])return;
    cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:nivelFill[nivel]}};
    cell.font={bold:true,color:{argb:nivelFont[nivel]}};
    cell.alignment={horizontal:"center",vertical:"middle"};
  }

  function bordesDatos(row){
    row.eachCell(cell=>{
      cell.border={
        top:{style:"thin",color:{argb:"D1D5DB"}},
        left:{style:"thin",color:{argb:"D1D5DB"}},
        bottom:{style:"thin",color:{argb:"D1D5DB"}},
        right:{style:"thin",color:{argb:"D1D5DB"}}
      };
      cell.alignment={vertical:"middle",wrapText:true};
    });
  }

  const todosAlumnos=[];
  const detalleCursos=[];
  const resumenRegistros=[];
  const conteos={AD:0,A:0,B:0,C:0};
  const conteoPorCurso={};

  registros.forEach((registro,registroIndex)=>{
    let sumaProm=0,contProm=0;
    const local={AD:0,A:0,B:0,C:0};
    registro.alumnos.forEach((a,alumnoIndex)=>{
      const nivel=a.nivelFinal||"";
      if(nivel){conteos[nivel]++;local[nivel]++;}
      if(Number.isFinite(Number(a.promedio))){sumaProm+=Number(a.promedio);contProm++;}

      todosAlumnos.push({
        sede:registro.sede,grado:registro.grado,seccion:registro.seccion,periodo:registro.periodo,
        alumno:a.nombre,total:Number(a.total||0),promedio:Number(a.promedio||0),nivel:nivel
      });

      const cursosDetalle=calcularDetalleCursoRegistro(registro,a);
      cursosDetalle.forEach(d=>{
        detalleCursos.push({
          sede:registro.sede,grado:registro.grado,seccion:registro.seccion,periodo:registro.periodo,
          alumno:a.nombre,curso:d.curso,puntaje:Number(d.total||0),maximo:Number(d.maximo||0),nivel:d.nivel
        });
        if(!conteoPorCurso[d.curso])conteoPorCurso[d.curso]={AD:0,A:0,B:0,C:0,total:0};
        conteoPorCurso[d.curso][d.nivel]++;
        conteoPorCurso[d.curso].total++;
      });
    });
    resumenRegistros.push({
      sede:registro.sede,grado:registro.grado,seccion:registro.seccion,periodo:registro.periodo,
      alumnos:registro.alumnos.length,promedio:contProm?sumaProm/contProm:0,
      AD:local.AD,A:local.A,B:local.B,C:local.C,fecha:registro.fecha||""
    });
  });

  const wsDash=wb.addWorksheet("Dashboard",{views:[{showGridLines:false}]});
  estiloTitulo(wsDash,"A1:H2","REPORTE DE EVALUACIÓN");
  wsDash.getCell("A3").value="Perfil";
  wsDash.getCell("B3").value=(currentUser.perfil==="general"?"ADMINISTRADOR ACADÉMICO":currentUser.perfil.toUpperCase());
  wsDash.getCell("D3").value="Usuario";
  wsDash.getCell("E3").value=currentUser.usuario;
  wsDash.getCell("G3").value="Fecha";
  wsDash.getCell("H3").value=new Date();
  wsDash.getCell("H3").numFmt="dd/mm/yyyy hh:mm";

  const sedeTexto=soloAulaActual?sede.value:(dashFiltroSede?.value||"TODAS");
  const periodoTexto=soloAulaActual?periodo.value:(dashFiltroPeriodo?.value||"TODOS");
  wsDash.getCell("A4").value="Sede / alcance";
  wsDash.getCell("B4").value=sedeTexto;
  wsDash.getCell("D4").value="Bimestre";
  wsDash.getCell("E4").value=periodoTexto;
  wsDash.getCell("G4").value="Registros";
  wsDash.getCell("H4").value=resumenRegistros.length;

  ["A3","D3","G3","A4","D4","G4"].forEach(ref=>{
    const c=wsDash.getCell(ref);c.font={bold:true,color:{argb:colores.navy}};c.fill={type:"pattern",pattern:"solid",fgColor:{argb:"EAF0F7"}};
  });

  const promedioGeneral=todosAlumnos.length?todosAlumnos.reduce((s,a)=>s+a.promedio,0)/todosAlumnos.length:0;
  const kpis=[
    ["A6","B6","Alumnos",todosAlumnos.length,colores.blue],
    ["C6","D6","Pruebas",resumenRegistros.length,colores.green],
    ["E6","F6","Promedio",promedioGeneral,colores.amber],
    ["G6","H6","Cursos",Object.keys(conteoPorCurso).length,colores.red]
  ];
  kpis.forEach(([l,v,label,value,color])=>{
    wsDash.getCell(l).value=label;
    wsDash.getCell(l).font={bold:true,color:{argb:colores.white}};
    wsDash.getCell(l).fill={type:"pattern",pattern:"solid",fgColor:{argb:color}};
    wsDash.getCell(v).value=value;
    wsDash.getCell(v).font={bold:true,size:16,color:{argb:color}};
    wsDash.getCell(v).fill={type:"pattern",pattern:"solid",fgColor:{argb:colores.lightGray}};
    wsDash.getCell(v).alignment={horizontal:"center"};
  });
  wsDash.getCell("F6").numFmt="0.00";

  wsDash.addRow([]);
  wsDash.addRow(["Nivel","Cantidad","Porcentaje"]);
  const headerNivel=wsDash.getRow(9);estiloCabecera(headerNivel);
  ["AD","A","B","C"].forEach(n=>{
    const r=wsDash.addRow([n,conteos[n],todosAlumnos.length?conteos[n]/todosAlumnos.length:0]);
    r.getCell(3).numFmt="0.0%";
    estiloNivel(r.getCell(1),n);bordesDatos(r);
  });

  wsDash.addRow([]);
  wsDash.addRow(["Curso","AD","A","B","C","Total"]);
  estiloCabecera(wsDash.getRow(15));
  Object.entries(conteoPorCurso).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([curso,d])=>{
    const r=wsDash.addRow([curso,d.AD,d.A,d.B,d.C,d.total]);bordesDatos(r);
    estiloNivel(r.getCell(2),"AD");estiloNivel(r.getCell(3),"A");estiloNivel(r.getCell(4),"B");estiloNivel(r.getCell(5),"C");
  });

  wsDash.columns=[
    {width:28},{width:14},{width:18},{width:14},{width:18},{width:14},{width:18},{width:18}
  ];
  wsDash.freezePanes={xSplit:0,ySplit:2};

  try{
    if(document.getElementById("barChart")&&document.getElementById("barChart").toDataURL){
      const barImage=wb.addImage({base64:document.getElementById("barChart").toDataURL("image/png"),extension:"png"});
      wsDash.addImage(barImage,{tl:{col:8,row:1},ext:{width:620,height:280}});
    }
    if(document.getElementById("pieChart")&&document.getElementById("pieChart").toDataURL){
      const pieImage=wb.addImage({base64:document.getElementById("pieChart").toDataURL("image/png"),extension:"png"});
      wsDash.addImage(pieImage,{tl:{col:8,row:16},ext:{width:440,height:300}});
    }
  }catch(e){console.warn("No se pudieron insertar las gráficas",e);}

  const wsReg=wb.addWorksheet("Registros de pruebas",{views:[{state:"frozen",ySplit:1}]});
  wsReg.columns=[
    {header:"Sede",key:"sede",width:20},{header:"Grado",key:"grado",width:20},{header:"Sección",key:"seccion",width:12},
    {header:"Bimestre",key:"periodo",width:20},{header:"Alumnos",key:"alumnos",width:12},{header:"Promedio",key:"promedio",width:13},
    {header:"AD",key:"AD",width:9},{header:"A",key:"A",width:9},{header:"B",key:"B",width:9},{header:"C",key:"C",width:9},{header:"Fecha",key:"fecha",width:21}
  ];
  estiloCabecera(wsReg.getRow(1));
  resumenRegistros.forEach(d=>{
    const r=wsReg.addRow(d);r.getCell(6).numFmt="0.00";bordesDatos(r);
    estiloNivel(r.getCell(7),"AD");estiloNivel(r.getCell(8),"A");estiloNivel(r.getCell(9),"B");estiloNivel(r.getCell(10),"C");
  });
  wsReg.autoFilter={from:"A1",to:"K1"};

  const wsEst=wb.addWorksheet("Estudiantes",{views:[{state:"frozen",ySplit:1}]});
  wsEst.columns=[
    {header:"Sede",key:"sede",width:20},{header:"Grado",key:"grado",width:20},{header:"Sección",key:"seccion",width:12},
    {header:"Bimestre",key:"periodo",width:20},{header:"Estudiante",key:"alumno",width:32},{header:"Puntaje total",key:"total",width:15},
    {header:"Promedio general",key:"promedio",width:17},{header:"Nivel general",key:"nivel",width:15}
  ];
  estiloCabecera(wsEst.getRow(1));
  todosAlumnos.forEach(d=>{
    const r=wsEst.addRow(d);r.getCell(6).numFmt="0.00";r.getCell(7).numFmt="0.00";bordesDatos(r);estiloNivel(r.getCell(8),d.nivel);
  });
  wsEst.autoFilter={from:"A1",to:"H1"};

  const wsCurso=wb.addWorksheet("Detalle por curso",{views:[{state:"frozen",ySplit:1}]});
  wsCurso.columns=[
    {header:"Sede",key:"sede",width:20},{header:"Grado",key:"grado",width:20},{header:"Sección",key:"seccion",width:12},
    {header:"Bimestre",key:"periodo",width:20},{header:"Estudiante",key:"alumno",width:32},{header:"Curso",key:"curso",width:34},
    {header:"Puntaje",key:"puntaje",width:12},{header:"Máximo",key:"maximo",width:12},{header:"Nivel del curso",key:"nivel",width:16}
  ];
  estiloCabecera(wsCurso.getRow(1));
  detalleCursos.forEach(d=>{
    const r=wsCurso.addRow(d);r.getCell(7).numFmt="0.00";r.getCell(8).numFmt="0.00";bordesDatos(r);estiloNivel(r.getCell(9),d.nivel);
  });
  wsCurso.autoFilter={from:"A1",to:"I1"};

  const wsPreg=wb.addWorksheet("Configuración",{views:[{state:"frozen",ySplit:1}]});
  wsPreg.columns=[
    {header:"Grado",key:"grado",width:20},{header:"PREG.",key:"preg",width:10},{header:"Curso",key:"curso",width:34},
    {header:"Competencia",key:"competencia",width:38},{header:"Clave",key:"clave",width:10},{header:"Peso",key:"peso",width:10}
  ];
  estiloCabecera(wsPreg.getRow(1));
  const gradosExportados=[...new Set(registros.map(r=>r.grado))];
  gradosExportados.forEach(g=>getPreguntas(g).forEach(q=>{
    const r=wsPreg.addRow({grado:g,preg:q.preg,curso:q.curso,competencia:q.competencia||"",clave:q.clave||"",peso:Number(q.peso||1)});bordesDatos(r);
  }));
  wsPreg.autoFilter={from:"A1",to:"F1"};

  [wsReg,wsEst,wsCurso,wsPreg].forEach(ws=>{
    ws.eachRow((row,rowNumber)=>{
      if(rowNumber>1&&rowNumber%2===0){
        row.eachCell(cell=>{
          if(!cell.fill||cell.fill.pattern!=="solid")cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"F8FAFC"}};
        });
      }
    });
  });

  const buffer=await wb.xlsx.writeBuffer();
  const blob=new Blob([buffer],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");
  const alcance=soloAulaActual?`${sede.value}_${grado.value}_${seccion.value}_${periodo.value}`:`${currentUser.perfil}_${sedeTexto}_${periodoTexto}`;
  link.href=url;
  link.download=`Reporte_Evaluacion_${alcance}`.replace(/[^a-zA-Z0-9_-]+/g,"_")+".xlsx";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportarCSV(){if(!contextKey())return;const qs=getPreguntas(grado.value),headers=["Sede","Grado","Sección","Periodo","Alumno",...qs.map(q=>`P${q.preg}-${q.curso}`),"Total","Promedio","Nivel"];const rows=alumnos.map(a=>[sede.value,grado.value,seccion.value,periodo.value,a.nombre,...qs.map(q=>a.respuestas[`${q.curso}_${q.preg}`]??""),a.total||0,a.promedio||0,a.nivelFinal||""]);const csv=[headers,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(";")).join("\n");const b=new Blob(["\uFEFF"+csv],{type:"text/csv"}),u=URL.createObjectURL(b),x=document.createElement("a");x.href=u;x.download="reporte_notas.csv";x.click();URL.revokeObjectURL(u)}

function cargarRangosGrado(){
  const g=gradoRango.value;
  const r=getRangosGrado(g);
  const maximo=getPreguntas(g).reduce((s,q)=>s+Number(q.peso||1),0);

  maximoGradoRango.value=maximo.toFixed(2);
  gADd.value=r.AD.d;
  gADh.value=r.AD.h;
  gAd.value=r.A.d;
  gAh.value=r.A.h;
  gBd.value=r.B.d;
  gBh.value=r.B.h;
  gCd.value=r.C.d;
  gCh.value=r.C.h;

  renderRangosCurso();
}
async function guardarRangosGrado(){
  const rangos={
    AD:{d:+gADd.value,h:+gADh.value},
    A:{d:+gAd.value,h:+gAh.value},
    B:{d:+gBd.value,h:+gBh.value},
    C:{d:+gCd.value,h:+gCh.value}
  };

  const maximo=Number(maximoGradoRango.value)||0;
  const ordenValido=
    rangos.C.d<=rangos.C.h &&
    rangos.B.d<=rangos.B.h &&
    rangos.A.d<=rangos.A.h &&
    rangos.AD.d<=rangos.AD.h &&
    rangos.C.h<rangos.B.d &&
    rangos.B.h<rangos.A.d &&
    rangos.A.h<rangos.AD.d &&
    rangos.AD.h<=maximo;

  if(!ordenValido){
    rangoStatus.style.display="block";
    rangoStatus.style.background="#fee2e2";
    rangoStatus.style.color="#991b1b";
    rangoStatus.textContent="Revise los rangos: no deben superponerse y AD no puede superar el puntaje máximo del grado.";
    return;
  }

  const all=JSON.parse(localStorage.getItem("rangosGrado")||"{}");
  all[gradoRango.value]=rangos;
  localStorage.setItem("rangosGrado",JSON.stringify(all));

  rangoStatus.style.display="block";
  rangoStatus.style.background="#eef6ff";
  rangoStatus.style.color="#15324b";
  rangoStatus.textContent=`Rangos generales guardados para ${gradoRango.value}.`;

  const synced=await sincronizarClaveAhora("rangosGrado");
  rangoStatus.textContent=synced
    ? `Rangos generales guardados y sincronizados para ${gradoRango.value}.`
    : `Rangos guardados localmente para ${gradoRango.value}; sincronización pendiente.`;

  if(grado.value===gradoRango.value){
    recalcularResumenFinal();
  }
}
function renderRangosCurso(){if(!rangosCursoBody)return;const g=gradoRango.value,qs=getPreguntas(g),map={};qs.forEach(q=>map[q.curso]=(map[q.curso]||0)+Number(q.peso||1));rangosCursoBody.innerHTML="";Object.entries(map).forEach(([c,max])=>{const r=rangosCurso(g,c,max),tr=document.createElement("tr");tr.dataset.curso=c;tr.innerHTML=`<td>${c}</td><td>${max}</td><td><input class="rc-ad" type="number" step="0.01" value="${r.AD}"></td><td><input class="rc-a" type="number" step="0.01" value="${r.A}"></td><td><input class="rc-b" type="number" step="0.01" value="${r.B}"></td><td><input class="rc-c" type="number" step="0.01" value="${r.C}"></td>`;rangosCursoBody.appendChild(tr)})}
async function guardarRangosCurso(){
  const all=JSON.parse(localStorage.getItem("rangosCurso")||"{}");
  all[gradoRango.value]={};
  [...rangosCursoBody.querySelectorAll("tr")].forEach(r=>all[gradoRango.value][r.dataset.curso]={
    AD:+r.querySelector(".rc-ad").value,
    A:+r.querySelector(".rc-a").value,
    B:+r.querySelector(".rc-b").value,
    C:+r.querySelector(".rc-c").value
  });
  localStorage.setItem("rangosCurso",JSON.stringify(all));
  rangoStatus.style.display="block";
  const synced=await sincronizarClaveAhora("rangosCurso");
  rangoStatus.textContent=synced?"Rangos por curso guardados y sincronizados.":"Rangos por curso guardados localmente; sincronización pendiente.";
}


function inicializarFiltrosDashboard(){
  if(!document.getElementById("dashFiltroSede"))return;

  dashFiltroSede.innerHTML='<option value="TODAS">Todas las sedes visibles</option>'+
    sedes.map(s=>`<option>${s}</option>`).join("");

  if(currentUser?.perfil==="sede"){
    dashFiltroSede.innerHTML=`<option>${currentUser.sede}</option>`;
    dashFiltroSede.value=currentUser.sede;
    dashFiltroSede.disabled=true;
  }else{
    dashFiltroSede.disabled=false;
  }

  actualizarOpcionesAula();
}

function obtenerAulaId(registro){
  return `${registro.grado} - ${registro.seccion}`;
}

function registrosPermitidosPorPerfil(){
  const lista=[];
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if(k&&k.startsWith("notas_")){
      try{
        const d=JSON.parse(localStorage.getItem(k));
        if(currentUser.perfil!=="sede"||d.sede===currentUser.sede)lista.push(d);
      }catch{}
    }
  }
  return lista;
}

function actualizarOpcionesAula(){
  if(!currentUser||!document.getElementById("dashModoAula"))return;

  const sedeSel=dashFiltroSede.value;
  const registros=registrosPermitidosPorPerfil()
    .filter(r=>sedeSel==="TODAS"||r.sede===sedeSel);

  const gradosDisponibles=[...new Set(registros.map(r=>r.grado))]
    .sort((a,b)=>grados.indexOf(a)-grados.indexOf(b));

  dashAulaSimpleBox.classList.toggle("hidden",dashModoAula.value!=="GRADO");
  dashAulasMultiplesBox.classList.toggle("hidden",dashModoAula.value!=="MULTIPLE");

  dashFiltroAula.innerHTML=gradosDisponibles.length
    ? gradosDisponibles.map(g=>`<option>${g}</option>`).join("")
    : '<option value="">Sin grados registrados</option>';

  dashAulasChecks.innerHTML="";
  gradosDisponibles.forEach(g=>{
    const label=document.createElement("label");
    label.style.display="inline-flex";
    label.style.alignItems="center";
    label.style.gap="5px";
    label.style.background="#f8fafc";
    label.style.border="1px solid #dbe4ef";
    label.style.padding="7px 10px";
    label.style.borderRadius="8px";
    label.innerHTML=`<input type="checkbox" class="dash-grado-check" value="${g}" checked style="width:auto;min-height:auto"> ${g}`;
    label.querySelector("input").addEventListener("change",actualizarDashboard);
    dashAulasChecks.appendChild(label);
  });
}

function registrosFiltradosDashboard(){
  let lista=registrosPermitidosPorPerfil();
  const sedeSel=dashFiltroSede?.value||"TODAS";
  const periodoSel=dashFiltroPeriodo?.value||"TODOS";
  const modo=dashModoAula?.value||"GENERAL";

  if(sedeSel!=="TODAS")lista=lista.filter(r=>r.sede===sedeSel);
  if(periodoSel!=="TODOS")lista=lista.filter(r=>r.periodo===periodoSel);

  if(modo==="GRADO"){
    const gradoSeleccionado=dashFiltroAula.value;
    lista=lista.filter(r=>r.grado===gradoSeleccionado);
  }

  if(modo==="MULTIPLE"){
    const seleccionados=[...document.querySelectorAll(".dash-grado-check:checked")]
      .map(x=>x.value);
    lista=lista.filter(r=>seleccionados.includes(r.grado));
  }

  return lista;
}

function calcularDetalleCursoRegistro(registro,alumno){
  const preguntas=getPreguntas(registro.grado);
  const agrupadas={};
  preguntas.forEach(q=>{
    if(!agrupadas[q.curso])agrupadas[q.curso]=[];
    agrupadas[q.curso].push(q);
  });

  return Object.entries(agrupadas).map(([curso,lista])=>{
    let total=0;
    lista.forEach(q=>{
      if(String(alumno.respuestas?.[`${curso}_${q.preg}`])==="1"){
        total+=Number(q.peso||1);
      }
    });
    const maximo=lista.reduce((s,q)=>s+Number(q.peso||1),0);
    const nivel=nivelPorRango(total,rangosCurso(registro.grado,curso,maximo));
    return{curso,total,maximo,nivel};
  });
}

function abrirDetallePrueba(indice){
  const registros=registrosFiltradosDashboard();
  const registro=registros[indice];
  if(!registro)return;

  detallePruebaPanel.classList.remove("hidden");
  detallePruebaTitulo.textContent=`Detalle: ${registro.sede} - ${registro.grado} ${registro.seccion} - ${registro.periodo}`;
  detallePruebaBody.innerHTML="";

  registro.alumnos.forEach(alumno=>{
    const detalle=calcularDetalleCursoRegistro(registro,alumno);
    const detalleTexto=detalle.map(d=>`${d.curso}: ${d.total.toFixed(2)}/${d.maximo.toFixed(2)} (${d.nivel})`).join("<br>");
    const tr=document.createElement("tr");
    tr.innerHTML=`
      <td>${alumno.nombre}</td>
      <td>${Number(alumno.total||0).toFixed(2)}</td>
      <td>${Number(alumno.promedio||0).toFixed(2)}</td>
      <td class="grade-${nivelGeneralPorGrado(Number(alumno.total||0),registro.grado)}">${nivelGeneralPorGrado(Number(alumno.total||0),registro.grado)}</td>
      <td>${detalleTexto}</td>`;
    detallePruebaBody.appendChild(tr);
  });

  detallePruebaPanel.scrollIntoView({behavior:"smooth",block:"start"});
}


function inicializarFiltrosSeguimiento(){
  if(!document.getElementById("segFiltroSede")||!currentUser)return;
  if(currentUser.perfil==="sede"){
    segFiltroSede.innerHTML=`<option>${currentUser.sede}</option>`;
    segFiltroSede.value=currentUser.sede;
    segFiltroSede.disabled=true;
  }else{
    segFiltroSede.innerHTML='<option value="TODAS">Todas las sedes visibles</option>'+sedes.map(s=>`<option>${s}</option>`).join("");
    segFiltroSede.disabled=false;
  }
}

function ordenNivel(nivel){
  return {C:1,B:2,A:3,AD:4}[nivel]||0;
}

function numeroBimestre(periodo){
  if(periodo.includes("1.er"))return 1;
  if(periodo.includes("2.º"))return 2;
  if(periodo.includes("3.er"))return 3;
  if(periodo.includes("4.º"))return 4;
  return 0;
}

function registrosSeguimientoFiltrados(){
  let lista=registrosPermitidosPorPerfil();
  const sedeSel=segFiltroSede?.value||"TODAS";
  const gradoSel=segFiltroGrado?.value||"TODOS";
  const seccionSel=segFiltroSeccion?.value||"TODAS";
  const periodosSeleccionados=[...document.querySelectorAll(".seg-bimestre-check:checked")].map(x=>x.value);
  if(sedeSel!=="TODAS")lista=lista.filter(r=>r.sede===sedeSel);
  if(gradoSel!=="TODOS")lista=lista.filter(r=>r.grado===gradoSel);
  if(seccionSel!=="TODAS")lista=lista.filter(r=>r.seccion===seccionSel);
  if(periodosSeleccionados.length)lista=lista.filter(r=>periodosSeleccionados.includes(r.periodo));
  else lista=[];
  return lista;
}

function recalcularNivelAlumnoRegistro(registro,alumno){
  if(Number.isFinite(Number(alumno.total))){
    return nivelGeneralPorGrado(Number(alumno.total),registro.grado);
  }
  return alumno.nivelFinal||"";
}

function actualizarSeguimiento(){
  if(!currentUser||!document.getElementById("seguimientoRiesgoBody"))return;

  const registros=registrosSeguimientoFiltrados();
  const filtroNivel=segFiltroNivel.value;
  const bimestresSeleccionados=[...document.querySelectorAll(".seg-bimestre-check:checked")].length;

  if(bimestresSeleccionados===0){
    seguimientoRiesgoBody.innerHTML='<tr><td colspan="8">Seleccione al menos un bimestre.</td></tr>';
    seguimientoAvanceBody.innerHTML='<tr><td colspan="10">Seleccione al menos un bimestre para realizar la comparación.</td></tr>';
    segTotalAD.textContent=0;
    segTotalA.textContent=0;
    segTotalB.textContent=0;
    segTotalC.textContent=0;
    segTotalRiesgo.textContent=0;
    segAlertas.textContent=0;
    segMejoras.textContent=0;
    return;
  }
  seguimientoRiesgoBody.innerHTML="";
  seguimientoAvanceBody.innerHTML="";

  let totalAD=0,totalA=0,totalB=0,totalC=0,totalAlertas=0,totalMejoras=0;
  const historico={};

  registros.forEach(registro=>{
    registro.alumnos.forEach(alumno=>{
      const nivel=recalcularNivelAlumnoRegistro(registro,alumno);
      if(nivel==="AD")totalAD++;
      if(nivel==="A")totalA++;
      if(nivel==="B")totalB++;
      if(nivel==="C")totalC++;

      const mostrar=filtroNivel==="TODOS"||filtroNivel===nivel;
      if(mostrar){
        const tr=document.createElement("tr");
        tr.innerHTML=`
          <td>${registro.sede}</td><td>${registro.grado}</td><td>${registro.seccion}</td><td>${registro.periodo}</td>
          <td>${alumno.nombre}</td><td>${Number(alumno.total||0).toFixed(2)}</td><td>${Number(alumno.promedio||0).toFixed(2)}</td>
          <td class="grade-${nivel}">${nivel}</td>`;
        seguimientoRiesgoBody.appendChild(tr);
      }

      const key=`${registro.sede}|${registro.grado}|${registro.seccion}|${alumno.nombre}`;
      if(!historico[key])historico[key]={sede:registro.sede,grado:registro.grado,seccion:registro.seccion,alumno:alumno.nombre,bimestres:{}};
      historico[key].bimestres[numeroBimestre(registro.periodo)]={nivel,total:Number(alumno.total||0),promedio:Number(alumno.promedio||0)};
    });
  });

  if(!seguimientoRiesgoBody.children.length){
    seguimientoRiesgoBody.innerHTML='<tr><td colspan="8">No existen alumnos para los filtros seleccionados.</td></tr>';
  }

  Object.values(historico).forEach(item=>{
    let estado="Sin variación",detalle="No hay suficientes bimestres para comparar.",alerta=false,mejora=false;
    const disponibles=Object.keys(item.bimestres).map(Number).sort((a,b)=>a-b);

    if(disponibles.length>=2){
      const cambios=[];
      let bajas=0,subidas=0,iguales=0;
      let mayorCaida=0;
      let mayorMejora=0;

      for(let i=1;i<disponibles.length;i++){
        const ant=disponibles[i-1],act=disponibles[i];
        const nivelAnt=item.bimestres[ant].nivel,nivelAct=item.bimestres[act].nivel;
        const diferencia=ordenNivel(nivelAct)-ordenNivel(nivelAnt);

        if(diferencia<0){
          bajas++;
          mayorCaida=Math.min(mayorCaida,diferencia);
          cambios.push(`B${ant} ${nivelAnt} → B${act} ${nivelAct}: retroceso`);
        }else if(diferencia>0){
          subidas++;
          mayorMejora=Math.max(mayorMejora,diferencia);
          cambios.push(`B${ant} ${nivelAnt} → B${act} ${nivelAct}: mejora`);
        }else{
          iguales++;
          cambios.push(`B${ant} ${nivelAnt} → B${act} ${nivelAct}: se mantiene`);
        }
      }

      if(bajas>0 && subidas===0){
        alerta=true;
        totalAlertas++;
        if(bajas>=2){
          estado="ALERTA ALTA: retroceso sostenido";
        }else if(mayorCaida<=-2){
          estado="ALERTA ALTA: caída significativa";
        }else{
          estado="ALERTA: bajó un nivel";
        }
      }else if(subidas>0 && bajas===0){
        mejora=true;
        totalMejoras++;
        estado=subidas>=2?"MEJORA SOSTENIDA":"MEJORA";
      }else if(subidas>0 && bajas>0){
        if(ordenNivel(item.bimestres[disponibles.at(-1)].nivel) > ordenNivel(item.bimestres[disponibles[0]].nivel)){
          mejora=true;
          totalMejoras++;
          estado="EVOLUCIÓN POSITIVA CON VARIACIONES";
        }else if(ordenNivel(item.bimestres[disponibles.at(-1)].nivel) < ordenNivel(item.bimestres[disponibles[0]].nivel)){
          alerta=true;
          totalAlertas++;
          estado="ALERTA: tendencia final descendente";
        }else{
          estado="RESULTADO VARIABLE";
        }
      }else{
        estado="SE MANTIENE";
      }

      detalle=cambios.join(" | ");
    }

    const celdas=[1,2,3,4].map(b=>{
      const d=item.bimestres[b];
      return d?`<td class="grade-${d.nivel}">${d.nivel}<br><small>${d.total.toFixed(2)} pts</small></td>`:"<td>-</td>";
    }).join("");

    const tr=document.createElement("tr");
    tr.innerHTML=`<td>${item.sede}</td><td>${item.grado}</td><td>${item.seccion}</td><td>${item.alumno}</td>${celdas}
      <td style="font-weight:bold;color:${alerta?"#b42318":mejora?"#15803d":"#64748b"};background:${alerta?"#fee2e2":mejora?"#dcfce7":"#f8fafc"}">${estado}</td><td>${detalle}</td>`;
    seguimientoAvanceBody.appendChild(tr);
  });

  if(!seguimientoAvanceBody.children.length){
    seguimientoAvanceBody.innerHTML='<tr><td colspan="10">No existen registros para comparar entre bimestres.</td></tr>';
  }

  segTotalAD.textContent=totalAD;
  segTotalA.textContent=totalA;
  segTotalB.textContent=totalB;
  segTotalC.textContent=totalC;
  segTotalRiesgo.textContent=totalAD+totalA+totalB+totalC;
  segAlertas.textContent=totalAlertas;
  segMejoras.textContent=totalMejoras;
}



let bulkStudentsRows=[];

function bulkEl(id){return document.getElementById(id)}

function normalizarCabeceraCargaMasiva(value){
  return String(value||"").trim().toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^A-Z0-9]+/g,"_").replace(/^_+|_+$/g,"");
}

function normalizarTextoCargaMasiva(value){
  return String(value??"").trim().replace(/\s+/g," ");
}

function normalizarGradoCargaMasiva(value){
  const raw=normalizarTextoCargaMasiva(value);
  const key=raw.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[.°º]/g,"").replace(/\s+/g," ");
  const map={
    "1 SECUNDARIA":"1.º Secundaria","1ERO SECUNDARIA":"1.º Secundaria","1RO SECUNDARIA":"1.º Secundaria",
    "2 SECUNDARIA":"2.º Secundaria","2DO SECUNDARIA":"2.º Secundaria",
    "3 SECUNDARIA":"3.º Secundaria","3ERO SECUNDARIA":"3.º Secundaria","3RO SECUNDARIA":"3.º Secundaria",
    "4 SECUNDARIA":"4.º Secundaria","4TO SECUNDARIA":"4.º Secundaria",
    "5 SECUNDARIA":"5.º Secundaria","5TO SECUNDARIA":"5.º Secundaria",
    "4 PRE":"4.º Pre","4TO PRE":"4.º Pre",
    "5 PRE":"5.º Pre","5TO PRE":"5.º Pre"
  };
  return grados.includes(raw)?raw:(map[key]||raw);
}

function normalizarPeriodoCargaMasiva(value){
  const raw=normalizarTextoCargaMasiva(value);
  const key=raw.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[.°º]/g,"").replace(/\s+/g," ");
  if(["TODOS","TODO","TODOS LOS BIMESTRES"].includes(key))return "TODOS";
  const map={
    "1 BIMESTRE":"1.er Bimestre","1ER BIMESTRE":"1.er Bimestre","PRIMER BIMESTRE":"1.er Bimestre",
    "2 BIMESTRE":"2.º Bimestre","2DO BIMESTRE":"2.º Bimestre","SEGUNDO BIMESTRE":"2.º Bimestre",
    "3 BIMESTRE":"3.er Bimestre","3ER BIMESTRE":"3.er Bimestre","TERCER BIMESTRE":"3.er Bimestre",
    "4 BIMESTRE":"4.º Bimestre","4TO BIMESTRE":"4.º Bimestre","CUARTO BIMESTRE":"4.º Bimestre"
  };
  const validos=["1.er Bimestre","2.º Bimestre","3.er Bimestre","4.º Bimestre"];
  return validos.includes(raw)?raw:(map[key]||raw);
}

function validarFilaCargaMasiva(row,index){
  const sede=normalizarTextoCargaMasiva(row.SEDE).toUpperCase();
  const grado=normalizarGradoCargaMasiva(row.GRADO);
  const seccion=normalizarTextoCargaMasiva(row.SECCION).toUpperCase();
  const periodo=normalizarPeriodoCargaMasiva(row.PERIODO);
  const nombre=normalizarTextoCargaMasiva(row.NOMBRE_COMPLETO||row.ALUMNO||row.ESTUDIANTE||row.NOMBRE);
  const errores=[];
  if(!sedes.includes(sede))errores.push("Sede no reconocida");
  if(!grados.includes(grado))errores.push("Grado no reconocido");
  if(!["A","B","C","D","E","F"].includes(seccion))errores.push("Sección inválida");
  if(!["TODOS","1.er Bimestre","2.º Bimestre","3.er Bimestre","4.º Bimestre"].includes(periodo))errores.push("Periodo inválido");
  if(!nombre)errores.push("Nombre vacío");
  return {fila:index+2,sede,grado,seccion,periodo,nombre,valido:errores.length===0,errores};
}

function convertirMatrizCargaMasiva(matrix){
  if(!Array.isArray(matrix)||!matrix.length)return [];
  const headers=(matrix[0]||[]).map(normalizarCabeceraCargaMasiva);
  const aliases={
    SEDE:["SEDE","CAMPUS"],GRADO:["GRADO","NIVEL_GRADO"],SECCION:["SECCION","AULA_SECCION"],
    PERIODO:["PERIODO","BIMESTRE"],NOMBRE_COMPLETO:["NOMBRE_COMPLETO","APELLIDOS_Y_NOMBRES","ALUMNO","ESTUDIANTE","NOMBRE"]
  };
  const positions={};
  Object.entries(aliases).forEach(([key,names])=>{positions[key]=headers.findIndex(h=>names.includes(h));});
  const faltantes=Object.entries(positions).filter(([,i])=>i<0).map(([k])=>k);
  if(faltantes.length)throw new Error("Faltan columnas obligatorias: "+faltantes.join(", "));
  return matrix.slice(1).filter(r=>Array.isArray(r)&&r.some(v=>normalizarTextoCargaMasiva(v))).map((r,i)=>validarFilaCargaMasiva({
    SEDE:r[positions.SEDE],GRADO:r[positions.GRADO],SECCION:r[positions.SECCION],PERIODO:r[positions.PERIODO],NOMBRE_COMPLETO:r[positions.NOMBRE_COMPLETO]
  },i));
}

function parseCsvCargaMasiva(text){
  const lines=String(text||"").replace(/^\uFEFF/,"").split(/\r?\n/).filter(x=>x.trim());
  if(!lines.length)return [];
  const delimiter=(lines[0].match(/;/g)||[]).length>=(lines[0].match(/,/g)||[]).length?";":",";
  return lines.map(line=>{
    const out=[];let current="",quoted=false;
    for(let i=0;i<line.length;i++){
      const ch=line[i];
      if(ch==='"'&&line[i+1]==='"'){current+='"';i++;continue;}
      if(ch==='"'){quoted=!quoted;continue;}
      if(ch===delimiter&&!quoted){out.push(current);current="";}else current+=ch;
    }
    out.push(current);return out;
  });
}


function valorCeldaExcelCargaMasiva(value){
  if(value===null||value===undefined)return "";
  if(value instanceof Date)return value.toISOString();
  if(typeof value!=="object")return value;
  if("text" in value)return value.text;
  if("result" in value)return value.result;
  if(Array.isArray(value.richText))return value.richText.map(x=>x.text||"").join("");
  if("hyperlink" in value)return value.text||value.hyperlink||"";
  return String(value);
}

function setProgresoCargaMasiva(message,visible=true){
  const el=bulkEl("bulkStudentsProgress");
  if(!el)return;
  el.style.display=visible?"block":"none";
  el.textContent=message||"";
}

function esperarSincronizacionDisponible(timeoutMs=30000){
  return new Promise((resolve,reject)=>{
    const inicio=Date.now();
    const timer=setInterval(()=>{
      if(!syncFlushing){clearInterval(timer);resolve(true);return;}
      if(Date.now()-inicio>timeoutMs){clearInterval(timer);reject(new Error("La sincronización anterior no terminó a tiempo."));}
    },200);
  });
}

async function leerArchivoCargaMasivaAlumnos(event){
  if(!currentUser||currentUser.perfil!=="admin"){alert("Esta opción es exclusiva del Administrador.");return;}
  const file=event.target.files?.[0];if(!file)return;
  try{
    setProgresoCargaMasiva("Leyendo y validando el archivo...");
    let matrix=[];
    if(/\.csv$/i.test(file.name)){
      matrix=parseCsvCargaMasiva(await file.text());
    }else{
      const buffer=await file.arrayBuffer();
      const workbook=new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const sheet=workbook.worksheets[0];
      sheet.eachRow({includeEmpty:false},row=>matrix.push(row.values.slice(1).map(valorCeldaExcelCargaMasiva)));
    }
    bulkStudentsRows=convertirMatrizCargaMasiva(matrix);
    renderVistaPreviaCargaMasiva();
    const validas=bulkStudentsRows.filter(r=>r.valido).length;
    mostrarEstadoCargaMasiva(`Archivo leído: ${bulkStudentsRows.length} fila(s); ${validas} válida(s).`,false);
    setProgresoCargaMasiva("Archivo listo para guardar.");
  }catch(error){
    console.error(error);bulkStudentsRows=[];renderVistaPreviaCargaMasiva();mostrarEstadoCargaMasiva(error.message||"No se pudo leer el archivo.",true);setProgresoCargaMasiva("",false);
  }
}

function renderVistaPreviaCargaMasiva(){
  const body=bulkEl("bulkStudentsPreviewBody");if(!body)return;
  body.innerHTML="";
  if(!bulkStudentsRows.length){body.innerHTML='<tr><td colspan="7">Seleccione un archivo para visualizar los estudiantes.</td></tr>';}
  bulkStudentsRows.slice(0,500).forEach((r,i)=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`<td>${i+1}</td><td>${escaparHtmlAdmin(r.sede)}</td><td>${escaparHtmlAdmin(r.grado)}</td><td>${escaparHtmlAdmin(r.seccion)}</td><td>${escaparHtmlAdmin(r.periodo)}</td><td>${escaparHtmlAdmin(r.nombre)}</td><td class="${r.valido?'bulk-valid':'bulk-error'}">${r.valido?'Válido':escaparHtmlAdmin(r.errores.join('; '))}</td>`;
    body.appendChild(tr);
  });
  const valid=bulkStudentsRows.filter(r=>r.valido).length;
  if(bulkEl("bulkStudentsValidCount"))bulkEl("bulkStudentsValidCount").value=valid;
  if(bulkEl("bulkStudentsErrorCount"))bulkEl("bulkStudentsErrorCount").value=bulkStudentsRows.length-valid;
}

function mostrarEstadoCargaMasiva(message,error=false){
  const el=bulkEl("bulkStudentsStatus");if(!el)return;
  el.style.display="block";el.style.background=error?"#fee2e2":"#eef6ff";el.style.color=error?"#991b1b":"#15324b";el.textContent=message;
}

function limpiarCargaMasivaAlumnos(){
  bulkStudentsRows=[];
  const input=bulkEl("bulkStudentsFile");if(input)input.value="";
  renderVistaPreviaCargaMasiva();
  if(bulkEl("bulkStudentsStatus"))bulkEl("bulkStudentsStatus").style.display="none";
}

function descargarPlantillaCargaMasivaCSV(){
  const rows=[
    ["SEDE","GRADO","SECCION","PERIODO","NOMBRE_COMPLETO"],
    ["BELISARIO","1.º Secundaria","A","1.er Bimestre","Ana Torres Salazar"],
    ["BELISARIO","1.º Secundaria","A","TODOS","Bruno Díaz Ramos"],
    ["BELLAVISTA","2.º Secundaria","B","2.º Bimestre","Carla Mendoza Ruiz"],
    ["INGENIEROS","4.º Pre","A","TODOS","Diego Flores Vega"],
    ["SAN MIGUEL","5.º Secundaria","C","3.er Bimestre","Elena Castro León"]
  ];
  const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(";")).join("\n");
  const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="plantilla_carga_masiva_alumnos.csv";a.click();URL.revokeObjectURL(url);
}


function descargarErroresCargaMasiva(){
  const rows=bulkStudentsRows.filter(r=>!r.valido);
  if(!rows.length){alert("No existen filas con observaciones.");return;}
  const data=[["FILA","SEDE","GRADO","SECCION","PERIODO","NOMBRE_COMPLETO","OBSERVACIONES"],
    ...rows.map(r=>[r.fila,r.sede,r.grado,r.seccion,r.periodo,r.nombre,r.errores.join("; ")])];
  const csv=data.map(row=>row.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(";")).join("\n");
  const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="observaciones_carga_masiva.csv";a.click();URL.revokeObjectURL(url);
}

async function procesarCargaMasivaAlumnos(){
  if(!currentUser||currentUser.perfil!=="admin"){
    alert("Esta opción es exclusiva del Administrador.");
    return;
  }

  const boton=bulkEl("bulkStudentsSaveButton");
  const validas=bulkStudentsRows.filter(r=>r.valido);
  if(!validas.length){
    mostrarEstadoCargaMasiva("No existen filas válidas para guardar. Revise las observaciones.",true);
    return;
  }

  const invalidas=bulkStudentsRows.length-validas.length;
  if(invalidas&&!confirm(`Hay ${invalidas} fila(s) con observaciones. ¿Desea guardar únicamente las ${validas.length} filas válidas?`))return;

  const modo=bulkEl("bulkStudentsMode")?.value||"AGREGAR";
  if(modo==="REEMPLAZAR"&&!confirm("El modo Reemplazar sustituirá la lista de cada aula y bimestre incluidos. ¿Desea continuar?"))return;

  if(boton){boton.disabled=true;boton.textContent="Guardando...";}
  setProgresoCargaMasiva("Preparando listas por sede, grado, sección y bimestre...");

  try{
    const periodos=["1.er Bimestre","2.º Bimestre","3.er Bimestre","4.º Bimestre"];
    const grupos=new Map();

    validas.forEach(r=>{
      const periodosFila=r.periodo==="TODOS"?periodos:[r.periodo];
      periodosFila.forEach(p=>{
        const key=`notas_${r.sede}_${r.grado}_${r.seccion}_${p}`;
        if(!grupos.has(key))grupos.set(key,{key,sede:r.sede,grado:r.grado,seccion:r.seccion,periodo:p,nombres:[]});
        grupos.get(key).nombres.push(r.nombre);
      });
    });

    const cambios=[];
    let agregados=0,duplicados=0,contextos=0;

    for(const g of grupos.values()){
      let existente;
      try{existente=JSON.parse(nativeStorageGet(g.key)||"null");}catch{existente=null;}
      if(!existente)existente={sede:g.sede,grado:g.grado,seccion:g.seccion,periodo:g.periodo,alumnos:[],fecha:new Date().toISOString()};

      const anteriores=new Map((existente.alumnos||[]).map(a=>[normalizarNombreAlumno(a.nombre),a]));
      const nuevos=[];
      const vistos=new Set();

      g.nombres.forEach(nombre=>{
        const normalizado=normalizarNombreAlumno(nombre);
        if(!normalizado||vistos.has(normalizado)){duplicados++;return;}
        vistos.add(normalizado);
        if(anteriores.has(normalizado)){
          nuevos.push(anteriores.get(normalizado));
          duplicados++;
        }else{
          nuevos.push({nombre,respuestas:{},total:0,promedio:0,nivelFinal:""});
          agregados++;
        }
      });

      if(modo==="AGREGAR"){
        anteriores.forEach((alumno,nombreNormalizado)=>{
          if(!vistos.has(nombreNormalizado))nuevos.push(alumno);
        });
      }

      existente.sede=g.sede;
      existente.grado=g.grado;
      existente.seccion=g.seccion;
      existente.periodo=g.periodo;
      existente.alumnos=nuevos;
      existente.fecha=new Date().toISOString();

      const serialized=JSON.stringify(existente);
      nativeStorageSetItem.call(localStorage,g.key,serialized);
      enqueueSheetsSync(g.key,serialized,"set");
      cambios.push(g.key);
      contextos++;
    }

    actualizarDashboard();
    actualizarSeguimiento();
    cargarAlumnosAdministracion();

    if(!googleSheetsConfigured()){
      mostrarEstadoCargaMasiva(`Carga local completada: ${agregados} nuevo(s), ${duplicados} coincidencia(s), ${contextos} lista(s). Configure Google Sheets para sincronizar.`,true);
      return;
    }

    setProgresoCargaMasiva(`Enviando ${cambios.length} lista(s) a Google Sheets...`);
    await esperarSincronizacionDisponible();
    const sincronizado=await flushSyncQueue();
    const pendientes=cambios.filter(key=>Boolean(readSyncQueue()[key]));

    if(sincronizado&&pendientes.length===0){
      mostrarEstadoCargaMasiva(`Carga completada y verificada en Google Sheets: ${agregados} estudiante(s) nuevo(s), ${duplicados} coincidencia(s), ${contextos} lista(s) actualizada(s).`,false);
      setProgresoCargaMasiva("Sincronización confirmada con Google Sheets.");
    }else{
      mostrarEstadoCargaMasiva(`La carga local se completó, pero ${pendientes.length} lista(s) siguen pendientes de sincronización. Use “Enviar cambios” o revise la implementación del Web App.`,true);
      setProgresoCargaMasiva("Los cambios pendientes permanecen en la cola y no se perderán.");
    }
  }catch(error){
    console.error("Error en carga masiva",error);
    mostrarEstadoCargaMasiva("No se pudo completar la carga masiva: "+(error.message||error),true);
    setProgresoCargaMasiva("Revise el archivo y la conexión con Google Sheets.");
  }finally{
    if(boton){boton.disabled=false;boton.textContent="Guardar estudiantes";}
  }
}

function adminEl(id){
  return document.getElementById(id);
}

function inicializarGestionAlumnos(){
  const sel=adminEl("adminAlumSede");
  if(!sel)return;
  sel.innerHTML='<option value="">Seleccione sede</option>'+sedes.map(s=>`<option>${s}</option>`).join("");
}

function validarAdministradorAlumnos(){
  if(!currentUser||currentUser.perfil!=="admin"){
    alert("Esta función está disponible únicamente para el Administrador.");
    return false;
  }
  return true;
}

function obtenerFiltrosGestionAlumnos(){
  return {
    sede:adminEl("adminAlumSede")?.value||"",
    grado:adminEl("adminAlumGrado")?.value||"",
    seccion:adminEl("adminAlumSeccion")?.value||"",
    periodo:adminEl("adminAlumPeriodo")?.value||"",
    alcance:adminEl("adminAlumAlcance")?.value||"PERIODO",
    buscar:normalizarNombreAlumno(adminEl("adminAlumBuscar")?.value||"")
  };
}

function obtenerRegistrosGestionAlumnos(){
  if(!validarAdministradorAlumnos())return [];
  const f=obtenerFiltrosGestionAlumnos();
  if(!f.sede||!f.grado||!f.seccion)return [];
  return registrosPermitidosPorPerfil().filter(r=>
    r.sede===f.sede&&r.grado===f.grado&&r.seccion===f.seccion&&
    (f.alcance==="AULA_COMPLETA"||r.periodo===f.periodo)
  );
}

function normalizarNombreAlumno(nombre){
  return String(nombre||"").trim().toLocaleLowerCase("es");
}

function escaparHtmlAdmin(value){
  return String(value??"")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/\"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function cargarAlumnosAdministracion(){
  const body=adminEl("adminAlumBody");
  if(!body)return;
  body.innerHTML="";
  if(!currentUser||currentUser.perfil!=="admin")return;

  const f=obtenerFiltrosGestionAlumnos();
  if(!f.sede||!f.grado||!f.seccion){
    body.innerHTML='<tr><td colspan="8">Seleccione sede, grado y sección.</td></tr>';
    adminEl("adminAlumTotal").textContent="0";
    adminEl("adminAlumRegistros").textContent="0";
    adminEl("adminAlumSeleccionados").textContent="0";
    return;
  }

  const registros=obtenerRegistrosGestionAlumnos();
  const mapa=new Map();
  registros.forEach(registro=>{
    (registro.alumnos||[]).forEach(alumno=>{
      const key=normalizarNombreAlumno(alumno.nombre);
      if(f.buscar&&!key.includes(f.buscar))return;
      if(!mapa.has(key))mapa.set(key,{nombre:alumno.nombre,periodos:new Set(),niveles:new Set()});
      const item=mapa.get(key);
      item.periodos.add(registro.periodo);
      if(alumno.nivelFinal)item.niveles.add(alumno.nivelFinal);
    });
  });

  [...mapa.values()].sort((a,b)=>a.nombre.localeCompare(b.nombre,"es")).forEach(item=>{
    const periodos=[...item.periodos].join(", ");
    const niveles=[...item.niveles].join(", ")||"-";
    const safeName=escaparHtmlAdmin(item.nombre);
    const encoded=encodeURIComponent(item.nombre);
    const tr=document.createElement("tr");
    tr.innerHTML=`
      <td><input type="checkbox" class="admin-alumno-check" data-nombre-encoded="${encoded}" style="width:auto;min-height:auto" onchange="actualizarConteoSeleccionAdmin()"></td>
      <td><strong>${safeName}</strong></td><td>${escaparHtmlAdmin(f.sede)}</td><td>${escaparHtmlAdmin(f.grado)}</td><td>${escaparHtmlAdmin(f.seccion)}</td>
      <td>${escaparHtmlAdmin(periodos)}</td><td>${escaparHtmlAdmin(niveles)}</td>
      <td style="white-space:nowrap">
        <button class="btn-primary" onclick="editarAlumnoAdmin(decodeURIComponent('${encoded}'))">Editar</button>
        <button class="btn-red" onclick="eliminarAlumnoIndividualAdmin(decodeURIComponent('${encoded}'))">Eliminar</button>
      </td>`;
    body.appendChild(tr);
  });

  if(!body.children.length){
    body.innerHTML='<tr><td colspan="8">No existen alumnos para los filtros seleccionados.</td></tr>';
  }
  adminEl("adminAlumTotal").textContent=String(mapa.size);
  adminEl("adminAlumRegistros").textContent=String(registros.length);
  adminEl("adminAlumSeleccionados").textContent="0";
  const seleccionarTodos=adminEl("adminAlumSeleccionarTodos");
  if(seleccionarTodos){seleccionarTodos.checked=false;seleccionarTodos.indeterminate=false;}
}

function seleccionarTodosAlumnosAdmin(checked){
  document.querySelectorAll(".admin-alumno-check").forEach(x=>x.checked=checked);
  actualizarConteoSeleccionAdmin();
}

function actualizarConteoSeleccionAdmin(){
  const checks=[...document.querySelectorAll(".admin-alumno-check")];
  const count=checks.filter(x=>x.checked).length;
  const selected=adminEl("adminAlumSeleccionados");
  if(selected)selected.textContent=String(count);
  const all=adminEl("adminAlumSeleccionarTodos");
  if(all){
    all.checked=checks.length>0&&checks.every(x=>x.checked);
    all.indeterminate=checks.some(x=>x.checked)&&!checks.every(x=>x.checked);
  }
}

function nombresSeleccionadosAdmin(){
  return [...document.querySelectorAll(".admin-alumno-check:checked")]
    .map(x=>decodeURIComponent(x.dataset.nombreEncoded||""))
    .filter(Boolean);
}

async function comandoAdminGoogleSheets(action,payload){
  if(!googleSheetsConfigured())return {ok:false,localOnly:true};
  try{
    return await jsonpCommandGoogleSheets(action,payload);
  }catch(jsonpError){
    console.warn("JSONP administrativo no disponible, se intentará POST:",jsonpError);
    return await postToGoogleSheets(Object.assign({action},payload));
  }
}

async function editarAlumnoAdmin(nombreActual){
  if(!validarAdministradorAlumnos())return;
  const f=obtenerFiltrosGestionAlumnos();
  if(!f.sede||!f.grado||!f.seccion){alert("Seleccione sede, grado y sección.");return;}
  const nuevoNombre=prompt("Ingrese el nuevo nombre completo del estudiante:",nombreActual);
  if(nuevoNombre===null)return;
  const limpio=String(nuevoNombre).trim().replace(/\s+/g," ");
  if(!limpio){alert("El nombre no puede estar vacío.");return;}
  if(normalizarNombreAlumno(limpio)===normalizarNombreAlumno(nombreActual))return;

  const registros=registrosPermitidosPorPerfil().filter(r=>
    r.sede===f.sede&&r.grado===f.grado&&r.seccion===f.seccion
  );
  const existeDuplicado=registros.some(r=>(r.alumnos||[]).some(a=>
    normalizarNombreAlumno(a.nombre)===normalizarNombreAlumno(limpio)&&
    normalizarNombreAlumno(a.nombre)!==normalizarNombreAlumno(nombreActual)
  ));
  if(existeDuplicado){alert("Ya existe un estudiante con ese nombre en el aula.");return;}
  if(!confirm(`¿Cambiar el nombre de ${nombreActual} a ${limpio} en todos los bimestres del aula?`))return;

  let actualizados=0;
  registros.forEach(registro=>{
    let cambio=false;
    (registro.alumnos||[]).forEach(a=>{
      if(normalizarNombreAlumno(a.nombre)===normalizarNombreAlumno(nombreActual)){
        a.nombre=limpio;
        cambio=true;
        actualizados++;
      }
    });
    if(cambio){
      const key=`notas_${registro.sede}_${registro.grado}_${registro.seccion}_${registro.periodo}`;
      localStorage.setItem(key,JSON.stringify(registro));
      if(claveContextoActual()===key){
        alumnos=registro.alumnos;
        renderCargaPreguntas();
        updateSummary();
      }
    }
  });

  if(!actualizados){alert("No se encontró el estudiante en los registros locales.");return;}

  try{
    const respuesta=await comandoAdminGoogleSheets("updateStudent",{
      sede:f.sede,grado:f.grado,seccion:f.seccion,
      nombreActual,nuevoNombre:limpio
    });
    setSheetsStatus(respuesta.opaque?"Actualización enviada a Google Sheets.":"Nombre actualizado en Google Sheets.");
  }catch(error){
    console.error(error);
    setSheetsStatus("El nombre se actualizó localmente, pero Google Sheets reportó: "+error.message,true);
  }

  const status=adminEl("adminAlumStatus");
  if(status){
    status.style.display="block";
    status.style.background="#eef6ff";
    status.style.color="#15324b";
    status.textContent=`Se actualizó el nombre en ${actualizados} registro(s) bimestrales.`;
  }
  cargarAlumnosAdministracion();
  actualizarDashboard();
  actualizarSeguimiento();
}

async function eliminarAlumnoIndividualAdmin(nombre){
  if(!validarAdministradorAlumnos())return;
  const f=obtenerFiltrosGestionAlumnos();
  const alcanceTexto=f.alcance==="AULA_COMPLETA"?"todos los bimestres del aula":"el bimestre seleccionado";
  if(!confirm(`¿Eliminar a ${nombre} de ${alcanceTexto}? Esta acción también eliminará sus notas y resultados asociados.`))return;
  await ejecutarEliminacionAlumnosAdmin([nombre]);
}

async function eliminarAlumnosSeleccionados(){
  if(!validarAdministradorAlumnos())return;
  const nombres=nombresSeleccionadosAdmin();
  if(!nombres.length){alert("Seleccione al menos un alumno.");return;}
  const f=obtenerFiltrosGestionAlumnos();
  const alcanceTexto=f.alcance==="AULA_COMPLETA"?"todos los bimestres del aula":"el bimestre seleccionado";
  if(!confirm(`¿Eliminar ${nombres.length} alumno(s) de ${alcanceTexto}? Se eliminarán sus notas y resultados asociados.`))return;
  await ejecutarEliminacionAlumnosAdmin(nombres);
}

async function ejecutarEliminacionAlumnosAdmin(nombres){
  if(!validarAdministradorAlumnos())return;
  const f=obtenerFiltrosGestionAlumnos();
  const registros=obtenerRegistrosGestionAlumnos();
  if(!registros.length){alert("No existen registros para eliminar con los filtros seleccionados.");return;}
  const objetivo=new Set(nombres.map(normalizarNombreAlumno));
  let eliminados=0;
  const cambios=[];

  registros.forEach(registro=>{
    const antes=(registro.alumnos||[]).length;
    registro.alumnos=(registro.alumnos||[]).filter(a=>!objetivo.has(normalizarNombreAlumno(a.nombre)));
    const diferencia=antes-registro.alumnos.length;
    if(diferencia>0){
      eliminados+=diferencia;
      const key=`notas_${registro.sede}_${registro.grado}_${registro.seccion}_${registro.periodo}`;
      cambios.push({key,registro});
    }
  });

  if(!eliminados){alert("No se encontró ningún alumno para eliminar.");return;}

  // Actualiza primero la base remota. Si falla, conserva los datos locales para evitar inconsistencias.
  try{
    const respuesta=await comandoAdminGoogleSheets("deleteStudents",{
      sede:f.sede,grado:f.grado,seccion:f.seccion,periodo:f.periodo,
      alcance:f.alcance,nombres
    });
    setSheetsStatus(respuesta.opaque?"Eliminación enviada a Google Sheets.":"Alumnos eliminados en Google Sheets.");
  }catch(error){
    console.error(error);
    setSheetsStatus("No se pudo eliminar en Google Sheets: "+error.message,true);
    alert("No se completó la eliminación porque Google Sheets no confirmó la operación. Actualice Code.gs y publique una nueva versión del Web App.");
    return;
  }

  cambios.forEach(({key,registro})=>{
    localStorage.setItem(key,JSON.stringify(registro));
    sessionStorage.removeItem("borrador_"+key);
    if(claveContextoActual()===key){
      alumnos=registro.alumnos;
      renderCargaPreguntas();
      updateSummary();
    }
  });

  const status=adminEl("adminAlumStatus");
  if(status){
    status.style.display="block";
    status.style.background="#eef6ff";
    status.style.color="#15324b";
    status.textContent=`Se eliminaron ${eliminados} registro(s) de alumno. La lista, notas, resultados y estadísticas fueron actualizadas.`;
  }
  cargarAlumnosAdministracion();
  actualizarDashboard();
  actualizarSeguimiento();
}

function registrosVisibles(){
  return registrosFiltradosDashboard();
}
function calcularNotaGeneralAlumno(registro,alumno){
  const preguntas=getPreguntas(registro.grado);
  const maximoTotal=preguntas.reduce((s,q)=>s+Number(q.peso||1),0);

  let puntajeObtenido=0;
  preguntas.forEach(q=>{
    const valor=alumno.respuestas?.[`${q.curso}_${q.preg}`];
    if(String(valor)==="1")puntajeObtenido+=Number(q.peso||1);
  });

  if(maximoTotal<=0)return null;
  return (puntajeObtenido/maximoTotal)*20;
}

function actualizarDashboard(){
  if(!currentUser)return;

  const items=registrosVisibles();
  const counts={AD:0,A:0,B:0,C:0};
  const sedesVisibles=new Set();
  let totalAlumnos=0;
  let sumaPromedios=0;
  let cantidadPromedios=0;
  let totalPreguntas=0;

  const detalleCurso={};

  items.forEach(registro=>{
    sedesVisibles.add(registro.sede);
    totalAlumnos+=registro.alumnos.length;

    const preguntas=getPreguntas(registro.grado);
    totalPreguntas=Math.max(totalPreguntas,preguntas.length);

    const preguntasPorCurso={};
    preguntas.forEach(q=>{
      if(!preguntasPorCurso[q.curso])preguntasPorCurso[q.curso]=[];
      preguntasPorCurso[q.curso].push(q);
    });

    registro.alumnos.forEach(alumno=>{
      const notaGeneral=calcularNotaGeneralAlumno(registro,alumno);
      if(notaGeneral!==null && Number.isFinite(notaGeneral)){
        sumaPromedios+=notaGeneral;
        cantidadPromedios++;
      }

      Object.entries(preguntasPorCurso).forEach(([curso,lista])=>{
        let totalCurso=0;
        lista.forEach(q=>{
          const valor=alumno.respuestas?.[`${curso}_${q.preg}`];
          if(String(valor)==="1")totalCurso+=Number(q.peso||1);
        });

        const maximo=lista.reduce((s,q)=>s+Number(q.peso||1),0);
        const rangos=rangosCurso(registro.grado,curso,maximo);
        const nivel=nivelPorRango(totalCurso,rangos);

        counts[nivel]=(counts[nivel]||0)+1;

        if(!detalleCurso[curso])detalleCurso[curso]={AD:0,A:0,B:0,C:0,total:0};
        detalleCurso[curso][nivel]++;
        detalleCurso[curso].total++;
      });
    });
  });

  dashAlumnos.textContent=totalAlumnos;
  dashSedes.textContent=sedesVisibles.size;
  dashRegistros.textContent=items.length;
  dashPromedio.textContent=cantidadPromedios?(sumaPromedios/cantidadPromedios).toFixed(1):"0.0";
  dashPreguntas.textContent=totalPreguntas;

  renderCharts(counts);
  renderDetalleCursos(detalleCurso);
}

function renderDetalleCursos(detalleCurso){
  let panel=document.getElementById("detalleCursosPanel");
  if(!panel){
    panel=document.createElement("div");
    panel.id="detalleCursosPanel";
    panel.className="panel";
    panel.innerHTML=`
      <h3>Conteo de niveles por curso</h3>
      <div class="table-wrap" style="max-height:none">
        <table class="compact-table">
          <thead>
            <tr>
              <th>Curso</th>
              <th>AD</th>
              <th>A</th>
              <th>B</th>
              <th>C</th>
              <th>Total evaluaciones</th>
            </tr>
          </thead>
          <tbody id="detalleCursosBody"></tbody>
        </table>
      </div>`;
    document.getElementById("dashboard").appendChild(panel);
  }

  const body=document.getElementById("detalleCursosBody");
  body.innerHTML="";

  Object.entries(detalleCurso)
    .sort((a,b)=>a[0].localeCompare(b[0]))
    .forEach(([curso,d])=>{
      const tr=document.createElement("tr");
      tr.innerHTML=`
        <td>${curso}</td>
        <td class="grade-AD">${d.AD}</td>
        <td class="grade-A">${d.A}</td>
        <td class="grade-B">${d.B}</td>
        <td class="grade-C">${d.C}</td>
        <td>${d.total}</td>`;
      body.appendChild(tr);
    });

  if(!Object.keys(detalleCurso).length){
    body.innerHTML='<tr><td colspan="6">No existen notas guardadas para los filtros visibles.</td></tr>';
  }
}

function renderCharts(c){
  const labels=["AD","A","B","C"];
  const data=labels.map(x=>c[x]||0);
  const colors=["#2563eb","#16a34a","#f59e0b","#dc2626"];

  if(barChart)barChart.destroy();
  if(pieChart)pieChart.destroy();

  const barCanvas=document.getElementById("barChart");
  const pieCanvas=document.getElementById("pieChart");

  barChart=new Chart(barCanvas,{
    type:"bar",
    data:{
      labels,
      datasets:[{
        label:"Conteo de niveles por curso",
        data,
        backgroundColor:colors
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      plugins:{legend:{display:false}},
      scales:{y:{beginAtZero:true,ticks:{precision:0}}}
    }
  });

  pieChart=new Chart(pieCanvas,{
    type:"doughnut",
    data:{
      labels,
      datasets:[{
        data,
        backgroundColor:colors
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      plugins:{legend:{position:"bottom"}}
    }
  });
}

function renderUsers(){usersBody.innerHTML="";getUsers().forEach((u,i)=>{const tr=document.createElement("tr");tr.innerHTML=`<td><input class="uu" value="${u.usuario}"></td><td><input class="up" value="${u.password}"></td><td><select class="ur"><option value="admin" ${u.perfil==="admin"?"selected":""}>Administrador</option><option value="general" ${u.perfil==="general"?"selected":""}>Administrador Académico</option><option value="sede" ${u.perfil==="sede"?"selected":""}>Sede</option></select></td><td><select class="us"><option>TODAS</option>${sedes.map(s=>`<option ${s===u.sede?"selected":""}>${s}</option>`).join("")}</select></td><td><button class="btn-red" onclick="eliminarUsuario(${i})">Eliminar</button></td>`;usersBody.appendChild(tr)})}
function agregarUsuario(){const u=getUsers();u.push({usuario:"nuevo",password:"cambiar123",perfil:"sede",sede:sedes[0]});localStorage.setItem("usuariosSistema",JSON.stringify(u));renderUsers()}
function eliminarUsuario(i){const u=getUsers();if(u[i].usuario==="admin"){alert("No se puede eliminar el administrador principal.");return}u.splice(i,1);localStorage.setItem("usuariosSistema",JSON.stringify(u));renderUsers()}
async function guardarUsuarios(){
  const u=[...usersBody.querySelectorAll("tr")].map(r=>({
    usuario:r.querySelector(".uu").value,
    password:r.querySelector(".up").value,
    perfil:r.querySelector(".ur").value,
    sede:r.querySelector(".ur").value==="sede"?r.querySelector(".us").value:"TODAS"
  }));
  localStorage.setItem("usuariosSistema",JSON.stringify(u));
  const synced=await sincronizarClaveAhora("usuariosSistema");
  alert(synced?"Usuarios guardados y sincronizados.":"Usuarios guardados localmente; sincronización pendiente.");
}


function retirarDatosVisualesAutogenerados(){
  const nombresDemo=new Set([
    "Ana Torres Salazar","Bruno Díaz Ramos","Carla Mendoza Ruiz","Diego Flores Vega","Elena Castro León",
    "Fabio Rojas Peña","Gabriela Núñez Soto","Hugo Paredes Silva","Isabel Chávez Luna","Jorge Mejía Campos",
    "Karen Salas Ortiz","Luis Herrera Mora","María Vega Ruiz","Nicolás Pérez Soto","Olivia Ramos Díaz",
    "Pablo Castro León","Rosa Mendoza Peña","Sergio Torres Campos","Tatiana Flores Ortiz","Víctor Chávez Silva",
    "Wendy Herrera Luna","Ximena Salas Mora","Yahir Pérez Vega","Zoe Núñez Ramos","Álvaro Rojas Soto"
  ]);

  for(let i=localStorage.length-1;i>=0;i--){
    const key=localStorage.key(i);
    if(!key||!key.startsWith("notas_"))continue;
    try{
      const registro=JSON.parse(localStorage.getItem(key));
      const lista=Array.isArray(registro?.alumnos)?registro.alumnos:[];
      if(lista.length && lista.every(a=>nombresDemo.has(a.nombre))){
        localStorage.removeItem(key);
      }
    }catch(error){
      console.warn("No se pudo revisar el registro local",key,error);
    }
  }

  localStorage.removeItem("datosMuestraCreados");
  localStorage.removeItem("ejemplosVisualesCompletos");
}

retirarDatosVisualesAutogenerados();

loginPassword.addEventListener("keydown",e=>{if(e.key==="Enter")login()});

/* CONEXION COMPLETA CON GOOGLE SHEETS */
const GOOGLE_SHEETS_DEFAULT_URL = "https://script.google.com/macros/s/AKfycbxFXmuRuyXFKMMurZ3_wzkyjt6bRb_pWhBgvzDbhA6rgUYeCFHoxNfWc-N2D9FZF6C7/exec";
let GOOGLE_SHEETS_WEB_APP_URL = localStorage.getItem("GOOGLE_SHEETS_WEB_APP_URL") || GOOGLE_SHEETS_DEFAULT_URL;
const SYNC_QUEUE_KEY="__SHEETS_SYNC_QUEUE_V2__";
const SYNC_ALLOWED_KEYS=new Set(["usuariosSistema","preguntasPorGrado","rangosGrado","rangosCurso"]);
const nativeStorageSetItem=Storage.prototype.setItem;
const nativeStorageRemoveItem=Storage.prototype.removeItem;
let syncFlushTimer=null;
let syncFlushing=false;
let syncPaused=false;

function googleSheetsConfigured(){
  return /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(GOOGLE_SHEETS_WEB_APP_URL);
}

function isSyncableKey(key){
  key=String(key);
  return SYNC_ALLOWED_KEYS.has(key)||key.startsWith("notas_");
}

function setSheetsStatus(message,error=false){
  const el=document.getElementById("sheetsConnectionStatus");
  if(!el)return;
  el.style.display="block";
  el.style.background=error?"#fee2e2":"#eef6ff";
  el.style.color=error?"#991b1b":"#15324b";
  el.textContent=message;
}

function fnv1aHash(text){
  let hash=0x811c9dc5;
  text=String(text??"");
  for(let i=0;i<text.length;i++){
    hash^=text.charCodeAt(i);
    hash=Math.imul(hash,0x01000193);
  }
  return (hash>>>0).toString(16).padStart(8,"0");
}

function readSyncQueue(){
  try{return JSON.parse(nativeStorageGet(SYNC_QUEUE_KEY)||"{}")}catch{return {}}
}
function nativeStorageGet(key){return Storage.prototype.getItem.call(localStorage,key)}
function saveSyncQueue(queue){nativeStorageSetItem.call(localStorage,SYNC_QUEUE_KEY,JSON.stringify(queue))}

function enqueueSheetsSync(key,value,operation="set"){
  key=String(key);
  if(syncPaused||!isSyncableKey(key))return;
  const queue=readSyncQueue();
  queue[key]={operation,value:operation==="set"?String(value):"",updatedAt:Date.now(),attempts:0};
  saveSyncQueue(queue);
  scheduleSyncFlush();
}

function scheduleSyncFlush(delay=500){
  clearTimeout(syncFlushTimer);
  syncFlushTimer=setTimeout(()=>flushSyncQueue(),delay);
}

Storage.prototype.setItem=function(key,value){
  nativeStorageSetItem.call(this,key,value);
  if(this===localStorage)enqueueSheetsSync(key,value,"set");
};
Storage.prototype.removeItem=function(key){
  nativeStorageRemoveItem.call(this,key);
  if(this===localStorage)enqueueSheetsSync(key,"","delete");
};

function jsonpRequest(action,params={},timeoutMs=30000){
  return new Promise((resolve,reject)=>{
    if(!googleSheetsConfigured())return reject(new Error("URL del Web App no configurada."));
    const callback="__gs_cb_"+Date.now()+"_"+Math.random().toString(36).slice(2);
    const script=document.createElement("script");
    const timer=setTimeout(()=>cleanup(new Error("Tiempo de espera agotado.")),timeoutMs);
    function cleanup(error,data){
      clearTimeout(timer);
      try{delete window[callback]}catch{}
      script.remove();
      error?reject(error):resolve(data);
    }
    window[callback]=data=>cleanup(null,data);
    const query=new URLSearchParams({action,callback,...Object.fromEntries(Object.entries(params).map(([k,v])=>[k,String(v)]))});
    script.src=GOOGLE_SHEETS_WEB_APP_URL+"?"+query.toString();
    script.onerror=()=>cleanup(new Error("No se pudo leer la respuesta del Web App."));
    document.head.appendChild(script);
  });
}

async function postCommand(payload){
  if(!googleSheetsConfigured())throw new Error("URL del Web App no configurada.");
  const body=new URLSearchParams({payload:JSON.stringify(payload)}).toString();
  await fetch(GOOGLE_SHEETS_WEB_APP_URL,{
    method:"POST",
    mode:"no-cors",
    headers:{"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"},
    body,
    cache:"no-store"
  });
  return true;
}

async function verifyRemoteItem(key,value,shouldExist=true){
  const expectedHash=fnv1aHash(value);
  const expectedLength=String(value).length;
  for(let attempt=0;attempt<8;attempt++){
    await new Promise(r=>setTimeout(r,700+attempt*300));
    try{
      const meta=await jsonpRequest("verifyItem",{key});
      if(!shouldExist && meta?.ok && !meta.exists)return true;
      if(shouldExist && meta?.ok && meta.exists && meta.hash===expectedHash && Number(meta.length)===expectedLength)return true;
    }catch(error){console.warn("Verificación pendiente",error)}
  }
  return false;
}

async function sendQueueEntry(key,entry){
  if(entry.operation==="delete"){
    await postCommand({action:"deleteItem",key});
    return verifyRemoteItem(key,"",false);
  }
  await postCommand({action:"setItem",key,value:entry.value});
  return verifyRemoteItem(key,entry.value,true);
}

async function flushSyncQueue(){
  if(syncFlushing||syncPaused||!googleSheetsConfigured())return false;
  syncFlushing=true;
  let allOk=true;
  try{
    let queue=readSyncQueue();
    const keys=Object.keys(queue).sort((a,b)=>(queue[a].updatedAt||0)-(queue[b].updatedAt||0));
    if(!keys.length){setSheetsStatus("Google Sheets sincronizado.");return true}
    setSheetsStatus(`Sincronizando ${keys.length} cambio(s) con Google Sheets...`);
    for(const key of keys){
      const current=readSyncQueue()[key];
      if(!current)continue;
      try{
        const ok=await sendQueueEntry(key,current);
        queue=readSyncQueue();
        if(ok){delete queue[key]}
        else{
          queue[key]={...current,attempts:(current.attempts||0)+1,lastError:"No se confirmó el guardado"};
          allOk=false;
        }
        saveSyncQueue(queue);
      }catch(error){
        console.error("Error de sincronización",key,error);
        queue=readSyncQueue();
        if(queue[key])queue[key]={...queue[key],attempts:(queue[key].attempts||0)+1,lastError:error.message};
        saveSyncQueue(queue);
        allOk=false;
      }
    }
    const pending=Object.keys(readSyncQueue()).length;
    if(pending){
      setSheetsStatus(`${pending} cambio(s) pendientes. Se reintentará automáticamente.`,true);
      scheduleSyncFlush(5000);
    }else setSheetsStatus("Todos los cambios están sincronizados con Google Sheets.");
    return allOk&&pending===0;
  }finally{syncFlushing=false}
}

async function sincronizarClaveAhora(key){
  key=String(key);
  if(!isSyncableKey(key))return true;
  const value=nativeStorageGet(key);
  if(value===null)enqueueSheetsSync(key,"","delete");
  else enqueueSheetsSync(key,value,"set");
  await flushSyncQueue();
  return !readSyncQueue()[key];
}

async function probarConexionGoogleSheets(){
  setSheetsStatus("Verificando conexión con Google Sheets...");
  try{
    const data=await jsonpRequest("ping");
    if(!data?.ok)throw new Error(data?.error||"Respuesta inválida.");
    setSheetsStatus(`Conectado a ${data.nombre||"Google Sheets"}. Sincronización bidireccional activa.`);
    return true;
  }catch(error){
    console.error(error);
    setSheetsStatus("No se pudo acceder al Web App: "+error.message,true);
    return false;
  }
}

async function sincronizarDesdeGoogleSheets(options={}){
  if(!googleSheetsConfigured())return false;
  const force=Boolean(options.force);
  try{
    if(!force&&Object.keys(readSyncQueue()).length){setSheetsStatus("Hay cambios locales pendientes. Envíelos antes de recargar la hoja.",true);return false;}
    syncPaused=true;
    setSheetsStatus("Cargando Usuarios, Preguntas, Rangos, Estudiantes y Notas desde Google Sheets...");
    const data=await jsonpRequest("snapshot",{t:Date.now()},90000);
    if(!data?.ok)throw new Error(data?.error||"No se pudo obtener la información.");
    const remoteItems=data.items||{},remoteKeys=new Set(Object.keys(remoteItems).filter(isSyncableKey)),localKeys=[];
    for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(isSyncableKey(key))localKeys.push(key);}
    localKeys.forEach(key=>{if(!remoteKeys.has(key))nativeStorageRemoveItem.call(localStorage,key);});
    for(const [key,value] of Object.entries(remoteItems)){if(isSyncableKey(key))nativeStorageSetItem.call(localStorage,key,String(value));}
    refrescarInterfazDespuesDeCarga_();
    const sourceCount=Object.keys(data.sources||{}).length;
    setSheetsStatus(`Información cargada desde Google Sheets: ${remoteKeys.size} conjunto(s), ${sourceCount} fuente(s) tabular(es).`);
    return true;
  }catch(error){console.error(error);setSheetsStatus("No se pudo cargar Google Sheets: "+error.message,true);return false;}finally{syncPaused=false;}
}


function refrescarInterfazDespuesDeCarga_(){
  if(!currentUser)return;
  const updatedUser=getUsers().find(u=>u.usuario===currentUser.usuario);
  if(!updatedUser){logout();alert("El usuario actual ya no existe o fue desactivado en Google Sheets.");return;}
  currentUser=updatedUser;aplicarPermisos();
  if(typeof renderPreguntasConfig==="function")renderPreguntasConfig();
  if(typeof cargarRangosGrado==="function")cargarRangosGrado();
  if(typeof renderUsers==="function"&&currentUser.perfil==="admin")renderUsers();
  if(typeof actualizarDashboard==="function")actualizarDashboard();
  if(typeof actualizarSeguimiento==="function")actualizarSeguimiento();
  if(typeof cargarListaDelContexto==="function"&&contextoActualCompleto())cargarListaDelContexto();
}
async function recargarDesdeGoogleSheets(){
  if(Object.keys(readSyncQueue()).length){const continuar=confirm("Existen cambios locales pendientes. Si continúa, se reemplazarán con la información actual de Google Sheets. ¿Desea continuar?");if(!continuar)return;saveSyncQueue({});}
  await sincronizarDesdeGoogleSheets({force:true});
}

async function sincronizarTodoConGoogleSheets(){
  if(!googleSheetsConfigured()){alert("La URL del Web App no es válida.");return}
  for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i);
    if(isSyncableKey(key))enqueueSheetsSync(key,localStorage.getItem(key),"set");
  }
  const ok=await flushSyncQueue();
  alert(ok?"Toda la información fue sincronizada y verificada en Google Sheets.":"La información quedó en cola; revise el estado de conexión.");
}

async function comandoAdminGoogleSheets(action,payload){
  await postCommand({action,...payload});
  // Las operaciones administrativas modifican varias claves; se vuelve a cargar el estado confirmado.
  await new Promise(r=>setTimeout(r,1200));
  return {ok:true};
}

window.addEventListener("online",()=>scheduleSyncFlush(200));
window.addEventListener("DOMContentLoaded",()=>{
  sheetsInitialLoadPromise=(async()=>{
    const connected=await probarConexionGoogleSheets();
    if(!connected)return false;
    const pending=Object.keys(readSyncQueue()).length;
    if(pending)await flushSyncQueue();
    if(Object.keys(readSyncQueue()).length===0)return sincronizarDesdeGoogleSheets({force:true});
    setSheetsStatus("Existen cambios locales pendientes; use Enviar cambios o Cargar desde hoja.",true);
    return false;
  })();
});

function configurarUrlGoogleSheets(url){
  const valor=String(url||"").trim();
  if(!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(valor))throw new Error("Ingrese una URL válida que termine en /exec.");
  nativeStorageSetItem.call(localStorage,"GOOGLE_SHEETS_WEB_APP_URL",valor);
  GOOGLE_SHEETS_WEB_APP_URL=valor;
  window.location.reload();
}
