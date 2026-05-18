# Admin Module - Batch Teacher Assignment

This module provides admin users with the ability to assign teachers to batch subjects.

## Features

- **Batch Selection**: Choose from available batches in your institution
- **Subject Selection**: Select subjects within the chosen batch
- **Teacher Assignment**: Assign qualified teachers to batch-subject combinations
- **Search Functionality**: Search and filter teachers by name or email
- **View Assignments**: See all teachers already assigned to a batch-subject
- **Role-based Access**: Only users with ADMIN or REKTOR roles can access this module

## API Integration

This module uses the following API endpoint:

```
POST /api/tenants/{tenantId}/batches/{batchId}/teachers
```

### Request Body

```json
{
  "subject_id": "95d46039-0641-48ea-9284-9448a3118e9c",
  "teacher_id": "972beb56-cb93-4174-983b-a23b9c363e21"
}
```

### Response

```json
{
  "success": true,
  "message": "Teacher assigned successfully",
  "data": { ... }
}
```

## File Structure

```
src/
├── features/admin/
│   ├── components/
│   │   └── BatchTeacherAssignment.tsx    # Main component
│   └── services/
│       └── batchTeacherApi.ts            # API service functions
└── app/(dashboard)/dashboard/admin/
    ├── page.tsx                          # Admin dashboard home
    └── batch-teacher-assignment/
        └── page.tsx                      # Assignment page
```

## Service Methods

### `assignTeacherToBatch(tenantId, batchId, payload)`
Assigns a teacher to a batch-subject combination.

### `getBatches(tenantId)`
Fetches all batches for a tenant.

### `getBatchSubjects(tenantId, batchId)`
Fetches all subjects for a specific batch.

### `getTenantTeachers(tenantId, params?)`
Fetches all teachers for a tenant with optional search parameters.

### `getBatchSubjectTeachers(tenantId, batchId, subjectId)`
Fetches all teachers already assigned to a batch-subject.

## Access

- **URL**: `http://localhost:3000/dashboard/admin/batch-teacher-assignment`
- **Required Role**: ADMIN or REKTOR
- **Authentication**: Bearer token required (handled by axios interceptor)

## User Flow

1. Navigate to Admin Dashboard
2. Click "Manage Assignments" on the Batch Teacher Assignment card
3. Select a batch from the dropdown
4. Select a subject from the batch
5. View currently assigned teachers
6. Click "Add Teacher" button
7. Search for or select a teacher
8. Click "Assign Teacher"
9. See confirmation message and updated list

## Future Enhancements

- Remove teacher from batch-subject assignments
- Bulk assignment functionality
- Export assignment reports
- Schedule-based assignments
- Curriculum management
- Permission management
