import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import './i18n'; // initialize i18next (FR/AR)
import { SignInScreen } from './screens/signin';
import { FrontDeskShell } from './FrontDeskShell';
import { PosGuard } from './components/PosGuard';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/signin" element={<SignInScreen />} />
        <Route
          path="/pos"
          element={
            <PosGuard>
              <FrontDeskShell />
            </PosGuard>
          }
        />
        <Route path="*" element={<Navigate to="/signin" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
