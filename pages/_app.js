import '../styles/globals.css';
import { BrandingProvider } from '../contexts/BrandingContext';

function MyApp({ Component, pageProps }) {
  return (
    <BrandingProvider>
      <Component {...pageProps} />
    </BrandingProvider>
  );
}

export default MyApp;
