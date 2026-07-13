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


NOTA: Esta version no carga ejemplos visuales ni datos de demostracion. Los modulos inician sin registros precargados.


CONEXION ACTIVA CONFIGURADA
---------------------------
URL Web App:
https://script.google.com/macros/s/AKfycbxFXmuRuyXFKMMurZ3_wzkyjt6bRb_pWhBgvzDbhA6rgUYeCFHoxNfWc-N2D9FZF6C7/exec

IMPORTANTE:
1. Pegue el Code.gs actualizado en Apps Script.
2. Ejecute configurarSistema una vez y acepte permisos.
3. Vuelva a implementar la aplicación web usando una NUEVA VERSION.
4. Ejecutar como: usted.
5. Acceso: cualquier usuario con el enlace, o todos los usuarios de su organización que usarán el sistema.
6. Abra index.html y pulse Probar conexión.

La lectura usa JSONP para funcionar incluso desde file://. El guardado usa POST y tiene respaldo no-cors para navegadores que bloqueen CORS.
