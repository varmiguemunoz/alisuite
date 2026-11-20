import { Notification } from 'electron'
import { EmailProviderError, type EmailSender } from '@shared/email-delivery'
import { config } from '../config'
import {
  ExternalError,
  NotConfigured,
  systemClock,
  type EmailPort,
  type HttpPort,
  type NotifierPort,
  type Ports
} from './ports'

export const fetchHttp: HttpPort = {
  async request({ url, method, body, timeoutMs }) {
    if (!url.startsWith('https://'))
      throw new ExternalError('La URL debe empezar por https://.', false)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { 'content-type': 'application/json' } : undefined,
        body: method === 'GET' ? undefined : (body ?? undefined),
        signal: controller.signal
      })
      const text = (await res.text()).slice(0, 10_000)
      if (res.status === 429 || res.status >= 500)
        throw new ExternalError(`El servidor respondió ${res.status}.`, true)
      if (res.status >= 400) throw new ExternalError(`El servidor respondió ${res.status}.`, false)
      return { status: res.status, body: text }
    } catch (err) {
      if (err instanceof ExternalError) throw err
      throw new ExternalError(err instanceof Error ? err.message : String(err), true)
    } finally {
      clearTimeout(timer)
    }
  }
}

export const macNotifier: NotifierPort = {
  notify(title, body) {
    if (!Notification.isSupported()) return
    new Notification({ title, body }).show()
  }
}

export function notificationEmail(sender: () => EmailSender | null): EmailPort {
  return {
    async send({ to, subject, html, idempotencyKey }) {
      const resend = sender()
      if (!resend) throw new NotConfigured('Falta la API key de Resend en Ajustes, Email.')
      const from = config.from()
      if (!from) throw new NotConfigured('Falta el remitente en Ajustes, Email.')
      try {
        await resend.send({
          from,
          to,
          replyTo: config.replyTo() || undefined,
          subject,
          html,
          idempotencyKey
        })
      } catch (err) {
        const retryable = err instanceof EmailProviderError ? err.retryable : true
        throw new ExternalError(err instanceof Error ? err.message : String(err), retryable)
      }
    },
    ownerEmail: () => config.ownerEmail() || null
  }
}

export function createPorts(sender: () => EmailSender | null): Ports {
  return {
    email: notificationEmail(sender),
    http: fetchHttp,
    notifier: macNotifier,
    clock: systemClock
  }
}
