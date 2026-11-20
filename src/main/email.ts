import type { EmailSender } from '@shared/email-delivery'
import { resendHttpSender } from '@shared/email-delivery/providers/resend/http-sender'
import { config } from './config'

export function notificationSender(): EmailSender | null {
  const key = config.resendKey()
  return key ? resendHttpSender(key) : null
}
