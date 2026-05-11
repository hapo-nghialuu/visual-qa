"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

function initials(name?: string | null) {
  if (!name) return "U";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function Header() {
  const { data } = useSession();
  const user = data?.user;

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-card/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="rounded-md px-2 py-1 font-semibold text-primary hover:bg-primary/10">
            Visual QA
          </Link>
          <nav className="hidden gap-4 text-sm md:flex">
            <Link href="/" className="rounded-md px-2 py-1 hover:bg-muted hover:text-primary">
              Compare
            </Link>
            <Link
              href="/compare-dom"
              className="rounded-md px-2 py-1 hover:bg-muted hover:text-primary"
            >
              Compare DOM
            </Link>
            {user ? (
              <>
                <Link href="/projects" className="rounded-md px-2 py-1 hover:bg-muted hover:text-primary">
                  Projects
                </Link>
                <Link href="/settings" className="rounded-md px-2 py-1 hover:bg-muted hover:text-primary">
                  Settings
                </Link>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-primary"
                  onClick={() => signIn("google", { callbackUrl: "/" })}
                >
                  Projects
                </button>
                <button
                  type="button"
                  className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-primary"
                  onClick={() => signIn("google", { callbackUrl: "/" })}
                >
                  Settings
                </button>
              </>
            )}
          </nav>
        </div>
        {!user ? (
          <Button onClick={() => signIn("google", { callbackUrl: "/" })}>
            Login with Google
          </Button>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger>
              <button className="rounded-full">
                <Avatar>
                  <AvatarImage src={user.image || ""} alt={user.name || "User"} />
                  <AvatarFallback>{initials(user.name)}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="text-sm">{user.name}</div>
                <div className="text-xs text-muted-foreground">{user.email}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
