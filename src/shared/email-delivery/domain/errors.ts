export type ErrorKind = 'fatal' | 'retryable' | 'rejected'

export class EmailProviderError extends Error {
  constructor(
    message: string,
    readonly provider: string,
    readonly code: string,
    readonly status: number | null,
    readonly kind: ErrorKind
  ) {
    super(message)
    this.name = 'EmailProviderError'
  }

  get retryable(): boolean {
    return this.kind === 'retryable'
  }
}

export const kindForStatus = (status: number | null): ErrorKind =>
  status === null || status === 429 || status >= 500 ? 'retryable' : 'rejected'
