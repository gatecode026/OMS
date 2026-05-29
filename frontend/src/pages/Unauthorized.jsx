import React from 'react';
import './Unauthorized.css';
import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import { ShieldAlert, ArrowLeft, LayoutDashboard } from 'lucide-react';

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <div className="unauthorized-wrapper flex-center">
      <div className="unauthorized-card card animate-slide-up">
        <div className="unauthorized-icon-holder">
          <ShieldAlert size={48} className="text-danger glow-danger" />
        </div>

        <h1 className="unauthorized-code">403</h1>
        <h2 className="unauthorized-title">Access Denied</h2>
        <p className="unauthorized-desc">
          You do not have the required role or credentials to view this secure administrative directory. Please check your role settings or contact the Super Admin.
        </p>

        <div className="unauthorized-actions">
          <Button variant="secondary" onClick={() => navigate(-1)} icon={ArrowLeft}>
            Go Back
          </Button>
          <Button variant="primary" onClick={() => navigate('/')} icon={LayoutDashboard}>
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
