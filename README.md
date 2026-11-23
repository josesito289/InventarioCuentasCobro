# InventarioCuentasCobro

PWA de gestión de inventario y generación de cuentas de cobro. Funciona
100% sin conexión una vez instalada, guarda todo localmente en el
dispositivo y permite generar/restaurar un respaldo en JSON.

**Versión actual:** 1.1.0 — ver [`CHANGELOG.md`](./CHANGELOG.md) para el
detalle de cambios de cada versión.

## 1. Subir a GitHub

1. Crea un repositorio nuevo en GitHub llamado **`InventarioCuentasCobro`**
   (público o privado, ambos funcionan con GitHub Pages).
2. Descomprime este ZIP y sube **todo el contenido** (no la carpeta,
   sino los archivos `index.html`, `manifest.json`, `sw.js`, las carpetas
   `css/`, `js/`, `icons/`, etc.) a la raíz del repositorio.
   - Desde la web de GitHub: botón "Add file" → "Upload files" → arrastra
     todo el contenido descomprimido.
   - O por línea de comandos:
     ```
     git init
     git add .
     git commit -m "Primera versión"
     git branch -M main
     git remote add origin https://github.com/TU_USUARIO/InventarioCuentasCobro.git
     git push -u origin main
     ```

## 2. Activar GitHub Pages

1. En el repositorio: **Settings → Pages**.
2. En "Build and deployment" → "Source" elige **"Deploy from a branch"**.
3. Branch: **main**, carpeta: **/ (root)**. Guarda.
4. Espera 1-2 minutos. Tu app quedará disponible en:
   `https://TU_USUARIO.github.io/InventarioCuentasCobro/`

> **Importante:** si cambias el nombre del repositorio por otro distinto
> a `InventarioCuentasCobro`, debes editar `manifest.json` y reemplazar
> `/InventarioCuentasCobro/` por `/NOMBRE-DE-TU-REPO/` en los campos
> `"id"`. Esto evita que Android marque la app como "ya instalada" por
> compartir un id de manifest genérico con otra PWA.

## 3. Instalar en el Moto G24 (o cualquier Android con Chrome)

1. Abre Chrome en el teléfono y entra a la URL de tu GitHub Pages.
2. Toca el menú (⋮) → **"Instalar app"** o **"Añadir a pantalla de
   inicio"**. Chrome también puede mostrar un banner automático de
   instalación.
3. La app aparecerá como un ícono independiente, en modo pantalla
   completa (sin la barra de Chrome), tal como una app nativa.
4. A partir de ese momento funciona sin internet: todo el código y los
   datos se guardan en el propio teléfono.

## 4. Uso de la app

- **Pestaña "Registro"**:
  - Arriba, **"Saldos por tercero"**: elige una compañía y consulta de
    inmediato cuánto te debe (total pendiente, incluyendo pagos
    parciales) y cuánto te ha comprado en total.
  - Registra entradas de inventario o genera cuentas de cobro (salidas).
    Al elegir "Cta. Cobro (Salida)" la app te pide la **compañía** a la
    que va dirigida (puedes crear una nueva al vuelo) y el **estado**
    (PENDIENTE, PAGADO o PAGO PARCIAL — este último despliega el campo
    de valor abonado).
  - Administra el catálogo de productos (manual o importando
    CSV/TXT/XLSX).
- **Pestaña "Editar / Hist."**:
  - Busca un registro por su Llave ID, modifícalo (incluyendo el estado
    de pago) o anúlalo.
  - Cada cuenta de cobro muestra su **Tercero**, **Saldo** y **Fecha de
    pago**, y un botón **"Descargar cuenta de cobro"** para volver a
    generar el `.rtf` cuando quieras (ya no solo al momento de crearla).
  - El histórico se puede **filtrar por tercero**, y muestra Tercero,
    Estado y Saldo de cada movimiento.
- **Pestaña "Hist. Productos"**: consulta el historial de movimientos
  filtrando por producto, y ve de un vistazo la columna **Existencias**
  (entradas menos salidas, es decir lo disponible para la venta).
