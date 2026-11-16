/**
 * The user's employers with their job counts, each with edit and delete.
 * @module
 */

import { Anchor, Table } from "@mantine/core";
import { Link } from "react-router";

import { employerDetailPath } from "~/app/routes";
import { useEmployerDelete } from "~/features/employers/hooks/useEmployerDelete";
import { EmployerRowMenu } from "../EmployersTableRowMenu/EmployersTableRowMenu";

export type EmployerRow = { id: number; name: string; jobCount: number };

export function EmployersTable({ employers }: { readonly employers: EmployerRow[] }) {
  const { requestDelete, deleting, deletingId, alert, dialog } = useEmployerDelete();

  return (
    <>
      {alert}
      <Table striped highlightOnHover maw={720}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th>Jobs</Table.Th>
            <Table.Th aria-label="Actions" />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {employers
            .filter((e) => e.id !== deletingId)
            .map((employer) => (
              <Table.Tr key={employer.id}>
                <Table.Td>
                  <Anchor component={Link} to={employerDetailPath(employer.id)}>
                    {employer.name}
                  </Anchor>
                </Table.Td>
                <Table.Td>{employer.jobCount}</Table.Td>
                <Table.Td>
                  <EmployerRowMenu
                    employer={employer}
                    onDelete={requestDelete}
                    deleteDisabled={deleting}
                  />
                </Table.Td>
              </Table.Tr>
            ))}
        </Table.Tbody>
      </Table>
      {dialog}
    </>
  );
}
