import React from "react"
import TeachersTable from "./TeachersTable"

export default function TeachersPage() {
  return (
    <div className="adm-root">
      <div className="adm-topbar">
        <div className="adm-topbar-left">
          <h1>Teacher Management</h1>
          <p>Manage and monitor all teachers with actionable filters and bulk operations</p>
        </div>
      </div>

      <div className="adm-stats">
        <div className="adm-stat">
          <div className="adm-stat-icon" style={{ background: "#e0e7ff" }}>👨‍🏫</div>
          <div className="adm-stat-val">216</div>
          <div className="adm-stat-label">Total Teachers</div>
          <div className="adm-stat-change up">↑ +12 this month</div>
          <div className="adm-stat-corner" style={{ background: "#6366f1" }} />
        </div>
        <div className="adm-stat">
          <div className="adm-stat-icon" style={{ background: "#dcfce7" }}>✓</div>
          <div className="adm-stat-val">187</div>
          <div className="adm-stat-label">Active Teachers</div>
          <div className="adm-stat-change up">↑ +9 this month</div>
          <div className="adm-stat-corner" style={{ background: "#10b981" }} />
        </div>
        <div className="adm-stat">
          <div className="adm-stat-icon" style={{ background: "#fef3c7" }}>⏳</div>
          <div className="adm-stat-val">17</div>
          <div className="adm-stat-label">On Leave</div>
          <div className="adm-stat-change down">↓ -2 this month</div>
          <div className="adm-stat-corner" style={{ background: "#f59e0b" }} />
        </div>
        <div className="adm-stat">
          <div className="adm-stat-icon" style={{ background: "#fee2e2" }}>⊗</div>
          <div className="adm-stat-val">12</div>
          <div className="adm-stat-label">Inactive Teachers</div>
          <div className="adm-stat-change up">↑ +1 this month</div>
          <div className="adm-stat-corner" style={{ background: "#ef4444" }} />
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-header">
          <span className="adm-card-title">All Teachers</span>
        </div>
        <TeachersTable />
      </div>
    </div>
  )
}
