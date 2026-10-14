let handler = () => {}

export function setUnauthorizedHandler(fn) {
  handler = fn
}

export function notifyUnauthorized() {
  handler()
}
