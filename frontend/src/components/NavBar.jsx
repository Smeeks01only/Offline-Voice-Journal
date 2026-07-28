import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import RecordButton from './RecordButton';
import './NavBar.css';

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
);

const TimelineIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

export default function NavBar() {
  return (
    <nav className="nav-bar">
      <div className="nav-brand">
        <Link to="/">Your journal</Link>
      </div>
      <div className="nav-links">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
          <HomeIcon />
          <span>Journal</span>
        </NavLink>
        
        <NavLink to="/timeline" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <TimelineIcon />
          <span>Timeline</span>
        </NavLink>
        
        <NavLink to="/search" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <SearchIcon />
          <span>Search</span>
        </NavLink>
      </div>

      <div className="nav-record-wrapper">
        <RecordButton className="nav-record-btn" />
      </div>
    </nav>
  );
}
