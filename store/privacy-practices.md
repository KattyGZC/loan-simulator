# Chrome Web Store: privacy practices

What the developer dashboard asks for under **Privacy**. It takes one answer for every language, so this file is in English only. Every answer must match `AGENTS.md` (Privacy) and the privacy policy in `docs/privacy/`; if the permissions or the stored data change, this file and the policy change in the same pull request.

## Single purpose

```text
Simulate loan payment schedules, and extra principal payments on an existing loan, in Chrome's side panel. Everything is computed locally from the values the user enters.
```

## Permission justification

`storage`:

```text
Keeps the user's form drafts, saved loan scenarios and preferences (currency, decimal sign of exported files, SOLCA default) in chrome.storage.local, and the table being printed in chrome.storage.session. Nothing leaves the browser.
```

`sidePanel`:

```text
The whole interface is a side panel: clicking the toolbar icon opens the simulator next to the page the user is reading, such as a bank's published rates.
```

## Remote code

No, I am not using remote code. All JavaScript is in the package; the extension makes no network requests.

## Data usage

Collected data: none of the categories (personally identifiable information, health, financial and payment information, authentication, personal communications, location, web history, user activity, website content).

The amounts a user types are financial figures, but they stay in the browser's local storage and are never sent to the developer or anyone else, so under the Chrome Web Store definition they are not collected.

Certify all three:

- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

## Privacy policy URL

```text
https://kattygzc.github.io/loan-simulator/privacy/
```
