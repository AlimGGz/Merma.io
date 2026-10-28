# CONTEO VERDE – Versión corregida para GitHub Pages (v2)

## ¿Qué se corrigió?

La primera versión necesitaba `app.js` y `data/recipes.json` en rutas concretas. Si se subía solo `index.html`, la búsqueda no funcionaba. Esta versión **no hace solicitudes de red para las recetas** y **contiene todos los archivos necesarios en un solo `index.html`**. No necesita carpetas ni archivos adicionales.

## Instalación (la más fácil)

1. Descarga el `index.html` de la versión completa o extrae el ZIP corregido.
2. Abre tu repositorio en GitHub. En la raíz (mismo nivel donde aparece el `README`) selecciona **Add file → Upload files**.
3. Sube el **archivo `index.html` corregido** y confirma **Commit changes**. Si GitHub pregunta si quieres sustituir el archivo previo, confírmalo.
4. En **Settings → Pages**, revisa que esté configurado `Deploy from a branch` → rama `main` → `/(root)`.
5. Abre la URL de tu GitHub Pages y actualiza forzando caché con **Ctrl+Shift+R** (Windows). Si es necesario, añade `?v=2` al final de la URL.
6. En la barra verde debes ver **Catálogo listo: 6,610 recetas**. Busca por ejemplo `Mocha`, `Caramel Macchiato` o `Toffe Nut Latte`.

**Muy importante:** descomprime el ZIP antes de subir el archivo. No subas el ZIP como si fuera la aplicación web ni coloques `index.html` dentro de una subcarpeta si Pages apunta a `/(root)`.

## Privacidad del recetario

**Versión completa:** incluye las 6,610 recetas, 17,059 renglones de insumos y su información detallada incrustada en el HTML, por lo que **quedarán públicamente accesibles si publicas este archivo mediante GitHub Pages**. Verifica autorización de la empresa para compartirlas.

**Versión privada:** contiene solo el buscador y la interfaz en un `index.html` independiente, sin datos corporativos. Al abrirla, pulsa **Cargar catálogo JSON**, elige el archivo `Conteo_Verde_Catalogo_Recetas.json` de tu dispositivo y procede a buscar. En este modo **debes cargar el JSON al abrir una sesión nueva**, pero no necesitas almacenarlo en GitHub.

**GitHub Pages no ofrece control de acceso a los archivos publicados.** Tener el repositorio privado no vuelve privadas las recetas de una página pública.

## Prueba rápida

1. Confirmar el número **6,610** en la parte superior (versión completa).
2. Escribir `Mocha` en el buscador: deben aparecer recetas.
3. Seleccionar `Mocha Blanco`, elegir `Grande` y escribir `3` bebidas.
4. Verificar que se desglosen insumos y que el botón **Agregar a merma** funcione.
5. Exportar **CSV** y abrirlo en Excel.

Los cálculos se basan únicamente en los renglones del PDF de recetas del 26/10/2026. Algunos artículos reflejan solo empaques o subrecetas con ceros; no se inventan cantidades de leche, café o jarabes ausentes. El registro se guarda en el navegador, no en el servidor.
