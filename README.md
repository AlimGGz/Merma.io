# Conteo Verde — Merma de bebidas

Aplicación web estática y responsiva para consultar recetas, seleccionar su presentación y calcular el consumo de insumos para un registro de merma. No necesita backend ni instalación de paquetes JavaScript.

**Fuente del catálogo:** `RECETAS.pdf` (reporte *Recipe Card*, SB_Corp_Polanco, fechado **26/10/2026**). El archivo suministrado contiene **6,610 fichas** y **17,059 renglones de insumos**. El PDF original **no está incluido** en el paquete web.

## Funciones

- Buscar por nombre y elegir el tamaño disponible, según las fichas.
- Elegir cuántas bebidas se mermaron.
- Consultar cantidades con la **unidad original del PDF** y la página de referencia.
- Desglosar subrecetas (por ejemplo, una porción de jarabe) cuando coincide el nombre y la unidad de rendimiento de la receta auxiliar. Una subreceta de lote se prorratea conforme a su rendimiento declarado.
- Mostrar u ocultar cantidades cero, conservar ajustes negativos y advertir sobre faltantes probables.
- Registrar varias bebidas y consolidar insumos repetidos **solo si comparten nombre y unidad**.
- Escribir SAP de cada insumo (el PDF no incluye una columna SAP explícita).
- Incorporar insumos manuales sin cambiar las fichas del catálogo.
- Exportar un resumen y un detalle como CSV en UTF-8, delimitado por punto y coma (abrible en Excel).
- Conservar lista, SAP y datos de tienda/responsable en el almacenamiento del **mismo navegador/dispositivo**. No hay sincronización en la nube.

## Publicación en GitHub Pages

1. **Descomprime** el archivo ZIP descargado.
2. Crea un repositorio GitHub, por ejemplo `conteo-verde-mermas`.
3. Sube al **nivel raíz** del repositorio los archivos `index.html`, `styles.css`, `app.js`, `.nojekyll`, `README.md` y la carpeta `data/` con `recipes.json`. La carpeta `scripts/` es opcional: sirve para actualizar el catálogo fuera de la web.
4. Abre **Settings → Pages → Build and deployment → Source → Deploy from a branch**.
5. Elige **main** y **/(root)**; guarda los cambios.
6. Visita la URL de Pages que GitHub indique para tu repositorio. Para un repositorio estándar suele tener la forma `https://TU_USUARIO.github.io/conteo-verde-mermas/`.

**No subas el ZIP sin descomprimir**: GitHub Pages necesita ver `index.html` en la raíz publicada.

Documentación oficial: https://docs.github.com/es/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

### ⚠️ Privacidad y uso interno

**GitHub Pages publica sitios accesibles desde Internet, incluso si el repositorio es privado (cuando el plan lo permite).** Si subes `data/recipes.json` al sitio, el catálogo detallado de recetas también será descargable por terceros. **Verifica antes de publicarlo que tengas autorización para divulgar las recetas corporativas.**

Si **NO** tienes autorización para publicar las recetas:

- Utiliza el paquete alternativo `conteo_verde_sin_datos_publicos.zip` o simplemente omite `data/recipes.json` al subir los archivos.
- Conserva el catálogo JSON **fuera de GitHub Pages**, en tu equipo o un sistema interno autorizado.
- Al abrir la app, desplázate hasta el final y usa **«abrir un JSON de recetas»** para cargar temporalmente el archivo privado desde tu dispositivo. Así el servidor público no almacena esas recetas.
- En esta modalidad el JSON se debe cargar de nuevo en cada sesión; la aplicación no lo sube a ningún servidor.

## Probar localmente

Un navegador puede bloquear la carga del JSON cuando abres `index.html` con doble clic. Para probar con los datos incluidos:

```bash
cd conteo_verde_mermas
python3 -m http.server 8000
```

Y abre `http://localhost:8000/`. Esto tampoco requiere internet.

## Actualizar el catálogo cuando tengas un PDF nuevo

Para el formato PDF de **Crystal Reports / Recipe Card** empleado aquí, el proyecto incluye un extractor:

```bash
python3 scripts/extraer_recetas.py NUEVO_REPORTE.pdf data/recipes.json
```

Requisitos para actualizar los datos: Python 3 y la herramienta `pdftotext` de Poppler instalada localmente. La herramienta cancela la generación si detecta filas de insumos que no pudo interpretar. Valida una muestra de recetas antes de usar un nuevo reporte; el extractor no funciona necesariamente con otros formatos de PDF.

Al terminar, reemplaza `data/recipes.json` por el archivo nuevo y vuelve a subirlo **solo si la publicación del catálogo está autorizada**. El extractor intenta leer automáticamente la fecha y la tienda del encabezado; comprueba que los metadatos del JSON resultante sean correctos.

## Advertencias de cálculo

1. **No se inventan consumos que no figuren en el reporte.** Por ejemplo, «Latte Alto» puede registrar una subreceta de empaque con cantidades cero, sin consumos de leche o espresso. No se interpreta como la receta completa de preparación.
2. Algunos nombres de producto del PDF aparecen abreviados o truncados. Se conservan exactamente como se extrajeron.
3. Las cantidades **cero** no forman parte de los totales, salvo que actives su visualización para revisarlas.
4. Las cantidades **negativas** se conservan en el cálculo neto, pues pueden representar ajustes o créditos en el reporte. Revisa si son adecuadas para la merma que quieres registrar.
5. Se expanden las referencias a subrecetas por **coincidencia exacta de nombre**, salvo diferencias de mayúsculas/acentos/espacios. Si las unidades entre la referencia y el rendimiento no coinciden, no se expande y se emite un aviso.
6. Si hay **nombres duplicados** de subreceta, se usa la primera ficha y se genera un aviso. El archivo original contiene un nombre repetido.
7. Las unidades `ONZ: Onza`, `ONZ: OnzaFluida`, `ML: Mililitro`, `GR: Gramo` y otras no se convierten ni combinan entre sí sin una tabla de equivalencias autorizada.
8. Los archivos CSV sirven como **soporte de captura**; la aplicación **no envía ni registra automáticamente** ajustes en WOE, SAP u otro sistema de inventario.

## Estructura

```text
index.html                 Página y formularios
styles.css                 Diseño responsivo
app.js                     Buscador, cálculos, bitácora y CSV
data/recipes.json          Catálogo extraído del PDF (dato sensible)
scripts/extraer_recetas.py Extractor para futuros PDFs del mismo formato
.nojekyll                  GitHub Pages sirve el sitio directamente
README.md                  Este instructivo
```

## Licencia y datos

Esta entrega no concede licencia sobre las recetas, marcas ni otros materiales de terceros del PDF original. Su uso y publicación están sujetos a las autorizaciones de sus titulares.
