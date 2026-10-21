import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { hydrateFromApi } from './data/hydrate';
import { hydrateSiteFromApi } from './lib/site';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/site.css';

function render() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>
  );
}

// Render only after the published release settles, so a page never flashes the bundled seed and
// then re-prices itself. hydrateFromApi always resolves, and falls back to the seed on any failure.
// Site content (pages, theme, navigation, promotions) loads in parallel with the catalog so a
// slower page payload never delays first paint more than the catalog already does.
void Promise.all([hydrateFromApi(), hydrateSiteFromApi()]).then(render, render);
