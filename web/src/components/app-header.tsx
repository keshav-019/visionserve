import { Fragment, useMemo, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  Check,
  ChevronDown,
  ChevronsUpDown,
  LogOut,
  Monitor,
  Moon,
  Search,
  Sun,
  UserRound,
} from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { notificationsQueryOptions } from "@/services/misc";
import { useUiStore, type ThemePreference } from "@/lib/store";
import { currentUser } from "@/mocks/data";
import { formatRelative, truncateMiddle } from "@/lib/format";
import type { Environment } from "@/lib/types";
import { cn } from "@/lib/utils";

const sectionLabels: Record<string, string> = {
  playground: "Playground",
  jobs: "Jobs",
  batches: "Batches",
  results: "Results",
  models: "Models",
  deployments: "Deployments",
  benchmarks: "Benchmarks",
  metrics: "Metrics",
  usage: "Usage & Quotas",
  "system-health": "System Health",
  "api-keys": "API Keys",
  webhooks: "Webhooks",
  storage: "Storage",
  team: "Team",
  "audit-log": "Audit Log",
  settings: "Settings",
  "api-reference": "API Reference",
};

const idLike = (s: string) =>
  /^(job_|bat_|res_|dep_|key_|wh_|mv_|detector|ocr-|classifier|segmenter)/.test(s);

function HeaderBreadcrumbs() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return <span className="text-sm font-medium">Dashboard</span>;
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/">VisionServe</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {segments.map((seg, i) => {
          const to = `/${segments.slice(0, i + 1).join("/")}`;
          const last = i === segments.length - 1;
          const label = idLike(seg) ? truncateMiddle(seg, 12, 4) : (sectionLabels[seg] ?? seg);
          return (
            <Fragment key={to}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {last ? (
                  <BreadcrumbPage className="max-w-64 truncate font-mono text-[13px]">
                    {label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={to}>{label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function EnvSelector() {
  const environment = useUiStore((s) => s.environment);
  const setEnvironment = useUiStore((s) => s.setEnvironment);
  return (
    <Select value={environment} onValueChange={(v) => setEnvironment(v as Environment)}>
      <SelectTrigger className="h-8 w-32 font-mono text-xs" aria-label="Select environment">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="production" className="font-mono text-xs">
          production
        </SelectItem>
        <SelectItem value="staging" className="font-mono text-xs">
          staging
        </SelectItem>
        <SelectItem value="development" className="font-mono text-xs">
          development
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

function ThemeMenu() {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const options: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" aria-label="Change theme">
          <Sun
            className="size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
            aria-hidden
          />
          <Moon
            className="absolute size-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
            aria-hidden
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {options.map((opt) => (
          <DropdownMenuItem key={opt.value} onClick={() => setTheme(opt.value)}>
            <opt.icon className="size-4" aria-hidden />
            {opt.label}
            {theme === opt.value && <Check className="ml-auto size-4" aria-hidden />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationsMenu() {
  const { data } = useQuery(notificationsQueryOptions());
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const items = useMemo(
    () => (data ?? []).map((n) => ({ ...n, read: n.read || readIds.has(n.id) })),
    [data, readIds],
  );
  const unread = items.filter((n) => !n.read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-8"
          aria-label={`Notifications, ${unread} unread`}
        >
          <Bell className="size-4" aria-hidden />
          {unread > 0 && (
            <span className="absolute top-1 right-1 flex size-2">
              <span
                className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-60"
                aria-hidden
              />
              <span
                className="relative inline-flex size-2 rounded-full bg-destructive"
                aria-hidden
              />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-medium">Notifications</p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setReadIds(new Set(items.map((n) => n.id)))}
            disabled={unread === 0}
          >
            Mark all read
          </Button>
        </div>
        <ScrollArea className="max-h-96">
          <ul className="divide-y">
            {items.map((n) => (
              <li key={n.id}>
                <Link
                  to={n.href ?? "/"}
                  className={cn(
                    "flex gap-3 px-3 py-2.5 transition-colors hover:bg-muted/60",
                    !n.read && "bg-accent/40",
                  )}
                >
                  <span
                    className={cn(
                      "mt-1.5 size-1.5 shrink-0 rounded-full",
                      n.read ? "bg-transparent" : "bg-primary",
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium">{n.title}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{n.body}</span>
                    <span className="mt-1 block text-[11px] text-muted-foreground/70">
                      {formatRelative(n.ts)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function UserMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 gap-1.5 px-1.5" aria-label="Account menu">
          <Avatar className="size-6 border">
            <AvatarFallback className="bg-secondary text-[10px] font-semibold">
              {currentUser.name
                .split(" ")
                .map((p) => p[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium">{currentUser.name}</p>
          <p className="text-xs text-muted-foreground">{currentUser.email}</p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            {currentUser.role} · {currentUser.jobTitle}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/team">
            <UserRound className="size-4" aria-hidden />
            Team &amp; roles
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings">
            <ChevronsUpDown className="size-4" aria-hidden />
            Workspace settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <LogOut className="size-4" aria-hidden />
          Sign out (demo)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppHeader() {
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen);
  return (
    <header className="sticky top-0 z-30 flex h-13 shrink-0 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur-md">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mx-1 h-5" />
      <HeaderBreadcrumbs />
      <div className="ml-auto flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="hidden h-8 w-56 justify-start gap-2 text-muted-foreground md:flex"
          onClick={() => setCommandPaletteOpen(true)}
        >
          <Search className="size-3.5" aria-hidden />
          <span className="text-xs">Search…</span>
          <kbd className="ml-auto rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            ⌘K
          </kbd>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 md:hidden"
          onClick={() => setCommandPaletteOpen(true)}
          aria-label="Search"
        >
          <Search className="size-4" aria-hidden />
        </Button>
        <EnvSelector />
        <ThemeMenu />
        <NotificationsMenu />
        <UserMenu />
      </div>
    </header>
  );
}
