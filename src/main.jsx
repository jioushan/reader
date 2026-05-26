import { render } from 'preact';
import { App } from './app';
import './styles/themes.css';
import './styles/global.css';
import './styles/library.css';
import './styles/reader.css';

render(<App />, document.getElementById('app'));
