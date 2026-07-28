import React from 'react';
import NavBar from './NavBar';
import './AppLayout.css';

export default function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <main className="main-content">
        {children}
      </main>
      <NavBar />
    </div>
  );
}
