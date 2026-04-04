import React from 'react';
import UsersTable from './UsersTable';

const page = () => {
    return (
        <div className="adm-root">
            {/* Top bar */}
            <div className="adm-topbar">
                <div className="adm-topbar-left">
                    <h1>Admin Management</h1>
                    <p>Manage and monitor all admins - View, edit, and delete admin accounts</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="adm-stats">
                <div className="adm-stat">
                    <div className="adm-stat-icon" style={{ background: '#e0e7ff' }}>👥</div>
                    <div className="adm-stat-val">1,234</div>
                    <div className="adm-stat-label">Total Admins</div>
                    <div className="adm-stat-change up">↑ +45 this month</div>
                    <div className="adm-stat-corner" style={{ background: '#6366f1' }} />
                </div>
                <div className="adm-stat">
                    <div className="adm-stat-icon" style={{ background: '#dcfce7' }}>✓</div>
                    <div className="adm-stat-val">1,089</div>
                    <div className="adm-stat-label">Active Admins</div>
                    <div className="adm-stat-change up">↑ +32 this month</div>
                    <div className="adm-stat-corner" style={{ background: '#10b981' }} />
                </div>
                <div className="adm-stat">
                    <div className="adm-stat-icon" style={{ background: '#fef3c7' }}>⏳</div>
                    <div className="adm-stat-val">98</div>
                    <div className="adm-stat-label">Pending Approval</div>
                    <div className="adm-stat-change down">↓ -8 this month</div>
                    <div className="adm-stat-corner" style={{ background: '#f59e0b' }} />
                </div>
                <div className="adm-stat">
                    <div className="adm-stat-icon" style={{ background: '#fee2e2' }}>⊗</div>
                    <div className="adm-stat-val">47</div>
                    <div className="adm-stat-label">Inactive Admins</div>
                    <div className="adm-stat-change up">↑ +5 this month</div>
                    <div className="adm-stat-corner" style={{ background: '#ef4444' }} />
                </div>
            </div>

            {/* Admins Card */}
            <div className="adm-card">
                <div className="adm-card-header">
                    <span className="adm-card-title">All Admins</span>
                </div>
                <UsersTable />
            </div>
        </div>
    );
};

export default page;