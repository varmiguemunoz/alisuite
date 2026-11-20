import { BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { homedir } from 'os'
import { resolve } from 'path'
import { isInside } from './services/paths'
import { config, publicSettings, saveSettings } from './config'
import type { Consultora } from './consultora'
import { checkPermissions, openPrivacy, restartApp, type Privacy } from './permissions'
import type { VoiceController } from './voice/voice'
import type { WorkspaceShortcut } from './workspace-shortcut'

export function registerConsultoraIpc(
  c: Consultora,
  notify: () => void,
  voice: VoiceController,
  workspaceShortcut: WorkspaceShortcut
): void {
  const read = (channel: string, fn: (...args: never[]) => unknown): void => {
    ipcMain.handle(channel, (_e, ...args) => fn(...(args as never[])))
  }
  const write = (channel: string, fn: (...args: never[]) => Promise<unknown>): void => {
    ipcMain.handle(channel, async (_e, ...args) => {
      const result = await fn(...(args as never[]))
      notify()
      return result
    })
  }

  read('consultora:overview', () => c.context.overview())
  read('consultora:search', (q: string) => c.context.search(q))
  read('consultora:settings', () => publicSettings())
  write('consultora:saveSettings', async (input) => {
    const settings = saveSettings(input)
    await voice.refresh() // el atajo de voz puede haber cambiado
    workspaceShortcut.refresh()
    return settings
  })
  read('consultora:voiceStatus', () => voice.status())
  read('consultora:workspaceShortcutStatus', () => workspaceShortcut.status())
  write('consultora:refreshVoice', () => voice.refresh())
  write('consultora:retryVoiceNotes', () => voice.retry())
  read('consultora:testApiKey', () => c.ai.testKey())
  ipcMain.handle('consultora:pickFolder', async (event) => {
    const options: Electron.OpenDialogOptions = {
      defaultPath: config.docsPath(),
      properties: ['openDirectory', 'createDirectory']
    }
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options)
    return result.canceled ? null : (result.filePaths[0] ?? null)
  })

  read('dashboard:metrics', (query) => c.metrics.query(query))
  read('dashboard:get', () => c.dashboards.get())
  write('dashboard:save', (layout) => c.dashboards.save(layout))
  write('dashboard:reset', () => c.dashboards.reset())

  ipcMain.handle('consultora:pickRecording', async (event) => {
    const options: Electron.OpenDialogOptions = {
      title: 'Subir grabación',
      properties: ['openFile'],
      filters: [
        {
          name: 'Video o audio',
          extensions: ['mp4', 'mov', 'm4v', 'mkv', 'webm', 'mp3', 'm4a', 'wav']
        }
      ]
    }
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options)
    return result.canceled ? null : (result.filePaths[0] ?? null)
  })
  write('consultora:importRecording', (path: string, info) => c.recordings.import(path, info))

  read('consultora:listMeetings', (filter) => c.meetings.list(filter))
  read('consultora:getMeeting', (id: string) => c.meetings.get(id))
  write('consultora:createMeeting', (input) => c.meetings.create(input))
  write('consultora:updateMeeting', (id: string, patch) => c.meetings.update(id, patch))
  write('consultora:removeMeeting', (id: string) => c.meetings.remove(id))
  write('consultora:updateActionItem', (id: string, index: number, patch) =>
    c.meetings.updateActionItem(id, index, patch)
  )
  write('consultora:processMeeting', (id: string) => c.recordings.process(id))
  read('consultora:listActionItems', (filter) => c.meetings.listActionItems(filter))

  write('consultora:appendNote', (entity, ref: string, text: string) =>
    c.context.appendNote(entity, ref, text)
  )

  // ---- Permisos de macOS ----
  ipcMain.handle('permissions:check', () => checkPermissions())
  ipcMain.handle('permissions:open', (_e, kind: Privacy) => openPrivacy(kind))
  ipcMain.handle('app:restart', () => restartApp())

  // ---- Grabación ----
  ipcMain.handle('recording:start', () => c.recordings.start())
  ipcMain.handle('recording:chunk', (_e, id: string, data: Uint8Array) =>
    c.recordings.chunk(id, data)
  )
  ipcMain.handle('recording:stop', (_e, id: string, info) => c.recordings.stop(id, info))

  // ---- Finder: abrir archivos o carpetas, solo dentro de tu carpeta personal ----
  // (no solo la carpeta raíz: si la cambias en Ajustes, los clientes antiguos siguen donde estaban)
  ipcMain.handle('shell:open', async (_e, path: string) => {
    const error = await shell.openPath(insideHome(path))
    if (error) throw new Error(error)
  })
  ipcMain.handle('shell:reveal', (_e, path: string) => shell.showItemInFolder(insideHome(path)))
}

function insideHome(path: string): string {
  const root = resolve(homedir())
  const target = resolve(String(path))
  if (target !== root && !isInside(root, target))
    throw new Error('Ruta fuera de tu carpeta personal.')
  return target
}
