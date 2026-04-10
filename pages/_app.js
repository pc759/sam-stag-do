import '../styles/globals.css';
import { BrandingProvider } from '../contexts/BrandingContext';
import { AuthProvider } from '../contexts/AuthContext';

function MyApp({ Component, pageProps }) {
  return (
    <BrandingProvider>
      <AuthProvider>
        <Component {...pageProps} />
      </AuthProvider>
    </BrandingProvider>
  );
}

export default MyApp;
