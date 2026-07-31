import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Minus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";

import { PageHeader, SectionCard } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { teamQueryOptions } from "@/services/misc";
import { permissionMatrix, roleLabels } from "@/mocks/data";
import { formatDate, formatRelative } from "@/lib/format";
import type { Role, TeamMember } from "@/lib/types";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "Team — VisionServe" },
      {
        name: "description",
        content: "Manage workspace members, invitations, and role-based permissions.",
      },
      { property: "og:title", content: "Team — VisionServe" },
      {
        property: "og:description",
        content: "Manage workspace members, invitations, and permissions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(teamQueryOptions());
  },
  component: TeamPage,
});

const roles = Object.keys(roleLabels) as Role[];

function TeamPage() {
  const { data } = useSuspenseQuery(teamQueryOptions());
  const { members, invitations } = data;
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("developer");

  const memberColumns: ColumnDef<TeamMember, unknown>[] = [
    {
      accessorKey: "name",
      header: "Member",
      cell: ({ row }) => (
        <div>
          <p className="text-xs font-medium">{row.original.name}</p>
          <p className="font-mono text-[11px] text-muted-foreground">{row.original.email}</p>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <span className="rounded-md border bg-muted px-1.5 py-0.5 text-[10px] font-medium">
          {roleLabels[row.original.role]}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge
          status={
            row.original.status === "active"
              ? "healthy"
              : row.original.status === "invited"
                ? "queued"
                : "failed"
          }
          label={row.original.status}
        />
      ),
    },
    {
      accessorKey: "lastActiveAt",
      header: "Last active",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.lastActiveAt ? formatRelative(row.original.lastActiveAt) : "never"}
        </span>
      ),
    },
    {
      accessorKey: "joinedAt",
      header: "Joined",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{formatDate(row.original.joinedAt)}</span>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <PageHeader
        title="Team"
        description={`${members.length} members · ${invitations.filter((i) => i.status === "pending").length} pending invitations`}
        actions={
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="size-4" aria-hidden />
                Invite member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite to workspace</DialogTitle>
                <DialogDescription>
                  They will receive an email with a sign-in link valid for 7 days.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="teammate@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="invite-role">Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                    <SelectTrigger id="invite-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r} value={r}>
                          {roleLabels[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteOpen(false)}>
                  Cancel
                </Button>
                <Button
                  disabled={!email.includes("@")}
                  onClick={() => {
                    setInviteOpen(false);
                    setEmail("");
                    toast.success("Invitation sent", {
                      description: `${email} was invited as ${roleLabels[role]}.`,
                    });
                  }}
                >
                  Send invitation
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <DataTable
        columns={memberColumns}
        data={members}
        searchPlaceholder="Search members…"
        getRowId={(m) => m.id}
        emptyTitle="No members"
        emptyDescription="Invite your first teammate to collaborate."
      />

      {invitations.length > 0 && (
        <SectionCard title="Pending invitations">
          <ul className="divide-y">
            {invitations.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <div>
                  <p className="font-mono text-xs">{inv.email}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {roleLabels[inv.role]} · invited by {inv.invitedBy} · expires{" "}
                    {formatDate(inv.expiresAt)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-destructive hover:text-destructive"
                  onClick={() => toast.success("Invitation revoked", { description: inv.email })}
                >
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <SectionCard title="Permission matrix" description="What each role can do in this workspace">
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Permission</TableHead>
                {roles.map((r) => (
                  <TableHead key={r} className="text-center text-xs">
                    {roleLabels[r]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {permissionMatrix.map((row) => (
                <TableRow key={row.permission}>
                  <TableCell className="py-1.5 text-xs font-medium">{row.permission}</TableCell>
                  {roles.map((r) => (
                    <TableCell key={r} className="py-1.5 text-center">
                      {row.roles[r] ? (
                        <Check
                          className="mx-auto size-3.5 text-emerald-600 dark:text-emerald-400"
                          aria-label={`${roleLabels[r]} allowed`}
                        />
                      ) : (
                        <Minus
                          className="mx-auto size-3.5 text-muted-foreground/40"
                          aria-label={`${roleLabels[r]} denied`}
                        />
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionCard>
    </div>
  );
}
