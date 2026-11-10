import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { useLogout, useMe } from "../api/auth.ts";
import { useHealth } from "../api/health.ts";
import { ApiStatus } from "./ApiStatus.tsx";
import { ThemeToggle } from "./ThemeToggle.tsx";
import { Button, buttonClass, cx } from "./ui.tsx";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cx(
    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
    isActive ? "bg-ink text-surface" : "text-ink-muted hover:bg-subtle",
  );

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-semibold">
      <img src="/favicon.svg" alt="" className="size-6" />
      Survey App
    </Link>
  );
}

function UserNav() {
  const me = useMe();
  const logout = useLogout();
  const navigate = useNavigate();

  if (me.isPending) return null;

  if (!me.data) {
    return (
      <nav className="flex items-center gap-1">
        <NavLink to="/login" className={navLinkClass}>
          Sign in
        </NavLink>
        <Link to="/register" className={buttonClass({ size: "sm" })}>
          Create account
        </Link>
      </nav>
    );
  }

  return (
    <nav className="flex items-center gap-1">
      <NavLink to="/surveys" className={navLinkClass}>
        My surveys
      </NavLink>
      <span className="hidden px-2 text-sm text-ink-subtle sm:inline">{me.data.name}</span>
      <Button
        variant="ghost"
        size="sm"
        loading={logout.isPending}
        onClick={() => logout.mutate(undefined, { onSuccess: () => navigate("/") })}
      >
        Sign out
      </Button>
    </nav>
  );
}

function Footer() {
  const health = useHealth();
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 text-xs text-ink-subtle">
        <span>Survey App</span>
        <ApiStatus health={health.data} isLoading={health.isLoading} />
      </div>
    </footer>
  );
}

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserNav />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}

export function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <Outlet />
      </main>
      <footer className="flex flex-col items-center gap-3 py-6 text-xs text-ink-subtle">
        <span>
          Made with{" "}
          <Link to="/" className="font-medium text-ink-soft hover:underline">
            Survey App
          </Link>
        </span>
        <ThemeToggle />
      </footer>
    </div>
  );
}
