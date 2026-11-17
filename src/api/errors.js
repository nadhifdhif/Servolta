export class ApiError extends Error {
  // `code` dari server untuk kasus khusus, mis. "password_change_required".
  constructor(message, status = 0, errors = {}, code = '') {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
    this.code = code
  }
}
