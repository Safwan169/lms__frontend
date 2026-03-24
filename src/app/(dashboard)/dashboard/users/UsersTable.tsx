'use client'
import getColumns from '@/app/(dashboard)/dashboard/users/userColumns';
import DataTable from '@/components/ui/table';
import { useState } from 'react';

const initialRows = [
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
const  UsersTable = () => {
 


  const [rows, setRows] = useState(initialRows);

const handleDelete = (id: number) => {
  console.log('handleDelete called with id:', id); // check browser console
  setRows(prev => {
    console.log('prev rows:', prev); // check what rows look like
    return prev.filter(row => row.id !== id);
  });
};
const columns = getColumns(handleDelete);
    return (
        
        <div>
            <DataTable columns={columns} rows={rows} />
        </div>
    );
};

export default  UsersTable;