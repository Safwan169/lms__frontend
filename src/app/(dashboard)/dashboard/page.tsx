import React from 'react';

const stats = [
    { label: 'Total Students', value: '4,821', change: '+143 this month', trend: 'up', color: '#6366f1', bg: '#eef2ff', icon: '👨‍🎓' },
    { label: 'Total Teachers', value: '312', change: '+8 this month', trend: 'up', color: '#0ea5e9', bg: '#e0f2fe', icon: '👩‍🏫' },
    { label: 'Revenue (BDT)', value: ' 24,390 BDT', change: '+12% vs last month', trend: 'up', color: '#10b981', bg: '#d1fae5', icon: '💰' },
];

const recentStudents = [
    { name: 'Sarah Johnson', course: 'React Masterclass', enrolled: '2h ago', status: 'Active', avatar: 'SJ' },
    { name: 'Mohammed Al-Rashid', course: 'Python for Data Science', enrolled: '5h ago', status: 'Active', avatar: 'MA' },
    { name: 'Priya Nair', course: 'UI/UX Design Fundamentals', enrolled: 'Yesterday', status: 'Pending', avatar: 'PN' },
    { name: 'Carlos Mendez', course: 'System Design', enrolled: 'Yesterday', status: 'Active', avatar: 'CM' },
    { name: 'Emily Chen', course: 'Next.js 14 App Router', enrolled: '2 days ago', status: 'Inactive', avatar: 'EC' },
];

const topCourses = [
    { title: 'React Masterclass', instructor: 'James Wright', students: 892, revenue: '$8,920', rating: 4.9, progress: 89 },
    { title: 'Python for Data Science', instructor: 'Dr. Aisha Patel', students: 741, revenue: '$7,410', rating: 4.8, progress: 74 },
    { title: 'UI/UX Design Fundamentals', instructor: 'Sofia Larsen', students: 634, revenue: '$6,340', rating: 4.7, progress: 63 },
    { title: 'System Design', instructor: 'Kevin Park', students: 520, revenue: '$5,200', rating: 4.9, progress: 52 },
];

const recentActivity = [
    { text: '3 new admissions in Class 9 (Science) - Batch A', time: '2 min ago', color: '#6366f1' },
    { text: 'Attendance submitted for Class 10 Mathematics', time: '18 min ago', color: '#f59e0b' },
    { text: 'Section B timetable updated for Class 8', time: '1h ago', color: '#10b981' },
    { text: 'Fee due reminders sent to 12 students (Class 7)', time: '3h ago', color: '#ef4444' },
    { text: '2 transfer requests approved for Class 6 - Batch C', time: '5h ago', color: '#6366f1' },
];

const AdminDashboard = () => {
    return (
        <>
           

            <div className="adm-root">

                {/* Top bar */}
                <div className="adm-topbar">
                    <div className="adm-topbar-left">
                        <h1>Admin Dashboard</h1>
                        <p>Monday, 16 March 2026 — Welcome back, Admin</p>
                    </div>
                    
                </div>

                {/* Stats */}
                <div className="adm-stats adm-stats-3">
                    {stats.map((s) => (
                        <div className="adm-stat" key={s.label}>
                            <div className="adm-stat-icon" style={{ background: s.bg }}>{s.icon}</div>
                            <div className="adm-stat-val">{s.value}</div>
                            <div className="adm-stat-label">{s.label}</div>
                            <div className={`adm-stat-change ${s.trend}`}>{s.trend === 'up' ? '↑' : '↓'} {s.change}</div>
                            <div className="adm-stat-corner" style={{ background: s.color }} />
                        </div>
                    ))}
                </div>

                {/* Main grid */}
                <div className="adm-grid">
                    <div>
                        {/* Recent enrollments */}
                        <div className="adm-card">
                            <div className="adm-card-header">
                                <span className="adm-card-title">Recent Enrollments</span>
                                <button className="adm-view-all">View all →</button>
                            </div>
                            <table className="adm-table">
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th>Enrolled</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentStudents.map((s) => (
                                        <tr key={s.name}>
                                            <td>
                                                <div className="adm-stu-cell">
                                                    <div className="adm-stu-av">{s.avatar}</div>
                                                    <div>
                                                        <div className="adm-stu-name">{s.name}</div>
                                                        <div className="adm-stu-course">{s.course}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ color: '#9095a8', fontSize: '0.78rem' }}>{s.enrolled}</td>
                                            <td><span className={`adm-badge ${s.status.toLowerCase()}`}>{s.status}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Top courses */}
                        {/* <div className="adm-card">
                            <div className="adm-card-header">
                                <span className="adm-card-title">Top Courses by Revenue</span>
                                <button className="adm-view-all">Manage →</button>
                            </div>
                            {topCourses.map((c, i) => (
                                <div className="adm-course-row" key={c.title}>
                                    <div className="adm-course-rank">#{i + 1}</div>
                                    <div className="adm-course-info">
                                        <div className="adm-course-name">{c.title}</div>
                                        <div className="adm-course-meta">{c.instructor} · {c.students} students · ★ {c.rating}</div>
                                    </div>
                                    <div className="adm-course-bar">
                                        <div className="adm-course-bar-fill" style={{ width: `${c.progress}%` }} />
                                    </div>
                                    <div className="adm-course-rev">{c.revenue}</div>
                                </div>
                            ))}
                        </div> */}
                    </div>

                    {/* Sidebar */}
                    <div>
                        {/* <div className="adm-card">
                            <div className="adm-card-header">
                                <span className="adm-card-title">Quick Actions</span>
                            </div>
                            <div className="adm-actions">
                                {[
                                    { icon: '➕', label: 'Add Course' },
                                    { icon: '👤', label: 'Add Student' },
                                    { icon: '📊', label: 'View Reports' },
                                    { icon: '💬', label: 'Send Notice' },
                                ].map((a) => (
                                    <button className="adm-action-btn" key={a.label}>
                                        <span className="adm-action-icon">{a.icon}</span>
                                        <span className="adm-action-label">{a.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div> */}

                        <div className="adm-card">
                            <div className="adm-card-header">
                                <span className="adm-card-title">Recent Activity</span>
                                <button className="adm-view-all">See all</button>
                            </div>
                            {recentActivity.map((a, i) => (
                                <div className="adm-act-item" key={i}>
                                    <div className="adm-act-dot" style={{ background: a.color }} />
                                    <div className="adm-act-text">{a.text}</div>
                                    <div className="adm-act-time">{a.time}</div>
                                </div>
                            ))}
                        </div>

                        {/* <div className="adm-card">
                            <div className="adm-card-header">
                                <span className="adm-card-title">Platform Health</span>
                            </div>
                            {[
                                { label: 'Server Uptime', value: '99.9%', color: '#10b981' },
                                { label: 'Avg. Load Time', value: '1.2s', color: '#6366f1' },
                                { label: 'Support Tickets Open', value: '7', color: '#f59e0b' },
                                { label: 'Pending Approvals', value: '3', color: '#ef4444' },
                            ].map((h) => (
                                <div key={h.label} style={{
                                    display: 'flex', justifyContent: 'space-between',
                                    alignItems: 'center', padding: '0.65rem 0',
                                    borderBottom: '1px solid #f5f6fa', fontSize: '0.82rem'
                                }}>
                                    <span style={{ color: '#9095a8' }}>{h.label}</span>
                                    <span style={{ fontWeight: 600, color: h.color }}>{h.value}</span>
                                </div>
                            ))}
                        </div> */}
                    </div>
                </div>
            </div>
        </>
    );
};

export default AdminDashboard;