import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <div className="space-y-3 text-center">
      <p className="text-sm font-semibold text-accent-ink">404</p>
      <h1 className="text-2xl font-bold">Page not found</h1>
      <Link to="/" className="text-sm font-medium text-accent-ink hover:underline">
        Back to home
      </Link>
    </div>
  );
}
