// A broken domain rule. The message is in Spanish because it reaches the UI as is.
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}
