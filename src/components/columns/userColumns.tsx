'use client'
import { GridColDef } from "@mui/x-data-grid";

const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70, align: 'center', headerAlign: 'center' },
    { field: 'firstName', headerName: 'First name', width: 130, align: 'center', headerAlign: 'center' },
    { field: 'lastName', headerName: 'Last name', width: 130, align: 'center', headerAlign: 'center' },
    { field: 'age', headerName: 'Age', type: 'number', width: 90, align: 'center', headerAlign: 'center' },
    {
        field: 'fullName',
        headerName: 'Full name',
        description: 'This column has a value getter and is not sortable.',
        sortable: false,
        width: 160,
        align: 'center',
        headerAlign: 'center',
        valueGetter: (value, row) => `${row.firstName || ''} ${row.lastName || ''}`,
    },
];

export default columns;