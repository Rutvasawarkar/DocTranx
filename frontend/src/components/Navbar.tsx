import { Link } from 'react-router-dom';
import { FileText, User } from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
  return (
    <nav className="navbar glass-panel">
      <div className="container flex-between">
        <Link to="/" className="brand flex-center">
          <FileText size={28} className="brand-icon" />
          <span className="brand-name">DocTranx</span>
        </Link>
        <div className="nav-links flex-center">
          <Link to="/" className="nav-link">Dashboard</Link>
          <div className="user-profile flex-center">
            <User size={20} />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
