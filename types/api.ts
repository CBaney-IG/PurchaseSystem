// API request/response shapes — used by all API routes and Server Actions.

export interface ApiSuccess<T> {
  data: T
  error: null
}

export interface ApiError {
  data: null
  error: {
    message: string
    code: string
  }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

export function apiSuccess<T>(data: T): ApiSuccess<T> {
  return { data, error: null }
}

export function apiError(message: string, code = 'UNKNOWN_ERROR'): ApiError {
  return { data: null, error: { message, code } }
}
