import { createContext, useContext, useMemo, useState } from 'react';

const ApiKeyContext = createContext(null);
export function ApiKeyProvider({ children }) {
  const [apiKey, setApiKey] = useState('');
  const value = useMemo(() => ({ apiKey, setApiKey }), [apiKey]);
  return (
    <ApiKeyContext.Provider value={value}>{children}</ApiKeyContext.Provider>
  );
}
export function useApiKey() {
  const context = useContext(ApiKeyContext);
  if (!context) {
    throw new Error('useApiKey must be used inside ApiKeyProvider.');
  }
  return context;
}
