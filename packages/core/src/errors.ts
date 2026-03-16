export class RelayerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RelayerError';
  }
}

export class RelayerDialectError extends RelayerError {
  constructor(
    public readonly dialect: string,
    message: string,
  ) {
    super(message);
    this.name = 'RelayerDialectError';
  }
}
