'use client'
import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { useState } from "react";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DeleteIcon from "@mui/icons-material/Delete";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import { Trash } from "lucide-react";

function ActionMenu({ id, onDelete }: { id: number; onDelete: (id: number) => void }) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleDelete = () => {
    onDelete(id);
    handleClose();
  };

  return (
<>
  <IconButton size="small" onClick={handleOpen}>
    <MoreVertIcon fontSize="small" />
  </IconButton>

  <Menu
    anchorEl={anchorEl}
    open={open}
    onClose={handleClose}
    PaperProps={{
      sx: {
        border: "1px solid",
        borderColor: "divider",
        borderRadius: "12px",
        
      }
    }}
  >
    <MenuItem
      onClick={handleDelete}
      sx={{
        borderRadius: "8px",
        mx: 0.5,
      }}
    >
      <ListItemIcon>
        <Trash />
      </ListItemIcon>
      <ListItemText>Delete</ListItemText>
    </MenuItem>
  </Menu>
</>
  );
}

const getColumns = (onDelete: (id: number) => void): GridColDef[] => [
  { field: 'id', headerName: 'ID', flex: 1, align: 'center', headerAlign: 'center' },

  { field: 'firstName', headerName: 'First name', flex: 1, align: 'center', headerAlign: 'center' },

  { field: 'lastName', headerName: 'Last name', flex: 1, align: 'center', headerAlign: 'center' },

  { field: 'age', headerName: 'Age', type: 'number', flex: 1, align: 'center', headerAlign: 'center' },

  {
    field: 'fullName',
    headerName: 'Full name',
    sortable: false,
    flex: 1,
    align: 'center',
    headerAlign: 'center',
    valueGetter: (value, row) => `${row.firstName || ''} ${row.lastName || ''}`,
  },

  {
    field: 'actions',
    headerName: 'Actions',
    flex: 1,
    sortable: false,
    align: 'center',
    headerAlign: 'center',
    renderCell: (params: GridRenderCellParams) => (
      <ActionMenu id={params.row.id} onDelete={onDelete} />
    ),
  },
];

export default getColumns;