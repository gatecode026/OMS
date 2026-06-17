import React, { createContext, useContext, useState, useEffect } from 'react';

const BrandingContext = createContext(undefined);

export const BrandingProvider = ({ children }) => {
  const [branding, setBranding] = useState({
    companyName: 'Gatecode OMS',
    logoUrl: '',
    primaryColor: '#d946ef',
    secondaryColor: '#1d4ed8',
    faviconUrl: '',
    timezone: 'Asia/Kolkata'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        setLoading(true);
        const hostname = window.location.hostname;
        const searchParams = new URLSearchParams(window.location.search);
        
        // Dev testing: check ?company= or ?subdomain= parameters first
        const queryCompany = searchParams.get('company') || searchParams.get('subdomain');
        let url = (window.API_URL || 'http://localhost:5000') + '/api/public/branding';

        if (queryCompany) {
          if (queryCompany.startsWith('COMP-')) {
            url = `${window.API_URL || "http://localhost:5000"}/api/public/branding/${queryCompany}`;
          } else {
            url = `${window.API_URL || "http://localhost:5000"}/api/public/branding?subdomain=${encodeURIComponent(queryCompany)}`;
          }
        } else if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
          // Standard production subdomain extraction
          const parts = hostname.split('.');
          if (parts.length > 2) {
            url = `${window.API_URL || "http://localhost:5000"}/api/public/branding?subdomain=${encodeURIComponent(parts[0])}`;
          }
        }

        const res = await fetch(url);
        if (res.ok) {
          const result = await res.json();
          if (result.status === 'success' && result.data) {
            const data = result.data;
            setBranding(data);

            // Inject branding properties into CSS custom variables
            if (data.primaryColor) {
              document.documentElement.style.setProperty('--color-primary', data.primaryColor);
              // Handle translucent variants for highlights & focus rings
              if (data.primaryColor.startsWith('#') && data.primaryColor.length === 7) {
                const r = parseInt(data.primaryColor.slice(1, 3), 16);
                const g = parseInt(data.primaryColor.slice(3, 5), 16);
                const b = parseInt(data.primaryColor.slice(5, 7), 16);
                document.documentElement.style.setProperty('--color-primary-light', `rgba(${r}, ${g}, ${b}, 0.15)`);
                document.documentElement.style.setProperty('--shadow-focus', `0 0 0 3px rgba(${r}, ${g}, ${b}, 0.3)`);
              }
            }
            if (data.secondaryColor) {
              document.documentElement.style.setProperty('--color-secondary', data.secondaryColor);
            }

            // Update Page title dynamically
            if (data.companyName) {
              document.title = data.companyName;
            }

            // Update favicon dynamically
            if (data.faviconUrl) {
              let link = document.querySelector("link[rel~='icon']");
              if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.head.appendChild(link);
              }
              link.href = data.faviconUrl;
            }
          }
        }
      } catch (err) {
        console.error('Failed to resolve branding context:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBranding();
  }, []);

  return (
    <BrandingContext.Provider value={{ branding, loading }}>
      {!loading && children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
};
