# Chrome Web Store listing: English

What the developer dashboard asks for under **Store listing**, in English. The Spanish listing is in `listing.es.md`; they change together.

## Name and summary

They come from the manifest (`public/_locales/en/messages.json`), not from the dashboard:

- Name: `Loan Simulator`
- Summary (132 characters at most): `Simulate loans from any bank or credit union, with extra principal payments.`

## Category

One for every language: Productivity › Tools.

## Images

In `images/en/`, made from the build by `npm run store:images` (run `npm run build` first). Upload the screenshots in their order:

1. `1-summary.png`: the new loan's summary and schedule.
2. `2-extraPayment.png`: what an extra payment saves.
3. `3-scenarios.png`: two scenarios side by side.
4. `4-preset.png`: the advanced options filled from what an institution publishes.
5. `5-glossary.png`: the glossary, in the dark theme.

Small promo tile (440×280): `promo-tile.png`.

When the panel changes how it looks, run the script again so the listing shows the extension as it is.

## Description

Plain text: the store shows line breaks but no Markdown.

```text
See what a loan really costs before you sign, and what an extra payment saves on the loan you already have.

Loan Simulator opens in Chrome's side panel. You enter what the bank or credit union publishes (amount, rate, term, method) and get the full payment schedule, payment by payment. Everything is computed in your browser: no account, no personal data, no server.

NEW LOAN
• French method (fixed payment) or German method (fixed principal, decreasing payment).
• Enter the nominal or the effective annual rate; it shows the other.
• Credit life insurance and other per-payment charges.
• Interest on 30/360 or on actual days/360, with real due dates.
• Totals: interest, insurance, SOLCA and total paid.

A LOAN YOU ALREADY HAVE
• Take the values from your statement and simulate an extra principal payment on any date.
• Choose to pay less each month or to finish earlier, and see what you save compared with paying nothing extra.

COMPARE AND KEEP
• Save new-loan scenarios and compare two of them side by side.
• Export the schedule to CSV, with the decimal sign your spreadsheet expects, or print it and save it as PDF.
• What you typed is still there when you open the panel again.

MADE TO BE UNDERSTOOD
• A glossary of 18 terms, each with a definition and an example, for someone who has never had a loan.
• A "?" next to every technical field explains it where you need it.
• English and Spanish, light and dark theme, usable with the keyboard alone and with a screen reader.

BUILT FOR ECUADOR, USABLE ANYWHERE
It includes the SOLCA contribution and can fill the advanced options with what seven Ecuadorian banks and credit unions publish, each with a link to its source document and the date it was read. Turn the Ecuador-specific options off and it works with any lender, in the currency you choose.

PRIVATE BY DESIGN
It asks only for the storage and side panel permissions. It makes no network requests and collects nothing.
Privacy policy: https://kattygzc.github.io/loan-simulator/privacy/

The results are estimates. Rounding, the day count or charges a lender does not publish can make its figures differ: confirm them with the lender before signing.

Open source (MIT): https://github.com/KattyGZC/loan-simulator
```
