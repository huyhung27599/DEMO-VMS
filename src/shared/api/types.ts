export type ApiResponse = {
  result: number | string
  msg?: string
  [k: string]: unknown
}

export type AuthBridge = {
  isAtLogin(): boolean
  logout(reason?: string): void
}
