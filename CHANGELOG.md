# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).
Este proyecto usa versionado [SemVer](https://semver.org/lang/es/).

## [1.1.0] — 2026-11-22

### Agregado

- **Varias compañías**: ahora se pueden registrar múltiples compañías
  (nombre + NIT) desde la configuración (⚙️). Al registrar una cuenta
  de cobro, la app pide seleccionar a qué compañía va dirigida (o crear
  una nueva al vuelo, sin salir del formulario). Se migran
  automáticamente los datos de compañía de la versión 1.0.0 a la
  primera compañía registrada.
- **Estados de cuenta de cobro**: PENDIENTE (por defecto), PAGADO y
  PAGO PARCIAL, seleccionables al crear el registro o, después, desde
  la pestaña Editar/Hist.
  - Nuevos campos por cuenta de cobro: **Tercero**, **Saldo**, **Fecha
    pago** y **Abono** (este último visible solo en PAGO PARCIAL).
  - El saldo y la fecha de pago se recalculan automáticamente según el
    estado elegido.
- **Botón "Descargar cuenta de cobro"** en Editar/Hist.: permite volver
  a generar el `.rtf` de cualquier cuenta ya guardada, no solo en el
  momento de crearla.
- **Filtro por tercero** en el histórico de la pestaña Editar/Hist.
- **Saldos por tercero** (pestaña Registro): tarjeta nueva sobre el
  registro, con selector de tercero y los totales "Pendiente por pagar"
  y "Total compras" calculados automáticamente.
- **Columna "Existencias"** en Hist. Productos: entradas menos salidas
  por producto, es decir, lo disponible para la venta.
- Respaldo/restauración JSON ampliado para incluir las compañías.

### Corregido

- **Bug de "cero extra" en el costo unitario (reportado en Motorola
  G24)**: los campos numéricos (cantidad, costo unitario, abono, etc.)
  dejaron de usar `<input type="number">` y ahora usan
  `<input type="text" inputmode="decimal">` con saneamiento propio en
  JavaScript. El input numérico nativo de Chrome/Android tiene un bug
  conocido en ciertos teclados que duplica o agrega dígitos al escribir;
  este cambio evita ese comportamiento por completo.

### Decisiones de diseño (criterio propio)

- El campo "Tercero" se llena con el nombre de la compañía en las
  cuentas de cobro, y con el nombre de quien cobra (tus propios datos)
  en las entradas, tal como se pidió explícitamente.
- "Total pendiente por pagar" por tercero suma el **saldo** (no solo el
  total) de las cuentas no anuladas, para que un pago parcial también
  se refleje como deuda pendiente por el valor que falta.
- La columna "Existencias" muestra el saldo actual del producto
  (entradas − salidas) repetido en cada fila de ese producto, en lugar
  de un saldo progresivo movimiento a movimiento, ya que el cálculo
  pedido es "por producto".

## [1.0.0] — 2026-11-07

Primera versión funcional de la PWA, construida a partir de la
especificación inicial (3 pestañas, registro/cuentas de cobro,
catálogo de productos, histórico e importación/respaldo).

### Agregado

- **Pestaña Registro**
  - Registro de entradas y cuentas de cobro (salidas) con selector de
    tipo en colores (verde = entrada, rojo = cuenta de cobro).
  - Selector de fecha (por defecto hoy, editable con el calendario nativo).
  - Buscador de productos con autocompletado por aproximación.
  - Cantidad, costo unitario (autocompletado desde el catálogo) y costo
    total de ítem, calculados en vivo.
  - Múltiples ítems por registro, con Llave ID autogenerada
    (`DD-MM-AA-Tipo-N`, secuencia por fecha + tipo) y total del registro
    sumando todos los ítems.
  - Botones para guardar el registro, generar la cuenta de cobro (solo
    en salidas) y generar/cargar el respaldo JSON completo.
  - Sección de productos: carga masiva vía CSV, CSV UTF-8, TXT o XLSX;
    descarga de plantilla de importación; alta/edición manual de
    productos (incluye campos opcionales de subproducto).
- **Pestaña Editar / Histórico**
  - Búsqueda de registros por Llave ID (con lista desplegable de
    sugerencias, de más reciente a más antiguo).
  - Edición de fecha, productos, cantidades y costos de un registro
    existente, con recálculo automático de totales.
  - Eliminar/agregar ítems dentro de un registro ya guardado.
  - Botón para anular un registro (se conserva en el histórico, marcado
    visualmente como anulado).
  - Tabla de histórico completo (entradas y salidas, más reciente
    primero) con botón **ModificarReg** por fila para cargar ese
    registro en la sección de edición.
- **Pestaña Historial de productos**
  - Listado de todos los movimientos (entradas y salidas) por producto,
    de más reciente a más antiguo.
  - Filtro por producto mediante chips seleccionables (por defecto
    muestra todos).
- **Generación de cuenta de cobro en formato Word**
  - Exporta un archivo `.rtf` (abre nativamente en Microsoft Word, sin
    conversión ni conexión a internet) replicando el formato de la
    plantilla de referencia: encabezado con ciudad/fecha, datos de la
    compañía, datos de quien cobra, tabla de artículos, total a pagar,
    valor en letras y bloque de firma.
  - Conversión de valores numéricos a letras en español
    (`js/numToWords.js`), sin dependencias externas.
- **Configuración (⚙️)**
  - Modal para guardar los datos fijos de la cuenta de cobro (nombre y
    NIT de la compañía, ciudad, nombre, cédula, celular y dirección de
    quien cobra), persistentes entre sesiones.
- **Funcionamiento offline**
  - Service Worker con estrategia *stale-while-revalidate* que cachea
    todo el app shell; la app funciona completa sin conexión desde la
    primera carga exitosa.
  - Almacenamiento 100% local vía `localStorage` (productos, registros
    y configuración), sin ningún backend.
  - Lector de archivos `.xlsx` propio (`js/xlsxLite.js`), basado en
    `DecompressionStream` nativo del navegador — no requiere ninguna
    librería descargada de internet.
- **PWA instalable como app "nativa"**
  - `manifest.json` con `id` explícito (`/InventarioCuentasCobro/`) para
    evitar que Android la detecte como "ya instalada" por compartir
    origen con otra PWA.
  - Íconos 192×192, 512×512 y 512×512 maskable incluidos.
  - Modo `standalone`, orientación vertical, tema e identidad visual
    rosa/malva moderna.
- Plantilla de importación de productos descargable en CSV
  (`NombreProducto/CostoUnitario/Subproducto/CantidadSubproducto/CostoUnitarioSubproducto`).
- Respaldo y restauración completa de datos en un único archivo JSON.

### Decisiones de diseño (criterio propio, documentadas en el README)

- Las columnas `Subproducto`, `CantidadSubproducto` y
  `CostoUnitarioSubproducto` se guardan como metadatos informativos del
  producto principal; el control de cantidades de inventario
  (entradas/salidas) se lleva por producto principal, no en cascada
  sobre sus subproductos.
- Los datos fijos de la cuenta de cobro (compañía y datos de quien
  cobra) se gestionan desde un modal de configuración accesible desde
  el encabezado, al no estar asignados explícitamente a ninguna de las
  3 pestañas.
