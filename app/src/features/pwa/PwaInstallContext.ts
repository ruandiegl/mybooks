import { createContext, useContext } from 'react';
import type { PwaInstallContextValue } from './pwa.types';

export const PwaInstallContext = createContext<PwaInstallContextValue>({
  state: 'unavailable', error: null, requestInstall: async () => 'unavailable',
});
export function usePwaInstall() { return useContext(PwaInstallContext); }
