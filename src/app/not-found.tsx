import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <section className="mx-auto w-full max-w-xl rounded-2xl border bg-card p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Error 404
        </p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">Page not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The page you are trying to access does not exist or may have been moved.
        </p>
        <div className="mt-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Go to Home
          </Link>
        </div>
      </section>
    </main>
  );
}