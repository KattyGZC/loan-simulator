# Simulador de Créditos

[English](README.md) | **Español**

Extensión de Chrome (panel lateral) para simular préstamos de **cualquier banco o cooperativa**, con los datos que la propia entidad publica en su sección de *transparencia*.

Muchos simuladores oficiales fallan, piden datos personales o solo dejan elegir plazos fijos. Esta extensión hace el cálculo de forma local y genérica: ingresas monto, tasa, plazo y sistema de amortización, y obtienes la tabla de pagos completa. Para un crédito que ya tienes, puedes simular un **abono a capital** y ver cuánto ahorras.

> Pensada para Ecuador (USD, SOLCA, segmentos del BCE), pero como casi todos los datos los ingresa el usuario, sirve para otros países desactivando lo específico de Ecuador.

> **Estado:** en desarrollo, aún no publicada. El motor de cálculo (`src/core/`) y los textos y formatos de número en inglés y español (`src/i18n/`) están terminados y probados, y el panel lateral, cargando la extensión sin empaquetar, ya simula un crédito nuevo y un abono a un crédito que ya tienes; cuenta el interés en 30/360 o en días reales/360. Faltan los escenarios guardados y la exportación a CSV. Este README describe la extensión prevista.

---

## Qué hace

- Calcula la tabla de amortización con el sistema **francés** (cuota fija) o el **alemán** (capital fijo, cuota decreciente).
- Convierte entre **tasa nominal** y **tasa efectiva** anual: ingresas una y muestra la otra.
- Suma el **seguro de desgravamen** y otros cargos por cuota, si los tienes.
- Calcula la **contribución SOLCA** (0,5 %) y el monto que realmente recibes.
- En un crédito que ya tienes, simula un **abono a capital** en cualquier fecha y compara el resto del crédito con y sin él:
  - **Reducir cuota:** mantienes el plazo y pagas menos cada mes.
  - **Reducir plazo:** mantienes la cuota y terminas antes.
- Muestra los totales: intereses, seguros, SOLCA y total pagado.
- Exporta la tabla a CSV.
- Interfaz en inglés y español.
- Conserva lo que escribiste en cada pestaña al cerrar el panel.
- Guarda escenarios de crédito nuevo y compara dos lado a lado (por ejemplo, «Coop X – consumo» vs «Banco Y – consumo»).

## Qué NO hace

- No se conecta a ningún banco ni lee datos de sus páginas.
- No envía información a ningún servidor: todo se calcula en tu navegador.
- No es una oferta de crédito. Los valores son **referenciales**: la cuota real la fija la entidad al aprobar el crédito.

---

## Datos de entrada

### Requeridos

| Campo | Descripción | Notas |
|---|---|---|
| **Monto** | Capital solicitado, en USD | Mayor a 0 |
| **Plazo** | Número de cuotas mensuales | Entre 1 y 360 |
| **Tasa de interés anual** | Nominal **o** efectiva (eliges cuál ingresas) | La otra se calcula sola. Si la entidad publica las dos, ingresa la nominal y compara la efectiva que calcula la extensión |
| **Sistema de amortización** | Francés o alemán | Por defecto, francés |

### Opcionales

| Campo | Por defecto | Descripción |
|---|---|---|
| **Seguro de desgravamen: tasa** | Sin seguro | Lo que publica la entidad en transparencia |
| **Seguro de desgravamen: unidad** | % anual | `% anual`, `% mensual` o `‰ mensual` (por mil). Las entidades lo publican en formatos distintos |
| **Seguro de desgravamen: base** | Saldo | `Saldo`: baja con el tiempo (lo más común). `Monto original`: fijo todo el crédito |
| **Seguro de desgravamen: en la cuota** | Sí | Solo sistema francés. `Sí`: la cuota fija ya incluye el seguro, así que la cuota total es la misma cada mes (lo usual en cooperativas). `No`: el seguro se suma encima, así que la cuota total cambia cada mes |
| **Otros cargos por cuota** | $0 | Valor fijo mensual: otros seguros, cuota de socio, etc. |
| **Contribución SOLCA** | Activada, 0,5 % | Se descuenta una sola vez al desembolsar. Desactívala si no aplica (por ejemplo, fuera de Ecuador o en créditos exentos) |
| **Base de días** | 30/360 | `30/360`: cada mes cuenta 30 días. `Días reales/360`: cada cuota cobra los días desde la anterior, como hace Produbanco |
| **Fecha de desembolso** | Hoy | Solo con días reales: ahí empieza el primer periodo de interés |
| **Fecha del primer pago** | Un mes después de hoy | Pone fechas en la tabla. Con días reales también fija los días de interés, y un vencimiento en sábado o domingo pasa al lunes |
| **Entidad y segmento** | Vacío | Etiquetas para guardar el escenario (por ejemplo, «Coop JEP – Consumo») |
| **Tasa máxima del segmento** | Vacío | Si la ingresas, la extensión avisa cuando la tasa supera el máximo legal |

