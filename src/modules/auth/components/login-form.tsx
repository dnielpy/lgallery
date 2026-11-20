"use client";

import Image from "next/image";
import { LoaderCircle, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

const INPUT = "h-11 w-full rounded-xl border border-border bg-background px-3.5 text-[15px] outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/15";

// Only paths inside LGallery, so a crafted link cannot send the user elsewhere after signing in.
function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export function LoginForm({ next }: { next: string | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error ?? "Could not sign in.");
      }
      router.replace(safeNext(next));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-background px-4 py-10">
      <form onSubmit={(event) => void handleSubmit(event)} className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-xl sm:p-8">
        <div className="mb-6 flex items-center gap-2.5">
          <Image src="/lgallery-logo.svg" alt="" width={36} height={36} priority className="size-9" />
          <div>
            <h1 className="text-xl font-medium tracking-[-0.025em]">LGallery</h1>
            <p className="text-sm text-muted-foreground">Sign in to see your photos</p>
          </div>
        </div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="username">User</label>
        <input id="username" name="username" autoComplete="username" required autoFocus defaultValue="admin" className={INPUT} />
        <label className="mb-1.5 mt-4 block text-sm font-medium" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className={INPUT} />
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary-blue text-sm font-semibold text-white transition hover:bg-primary-blue/90 disabled:opacity-60"
        >
          {submitting ? <LoaderCircle className="size-4 animate-spin" /> : <LogIn className="size-4" />}
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
