// frontend/src/components/Layout.jsx - AVEC SUPPORT DARK MODE
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-dark-bg transition-colors duration-200">
      <Navbar />
      <main className="flex-1 p-5">
        <div className="container mx-auto">
          <Outlet />
        </div>
      </main>
      <footer className="bg-gray-800 dark:bg-gray-900 text-white py-5 text-center transition-colors duration-200">
        <p>© 2025 GED - Gestion Électronique de Documents</p>
      </footer>
    </div>
  );
};

export default Layout;