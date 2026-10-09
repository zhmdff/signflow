import { AiError } from "./ai-shared";

export class HttpError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

/** Runs a route handler body and turns thrown errors into `{ error, code }` JSON. */
export async function respond<T>(run: () => Promise<T>): Promise<Response> {
  try {
    return Response.json(await run());
  } catch (err) {
    if (err instanceof AiError) {
      return Response.json({ error: err.message, code: err.code }, { status: err.status });
    }
    if (err instanceof HttpError) {
      return Response.json({ error: err.message, code: "bad_request" }, { status: err.status });
    }
    console.error(err);
    const message = err instanceof Error ? err.message : "Something went wrong.";
    return Response.json({ error: message, code: "server_error" }, { status: 500 });
  }
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new HttpError("Request body must be JSON.");
  }
}