### Un crédito que ya tienes (segunda pestaña)

Ingresa el crédito como aparece en tu último estado de cuenta o tabla de amortización.

| Campo | Descripción |
|---|---|
| **Saldo pendiente** | Capital que queda después de la última cuota que pagaste |
| **Cuotas restantes** | Incluida la próxima |
| **Tasa de interés anual** y **sistema** | Igual que para un crédito nuevo |
| **Cuota actual** | Solo sistema francés: capital e interés, más el seguro si está incluido, sin otros cargos. Fija todas las cuotas menos la última; las cuotas restantes solo la comprueban, y un aviso indica cuando no coinciden |
| **Fecha de la próxima cuota** | Los vencimientos siguientes caen en el mismo día del mes |
| **Seguro de desgravamen**, **otros cargos**, **conteo de días** | Opcionales, igual que para un crédito nuevo. El seguro es sobre el saldo |
| **Abono: fecha** | Hoy por defecto. Desde el vencimiento de la última cuota pagada hasta el día antes de la última cuota |
| **Abono: monto** | Lo que pagas. Debe ser mayor que el interés acumulado hasta su fecha |
| **Abono: efecto** | `Reducir plazo` (por defecto) o `Reducir cuota` |

---

## Resultados

- **Cuota mensual.** En el sistema francés es una sola; en el alemán, o cuando el seguro sobre el saldo se suma aparte a la cuota francesa, se muestran la primera y la última.
- **Monto neto recibido:** monto − SOLCA.
- **Totales:** intereses, seguros, SOLCA y total a pagar.
- **Tabla de amortización:** n.º, fecha, cuota total, capital, interés, seguro, otros cargos y saldo.
- **Abono a un crédito que tienes:** cómo se reparte entre interés acumulado y capital, el resto del crédito sin vs. con abono, lo que ahorras (intereses, seguro y otros cargos), las cuotas que te ahorras o la nueva cuota, y la tabla con el abono.

---

## Cómo se calcula

Base comercial **30/360** por defecto: cada mes cuenta como 30 días de un año de 360. Cada valor de la tabla se redondea a 2 decimales (la mitad hacia arriba), el saldo redondeado pasa al mes siguiente y la última cuota se ajusta para que el saldo quede exactamente en $0. El motor está probado contra las tablas del simulador de la Cooperativa JEP y su tabla de costos publicada, con una diferencia máxima de $0,01 por cuota.

Con **días reales/360**, cada cuota cobra `saldo × TNA × días / 360`, donde `días` va desde el vencimiento anterior (o el desembolso, en la primera cuota) hasta este. Un vencimiento en sábado o domingo pasa al lunes y el interés se cuenta hasta ese lunes. Los feriados no se conocen, así que una cuota que el banco mueve por feriado puede diferir en un día de interés. El capital fijo del alemán sigue siendo `P / n`. La cuota fija del francés es la que paga el crédito en los periodos reales, `cuota = P / Σₖ Πⱼ≤ₖ 1/(1 + iⱼ)` con `iⱼ = TNA × díasⱼ / 360` (más la tasa mensual del seguro cuando el seguro es sobre el saldo y está dentro de la cuota), así que la última cuota queda cerca de las demás. Con tasas altas y plazos largos, un periodo de 31 días o más puede cobrar más interés que la cuota; ese mes la diferencia se suma al saldo. Un primer periodo largo (un desembolso meses antes del primer pago) se cobra en la primera cuota: en el sistema alemán esa cuota lo lleva entero; en el francés la cuota sigue fija y el interés que la excede se suma al saldo. El sistema alemán en esta base está probado al centavo contra la tabla de un crédito de Produbanco. El simulador de Banco Guayaquil cuenta días reales sobre 365, así que sus cifras pueden diferir en centavos o algunos dólares.

### Tasas

