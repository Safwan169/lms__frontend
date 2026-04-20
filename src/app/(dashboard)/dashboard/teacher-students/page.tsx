"use client"

import { useMemo, useState } from "react"

import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table-primitive"

type DemoStudent = {
  id: string
  name: string
  roll: string
  className: string
  batchName: string
  phone: string
  guardianPhone: string
}

const demoStudents: DemoStudent[] = [
  {
    id: "std-001",
    name: "Safwan Rahman",
    roll: "1",
    className: "Class 9",
    batchName: "Science Morning A",
    phone: "01710000011",
    guardianPhone: "01790000011",
  },
  {
    id: "std-002",
    name: "Nusrat Jahan",
    roll: "2",
    className: "Class 9",
    batchName: "Science Morning A",
    phone: "01710000012",
    guardianPhone: "01790000012",
  },
  {
    id: "std-003",
    name: "Mahin Hasan",
    roll: "3",
    className: "Class 10",
    batchName: "SSC Evening",
    phone: "01710000013",
    guardianPhone: "01790000013",
  },
  {
    id: "std-004",
    name: "Ayesha Islam",
    roll: "4",
    className: "Class 10",
    batchName: "SSC Evening",
    phone: "01710000014",
    guardianPhone: "01790000014",
  },
  {
    id: "std-005",
    name: "Tamim Chowdhury",
    roll: "5",
    className: "Class 8",
    batchName: "Junior Day B",
    phone: "01710000015",
    guardianPhone: "01790000015",
  },
]

export default function TeacherStudentsPage() {
  const [batchFilter, setBatchFilter] = useState("All")
  const [search, setSearch] = useState("")

  const batchOptions = useMemo(() => {
    const unique = Array.from(new Set(demoStudents.map((item) => item.batchName)))
    return ["All", ...unique]
  }, [])

  const filteredStudents = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return demoStudents.filter((item) => {
      const batchMatch = batchFilter === "All" || item.batchName === batchFilter
      const searchMatch =
        keyword.length === 0 ||
        item.name.toLowerCase().includes(keyword) ||
        item.roll.toLowerCase().includes(keyword) ||
        item.className.toLowerCase().includes(keyword) ||
        item.batchName.toLowerCase().includes(keyword)
      return batchMatch && searchMatch
    })
  }, [batchFilter, search])

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Students Page</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Batch-wise teacher student list with local demo data for UI flow.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-xs uppercase text-muted-foreground">Total Demo Students</p>
          <p className="mt-1 text-2xl font-semibold">{demoStudents.length}</p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-xs uppercase text-muted-foreground">Visible After Filter</p>
          <p className="mt-1 text-2xl font-semibold">{filteredStudents.length}</p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-xs uppercase text-muted-foreground">Batches</p>
          <p className="mt-1 text-2xl font-semibold">{batchOptions.length - 1}</p>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-[220px_1fr]">
          <Select value={batchFilter} onValueChange={setBatchFilter}>
            {batchOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, roll, class or batch"
          />
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Roll</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Guardian</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.map((student) => (
              <TableRow key={student.id}>
                <TableCell className="font-medium">{student.roll}</TableCell>
                <TableCell>{student.name}</TableCell>
                <TableCell>{student.className}</TableCell>
                <TableCell>{student.batchName}</TableCell>
                <TableCell>{student.phone}</TableCell>
                <TableCell>{student.guardianPhone}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filteredStudents.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No students match your filter.</p>
        ) : null}
      </div>
    </div>
  )
}
