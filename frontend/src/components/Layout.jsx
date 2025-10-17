import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const Layout = () => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={{ flex: 1, padding: '20px' }}>
        <div className="container">
          <Outlet />
        </div>
      </main>
      <footer style={{ 
        background: '#333', 
        color: 'white', 
        padding: '20px', 
        textAlign: 'center' 
      }}>
        <p> 2025 GED - Gestion Électronique de Documents</p>
      </footer>
    </div>
  );
};

export default Layout;
