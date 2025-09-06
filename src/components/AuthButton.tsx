"use client";
import { useSession, signIn, signOut } from "next-auth/react";

export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <button className="rounded border px-3 py-1 opacity-60">Loading…</button>;
  }

  if (!session) {
    return (
      <button
        className="rounded bg-foreground text-background px-3 py-1"
        onClick={() => signIn("credentials", { callbackUrl: "/me" })}
      >
        Sign in
      </button>
    );
  }

  return (
    <button
      className="rounded bg-foreground text-background px-3 py-1"
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      Sign out
    </button>
  );
}

