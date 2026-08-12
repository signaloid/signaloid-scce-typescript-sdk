export class SdkError extends Error {
  public code: string;
  public details?: unknown;
  public status?: number;

  constructor(
    code: string,
    message: string,
    details?: unknown,
    status?: number,
  ) {
    super(message);
    this.code = code;
    this.details = details;
    this.status = status;
    this.name = "SdkError";
  }
}
