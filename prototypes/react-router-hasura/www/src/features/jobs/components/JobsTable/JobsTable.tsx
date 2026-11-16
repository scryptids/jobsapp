/**
 * Jobs table
 * @module
 */

import { useMemo } from "react";
import { Anchor } from "@mantine/core";
import { Link } from "react-router";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type RowData,
} from "@tanstack/react-table";

import { type PositionsQuery } from "src/graphql/_generated";
import { employerDetailPath, jobDetailPath } from "~/app/routes";
import { useJobDelete } from "~/features/jobs/hooks/useJobDelete";
import classes from "./JobsTable.module.css";
import { JobsTableRowMenu } from "../JobsTableRowMenu/JobsTableRowMenu";

/** A job as returned by the positions queries. */
export type JobRow = PositionsQuery["positions"][number];

declare module "@tanstack/react-table" {
  // Declaration merging must repeat the library's type parameter.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends RowData> {
    handleDelete: (job: JobRow) => void;
    deleteDisabled: boolean;
  }
}

export interface JobsTableProps {
  readonly jobsData: JobRow[];
  /** Hide the employer column, e.g. on an employer's own page. */
  readonly hideEmployer?: boolean;
}

/**
 * Column definitions live outside the component so the cell renderer is not
 * re-created as a new component type on every render; per-render values
 * reach cells through the table's `meta`.
 */
const columns: ColumnDef<JobRow>[] = [
  {
    header: "Title",
    accessorKey: "title",
    cell: ({ row }) => (
      <Anchor component={Link} to={jobDetailPath(row.original.id)}>
        {row.original.title}
      </Anchor>
    ),
  },
  {
    id: "employer",
    header: "Employer",
    // Employer is optional; a nested accessorKey warns when it's null.
    accessorFn: (row) => row.employer?.name ?? "",
    cell: ({ row }) => {
      const { employer } = row.original;
      return employer ? (
        <Anchor component={Link} to={employerDetailPath(employer.id)}>
          {employer.name}
        </Anchor>
      ) : null;
    },
  },
  {
    id: "menu",
    header: () => null,
    cell: ({ row, table }) => (
      <JobsTableRowMenu
        job={row.original}
        onDelete={table.options.meta!.handleDelete}
        deleteDisabled={table.options.meta!.deleteDisabled}
      />
    ),
  },
];

export function JobsTable({ jobsData, hideEmployer = false }: JobsTableProps) {
  const { requestDelete, deleting, deletingId, alert, dialog } = useJobDelete();

  // Hide the row immediately; loaders revalidate once the delete lands, and
  // the row comes back if it failed.
  const visibleJobs = useMemo(
    () => jobsData.filter((job) => job.id !== deletingId),
    [jobsData, deletingId]
  );

  const meta = useMemo(
    () => ({ handleDelete: requestDelete, deleteDisabled: deleting }),
    [requestDelete, deleting]
  );

  const columnVisibility = useMemo(() => ({ employer: !hideEmployer }), [hideEmployer]);

  const table = useReactTable({
    data: visibleJobs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(row.id),
    state: { columnVisibility },
    meta,
  });

  return (
    <>
      {alert}

      <table className={classes.jobs_table}>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} className={classes.column_header}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
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

      {dialog}
    </>
  );
}
