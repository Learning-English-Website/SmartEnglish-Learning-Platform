import { Outlet } from 'react-router-dom';
import AppNavbar from '../common/Navbar/Navbar';
import Footer from '../common/Footer/Footer';
import { useDarkMode } from '../../context/DarkModeContext';

export default function Layout() {
  const { darkMode, toggleDark } = useDarkMode();
  return (
    <>
      <AppNavbar darkMode={darkMode} onToggleDark={toggleDark} />
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
