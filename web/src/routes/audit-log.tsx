import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EnvBadge } from "@/components/shared/env-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { auditLogsQueryOptions } from "@/services/misc";
import { formatDateTime } from "@/lib/format";
import type { AuditLog } from "@/lib/types";

export const Route = createFileRoute("/audit-log")({
  head: () => ({
    meta: [
      { title: "Audit Log — VisionServe" },
      { name: "description", content: "Immutable audit trail of every action taken in the workspace: actor, resource, and result." },
      { property: "og:title", content: "Audit Log — VisionServe" },
      { property: "og:description", content: "Immutable audit trail of workspace actions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(auditLogsQueryOptions());
  },
  component: AuditPage,
});

const columns: ColumnDef<AuditLog, unknown>[] = [
  { accessorKey: "ts", header: "Time", cell: ({ row }) => <span className="font-mono text-xs whitespace-nowrap">{formatDateTime(row.original.ts)}</span> },
  { accessorKey: "actor", header: "Actor", cell: ({ row }) => <span className="font-mono text-xs">{row.original.actor}</span> },
  { accessorKey: "action", header: "Action", cell: ({ row }) => <span className="text-xs font-medium">{row.original.action}</span> },
  {
    accessorKey: "resource",
    header: "Resource",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        <span className="text-foreground/70">{row.original.resourceType}/</span>
        {row.original.resource}
      </span>
    ),
  },
  { accessorKey: "environment", header: "Env", cell: ({ row }) => <EnvBadge env={row.original.environment} /> },
  { accessorKey: "ip", header: "IP", cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.ip}</span> },
  {
    accessorKey: "result",
    header: "Result",
    cell: ({ row }) => {
      const r = row.original.result;
      return <StatusBadge status={r === "success" ? "succeeded" : r === "denied" ? "failed" : "degraded"} label={r} />;
    },
  },
];

function AuditPage() {
  const { data: logs, isLoading } = useSuspenseQuery(auditLogsQueryOptions());
  const [resultFilter, setResultFilter] = useState<string>("all");

  const filtered = useMemo(
    () => (resultFilter === "all" ? logs : logs.filter((l) => l.result === resultFilter)),
    [logs, resultFilter],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <PageHeader
        title="Audit log"
        description="Every authenticated action against this workspace, retained for 12 months."
      />
      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        searchPlaceholder="Search actor, action, or resource…"
        getRowId={(l) => l.id}
        pageSize={15}
        toolbar={
          <Select value={resultFilter} onValueChange={setResultFilter}>
            <SelectTrigger className="h-8 w-32 text-xs" aria-label="Filter by result">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All results</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="denied">Denied</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
        }
        emptyTitle="No audit entries"
        emptyDescription="Actions in this workspace will appear here."
      />
    </div>
  );
}
