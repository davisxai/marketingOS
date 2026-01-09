"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  Search,
  Send,
  Settings,
  ChevronDown,
  Mail,
  BarChart3,
  Flame,
} from "lucide-react";
import { useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [campaignsOpen, setCampaignsOpen] = useState(true);

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === path;
    }
    return pathname.startsWith(path);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top Header */}
      <AppHeader />

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="flex h-[calc(100vh-49px)] w-[240px] flex-shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
          {/* Sidebar content */}
          <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
            {/* Main Section */}
            <div className="mb-2 px-3 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Main
            </div>

            {/* Dashboard */}
            <Link
              href="/"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive("/")
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>

            {/* Leads */}
            <Link
              href="/leads"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive("/leads")
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Users className="h-4 w-4" />
              <span>Leads</span>
            </Link>

            {/* Actors (Scrapers) */}
            <Link
              href="/actors"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive("/actors")
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Search className="h-4 w-4" />
              <span>Actors</span>
            </Link>

            {/* Email Campaigns Section */}
            <div className="mb-2 mt-6 px-3 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Email Outreach
            </div>

            {/* Campaigns - Collapsible */}
            <Collapsible open={campaignsOpen} onOpenChange={setCampaignsOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                  <Send className="h-4 w-4" />
                  <span>Campaigns</span>
                  <ChevronDown
                    className={cn(
                      "ml-auto h-4 w-4 transition-transform duration-300",
                      campaignsOpen && "rotate-180"
                    )}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="ml-4 mt-1 flex flex-col gap-1">
                  <Link
                    href="/campaigns"
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      pathname === "/campaigns"
                        ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <BarChart3 className="h-4 w-4" />
                    <span>Overview</span>
                  </Link>
                  <Link
                    href="/campaigns/new"
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      pathname === "/campaigns/new"
                        ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <Mail className="h-4 w-4" />
                    <span>New Campaign</span>
                  </Link>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Templates */}
            <Link
              href="/templates"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive("/templates")
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <FileText className="h-4 w-4" />
              <span>Templates</span>
            </Link>

            {/* Settings Section */}
            <div className="mb-2 mt-6 px-3 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Settings
            </div>

            {/* Domain Warmup */}
            <Link
              href="/warmup"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive("/warmup")
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Flame className="h-4 w-4" />
              <span>Domain Warmup</span>
            </Link>

            {/* Settings */}
            <Link
              href="/settings"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive("/settings")
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Settings className="h-4 w-4" />
              <span>Preferences</span>
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto bg-background">
          <div className="h-full px-8 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
