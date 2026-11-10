import { Link } from "react-router";
import { ApiRequestError } from "../api/client.ts";
import { errorMessage } from "../lib/errors.ts";
import { Alert } from "./ui.tsx";

export function QueryError({ error, backTo = "/surveys" }: { error: unknown; backTo?: string }) {
  if (error instanceof ApiRequestError && error.status === 404) {
    return (
      <div className="space-y-3 py-10 text-center">
        <h1 className="text-xl font-bold">Not found</h1>
        <p className="text-ink-muted">{error.message}</p>
        <Link to={backTo} className="text-sm font-medium text-accent-ink hover:underline">
          Go back
        </Link>
      </div>
    );
  }
  return <Alert tone="error">{errorMessage(error)}</Alert>;
}
