import { render } from 'preact';
import { t, uiLanguage } from '@/i18n/translate';
import { App } from './App';
import './style.css';

const root = document.getElementById('app');
if (!root) throw new Error('The side panel page has no #app element to render into.');
document.documentElement.lang = uiLanguage();
document.title = t('extName');
render(<App />, root);
