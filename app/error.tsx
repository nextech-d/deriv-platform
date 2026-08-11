"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { reportClientError } from "@/lib/monitoring/report";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void reportClientError(error, { digest: error.digest, source: "app-error" });
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-lg font-semibold text-negative">Application error</p>
      <p className="max-w-md text-sm text-muted">{error.message}</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
