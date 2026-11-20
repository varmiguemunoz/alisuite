import { useCallback, useState } from 'react'
import type { Settings, SettingsInput } from '@shared/consultora'
import { api, attempt, useLoad } from '../lib'
import { Button, ErrorNote, Field, Section } from '../ui'

const INPUT = 'bg-transparent text-[14px] text-ob-text outline-none placeholder:text-ob-faint'

interface TextSettingProps {
  label: string
  value: string
  placeholder: string
  onSave: (value: string) => void
}

function TextSetting({ label, value, placeholder, onSave }: TextSettingProps): React.JSX.Element {
  return (
    <Field label={label}>
      <input
        key={value}
        defaultValue={value}
        placeholder={placeholder}
        spellCheck={false}
        onBlur={(e) => e.target.value.trim() !== value && onSave(e.target.value)}
        className={INPUT}
      />
    </Field>
  )
}

export function EmailSettings(): React.JSX.Element {
  const load = useCallback(() => api.settings(), [])
  const { data, reload } = useLoad(load)
  const [key, setKey] = useState('')
  const [error, setError] = useState<string | null>(null)

  const save = async (input: SettingsInput): Promise<boolean> => {
    const failed = await attempt(() => api.saveSettings(input))
    setError(failed)
    if (!failed) await reload()
    return !failed
  }

  const saveKey = async (): Promise<void> => {
    if (await save({ resendApiKey: key })) setKey('')
  }

  if (!data) return <Section title="Resend">{null}</Section>
  const settings: Settings = data

  return (
    <Section title="Resend">
      <div className="flex flex-col gap-2">
        <p className="px-1 text-caption text-ob-muted">
          Solo para notificaciones internas, como el paso «Enviarme un email» de las
          automatizaciones.
        </p>
        <form
          className="flex items-stretch gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (key.trim()) void saveKey()
          }}
        >
          <div className="min-w-0 flex-1">
            <Field
              label={
                settings.hasResendKey
                  ? `API key · guardada (${settings.resendKeyHint})`
                  : 'API key · falta'
              }
            >
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={settings.hasResendKey ? 'Pega otra para reemplazarla' : 're_…'}
                autoComplete="off"
                spellCheck={false}
                className={INPUT}
              />
            </Field>
          </div>
          <div className="flex items-center gap-2">
            <Button kind="primary" disabled={!key.trim()} onClick={() => void saveKey()}>
              Guardar
            </Button>
            {settings.hasResendKey && (
              <Button kind="danger" onClick={() => void save({ resendApiKey: '' })}>
                Quitar
              </Button>
            )}
          </div>
        </form>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <TextSetting
            label="Remitente"
            value={settings.fromEmail}
            placeholder="avisos@tudominio.com"
            onSave={(fromEmail) => void save({ fromEmail })}
          />
          <TextSetting
            label="Nombre del remitente"
            value={settings.fromName}
            placeholder="Alisuite"
            onSave={(fromName) => void save({ fromName })}
          />
          <TextSetting
            label="Tu email, destino de los avisos"
            value={settings.ownerEmail}
            placeholder="tu@correo.com"
            onSave={(ownerEmail) => void save({ ownerEmail })}
          />
          <TextSetting
            label="Responder a"
            value={settings.replyTo}
            placeholder="Opcional"
            onSave={(replyTo) => void save({ replyTo })}
          />
        </div>
        <ErrorNote message={error} />
      </div>
    </Section>
  )
}
