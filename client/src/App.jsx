import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { DarkModeProvider, useDarkMode } from './context/DarkModeContext';
import router from './routes';

function ToasterWithTheme() {
  const { darkMode } = useDarkMode();
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: darkMode ? '#151922' : '#ffffff',
          color: darkMode ? '#f1f3f5' : '#0f1419',
          border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(15,20,25,0.08)',
          borderRadius: '10px',
          fontFamily: '\'Geist Variable\', Geist, system-ui, sans-serif',
          fontSize: '0.9375rem',
          boxShadow: darkMode ? '0 12px 40px rgba(0,0,0,0.35)' : '0 8px 30px rgba(15,20,25,0.08)',
        },
        success: { iconTheme: { primary: '#2c5ef5', secondary: '#fff' } },
        error: { iconTheme: { primary: '#f87171', secondary: '#fff' } },
      }}
    />
  );
}

export default function App() {
  return (
    <DarkModeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
        <ToasterWithTheme />
      </AuthProvider>
    </DarkModeProvider>
  );
}
