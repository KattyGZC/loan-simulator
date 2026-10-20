# Loan Simulator

**English** | [Español](README.es.md)

A Chrome extension (side panel) for simulating loans from **any bank or credit union**, using the data each institution publishes in its *transparency* section.

Many official simulators break, ask for personal data, or only offer a few fixed terms. This extension does the math locally and generically: you enter the amount, rate, term and amortization method, and get the full payment schedule. You can also simulate **extra principal payments** and see how much you save.

> Built for Ecuador (USD, SOLCA contribution, Central Bank credit segments). Since almost all data is entered by the user, it works for other countries once the Ecuador-specific options are turned off.

---

## What it does

- Builds the amortization schedule with the **French** method (fixed payment) or the **German** method (fixed principal, decreasing payment).
- Converts between **nominal** and **effective** annual rates: you enter one and it shows the other.
- Adds **credit life insurance** (*seguro de desgravamen*) and other per-payment charges, if any.
- Computes the **SOLCA contribution** (0.5%) and the amount you actually receive.
- Simulates **one or more extra principal payments** and compares the result with the original loan:
  - **Reduce payment:** keep the term and pay less each month.
  - **Reduce term:** keep the payment and finish earlier.
- Shows totals: interest, insurance, SOLCA and total paid.
- Exports the schedule to CSV.
- Interface in English and Spanish.
- Saves scenarios to compare institutions (e.g. "Credit Union X – consumer" vs "Bank Y – consumer").

## What it does NOT do

- It doesn't connect to any bank or read data from its pages.
- It doesn't send data to any server: everything is computed in your browser.
- It isn't a loan offer. The results are **estimates**: the institution sets the actual payment when it approves the loan.

---

## Inputs

### Required

| Field | Description | Notes |
|---|---|---|
| **Amount** | Principal requested, in USD | Greater than 0 |
| **Term** | Number of monthly payments | From 1 to 360 |
| **Annual interest rate** | Nominal **or** effective (you choose which) | The other one is derived. If the institution publishes both, enter the nominal rate and compare the effective rate the extension computes |
| **Amortization method** | French or German | French by default |

### Optional

| Field | Default | Description |
|---|---|---|
| **Credit life insurance: rate** | No insurance | As published in the institution's transparency section |
| **Credit life insurance: unit** | % per year | `% per year`, `% per month` or `‰ per month` (per mille). Institutions publish it in different formats |
| **Credit life insurance: base** | Balance | `Balance`: decreases over time (most common). `Original amount`: fixed for the whole loan |
| **Other charges per payment** | $0 | Fixed monthly amount: other insurance, membership fees, etc. |
| **SOLCA contribution** | On, 0.5% | Deducted once at disbursement. Turn it off if it doesn't apply (e.g. outside Ecuador or on exempt loans) |
| **First payment date** | One month from today | Only used to put dates in the schedule |
| **Institution and segment** | Empty | Labels for saving the scenario (e.g. "JEP Credit Union – Consumer") |
| **Segment maximum rate** | Empty | If set, the extension warns when the rate exceeds the legal maximum |

### Extra principal payments (optional, one or more)

| Field | Description |
|---|---|
| **After payment #** | When the extra payment is made |
| **Amount** | Value applied directly to principal |
| **Effect** | `Reduce payment` or `Reduce term` |

---

## Outputs

- **Monthly payment.** Under the French method there is a single one; under the German method the first and last payments are shown.
- **Net amount received:** amount − SOLCA.
- **Totals:** interest, insurance, SOLCA and total paid.
- **Amortization schedule:** #, date, total payment, principal, interest, insurance, other charges and balance.
- **With extra payments:** side-by-side comparison (without vs. with), interest saved, and payments saved or the new payment.

---

## How it's calculated

Commercial **30/360** day count: each month counts as 30 days of a 360-day year, the same as Ecuadorian bank simulators. Values are rounded to 2 decimals per payment, and the last payment is adjusted so the balance ends at exactly $0.

### Rates

- Monthly rate: `i = APR / 12`
- Nominal to effective: `EAR = (1 + APR/12)^12 − 1`
- Effective to nominal: `APR = 12 × ((1 + EAR)^(1/12) − 1)`

> The **nominal** rate is the one used to compute the payment. The **effective** rate is the one institutions publish so they can be compared, and the one checked against the segment's maximum rate.

### French method (fixed payment)

```
payment   = P × i / (1 − (1 + i)^−n)
interest  = balance × i
principal = payment − interest
```

### German method (fixed principal)

