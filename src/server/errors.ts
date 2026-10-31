import { ZodError } from "zod";
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function fail(status: number, message: string): never {
  throw new AppError(status, message);
}
export function errorResponse(e: unknown) {
  if (e instanceof ZodError)
    return Response.json(
      {
        error: e.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join(" · "),
      },
      { status: 422 },
    );
  if (e instanceof AppError)
    return Response.json({ error: e.message }, { status: e.status });
  if ((e as { code?: string })?.code === "23505")
    return Response.json(
      { error: "Ese identificador ya existe. Elegí otro." },
      { status: 409 },
    );
  // Do not log SQL, provider bodies, tokens, names, or submitted documents.
  console.error("pixvo.request.failed", {
    type: e instanceof Error ? e.name : "unknown",
  });
  return Response.json(
    { error: "No se pudo completar la operación. Volvé a intentarlo." },
    { status: 500 },
  );
}
