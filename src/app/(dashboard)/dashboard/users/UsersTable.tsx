'use client'
import { useState, useMemo } from 'react';
import CustomTable from './CustomTable';
import { Search, Filter, Eye, Edit2, Trash2, Plus, Download } from 'lucide-react';

const initialRows = [
    { id: 1, firstName: 'Jon', lastName: 'Snow', email: 'jon.snow@example.com', role: 'Employee', status: 'Active', joinDate: '2024-01-15' },
    { id: 2, firstName: 'Cersei', lastName: 'Lannister', email: 'cersei@example.com', role: 'Instructor', status: 'Active', joinDate: '2023-11-20' },
    { id: 3, firstName: 'Jaime', lastName: 'Lannister', email: 'jaime@example.com', role: 'Employee', status: 'Active', joinDate: '2024-02-10' },
    { id: 4, firstName: 'Arya', lastName: 'Stark', email: 'arya.stark@example.com', role: 'Employee', status: 'Inactive', joinDate: '2023-08-05' },
    { id: 5, firstName: 'Daenerys', lastName: 'Targaryen', email: 'daenerys@example.com', role: 'Admin', status: 'Active', joinDate: '2023-06-12' },
    { id: 6, firstName: 'Melisandre', lastName: 'Red', email: 'melisandre@example.com', role: 'Instructor', status: 'Active', joinDate: '2024-01-08' },
    { id: 7, firstName: 'Ferrara', lastName: 'Clifford', email: 'ferrara@example.com', role: 'Employee', status: 'Active', joinDate: '2023-12-03' },
    { id: 8, firstName: 'Rossini', lastName: 'Frances', email: 'rossini@example.com', role: 'Instructor', status: 'Pending', joinDate: '2024-03-15' },
    { id: 9, firstName: 'Harvey', lastName: 'Roxie', email: 'harvey@example.com', role: 'Admin', status: 'Active', joinDate: '2023-05-22' },
    { id: 10, firstName: 'Michael', lastName: 'Davis', email: 'michael.davis@example.com', role: 'Employee', status: 'Active', joinDate: '2024-02-28' },
    { id: 11, firstName: 'Sarah', lastName: 'Connor', email: 'sarah.connor@example.com', role: 'Instructor', status: 'Active', joinDate: '2024-01-22' },
    { id: 12, firstName: 'John', lastName: 'Smith', email: 'john.smith@example.com', role: 'Employee', status: 'Active', joinDate: '2024-02-05' },
    { id: 13, firstName: 'Emma', lastName: 'Watson', email: 'emma.watson@example.com', role: 'Employee', status: 'Inactive', joinDate: '2023-09-10' },
    { id: 14, firstName: 'Robert', lastName: 'Johnson', email: 'robert.johnson@example.com', role: 'Admin', status: 'Active', joinDate: '2023-04-15' },
    { id: 15, firstName: 'Jessica', lastName: 'Brown', email: 'jessica.brown@example.com', role: 'Instructor', status: 'Active', joinDate: '2024-01-30' },
    { id: 16, firstName: 'David', lastName: 'Wilson', email: 'david.wilson@example.com', role: 'Employee', status: 'Pending', joinDate: '2024-03-20' },
    { id: 17, firstName: 'Lisa', lastName: 'Anderson', email: 'lisa.anderson@example.com', role: 'Instructor', status: 'Active', joinDate: '2023-12-12' },
    { id: 18, firstName: 'Chris', lastName: 'Taylor', email: 'chris.taylor@example.com', role: 'Employee', status: 'Active', joinDate: '2024-02-14' },
    { id: 19, firstName: 'Maria', lastName: 'Garcia', email: 'maria.garcia@example.com', role: 'Employee', status: 'Active', joinDate: '2024-03-01' },
    { id: 20, firstName: 'James', lastName: 'Martinez', email: 'james.martinez@example.com', role: 'Admin', status: 'Active', joinDate: '2023-07-18' },
];

