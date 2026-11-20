export type Language = 'es' | 'en'
export const LANGUAGES: Language[] = ['es', 'en']

export type MeetingStatus = 'recording' | 'transcribing' | 'summarizing' | 'ready' | 'error'

export interface ActionItem {
  text: string
  owner: string | null

  due: string | null
  done: boolean
}

export interface Meeting {
  id: string

  date: string
  title: string
  assigneeId: string | null
  participants: string[]
  summaryMd: string
  decisionsMd: string
  actionItems: ActionItem[]
  transcriptMd: string
  rawNotesMd: string
  recordingPath: string | null
  durationSec: number | null

  language: Language | null
  status: MeetingStatus
  error: string | null
  createdAt: string
  updatedAt: string
}

export type MeetingInput = Partial<
  Pick<
    Meeting,
    | 'date'
    | 'title'
    | 'participants'
    | 'summaryMd'
    | 'decisionsMd'
    | 'actionItems'
    | 'rawNotesMd'
    | 'language'
    | 'assigneeId'
  >
>

// ---- Respuestas compuestas ----

export type MeetingBrief = Pick<Meeting, 'id' | 'date' | 'title' | 'status' | 'participants'>

export interface OpenActionItem extends ActionItem {
  meetingId: string
  meetingTitle: string
  meetingDate: string

  index: number
}

export interface MeetingsPage {
  days: { date: string; meetings: MeetingBrief[] }[]
  page: number
  totalPages: number
  totalDays: number
}

export interface MeetingFilter {
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

export interface Overview {
  openActionItems: OpenActionItem[]
  recentMeetings: MeetingBrief[]
}

export interface SearchHit {
  type: 'meeting'
  id: string
  title: string
  snippet: string
}

export interface Settings {
  docsPath: string

  workspacePath: string
  hasApiKey: boolean

  apiKeyHint: string
  transcribeModel: string
  summaryModel: string
  summaryLanguage: string

  voiceShortcut: string
  voiceEnabled: boolean

  workspaceShortcut: string
  // ---- Email (los secretos, solo como pista) ----
  hasResendKey: boolean
  resendKeyHint: string
  fromEmail: string
  fromName: string
  replyTo: string
  ownerEmail: string
}

export interface VoiceStatus {
  shortcut: string
  enabled: boolean

  registered: boolean

  mode: 'hold' | 'toggle'

  accessibility: boolean

  pending: number
}

export interface SettingsInput {
  openaiApiKey?: string
  docsPath?: string

  workspacePath?: string
  transcribeModel?: string
  summaryModel?: string
  summaryLanguage?: string
  voiceShortcut?: string

  workspaceShortcut?: string
  voiceEnabled?: boolean

  resendApiKey?: string
  fromEmail?: string
  fromName?: string
  replyTo?: string
  ownerEmail?: string
}

export type NoteEntity = 'meeting'

export interface StopInfo {
  title: string
  participants: string[]
  durationSec: number
  language: Language
}

export interface ImportInfo {
  title: string
  participants: string[]
  language: Language
}

export interface ConsultoraApi {
  overview(): Promise<Overview>
  search(query: string): Promise<SearchHit[]>
  settings(): Promise<Settings>
  saveSettings(input: SettingsInput): Promise<Settings>

  testApiKey(): Promise<{ ok: boolean; message: string }>

  pickFolder(): Promise<string | null>
  voiceStatus(): Promise<VoiceStatus>

  retryVoiceNotes(): Promise<{ created: number; failed: number }>

  refreshVoice(): Promise<VoiceStatus>

  workspaceShortcutStatus(): Promise<{ shortcut: string; registered: boolean }>

  pickRecording(): Promise<string | null>

  importRecording(path: string, info: ImportInfo): Promise<Meeting>

  listMeetings(filter: MeetingFilter): Promise<MeetingsPage>
  getMeeting(id: string): Promise<Meeting>
  createMeeting(input: MeetingInput): Promise<Meeting>
  updateMeeting(id: string, patch: MeetingInput): Promise<Meeting>
  removeMeeting(id: string): Promise<void>
  updateActionItem(id: string, index: number, patch: Partial<ActionItem>): Promise<Meeting>

  processMeeting(id: string): Promise<Meeting>

  listActionItems(filter: { done?: boolean }): Promise<OpenActionItem[]>

  appendNote(entity: NoteEntity, ref: string, text: string): Promise<void>
}

// ---- Utilidades ----

export function normalizeName(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

export function toggleTaskLine(md: string, line: number): string {
  const lines = md.split('\n')
  const current = lines[line - 1]
  if (current === undefined) return md
  lines[line - 1] = current.replace(
    /^(\s*[-*+]\s+\[)([ xX])(\])/,
    (_, a, mark, b) => `${a}${mark === ' ' ? 'x' : ' '}${b}`
  )
  return lines.join('\n')
}
