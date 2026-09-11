export interface ApiError {
  status: number
  message: string
  errors?: Record<string, string[]>
}

export interface Response<T> {
  data?: T | null
  success: boolean
  traceId: string | null
}
