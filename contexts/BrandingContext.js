import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { applyBrandingToDocument } from '../lib/themeApply';

const BrandingContext = createContext(null);

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(null);

  const refreshBranding = useCallback(async () => {
    try {
      const res = await fetch('/api/public-branding');
      if (!res.ok) return;
      const data = await res.json();
      setBranding(data);
      applyBrandingToDocument(data);
    } catch {
      // leave defaults from globals.css
    }
  }, []);

  useEffect(() => {
    refreshBranding();
  }, [refreshBranding]);

  return (
    <BrandingContext.Provider value={{ branding, refreshBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) {
    throw new Error('useBranding must be used within BrandingProvider');
  }
  return ctx;
}
