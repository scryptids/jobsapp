/**
 * Jobs table
 * @module
 */

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";

import { type Positions } from "src/graphql/_generated";
import classes from "./JobsTable.module.css";
import { JobsTableRowMenu } from "../JobsTableRowMenu/JobsTableRowMenu";

export interface JobsTableProps {
  readonly jobsData: Array<Positions>;
}

/**
 * Column definitions live outside the component so the cell renderer is not
 * re-created as a new component type on every render.
 */
function buildColumns(
  deleteJob: (jobId: number) => void
): ColumnDef<Positions>[] {
  return [
    {
      header: "Title",
      accessorKey: "title",
    },
    {
      header: "Employer",
      accessorKey: "employer.name",
    },
    {
      id: "menu",
      header: () => null,
      accessorFn: (row) => row,
      cell: ({ row }) => (
        <JobsTableRowMenu job={row.original} deleteJob={deleteJob} />
      ),
    },
  ];
}

function deleteJob(jobId: number) {
  alert(`deleting ${jobId}`);
}

const columns = buildColumns(deleteJob);

export function JobsTable({ jobsData }: JobsTableProps) {
  const table = useReactTable({
    data: jobsData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <table className={classes.jobs_table}>
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th key={header.id} className={classes.column_header}>
                {header.isPlaceholder
                  ? null
                  : flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id} tabIndex={-1}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