```
principal = P / n
interest  = balance × i
payment   = principal + interest   (decreases every month)
```

### Credit life insurance

- On balance: `insurance = balance_at_start_of_month × monthly_rate`
- On original amount: `insurance = P × monthly_rate`
- Unit conversion: `% per year → /12/100`, `% per month → /100`, `‰ per month → /1000`

### SOLCA

```
SOLCA           = P × 0.5%   (once, at disbursement)
amount_received = P − SOLCA
```

### Extra principal payments

After payment N, the extra payment is subtracted from the balance and the rest of the loan is recalculated:

| | Reduce payment | Reduce term |
|---|---|---|
| **French** | New payment from the new balance and the remaining payments | Same payment; new number of payments: `n = −ln(1 − S·i / C) / ln(1 + i)` |
| **German** | New fixed principal: `S / remaining payments` | Same fixed principal; the leftover payments are dropped |

---

## Where to find the data

| Data | Where |
|---|---|
| Nominal and effective rate per product | The institution's website, **Transparencia** / **Tasas y tarifas** / **Costos financieros** section |
| Credit life insurance | The same transparency section (sometimes listed as "cargos financieros") |
| Maximum rates per segment | **Banco Central del Ecuador**, monthly publication of lending rates |
| Credit union data | The credit union itself; supervised by the **SEPS** |
| Bank data | The bank itself; supervised by the **Superintendencia de Bancos** |

The most common credit segments in Ecuador are: consumer, microcredit (retail, simple accumulation and extended accumulation), real estate, social and public-interest housing, and productive (corporate, business and SME). Maximum rates change often, so **the extension doesn't hardcode them**: the user enters the current one.

---

## Using it outside Ecuador

Only three things are specific to Ecuador, and all of them can be turned off or changed:

1. **Currency:** USD by default. The symbol can be changed.
2. **SOLCA:** can be turned off.
3. **Segment maximum rate:** optional.

Everything else (rates, term, amortization methods, insurance and extra payments) works the same in any country.

---

## Tech stack

- **Chrome Extension Manifest V3**, with the UI in the **side panel** (`side_panel`).
- **[WXT](https://wxt.dev/) + TypeScript.**
- The calculation engine is a pure module with no Chrome dependencies, covered by unit tests.
- Permissions: `storage` (save scenarios in the browser) and `sidePanel` (show the UI). No host permissions.
- UI in **English and Spanish** via Chrome's i18n (`_locales`): it follows the browser language and falls back to English.

### Planned structure

```
loan-simulator/
├── src/
│   ├── core/          # calculation engine (rates, French, German, insurance, extra payments)
│   ├── entrypoints/
│   │   ├── background.ts
│   │   └── sidepanel/ # UI
│   └── storage/       # saved scenarios
├── public/
│   └── _locales/      # UI strings: en/ and es/ messages.json
├── tests/             # engine tests against known cases
└── wxt.config.ts
```

### Development

> Pending: filled in once the project is initialized.

---

## Privacy

The extension **does not collect, send or share any data**. Saved scenarios stay only in your browser's local storage.

## Disclaimer

Results are **approximate estimates**. They may differ from the institution's figures because of rounding, the day count it uses, unpublished charges or loan-specific conditions. Always confirm the figures with the institution before signing.

## License

[MIT](LICENSE)

---

## References

- [Multicrédito simulator – Banco Guayaquil](https://www.bancoguayaquil.com/creditos/multicredito/): shows payment, principal, interest, insurance, SOLCA and totals; 360-day basis.
- [SOLCA contribution on loans – El Diario](https://www.eldiario.ec/centro/bancos-de-ecuador-que-es-la-contribucion-para-solca-y-por-que-te-la-descuentan-durante-ciertas-transacciones-06042026/)
- [Maximum rates per segment – Expreso](https://www.expreso.ec/actualidad/economia/junta-politica-regulacion-monetaria-financiera-remoza-esquema-tasas-interes-90700.html)
- [Right to prepay, art. 48 of the Consumer Protection Law – Expreso](https://www.expreso.ec/actualidad/dice-articulo-48-ley-consumidor-ecuador-179339.html)
- [Extra payments: reduce term or reduce payment – BBVA](https://www.bbva.com/es/pe/salud-financiera/reducir-el-plazo-o-reducir-la-cuota-de-los-creditos-para-ahorrar-mas-intereses/)
- [Nominal vs. effective rate in Ecuador – HaceCuentas](https://hacecuentas.com/ec/finanzas-personales/creditos-y-ahorro)