- Tasa mensual: `i = TNA / 12`
- De nominal a efectiva: `TEA = (1 + TNA/12)^12 − 1`
- De efectiva a nominal: `TNA = 12 × ((1 + TEA)^(1/12) − 1)`

> La **nominal** es la que se usa para calcular la cuota. La **efectiva** es la que publican las entidades para que se puedan comparar entre sí, y la que se contrasta con la tasa máxima del segmento.

### Sistema francés (cuota fija)

```
cuota   = P × i / (1 − (1 + i)^−n)
interés = saldo × i
capital = cuota − interés
```

Con el seguro **en la cuota**, el seguro sobre saldo funciona como un interés adicional: la cuota se calcula con `i + s` (`s` = tasa mensual del seguro) y `capital = cuota − interés − seguro`. El seguro sobre el monto original se suma a la cuota como un valor fijo.

### Sistema alemán (capital fijo)

```
capital = P / n
interés = saldo × i
cuota   = capital + interés   (decrece cada mes)
```

### Seguro de desgravamen

- Sobre saldo: `seguro = saldo_al_inicio_del_mes × tasa_mensual`
- Sobre monto: `seguro = P × tasa_mensual`
- Conversión de unidades: `% anual → /12/100`, `% mensual → /100`, `‰ mensual → /1000`

### SOLCA

```
SOLCA         = P × 0,5 %   (una sola vez, al desembolso)
monto_recibido = P − SOLCA
```

### Abonos a capital

Un abono hecho en una fecha entre dos vencimientos, dentro del periodo de la cuota k:

1. Primero paga el interés acumulado desde el vencimiento anterior: el interés de un día, `saldo × TNA / 360` redondeado al centavo, por los días. Con días reales son días de calendario; en 30/360 cada periodo cuenta 30 días y el último día del mes cuenta como el 30, así que un abono el 15 en un crédito que vence el 31 acumula 15 días, también en febrero.
2. El resto va a capital, y primero cubre el capital que iba a pagar la cuota k. En su vencimiento, la cuota k paga el capital que el abono le dejó y cobra el interés de los días que faltan sobre el saldo nuevo (`saldo × TNA × días / 360`, redondeado una vez, como una cuota normal), más el seguro y los otros cargos. Por eso un abono menor que el capital de la cuota k no cambia nada después de esa cuota; solo ahorra el interés de los días que se adelantó.
3. Cuando cubre más que el capital de la cuota k, las cuotas después de k pagan el saldo nuevo `S`:

| | Reducir cuota | Reducir plazo |
|---|---|---|
| **Francés** | Nueva cuota con `S` y las cuotas después de k | Misma cuota; nuevo número de cuotas: `n = −ln(1 − S·i / C) / ln(1 + i)` |
| **Alemán** | Nuevo capital fijo: `S / cuotas después de k` | Mismo capital fijo; se eliminan las cuotas que sobran |

En la tabla, la cuota k muestra el abono dentro de ella, como un estado de cuenta. Un abono mayor a lo que se debe se reduce al saldo más el interés acumulado y cancela el crédito en su fecha, con un aviso. Así aplicó Produbanco un abono en un estado de cuenta, y el motor coincide con ese estado al centavo.

---

## Dónde encontrar los datos

| Dato | Dónde |
|---|---|
| Tasa nominal y efectiva por producto | Página web de la entidad, sección **Transparencia** / **Tasas y tarifas** / **Costos financieros** |
| Seguro de desgravamen | La misma sección de transparencia (a veces como «cargos financieros») |
| Tasas máximas por segmento | **Banco Central del Ecuador**, publicación mensual de tasas de interés activas |
| Datos de cooperativas | La propia cooperativa; la supervisa la **SEPS** |
| Datos de bancos | El propio banco; lo supervisa la **Superintendencia de Bancos** |

Los segmentos de crédito más comunes en Ecuador son: consumo, microcrédito (minorista, de acumulación simple y de acumulación ampliada), inmobiliario, vivienda de interés social y público, y productivo (corporativo, empresarial y PYMES). Las tasas máximas cambian con frecuencia, por eso **la extensión no las trae fijas**: el usuario ingresa la vigente.

---

## Usarla fuera de Ecuador

Solo hay tres cosas específicas de Ecuador, y todas se pueden desactivar o cambiar:

1. **Moneda:** USD por defecto. Se puede cambiar el símbolo.
2. **SOLCA:** se desactiva.
3. **Tasa máxima del segmento:** es opcional.

