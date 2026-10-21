import type { ApiErrorBody } from '@/api/contracts/session'

export class ApiRequestError extends Error {
  readonly status: number
  readonly code: string
  readonly fields: Record<string, string>

  constructor(
    status: number,
    code: string,
    message: string,
    fields?: Record<string, string>,
  ) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.code = code
    this.fields = fields ?? {}
  }
}

export function isApiRequestError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError
}

export function readApiErrorBody(value: unknown): ApiErrorBody['error'] | null {
  if (!value || typeof value !== 'object' || !('error' in value)) {
    return null
  }

  const error = value.error
  if (!error || typeof error !== 'object') {
    return null
  }

  const record = error as Record<string, unknown>
  if (typeof record.code !== 'string' || typeof record.message !== 'string') {
    return null
  }

  const fields =
    record.fields && typeof record.fields === 'object'
      ? Object.fromEntries(
          Object.entries(record.fields).filter((entry): entry is [string, string] => {
            return typeof entry[1] === 'string'
          }),
        )
      : undefined

  return {
    code: record.code,
    message: record.message,
    fields,
  }
}
