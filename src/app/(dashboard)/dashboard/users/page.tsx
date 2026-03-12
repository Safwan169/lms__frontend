'use client';
import { useState, useMemo } from 'react';
import {
    DataGrid,
    GridColDef,
    GridColumnVisibilityModel,
} from '@mui/x-data-grid';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import Box from '@mui/material/Box';

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

const rows = [
    { id: 1, lastName: 'Snow', firstName: 'Jon', age: 35 },
    { id: 2, lastName: 'Lannister', firstName: 'Cersei', age: 42 },
    { id: 3, lastName: 'Lannister', firstName: 'Jaime', age: 45 },
    { id: 4, lastName: 'Stark', firstName: 'Arya', age: 16 },
    { id: 5, lastName: 'Targaryen', firstName: 'Daenerys', age: null },
    { id: 6, lastName: 'Melisandre', firstName: null, age: 150 },
    { id: 7, lastName: 'Clifford', firstName: 'Ferrara', age: 44 },
    { id: 8, lastName: 'Frances', firstName: 'Rossini', age: 36 },
    { id: 9, lastName: 'Roxie', firstName: 'Harvey', age: 65 },
    { id: 10, lastName: 'Roxie', firstName: 'Harvey', age: 65 },
    { id: 11, lastName: 'Roxie', firstName: 'Harvey', age: 65 },
    { id: 12, lastName: 'Roxie', firstName: 'Harvey', age: 65 },
    { id: 13, lastName: 'Roxie', firstName: 'Harvey', age: 65 },
    { id: 14, lastName: 'Roxie', firstName: 'Harvey', age: 65 },
    { id: 15, lastName: 'Roxie', firstName: 'Harvey', age: 65 },
    { id: 16, lastName: 'Roxie', firstName: 'Harvey', age: 65 },
    { id: 17, lastName: 'Roxie', firstName: 'Harvey', age: 65 },
    { id: 18, lastName: 'Roxie', firstName: 'Harvey', age: 65 },
    { id: 19, lastName: 'Roxie', firstName: 'Harvey', age: 65 },
    { id: 20, lastName: 'Roxie', firstName: 'Harvey', age: 65 },
    { id: 21, lastName: 'Roxie', firstName: 'Harvey', age: 65 },
    { id:22, lastName: 'Roxie', firstName: 'Harvey', age: 65 },
    { id: 23, lastName: 'Roxie', firstName: 'Harvey', age: 65 },
    { id: 24, lastName: 'Roxie', firstName: 'Harvey', age: 65 },
];

const paginationModel = { page: 0, pageSize: 10 };

export default function DataTable() {
    const [searchText, setSearchText] = useState('');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [columnVisibility, setColumnVisibility] = useState<GridColumnVisibilityModel>({});

    const filteredRows = useMemo(() => {
        if (!searchText.trim()) return rows;
        const lower = searchText.toLowerCase();
        return rows.filter((row) =>
            Object.values(row).some((val) =>
                String(val ?? '').toLowerCase().includes(lower)
            )
        );
    }, [searchText]);

    const handleOpenMenu = (e: React.MouseEvent<HTMLButtonElement>) => setAnchorEl(e.currentTarget);
    const handleCloseMenu = () => setAnchorEl(null);
    const toggleColumn = (field: string) => {
        setColumnVisibility((prev) => ({
            ...prev,
            [field]: prev[field] === false ? true : false,
        }));
    };

    return (
        <Paper sx={{ height: '90vh', width: '100%', p: 2, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            <Box display="flex" alignItems="center" justifyContent="flex-end" mb={1} gap={2}>
                <TextField
                    variant="outlined"
                    size="small"
                    placeholder="Search..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    sx={{
                        width: 280,
                        '& .MuiOutlinedInput-root': {
                            borderRadius: '10px',
                            '& fieldset': { borderColor: 'text.secondary' },
                        },
                    }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" />
                            </InputAdornment>
                        ),
                    }}
                />

                <Button
                    variant="outlined"
                    startIcon={<ViewColumnIcon />}
                    onClick={handleOpenMenu}
                    sx={{
                        color: 'text.secondary',
                        borderRadius: '10px',
                        borderColor: 'divider',
                    }}
                />

                <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleCloseMenu}>
                    {columns.map((col) => (
                        <MenuItem key={col.field} sx={{ py: 0 }}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={columnVisibility[col.field] !== false}
                                        onChange={() => toggleColumn(col.field)}
                                        size="small"
                                    />
                                }
                                label={col.headerName}
                            />
                        </MenuItem>
                    ))}
                </Menu>
            </Box>

            <Box sx={{ flexGrow: 1, width: '100%', minHeight: 0 }}>
                <DataGrid
                    rows={filteredRows}
                    columns={columns}
                    initialState={{ pagination: { paginationModel } }}
                    pageSizeOptions={[5, 10,20]}
                    checkboxSelection
                    columnVisibilityModel={columnVisibility}
                    onColumnVisibilityModelChange={(model) => setColumnVisibility(model)}
                    sx={{
                        border: 1,
                        borderColor: 'grey.300',
                        '& .MuiDataGrid-footerContainer': {
                            borderTop: '1px solid',
                            borderColor: 'grey.300',
                        }
                    }}
                />
            </Box>
        </Paper>
    );
}