"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  return (
    <main className="grid min-h-screen place-items-center bg-[#fbf8f5] p-6">
      <section className="w-full max-w-lg rounded-2xl border bg-white p-8 text-center shadow-sm">
        <AlertTriangle className="mx-auto mb-4 size-10 text-red-600" />
        <h1 className="text-2xl font-bold">This page could not be loaded</h1>
        <p className="mt-2 text-muted-foreground">
          Your data is safe. Retry the request, or return to the dashboard.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={reset}>
            <RotateCcw /> Retry
          </Button>
          <Button variant="outline" onClick={() => router.push("/")}>
            Dashboard
          </Button>
        </div>
      </section>
    </main>
  );
}
