/** BFF error → HTTP status + machine-readable code. */
export class BffError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "BffError";
  }
}

export const errJson = (err: BffError) => ({
  error: { code: err.code, message: err.message, retryable: err.retryable },
});
