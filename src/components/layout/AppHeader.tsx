"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sun, Moon, Search, LogOut, ChevronDown } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface UserProfile {
  full_name?: string;
  email: string;
  avatar_url?: string;
}

export function AppHeader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    async function fetchUser() {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        setUser({
          full_name: authUser.user_metadata?.full_name,
          email: authUser.email || "",
          avatar_url: authUser.user_metadata?.avatar_url,
        });
      }
    }
    fetchUser();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const displayName =
    user?.full_name || user?.email?.split("@")[0] || "User";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-xl">
      <div className="flex items-center justify-between px-6 py-2.5">
        {/* Left: Logo / Product */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <Image
              src="/resized_with_padding_180x180.png"
              alt="OperatorOS"
              width={24}
              height={24}
              className="h-6 w-6 rounded"
            />
            <span className="text-sm font-semibold text-foreground">
              OperatorOS
            </span>
          </Link>

          <span className="text-muted-foreground/50">/</span>

          <span className="text-sm font-medium text-muted-foreground">
            Email Blaster
          </span>
        </div>

        {/* Right: Search + Actions */}
        <div className="flex items-center gap-2">
          {/* Compact Search Bar */}
          <form className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
              <Search className="h-4 w-4 text-muted-foreground" />
            </span>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search..."
              className="h-8 w-[240px] rounded-lg border border-input bg-background py-1.5 pl-9 pr-12 text-sm text-foreground transition-all placeholder:text-muted-foreground focus:w-[300px] focus:border-ring focus:outline-none"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
            >
              <span className="text-xs">Cmd+K</span>
            </button>
          </form>

          <div className="ml-1 h-5 w-px bg-border" />

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>

          {/* User Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-muted">
                {user?.avatar_url ? (
                  <Image
                    width={28}
                    height={28}
                    src={user.avatar_url}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-semibold text-muted-foreground">
                    {initials}
                  </span>
                )}
              </span>
              <span className="text-sm font-medium">{displayName}</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  isDropdownOpen && "rotate-180"
                )}
              />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-popover p-2 shadow-lg">
                <div className="border-b border-border px-3 py-2">
                  <p className="text-sm font-medium text-popover-foreground">
                    {displayName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
