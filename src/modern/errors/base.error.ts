export abstract class BaseError extends Error {
  abstract readonly status: number;
  abstract readonly code: string;

  constructor() {
    super();
    this.name = this.constructor.name;
  }
}
