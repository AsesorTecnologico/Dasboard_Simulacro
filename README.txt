PROYECTO SISTEMA DE EVALUACION - SINCRONIZACION COMPLETA

ARCHIVOS
- index.html
- styles.css
- app.js
- Code.gs
- plantilla_carga_masiva_alumnos.xlsx
- plantilla_carga_masiva_alumnos.csv

INSTALACION OBLIGATORIA
1. Abra la hoja de Google Sheets vinculada.
2. Extensiones > Apps Script.
3. Reemplace TODO el contenido de Code.gs por el archivo incluido.
4. Ejecute configurarSistema una vez y autorice.
5. Implementar > Administrar implementaciones > Editar.
6. Seleccione Nueva version y pulse Implementar.
7. Mantenga la URL /exec configurada en app.js.
8. Sirva la carpeta por HTTP (no file://): python -m http.server 8000
9. Abra http://localhost:8000

MEJORAS DE SINCRONIZACION
- Cola persistente de cambios con reintentos automaticos.
- Confirmacion real por hash y longitud antes de marcar sincronizado.
- Sincronizacion de usuarios, preguntas, rangos, estudiantes, notas y resultados.
- Registros grandes divididos en fragmentos para evitar el limite de 50 000 caracteres por celda.
- Recuperacion desde Google Sheets al abrir la pagina.
- Guardado local seguro cuando no hay internet, con reintento al recuperar conexion.

IMPORTANTE
Cada vez que cambie Code.gs debe publicar una NUEVA VERSION de la aplicacion web.


CORRECCION DE CARGA DESDE GOOGLE SHEETS
========================================
Esta version lee datos directamente de las hojas tabulares, aunque Datos_Sistema este vacia.
Hojas compatibles: Usuarios, Preguntas o Configuracion_Preguntas, Rangos_Grado, Rangos_Curso, Estudiantes, Evaluaciones, Notas o Respuestas, Resultados o Resultados_Generales.

Despues de reemplazar Code.gs debe publicar una NUEVA VERSION del Web App.
Use "Cargar desde hoja" para reemplazar el estado local con la informacion de Google Sheets.
Use "Enviar cambios" para escribir cambios locales a Google Sheets.


CORRECCION DE CARGA MASIVA
---------------------------
- La carga masiva ahora guarda cada contexto en localStorage y lo agrega explícitamente a la cola de sincronización.
- Espera a que termine cualquier sincronización anterior antes de enviar los nuevos registros.
- Confirma cada lista mediante hash antes de mostrar que fue sincronizada.
- Permite descargar las filas con observaciones.
- Admite celdas de Excel con texto, fórmulas, resultados, texto enriquecido e hipervínculos.
- Si la conexión falla, los cambios quedan pendientes y no se pierden.

Después de reemplazar Code.gs, publique una NUEVA VERSION de la aplicación web.
