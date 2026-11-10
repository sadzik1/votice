import { Navigate, Outlet, useLocation } from "react-router";
import { useMe } from "../api/auth.ts";
import { Alert, Button, PageSpinner } from "./ui.tsx";

export function RequireAuth() {
  const me = useMe();
  const location = useLocation();

  if (me.isPending) return <PageSpinner />;
  if (me.isError) {
    return (
      <Alert tone="error">
        We couldn't check your session.{" "}
        <Button variant="ghost" size="sm" onClick={() => me.refetch()}>
          Try again
        </Button>
      </Alert>
    );
  }
  if (!me.data) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <Outlet />;
}

export function GuestOnly() {
  const me = useMe();
  if (me.isPending) return <PageSpinner />;
  if (me.data) return <Navigate to="/surveys" replace />;
  return <Outlet />;
}