const UsersTable = () => {
    const [rows, setRows] = useState(initialRows);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRole, setFilterRole] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);

    const filteredRows = useMemo(() => {
        setCurrentPage(1); // Reset to first page when filter changes
        return rows.filter(row => {
            const matchesSearch =
                row.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                row.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                row.email?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesRole = filterRole === 'All' || row.role === filterRole;
            const matchesStatus = filterStatus === 'All' || row.status === filterStatus;

            return matchesSearch && matchesRole && matchesStatus;
        });
    }, [rows, searchQuery, filterRole, filterStatus]);

    const totalPages = Math.ceil(filteredRows.length / itemsPerPage);
    const paginatedRows = useMemo(() => {
        const startIdx = (currentPage - 1) * itemsPerPage;
        return filteredRows.slice(startIdx, startIdx + itemsPerPage);
    }, [filteredRows, currentPage, itemsPerPage]);

    const handleDelete = (user: any) => {
        if (window.confirm(`Are you sure you want to delete employee ${user.firstName} ${user.lastName}?`)) {
            setRows(prev => prev.filter(row => row.id !== user.id));
        }
    };

    const handleEdit = (user: any) => {
        alert(`Edit functionality for employee ${user.firstName} ${user.lastName} - coming soon!`);
    };

    const handleView = (user: any) => {
        setSelectedUser(user);
    };

    const handleExport = () => {
        const csv = [
            ['ID', 'First Name', 'Last Name', 'Email', 'Role', 'Status', 'Join Date'],
            ...filteredRows.map(row => [row.id, row.firstName, row.lastName, row.email, row.role, row.status, row.joinDate])
        ]
            .map(row => row.join(','))
            .join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'employees.csv';
        a.click();
    };

    const columns = [
        {
            key: 'id',
            label: 'ID',
            sortable: true,
            render: (value: any) => <span className="font-semibold text-slate-900">#{value}</span>
        },
        {
            key: 'firstName',
            label: 'First Name',
            sortable: true,
        },
        {
            key: 'lastName',
            label: 'Last Name',
            sortable: true,
        },
        {
            key: 'email',
            label: 'Email',
            sortable: true,
            render: (value: any) => <span className="text-blue-600 underline">{value}</span>
        },
        {
            key: 'role',
            label: 'Role',
            sortable: true,
            render: (value: any) => {
                const colors: any = {
                    'Employee': 'bg-blue-100 text-blue-700',
                    'Instructor': 'bg-green-100 text-green-700',
                    'Admin': 'bg-purple-100 text-purple-700'
                };
                return (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[value] || 'bg-slate-100 text-slate-700'}`}>
                        {value}
                    </span>
                );
            }
        },
        {
            key: 'status',
            label: 'Status',
            sortable: true,
            render: (value: any) => {
                const colors: any = {
                    'Active': 'bg-green-100 text-green-700',
                    'Inactive': 'bg-red-100 text-red-700',
                    'Pending': 'bg-yellow-100 text-yellow-700'
                };
                return (
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${value === 'Active' ? 'bg-green-500' : value === 'Inactive' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[value] || 'bg-slate-100 text-slate-700'}`}>
                            {value}
                        </span>
                    </div>
                );
            }
        },
        {
            key: 'joinDate',
            label: 'Join Date',
            sortable: true,
        }
    ];

    const actions = [
        {
            label: 'View',
            icon: <Eye size={18} />,
            onClick: handleView,
            className: 'text-blue-600 hover:bg-blue-50'
        },
        {
            label: 'Edit',
            icon: <Edit2 size={18} />,
            onClick: handleEdit,
            className: 'text-amber-600 hover:bg-amber-50'
        },
        {
            label: 'Delete',
            icon: <Trash2 size={18} />,
            onClick: handleDelete,
            className: 'text-red-600 hover:bg-red-50'
        }
    ];

    return (
        <div>
            {/* Search and Filter Bar */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center', overflow: 'visible' }}>
                <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
                    <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: '#9095a8' }} />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            paddingLeft: '40px',
                            paddingRight: '16px',
                            paddingTop: '10px',
                            paddingBottom: '10px',
                            borderRadius: '10px',
                            border: '1px solid #e8eaf0',
                            fontSize: '0.82rem',
                            fontFamily: 'Sora, sans-serif',
                            backgroundColor: 'white',
                            color: '#1a1d2e'
                        }}
                    />
                </div>

                <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    style={{
                        padding: '10px 16px',
                        borderRadius: '10px',
                        border: '1px solid #e8eaf0',
                        fontSize: '0.82rem',
                        fontFamily: 'Sora, sans-serif',
                        backgroundColor: 'white',
                        color: '#1a1d2e',
                        cursor: 'pointer',
                        fontWeight: '500',
                        flexShrink: 0
                    }}
                >
                    <option value="All">All Roles</option>
                    <option value="Employee">Employee</option>
                    <option value="Instructor">Instructor</option>
                    <option value="Admin">Admin</option>
                </select>

                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{
                        padding: '10px 16px',
                        borderRadius: '10px',
                        border: '1px solid #e8eaf0',
                        fontSize: '0.82rem',
                        fontFamily: 'Sora, sans-serif',
                        backgroundColor: 'white',
                        color: '#1a1d2e',
                        cursor: 'pointer',
                        fontWeight: '500',
                        flexShrink: 0
                    }}
                >
                    <option value="All">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Pending">Pending</option>
                </select>

                <select
                    value={itemsPerPage}
                    onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                    }}
                    style={{
                        padding: '10px 16px',
                        borderRadius: '10px',
                        border: '1px solid #e8eaf0',
                        fontSize: '0.82rem',
                        fontFamily: 'Sora, sans-serif',
                        backgroundColor: 'white',
                        color: '#1a1d2e',
                        cursor: 'pointer',
                        fontWeight: '500',
                        flexShrink: 0
                    }}
                    title="Rows per page"
                >
                    <option value="5">5 rows</option>
                    <option value="10">10 rows</option>
                    <option value="15">15 rows</option>
                    <option value="20">20 rows</option>
                    <option value="50">50 rows</option>
                </select>

                <button
                    onClick={handleExport}
                    style={{
                        padding: '10px 16px',
                        borderRadius: '10px',
                        border: '1px solid #e8eaf0',
                        backgroundColor: 'white',
                        color: '#1a1d2e',
                        cursor: 'pointer',
                        fontWeight: '500',
                        fontSize: '0.82rem',
                        fontFamily: 'Sora, sans-serif',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        flexShrink: 0
                    }}
                >
                    <Download size={16} />
                    Export
                </button>
            </div>

            {/* Custom Table */}
            <CustomTable columns={columns} rows={paginatedRows} actions={actions} />

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem 0',
                    borderTop: '1px solid #e8eaf0',
                    marginTop: '1.25rem',
                    gap: '1rem',
                    flexWrap: 'wrap'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        fontSize: '0.83rem',
                        color: '#9095a8',
                        fontFamily: 'Sora, sans-serif'
                    }}>
                        <span>Show</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => {
                                setItemsPerPage(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            style={{
                                padding: '6px 10px',
                                borderRadius: '8px',
                                border: '1px solid #e8eaf0',
                                fontSize: '0.82rem',
                                fontFamily: 'Sora, sans-serif',
                                backgroundColor: 'white',
                                color: '#1a1d2e',
                                cursor: 'pointer',
                                fontWeight: '500'
                            }}
                        >
                            <option value="5">5</option>
                            <option value="10">10</option>
                            <option value="15">15</option>
                            <option value="20">20</option>
                            <option value="50">50</option>
                        </select>
                        <span>entries</span>
                        <span style={{ marginLeft: '8px' }}>
                            - Showing <span style={{ fontWeight: '600', color: '#1a1d2e' }}>{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                            <span style={{ fontWeight: '600', color: '#1a1d2e' }}>{Math.min(currentPage * itemsPerPage, filteredRows.length)}</span> of{' '}
                            <span style={{ fontWeight: '600', color: '#1a1d2e' }}>{filteredRows.length}</span> employees
                        </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {/* Previous Button */}
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid #e8eaf0',
                                backgroundColor: currentPage === 1 ? '#f5f6fa' : 'white',
                                color: currentPage === 1 ? '#9095a8' : '#1a1d2e',
                                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                fontWeight: '500',
                                fontSize: '0.82rem',
                                fontFamily: 'Sora, sans-serif',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                if (currentPage > 1) {
                                    (e.target as any).style.backgroundColor = '#f5f6fa';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (currentPage > 1) {
                                    (e.target as any).style.backgroundColor = 'white';
                                }
                            }}
                        >
                            ← Previous
                        </button>

                        {/* Page Numbers */}
                        <div style={{ display: 'flex', gap: '4px' }}>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '8px',
                                        border: currentPage === page ? '2px solid #6366f1' : '1px solid #e8eaf0',
                                        backgroundColor: currentPage === page ? '#eef2ff' : 'white',
                                        color: currentPage === page ? '#6366f1' : '#1a1d2e',
                                        cursor: 'pointer',
                                        fontWeight: currentPage === page ? '600' : '500',
                                        fontSize: '0.82rem',
                                        fontFamily: 'Sora, sans-serif',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (currentPage !== page) {
                                            (e.target as any).style.backgroundColor = '#f5f6fa';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (currentPage !== page) {
                                            (e.target as any).style.backgroundColor = 'white';
                                        }
                                    }}
                                >
                                    {page}
                                </button>
                            ))}
                        </div>

                        {/* Next Button */}
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid #e8eaf0',
                                backgroundColor: currentPage === totalPages ? '#f5f6fa' : 'white',
                                color: currentPage === totalPages ? '#9095a8' : '#1a1d2e',
                                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                fontWeight: '500',
                                fontSize: '0.82rem',
                                fontFamily: 'Sora, sans-serif',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                if (currentPage < totalPages) {
                                    (e.target as any).style.backgroundColor = '#f5f6fa';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (currentPage < totalPages) {
                                    (e.target as any).style.backgroundColor = 'white';
                                }
                            }}
                        >
                            Next →
                        </button>
                    </div>
                </div>
            )}

            {/* Employee Details Modal */}
            {selectedUser && (
                <div style={{
                    position: 'fixed',
                    inset: '0',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 50,
                    padding: '16px'
                }} onClick={() => setSelectedUser(null)}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '14px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                        maxWidth: '420px',
                        width: '100%',
                        padding: '24px',
                        border: '1px solid #e8eaf0'
                    }} onClick={(e) => e.stopPropagation()}>
                        <h2 style={{
                            fontSize: '1.5rem',
                            fontWeight: '600',
                            color: '#1a1d2e',
                            marginBottom: '16px',
                            fontFamily: 'Lora, serif'
                        }}>
                            {selectedUser.firstName} {selectedUser.lastName}
                        </h2>
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ marginBottom: '12px' }}>
                                <p style={{ fontSize: '0.7rem', fontWeight: '600', color: '#9095a8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Email</p>
                                <p style={{ color: '#1a1d2e', fontSize: '0.83rem' }}>{selectedUser.email}</p>
                            </div>
                            <div style={{ marginBottom: '12px' }}>
                                <p style={{ fontSize: '0.7rem', fontWeight: '600', color: '#9095a8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Role</p>
                                <p style={{ color: '#1a1d2e', fontSize: '0.83rem' }}>{selectedUser.role}</p>
                            </div>
                            <div style={{ marginBottom: '12px' }}>
                                <p style={{ fontSize: '0.7rem', fontWeight: '600', color: '#9095a8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Status</p>
                                <p style={{ color: '#1a1d2e', fontSize: '0.83rem' }}>{selectedUser.status}</p>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.7rem', fontWeight: '600', color: '#9095a8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Join Date</p>
                                <p style={{ color: '#1a1d2e', fontSize: '0.83rem' }}>{selectedUser.joinDate}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedUser(null)}
                            style={{
                                width: '100%',
                                padding: '10px 16px',
                                borderRadius: '10px',
                                backgroundColor: '#6366f1',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: '500',
                                fontSize: '0.83rem',
                                fontFamily: 'Sora, sans-serif'
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersTable;