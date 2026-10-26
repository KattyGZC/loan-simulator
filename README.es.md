# Simulador de Créditos

[English](README.md) | **Español**

Extensión de Chrome (panel lateral) para simular préstamos de **cualquier banco o cooperativa**, con los datos que la propia entidad publica en su sección de *transparencia*.

Muchos simuladores oficiales fallan, piden datos personales o solo dejan elegir plazos fijos. Esta extensión hace el cálculo de forma local y genérica: ingresas monto, tasa, plazo y sistema de amortización, y obtienes la tabla de pagos completa. Además puedes simular **abonos a capital** y ver cuánto ahorras.

> Pensada para Ecuador (USD, SOLCA, segmentos del BCE), pero como casi todos los datos los ingresa el usuario, sirve para otros países desactivando lo específico de Ecuador.

> **Estado:** en desarrollo, aún no publicada. El motor de cálculo (`src/core/`) está terminado y probado; faltan la interfaz del panel lateral, los idiomas, los escenarios guardados y la exportación a CSV. Este README describe la extensión prevista.

---

## Qué hace

- Calcula la tabla de amortización con el sistema **francés** (cuota fija) o el **alemán** (capital fijo, cuota decreciente).
- Convierte entre **tasa nominal** y **tasa efectiva** anual: ingresas una y muestra la otra.
- Suma el **seguro de desgravamen** y otros cargos por cuota, si los tienes.
- Calcula la **contribución SOLCA** (0,5 %) y el monto que realmente recibes.
- Simula **uno o varios abonos a capital** y compara el resultado con el crédito original:
  - **Reducir cuota:** mantienes el plazo y pagas menos cada mes.
  - **Reducir plazo:** mantienes la cuota y terminas antes.
- Muestra los totales: intereses, seguros, SOLCA y total pagado.
- Exporta la tabla a CSV.
- Interfaz en inglés y español.
- Guarda escenarios para comparar entidades (por ejemplo, «Coop X – consumo» vs «Banco Y – consumo»).

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
| **Fecha del primer pago** | Un mes después de hoy | Solo sirve para poner fechas en la tabla |
| **Entidad y segmento** | Vacío | Etiquetas para guardar el escenario (por ejemplo, «Coop JEP – Consumo») |
| **Tasa máxima del segmento** | Vacío | Si la ingresas, la extensión avisa cuando la tasa supera el máximo legal |

### Abonos a capital (opcional, uno o varios)

| Campo | Descripción |
|---|---|
| **Después de la cuota N.º** | En qué momento se hace el abono |
| **Monto del abono** | Valor que va directo a capital |
| **Efecto** | `Reducir cuota` o `Reducir plazo` |

---

## Resultados

- **Cuota mensual.** En el sistema francés es una sola; en el alemán se muestran la primera y la última.
- **Monto neto recibido:** monto − SOLCA.
- **Totales:** intereses, seguros, SOLCA y total a pagar.
- **Tabla de amortización:** n.º, fecha, cuota total, capital, interés, seguro, otros cargos y saldo.
- **Con abonos:** comparación lado a lado (sin abono vs. con abono), interés ahorrado y cuotas menos o nueva cuota.

---

## Cómo se calcula

Base comercial **30/360**: cada mes cuenta como 30 días de un año de 360. Cada valor de la tabla se redondea a 2 decimales (la mitad hacia arriba), el saldo redondeado pasa al mes siguiente y la última cuota se ajusta para que el saldo quede exactamente en $0. El motor está probado contra las tablas del simulador de la Cooperativa JEP y su tabla de costos publicada, con una diferencia máxima de $0,01 por cuota. Algunas entidades cuentan días reales (el simulador de Banco Guayaquil lo hace), así que sus cifras pueden diferir en centavos o algunos dólares.

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

Después de pagar la cuota N, el abono se resta del saldo y se recalcula el resto del crédito:

| | Reducir cuota | Reducir plazo |
|---|---|---|
| **Francés** | Nueva cuota con el saldo nuevo y las cuotas restantes | Misma cuota; nuevo número de cuotas: `n = −ln(1 − S·i / C) / ln(1 + i)` |
| **Alemán** | Nuevo capital fijo: `S / cuotas restantes` | Mismo capital fijo; se eliminan las cuotas que sobran |

Un abono mayor al saldo se reduce al saldo y cancela el crédito. Los abonos que tocan después de que el crédito ya se pagó se ignoran. En ambos casos la extensión muestra un aviso.

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
- Permisos: `storage` (guardar escenarios en el navegador) y `sidePanel` (mostrar la interfaz). Sin acceso a ningún sitio web.
- Interfaz en **inglés y español** con el sistema de idiomas de Chrome (`_locales`): sigue el idioma del navegador y, si no es ninguno de los dos, usa inglés.

### Estructura prevista

```
loan-simulator/
├── src/
│   ├── core/          # motor de cálculo (tasas, francés, alemán, seguros, abonos)
│   ├── entrypoints/
│   │   ├── background.ts
│   │   └── sidepanel/ # interfaz
│   └── storage/       # escenarios guardados
├── public/
│   └── _locales/      # textos de la interfaz: en/ y es/ messages.json
├── tests/             # tests del motor contra casos conocidos
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

La extensión **no recoge, no envía y no comparte ningún dato**. Los escenarios guardados quedan solo en el almacenamiento local de tu navegador.

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