- **⚙️ (arriba a la derecha)**: administra tus **compañías** (puedes
  tener varias, cada una con su nombre y NIT) y tus datos fijos como
  quien cobra (nombre, cédula, celular, dirección, ciudad). Completa al
  menos una compañía y tus datos antes de generar la primera cuenta de
  cobro.
- **Respaldo**: el botón "Respaldo JSON" descarga un archivo con todos
  los productos, registros y compañías. Guárdalo en un lugar seguro
  (Drive, correo, etc.) de vez en cuando. "Cargar respaldo" lo restaura
  por completo (reemplaza los datos actuales).

## 5. Generar la cuenta de cobro en Word

Al generar una cuenta de cobro se descarga un archivo `.rtf` con el
mismo formato de tu plantilla (encabezado, tabla de productos, total,
valor en letras y firma). El formato `.rtf` es nativo de Microsoft Word:
se abre directamente con Word (en el teléfono o en un computador) sin
necesidad de conversiones ni conexión a internet, y desde Word puedes
guardarlo como `.docx` si lo necesitas.

## 6. Estructura del proyecto

```
InventarioCuentasCobro/
├── index.html            Interfaz (3 pestañas) y modal de configuración
├── manifest.json          Manifest PWA (id, íconos, display standalone)
├── sw.js                  Service Worker (caché offline del app shell)
├── css/styles.css         Estilos (paleta rosa/malva, responsive)
├── js/db.js               Capa de almacenamiento (localStorage)
├── js/numToWords.js       Números a letras (para "Valor en letras")
├── js/xlsxLite.js         Lector .xlsx sin dependencias externas
├── js/importExport.js     Import CSV/TXT/XLSX, plantilla, respaldo JSON
├── js/docGen.js           Generador de la cuenta de cobro en .rtf
├── js/app.js              Lógica de interfaz y conexión entre módulos
├── icons/                 Íconos de la PWA (192, 512, 512 maskable)
├── README.md
└── CHANGELOG.md
```

## 7. Notas técnicas / decisiones de diseño

- **Almacenamiento:** se usa `localStorage` del navegador (datos propios
  del origen `https://TU_USUARIO.github.io/InventarioCuentasCobro/`).
  Borrar datos del navegador para ese sitio borra también los datos de
  la app — por eso es clave hacer respaldos periódicos.
- **Importación de productos:** CSV, CSV UTF-8 y TXT delimitado se leen
  con un parser propio (sin librerías externas). Los archivos `.xlsx` se
  leen con un lector ligero incluido (`js/xlsxLite.js`) que usa
  `DecompressionStream`, disponible de forma nativa en Chrome/Android —
  no se descarga ninguna librería de internet, todo funciona offline
  desde el primer uso.
- **Columnas Subproducto / CantidadSubproducto / CostoUnitarioSubproducto:**
  se guardan como información adicional del producto (por ejemplo, para
  anotar de qué insumos se compone), pero el control de cantidades de
  inventario (entradas/salidas) se maneja por producto principal, tal
  como se describe en las pestañas de registro e historial.
- **Llave ID:** se genera automáticamente como `DD-MM-AA-Tipo-N`, donde
  `N` es un consecutivo que reinicia por combinación de fecha + tipo
  (Entrada/Cuenta).
- **Tercero:** en las cuentas de cobro es la compañía seleccionada; en
  las entradas es el nombre de quien cobra (tus propios datos), ya que
  una entrada no se dirige a ningún cliente.
- **Total pendiente por pagar (saldos por tercero):** suma el *saldo*
  de todas las cuentas de cobro no anuladas de ese tercero (lo que
  incluye tanto las PENDIENTES completas como lo que falte de las de
  PAGO PARCIAL). Se tomó esta definición — en vez de sumar solo las
  marcadas como PENDIENTE — porque es la que refleja de verdad cuánto
  te queda por cobrar.
- **Campos numéricos (cantidad, costo, abono):** se cambiaron de
  `<input type="number">` a `<input type="text" inputmode="decimal">`
  con un filtro propio en JavaScript. Esto corrige un bug conocido de
  Chrome/Android (reportado en un Motorola G24) donde el teclado
  numérico nativo de algunos equipos duplica o agrega dígitos de más al
  escribir en campos `type="number"`.
