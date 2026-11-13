let handler = () => {}
let passwordHandler = () => {}

export function setUnauthorizedHandler(fn) {
  handler = fn
}

export function notifyUnauthorized() {
  handler()
}

// Server menolak karena sandi sementara belum diganti -> arahkan ke halaman Akun saya.
export function setPasswordChangeHandler(fn) {
  passwordHandler = fn
}

export function notifyPasswordChange() {
  passwordHandler()
}
