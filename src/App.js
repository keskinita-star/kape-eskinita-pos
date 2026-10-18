import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Navbar from './components/Navbar';
import Pos from './components/Pos';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Reports from './components/Reports';
import './App.css';

function AppContent() {
  const { currentUser, loading } = useAuth();
  const [activePage, setActivePage] = useState('pos');

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner">☕</div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Login />;
  }

  return (
    <div className="app">
      <Navbar activePage={activePage} setActivePage={setActivePage} />
      <main className="main-content">
        {activePage === 'pos' && <Pos />}
        {activePage === 'dashboard' && <Dashboard />}
        {activePage === 'inventory' && <Inventory />}
        {activePage === 'reports' && <Reports />}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;