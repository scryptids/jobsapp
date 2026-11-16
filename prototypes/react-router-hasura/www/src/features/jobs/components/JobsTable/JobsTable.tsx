/**
 * Jobs table
 * @module
 */

import { useCallback, useMemo, useState } from "react";
import { Alert } from "@mantine/core";
import { useFetcher } from "react-router";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type RowData,
} from "@tanstack/react-table";

import { type PositionsQuery } from "src/graphql/_generated";
import { jobDeletePath } from "~/app/routes";
import { type action as deleteJobAction } from "~/app/routes/jobs-delete";
import classes from "./JobsTable.module.css";
import { JobsTableRowMenu } from "../JobsTableRowMenu/JobsTableRowMenu";
import { JobDeleteDialog } from "../JobDeleteDialog/JobDeleteDialog";

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
  },
  {
    id: "employer",
    header: "Employer",
    // Employer is optional; a nested accessorKey warns when it's null.
    accessorFn: (row) => row.employer?.name ?? "",
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

export function JobsTable({ jobsData }: JobsTableProps) {
  const deleteFetcher = useFetcher<typeof deleteJobAction>();
  // Job awaiting confirmation in the dialog.
  const [confirming, setConfirming] = useState<JobRow | null>(null);
  // Last job submitted for deletion, for the error message.
  const [lastDeleted, setLastDeleted] = useState<JobRow | null>(null);

  const deleting = deleteFetcher.state !== "idle";
  const deletingId = deleting ? lastDeleted?.id : undefined;
  const failed =
    !deleting && deleteFetcher.data?.ok === false && lastDeleted !== null;

  // Hide the row immediately; loaders revalidate once the delete lands, and
  // the row comes back if it failed.
  const visibleJobs = useMemo(
    () => jobsData.filter((job) => job.id !== deletingId),
    [jobsData, deletingId]
  );

  const confirmDelete = useCallback(() => {
    if (!confirming) return;
    setLastDeleted(confirming);
    deleteFetcher.submit(null, {
      method: "post",
      action: jobDeletePath(confirming.id),
    });
    setConfirming(null);
  }, [confirming, deleteFetcher]);

  const cancelDelete = useCallback(() => setConfirming(null), []);

  const meta = useMemo(
    () => ({ handleDelete: setConfirming, deleteDisabled: deleting }),
    [deleting]
  );

  const table = useReactTable({
    data: visibleJobs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(row.id),
    meta,
  });

  return (
    <>
      {failed ? (
        <Alert color="red" title="Couldn't delete job" mb="md" role="alert">
          {deleteFetcher.data?.reason === "not-found"
            ? `${lastDeleted.title} no longer exists.`
            : `${lastDeleted.title} wasn't deleted. Please try again.`}
        </Alert>
      ) : null}

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
                        header.getContext()
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

      <JobDeleteDialog
        jobTitle={confirming?.title ?? null}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </>
  );
}
