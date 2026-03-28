'use client'
import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

interface ActionButton {
  label: string;
  icon: React.ReactNode;
  onClick: (row: any) => void;
  className?: string;
}

interface CustomTableProps {
  columns: Column[];
  rows: any[];
  actions?: ActionButton[];
  onRowClick?: (row: any) => void;
}

export default function CustomTable({ columns, rows, actions, onRowClick }: CustomTableProps) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;

    const sorted = [...rows].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'string') {
        return sortOrder === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return sorted;
  }, [rows, sortKey, sortOrder]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const renderCellValue = (column: Column, row: any) => {
    if (column.render) {
      return column.render(row[column.key], row);
    }
    return row[column.key] ?? '-';
  };

  return (
    <div>
      <table className="adm-table">
        {/* Table Header */}
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                onClick={() => column.sortable && handleSort(column.key)}
                style={{
                  cursor: column.sortable ? 'pointer' : 'default',
                  userSelect: 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{column.label}</span>
                  {column.sortable && sortKey === column.key && (
                    <span style={{ color: '#6366f1' }}>
                      {sortOrder === 'asc' ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                    </span>
                  )}
                </div>
              </th>
            ))}
            {actions && <th style={{ textAlign: 'center' }}>Actions</th>}
          </tr>
        </thead>

        {/* Table Body */}
        <tbody>
          {sortedRows.map((row, idx) => (
            <tr
              key={row.id || idx}
              onClick={() => onRowClick?.(row)}
              style={{
                cursor: onRowClick ? 'pointer' : 'default',
              }}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                >
                  {renderCellValue(column, row)}
                </td>
              ))}
              {actions && (
                <td style={{ textAlign: 'center' }}>
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === row.id ? null : row.id);
                      }}
                      style={{
                        padding: '6px 10px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        color: '#1a1d2e'
                      }}
                    >
                      ⋯
                    </button>

                    {/* Action Menu */}
                    {openMenuId === row.id && (
                      <div style={{
                        position: 'absolute',
                        right: 0,
                        marginTop: '8px',
                        width: '180px',
                        backgroundColor: 'white',
                        borderRadius: '10px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                        border: '1px solid #e8eaf0',
                        zIndex: 50,
                        overflow: 'hidden'
                      }}>
                        {actions.map((action, idx) => (
                          <button
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              action.onClick(row);
                              setOpenMenuId(null);
                            }}
                            style={{
                              width: '100%',
                              padding: '12px 16px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              fontSize: '0.8rem',
                              fontWeight: '500',
                              background: 'none',
                              border: idx < actions.length - 1 ? '1px solid #f0f1f5' : 'none',
                              borderBottom: idx < actions.length - 1 ? '1px solid #f0f1f5' : 'none',
                              cursor: 'pointer',
                              color: '#1a1d2e',
                              fontFamily: 'Sora, sans-serif',
                              textAlign: 'left',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f6fa'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            {action.icon}
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Empty State */}
      {sortedRows.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '48px 0',
          color: '#9095a8',
          fontSize: '0.9rem'
        }}>
          <p style={{ fontWeight: '500' }}>No data available</p>
        </div>
      )}
    </div>
  );
}
