export class ExchangeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExchangeAPIError';
  }
}

export class NetworkRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkRequestError';
  }
}