El resto (tasas, plazo, sistemas de amortización, seguros y abonos) es igual en cualquier país.

---

## Stack técnico

- **Chrome Extension Manifest V3**, con la interfaz en el **panel lateral** (`side_panel`).
- **[WXT](https://wxt.dev/) + TypeScript.**
- El motor de cálculo está en un módulo puro, sin dependencias de Chrome, y tiene tests unitarios.
- Permisos: `storage` (conservar tus formularios y escenarios guardados en el navegador) y `sidePanel` (mostrar la interfaz). Sin acceso a ningún sitio web.
- Interfaz en **inglés y español** con el sistema de idiomas de Chrome (`_locales`): sigue el idioma del navegador y, si no es ninguno de los dos, usa inglés.

### Estructura prevista

```
loan-simulator/
├── src/
│   ├── core/          # motor de cálculo (tasas, francés, alemán, seguros, abonos)
│   ├── i18n/          # textos de la interfaz, formatos de número y fecha, lectura de números
│   ├── entrypoints/
│   │   ├── background.ts
│   │   └── sidepanel/ # interfaz
│   └── storage/       # borradores del formulario de cada pestaña, escenarios guardados
├── public/
│   └── _locales/      # textos de la interfaz: en/ y es/ messages.json
├── tests/             # tests del motor contra casos conocidos, y de i18n
└── wxt.config.ts
```

### Desarrollo

Requiere **Node.js 22** y npm.

```bash
npm install        # instalar dependencias
npm run dev        # abrir Chrome con la extensión cargada y recarga en caliente
npm test           # correr los tests unitarios
npm run lint       # ESLint
npm run typecheck  # TypeScript
npm run build      # build de producción en .output/chrome-mv3
npm run check      # todo lo que corre la CI: lint, formato, typecheck, cobertura, build
npm run zip        # zip listo para la Chrome Web Store
```

Para cargar el build a mano: abre `chrome://extensions`, activa el **Modo de desarrollador**, haz clic en **Cargar descomprimida** y elige `.output/chrome-mv3`. Al hacer clic en el ícono de la barra se abre el panel lateral.

Antes de cambiar código, lee [AGENTS.md](AGENTS.md) (en inglés): estándar de código, estado actual y las decisiones en las que se apoya el motor.

La CI (GitHub Actions) corre lint, revisión de formato, typecheck, tests y build en cada push a `main` y en cada pull request.

---

## Privacidad

La extensión **no recoge, no envía y no comparte ningún dato**. Lo que escribes y los escenarios que guardas quedan solo en el almacenamiento local de tu navegador.

## Aviso

Los resultados son **aproximados y referenciales**. Pueden diferir de los de la entidad por redondeos, por la base de días que usa, por cargos no publicados o por condiciones particulares del crédito. Antes de firmar, confirma siempre los valores con la entidad.

## Licencia

[MIT](LICENSE)

---

## Referencias

- [Simulador Multicrédito – Banco Guayaquil](https://www.bancoguayaquil.com/creditos/multicredito/): muestra cuota, capital, interés, seguro, SOLCA y totales. Dice usar base de 360 días, pero su interés usa días reales.
- [Simulador de crédito – Cooperativa JEP](https://www.jep.coop/productos-servicios/creditos/simulador-de-credito) y su [tabla de costos publicada](https://www.jep.coop/documents/20182/0/CostosfinancierosMarzo2026.pdf/): casos de referencia para los tests del motor.
- [Contribución SOLCA en créditos – El Diario](https://www.eldiario.ec/centro/bancos-de-ecuador-que-es-la-contribucion-para-solca-y-por-que-te-la-descuentan-durante-ciertas-transacciones-06042026/)
- [Tasas máximas por segmento – Expreso](https://www.expreso.ec/actualidad/economia/junta-politica-regulacion-monetaria-financiera-remoza-esquema-tasas-interes-90700.html)
- [Derecho a pagos anticipados, art. 48 de la Ley del Consumidor – Expreso](https://www.expreso.ec/actualidad/dice-articulo-48-ley-consumidor-ecuador-179339.html)
- [Abono a capital: reducir plazo o reducir cuota – BBVA](https://www.bbva.com/es/pe/salud-financiera/reducir-el-plazo-o-reducir-la-cuota-de-los-creditos-para-ahorrar-mas-intereses/)
- [Tasa nominal vs. efectiva en Ecuador – HaceCuentas](https://hacecuentas.com/ec/finanzas-personales/creditos-y-ahorro)
