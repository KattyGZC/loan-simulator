import { createFormat, formatLocale } from '@/i18n/format';
import { uiLanguage } from '@/i18n/translate';

/** The locale the panel reads and writes numbers in, from the browser's language. */
export const locale = formatLocale(uiLanguage());

export const format = createFormat(locale);
