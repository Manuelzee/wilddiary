import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';
import './index.css';
import App from './App.jsx';
import theme from './theme.js';

// Handle chunk import errors gracefully when new builds are deployed
window.addEventListener('vite:preloadError', () => {
  const retryKey = 'vite_preload_retry';
  const lastRetry = sessionStorage.getItem(retryKey);
  const now = Date.now();
  if (!lastRetry || now - parseInt(lastRetry, 10) > 10000) {
    sessionStorage.setItem(retryKey, now.toString());
    window.location.reload();
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ColorModeScript initialColorMode={theme.config.initialColorMode} />
    <ChakraProvider theme={theme}>
      <App />
    </ChakraProvider>
  </StrictMode>,
);
