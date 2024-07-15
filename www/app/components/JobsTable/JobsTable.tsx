/**
 * Jobs table
 * @module
 */

import { useReactTable, getCoreRowModel, flexRender } from "@tanstack/react-table";

import classes from "./JobsTable.module.css";

export interface JobsTableProps {
  jobsData: any
}

export function JobsTable(props: JobsTableProps) {
  const columns = [
    {
      header: 'Title',
      accessorKey: 'title',
    },
    {
      header: 'Employer',
      accessorKey: 'employer.name',
    },
  ]
  const table = useReactTable({
    data: props.jobsData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <table>
      <thead>
        {table.getHeaderGroups().map(headerGroup => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map(header => (
              <th key={header.id} className={classes.column_header}>
                {header.isPlaceholder
                  ? null
                  : flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )
                }
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map(row => (
          <tr key={row.id}>
            {row.getVisibleCells().map(cell => (
              <td key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
