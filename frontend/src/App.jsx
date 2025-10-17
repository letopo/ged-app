// frontend/src/App.jsx - VERSION FINALE CORRECTE
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

// Composants d'authentification
import Login from './components/Login';
import Register from './components/Register';

// Composants principaux
import Dashboard from './components/Dashboard';
import Upload from './components/Upload';
import MyTasks from './components/MyTasks';
import Navbar from './components/Navbar';

// Pages avec visualisation (dans pages/)
import DocumentList from './pages/DocumentList';           // ← ICI : pages/ pas components/
import WorkflowDashboard from './pages/WorkflowDashboard'; // ← ICI : pages/ pas components/

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      setIsAuthenticated(true);
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setIsAuthenticated(true);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  // Route protégée
  const ProtectedRoute = ({ children }) => {
    return isAuthenticated ? children : <Navigate to="/login" />;
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {isAuthenticated && <Navbar user={user} onLogout={handleLogout} />}
        
        <Routes>
          {/* Routes publiques */}
          <Route 
            path="/login" 
            element={
              isAuthenticated ? 
                <Navigate to="/dashboard" /> : 
                <Login onLogin={handleLogin} />
            } 
          />
          
          <Route 
            path="/register" 
            element={
              isAuthenticated ? 
                <Navigate to="/dashboard" /> : 
                <Register />
            } 
          />

          {/* Routes protégées */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/documents" 
            element={
              <ProtectedRoute>
                <DocumentList />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/upload" 
            element={
              <ProtectedRoute>
                <Upload />
              </ProtectedRoute>
            } 
          />

          {/* Routes Workflow */}
          <Route 
            path="/my-tasks" 
            element={
              <ProtectedRoute>
                <MyTasks />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/workflow-dashboard" 
            element={
              <ProtectedRoute>
                <WorkflowDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Redirection par défaut */}
          <Route 
            path="/" 
            element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} 
          />
          
          {/* 404 */}
          <Route 
            path="*" 
            element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;