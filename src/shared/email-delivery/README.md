# email-delivery

Envío de emails de notificación interna con Resend.

Lo usan dos raíces de composición.

1. `src/main/email.ts` crea el remitente de la app con la API key de Ajustes. Lo usa el paso de automatización «Enviarme un email».
2. `services/cloud/src/app.module.ts` lo usa para las invitaciones de organización.

El núcleo define el puerto `EmailSender` y el error `EmailProviderError`. El adaptador vive en `providers/resend/http-sender.ts` y llama a la API HTTP de Resend con fetch, sin SDK.
