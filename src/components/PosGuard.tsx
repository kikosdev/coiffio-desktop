import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { storage } from '../lib/storage';

interface Props {
  children: ReactNode;
}

/**
 * Route guard for /pos. Reads sessionStorage token adapter.
 * SWAP: When Tauri secure store is added, the read becomes async — add a
 *       loading state here and render null/spinner while resolving.
 */
export function PosGuard({ children }: Props) {
  if (!storage.hasToken()) {
    return <Navigate to="/signin" replace />;
  }
  return <>{children}</>;
}
