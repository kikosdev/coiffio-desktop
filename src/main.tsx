import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { FrontDeskShell } from './FrontDeskShell';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FrontDeskShell />
  </StrictMode>
);
