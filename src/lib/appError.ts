export type AppError = {
  title: string
  message: string
  fix?: string
  status?: number
}

function getStatus(err: unknown): number | undefined {
  if (!err || typeof err !== 'object') return undefined
  const anyErr = err as { status?: unknown; statusCode?: unknown; code?: unknown }
  const status =
    typeof anyErr.status === 'number'
      ? anyErr.status
      : typeof anyErr.statusCode === 'number'
        ? anyErr.statusCode
        : undefined
  return status
}

function getMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (!err || typeof err !== 'object') return 'Something went wrong.'
  const anyErr = err as { message?: unknown; error_description?: unknown }
  if (typeof anyErr.message === 'string') return anyErr.message
  if (typeof anyErr.error_description === 'string') return anyErr.error_description
  return 'Something went wrong.'
}

export function toAppError(err: unknown): AppError {
  const status = getStatus(err)
  const message = getMessage(err)

  // Common fetch/network errors
  if (
    message.toLowerCase().includes('failed to fetch') ||
    message.toLowerCase().includes('networkerror') ||
    message.toLowerCase().includes('network error')
  ) {
    return {
      title: 'Network error',
      message: 'We could not reach the server.',
      fix: 'Check your internet connection and that your Supabase URL is correct, then try again.',
      status,
    }
  }

  // Supabase misconfig
  if (message.toLowerCase().includes('supabase is not configured')) {
    return {
      title: 'Supabase not configured',
      message,
      fix: 'Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env.local`, then restart `npm run dev`.',
      status,
    }
  }

  if (status === 400) {
    return {
      title: 'Invalid request (400)',
      message,
      fix: 'Double-check your email, password, and required fields, then try again.',
      status,
    }
  }

  if (status === 401) {
    return {
      title: 'Not authorized (401)',
      message,
      fix: 'Check your email/password. If this keeps happening, confirm Auth is enabled in Supabase.',
      status,
    }
  }

  if (status === 404) {
    return {
      title: 'Not found (404)',
      message,
      fix: 'Your Supabase URL may be wrong (project ref). Confirm `VITE_SUPABASE_URL` and try again.',
      status,
    }
  }

  if (status === 429) {
    return {
      title: 'Too many attempts (429)',
      message,
      fix: 'Wait a minute and try again.',
      status,
    }
  }

  if (status && status >= 500) {
    return {
      title: `Server error (${status})`,
      message,
      fix: 'This is usually temporary. Try again in a moment, or check Supabase status/logs.',
      status,
    }
  }

  // Friendly auth message tweaks
  const lower = message.toLowerCase()
  if (lower.includes('invalid login credentials')) {
    return {
      title: 'Login failed',
      message: 'Email or password is incorrect.',
      fix: 'Check your details and try again, or create an account.',
      status,
    }
  }

  if (lower.includes('email not confirmed')) {
    return {
      title: 'Email not confirmed',
      message: 'Please confirm your email address before logging in.',
      fix: 'Check your inbox/spam for the confirmation email.',
      status,
    }
  }

  return {
    title: 'Something went wrong',
    message,
    status,
  }
}

