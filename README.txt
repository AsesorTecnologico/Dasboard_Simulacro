PROYECTO DE EVALUACION - ARCHIVOS SEPARADOS

ARCHIVOS
1. index.html     Interfaz y estructura visual.
2. styles.css     Diseno, colores, tablas y vistas responsivas.
3. app.js         Logica completa del sistema y conexion con Google Sheets.
4. Code.gs        Backend de Google Apps Script conectado a la hoja:
                  1nKwAcJ7xsg8TA8TraNTUebRcZM1_QtYbfGG580sOd98
5. appsscript.json Configuracion del proyecto Apps Script.

INSTALACION DE GOOGLE APPS SCRIPT
1. Abra la hoja de calculo.
2. Extensiones > Apps Script.
3. Pegue Code.gs en el archivo Code.gs.
4. En Configuracion del proyecto, active mostrar appsscript.json y reemplacelo por el incluido.
5. Ejecute configurarSistema() una vez y autorice.
6. Implementar > Nueva implementacion > Aplicacion web.
7. Copie la URL que termina en /exec.

CONFIGURACION DEL FRONTEND
Opcion A: abra app.js y reemplace PEGAR_AQUI_URL_DEL_WEB_APP por la URL /exec.
Opcion B: abra la pagina, presione F12 y ejecute:
configurarUrlGoogleSheets("SU_URL_TERMINADA_EN_EXEC")

EJECUCION LOCAL
Los archivos separados deben permanecer en la misma carpeta.
Abra index.html mediante un servidor local, por ejemplo:
python -m http.server 8000
Luego visite http://localhost:8000

NOTA
Abrir index.html directamente con file:// puede limitar solicitudes fetch en algunos navegadores.


GESTION DE ALUMNOS (SOLO ADMINISTRADOR)
- Nuevo modulo Gestion de alumnos.
- Eliminacion individual o masiva.
- Alcance: bimestre seleccionado o todos los bimestres del aula.
- Elimina lista, notas, resultados y actualiza estadisticas.
- Requiere volver a publicar Code.gs como nueva version del Web App.


GESTION ADMINISTRATIVA DE ALUMNOS
- Solo el perfil Administrador puede editar o eliminar alumnos.
- La edición cambia el nombre en todos los bimestres del aula.
- La eliminación puede aplicarse al bimestre seleccionado o a todos los bimestres del aula.
- Después de reemplazar Code.gs, publique una NUEVA VERSION del Web App.
