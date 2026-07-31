import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { PageHeader, SectionCard } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { storageQueryOptions } from "@/services/misc";
import { formatBytes, formatDate, formatRelative } from "@/lib/format";
import type { StorageObject } from "@/lib/types";

export const Route = createFileRoute("/storage")({
  head: () => ({
    meta: [
      { title: "Storage — VisionServe" },
      {
        name: "description",
        content: "Stored uploads, annotated outputs, and retention policies for the workspace.",
      },
      { property: "og:title", content: "Storage — VisionServe" },
      { property: "og:description", content: "Stored objects and retention policies." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(storageQueryOptions());
  },
  component: StoragePage,
});

function StoragePage() {
  const { data } = useSuspenseQuery(storageQueryOptions());
  const { objects, policies } = data;
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filtered = useMemo(
    () => (typeFilter === "all" ? objects : objects.filter((o) => o.type === typeFilter)),
    [objects, typeFilter],
  );
  const totalBytes = objects.reduce((sum, o) => sum + o.sizeBytes, 0);

  const columns: ColumnDef<StorageObject, unknown>[] = [
    {
      accessorKey: "name",
      header: "Object",
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.name}</span>,
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <span className="rounded-md border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
          {row.original.type}
        </span>
      ),
    },
    {
      accessorKey: "owner",
      header: "Owner",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{row.original.owner}</span>
      ),
    },
    {
      accessorKey: "jobId",
      header: "Source",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.jobId ?? row.original.batchId ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "sizeBytes",
      header: "Size",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-tnum">{formatBytes(row.original.sizeBytes)}</span>
      ),
    },
    {
      accessorKey: "provider",
      header: "Provider",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{row.original.provider}</span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {formatRelative(row.original.createdAt)}
        </span>
      ),
    },
    {
      accessorKey: "expiresAt",
      header: "Expires",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{formatDate(row.original.expiresAt)}</span>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <PageHeader
        title="Storage"
        description={`${objects.length} objects · ${formatBytes(totalBytes)} total across originals, annotated outputs, and archives.`}
      />

      <DataTable
        columns={columns}
        data={filtered}
        searchPlaceholder="Search objects…"
        getRowId={(o) => o.id}
        pageSize={15}
        toolbar={
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 w-36 text-xs" aria-label="Filter by type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="original">Originals</SelectItem>
              <SelectItem value="annotated">Annotated</SelectItem>
              <SelectItem value="archive">Archives</SelectItem>
              <SelectItem value="metadata">Metadata</SelectItem>
            </SelectContent>
          </Select>
        }
        emptyTitle="No stored objects"
        emptyDescription="Uploads and outputs appear here as jobs complete."
      />

      <SectionCard
        title="Retention policies"
        description="Automatic cleanup applied by the sweeper every 15 minutes"
      >
        <ul className="divide-y">
          {policies.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{p.resource}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{p.description}</p>
              </div>
              <div className="flex items-center gap-6">
                <span className="font-mono text-xs font-tnum">{p.retentionDays} days</span>
                <div className="flex items-center gap-2">
                  <Switch
                    id={`retention-${p.id}`}
                    defaultChecked={p.autoDelete}
                    aria-label={`Auto-delete ${p.resource}`}
                  />
                  <Label htmlFor={`retention-${p.id}`} className="text-xs text-muted-foreground">
                    Auto-delete
                  </Label>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
