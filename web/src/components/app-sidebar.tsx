import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Aperture,
  BookOpen,
  Boxes,
  FlaskConical,
  Gauge,
  HardDrive,
  HeartPulse,
  Images,
  KeyRound,
  Layers,
  LayoutDashboard,
  ListChecks,
  PieChart,
  Rocket,
  ScrollText,
  Settings,
  Users,
  Webhook,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EnvBadge } from "@/components/shared/env-badge";
import { currentUser, workspace } from "@/mocks/data";
import { useUiStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

const groups: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
      { title: "Playground", url: "/playground", icon: FlaskConical },
    ],
  },
  {
    label: "Inference",
    items: [
      { title: "Jobs", url: "/jobs", icon: ListChecks },
      { title: "Batches", url: "/batches", icon: Layers },
      { title: "Results", url: "/results", icon: Images },
    ],
  },
  {
    label: "Models",
    items: [
      { title: "Registry", url: "/models", icon: Boxes },
      { title: "Deployments", url: "/deployments", icon: Rocket },
      { title: "Benchmarks", url: "/benchmarks", icon: Gauge },
    ],
  },
  {
    label: "Observability",
    items: [
      { title: "Metrics", url: "/metrics", icon: Activity },
      { title: "Usage & Quotas", url: "/usage", icon: PieChart },
      { title: "System Health", url: "/system-health", icon: HeartPulse },
    ],
  },
  {
    label: "Workspace",
    items: [
      { title: "API Keys", url: "/api-keys", icon: KeyRound },
      { title: "Webhooks", url: "/webhooks", icon: Webhook },
      { title: "Storage", url: "/storage", icon: HardDrive },
      { title: "Team", url: "/team", icon: Users },
      { title: "Audit Log", url: "/audit-log", icon: ScrollText },
    ],
  },
];

const bottomItems: NavItem[] = [
  { title: "API Reference", url: "/api-reference", icon: BookOpen },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const environment = useUiStore((s) => s.environment);
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const isActive = (url: string) =>
    url === "/" ? pathname === "/" : pathname === url || pathname.startsWith(`${url}/`);

  const closeMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-3">
        <Link to="/" onClick={closeMobile} className="flex items-center gap-2.5" aria-label="VisionServe dashboard">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Aperture className="size-4.5" aria-hidden />
          </span>
          {!collapsed && (
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold tracking-tight">VisionServe</span>
              <span className="truncate text-[11px] text-muted-foreground">{workspace.name}</span>
            </span>
          )}
          {!collapsed && <EnvBadge env={environment} className="ml-auto" />}
        </Link>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                      <Link to={item.url} onClick={closeMobile}>
                        <item.icon aria-hidden />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="gap-0 p-0">
        <div className="px-2 pb-2">
          <SidebarMenu>
            {bottomItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                  <Link to={item.url} onClick={closeMobile}>
                    <item.icon aria-hidden />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </div>
        <SidebarSeparator />
        <div className={cn("flex items-center gap-2.5 px-3 py-3", collapsed && "justify-center px-0")}>
          <Avatar className="size-7 border">
            <AvatarFallback className="bg-secondary text-[11px] font-semibold">
              {currentUser.name.split(" ").map((p) => p[0]).join("")}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{currentUser.name}</p>
              <p className="truncate text-[11px] text-muted-foreground capitalize">{currentUser.role.replace("_", " ")}</p>
            </div>
          )}
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
