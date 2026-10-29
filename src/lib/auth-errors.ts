/** Show actionable categories, never raw provider messages, submitted values or traces. */
export function accountRequestError(error: unknown): string {
  const details = error && typeof error === 'object' ? error as { code?: unknown; status?: unknown } : {}
  const code = typeof details.code === 'string' ? details.code.toLowerCase() : ''
  const status = typeof details.status === 'number' ? details.status : undefined
  if (['email_not_confirmed', 'email_not_verified'].includes(code)) {
    return 'Verify your email address using the email from Neon Auth, then try signing in again.'
  }
  if (['invalid_credentials', 'invalid_email_or_password', 'invalid_password', 'user_not_found', 'identity_not_found'].includes(code) || status === 401) {
    return 'The sign-in service rejected that email or password. Check both, or use Forgot password to reset your password.'
  }
  if (['over_request_rate_limit', 'over_email_send_rate_limit', 'too_many_requests'].includes(code) || status === 429) {
    return 'Too many authentication attempts. Wait a few minutes before trying again.'
  }
  if (code === 'email_address_invalid' || code === 'invalid_email') return 'Enter a valid email address and try again.'
  if (status === 403) return 'The sign-in service refused this request. The app address or account may not be allowed. Contact your administrator.'
  if (status && status >= 500) return 'The sign-in service is temporarily unavailable. Please try again shortly.'
  if (status && status >= 400) return 'The sign-in service could not accept this request. Check your details and try again.'
  return 'The browser could not complete the request to the sign-in service. Check your connection and try again.'
}
