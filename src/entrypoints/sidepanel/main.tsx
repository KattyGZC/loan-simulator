import { render } from 'preact';
import { App } from './App';
import './style.css';

const root = document.getElementById('app');
if (!root) throw new Error('The side panel page has no #app element to render into.');
render(<App />, root);
