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
import { Columns3Cog } from 'lucide-react';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';



const paginationModel = { page: 0, pageSize: 10 };

export default function DataTable({ columns, rows }: { columns: GridColDef[], rows: any[] }) {
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
  }, [searchText, rows]);

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


        <Tooltip title="Show / Hide Columns">
          <IconButton
            onClick={handleOpenMenu}
            sx={{
              width: 36,
              height: 36,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '10px',
              color: 'text.secondary',
            }}
          >
            <Columns3Cog fontSize="small" />
          </IconButton>
        </Tooltip>

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
          pageSizeOptions={[5, 10, 20]}
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