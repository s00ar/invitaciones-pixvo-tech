"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "./auth";
import { Notice } from "./ui";
export function CreateInvitation({
  template,
  sampleId,
}: {
  template: string;
  sampleId?: string;
}) {
  const [error, setError] = useState(""),
    router = useRouter();
  useEffect(() => {
    let cancelled = false;
    const key = `pixvo-create:${template}:${sampleId ?? ""}`;
    let promise = (
      window as unknown as Record<string, Promise<{ id: string }> | undefined>
    )[key];
    if (!promise) {
      promise = api<{ id: string }>("/api/invitations", "POST", {
        templateId: template,
        ...(sampleId ? { sampleId } : {}),
      });
      (window as unknown as Record<string, unknown>)[key] = promise;
    }
    promise
      .then((d) => {
        if (!cancelled) {
          delete (window as unknown as Record<string, unknown>)[key];
          router.replace(`/app/invitaciones/${d.id}/editar`);
          router.refresh();
        }
      })
      .catch((e) => {
        delete (window as unknown as Record<string, unknown>)[key];
        setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [template, sampleId, router]);
  return (
    <main className="workspace-content">
      <h1>Preparando tu invitación…</h1>
      {error && <Notice error>{error}</Notice>}
    </main>
  );
}
