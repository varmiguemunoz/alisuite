import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { api, tool, day, query, enc } from '../client'

export function register(server: McpServer): void {
  server.registerTool(
    'get_overview',
    {
      description:
        'Panorama en una llamada: action items abiertos y últimas reuniones. ' +
        'Úsala primero para preguntas generales ("¿qué tengo pendiente?").',
      inputSchema: {}
    },
    () => tool(() => api('GET', '/consultora/overview'))
  )

  server.registerTool(
    'search',
    {
      description:
        'Busca un texto en reuniones, incluidas transcripciones. Devuelve tipo, id, título y un fragmento.',
      inputSchema: { query: z.string().min(2) }
    },
    ({ query: q }) => tool(() => api('GET', `/consultora/search${query({ q })}`))
  )

  server.registerTool(
    'append_note',
    {
      description:
        'Añade una nota fechada al final de las notas de una reunión. ' +
        'La forma más rápida de guardar contexto que el dueño te cuenta.',
      inputSchema: {
        entity: z.literal('meeting'),
        ref: z.string().describe('id de la reunión'),
        text: z.string().min(1)
      }
    },
    (args) => tool(() => api('POST', '/consultora/notes/append', args))
  )

  server.registerTool(
    'list_meetings',
    {
      description:
        'Reuniones por día (más reciente primero), sin textos largos. Filtra por fechas. ' +
        'Luego usa get_meeting para el detalle.',
      inputSchema: {
        from: day.optional(),
        to: day.optional(),
        page: z.number().int().min(1).optional()
      }
    },
    (args) => tool(() => api('GET', `/consultora/meetings${query(args)}`))
  )

  server.registerTool(
    'get_meeting',
    {
      description:
        'Una reunión: resumen ejecutivo, decisiones, action items, participantes, notas y ruta de la grabación. ' +
        'Para "¿qué se acordó en la última reunión?". include_transcript=true añade la transcripción completa (larga).',
      inputSchema: { id: z.string(), include_transcript: z.boolean().optional() }
    },
    ({ id, include_transcript }) =>
      tool(() =>
        api('GET', `/consultora/meetings/${enc(id)}${include_transcript ? '?transcript=1' : ''}`)
      )
  )

  server.registerTool(
    'list_action_items',
    {
      description: 'Action items de todas las reuniones. Por defecto solo los abiertos.',
      inputSchema: { done: z.boolean().optional() }
    },
    ({ done }) =>
      tool(() =>
        api('GET', `/consultora/action-items${query({ done: done ? 'true' : undefined })}`)
      )
  )

  server.registerTool(
    'create_meeting',
    {
      description:
        'Registra una reunión sin grabación (p. ej. con notas que te dicta el dueño). ' +
        'Puedes dar el resumen, decisiones y action items ya escritos, o solo rawNotesMd y luego process=true para que se resuman solos.',
      inputSchema: {
        title: z.string(),
        date: z.string().optional().describe('ISO; por defecto ahora'),
        participants: z.array(z.string()).optional(),
        summaryMd: z.string().optional(),
        decisionsMd: z.string().optional(),
        actionItems: z
          .array(
            z.object({
              text: z.string(),
              owner: z.string().nullable().optional(),
              due: z.string().nullable().optional()
            })
          )
          .optional(),
        rawNotesMd: z.string().optional(),
        process: z.boolean().optional()
      }
    },
    ({ process, ...fields }) =>
      tool(async () => {
        const meeting = (await api('POST', '/consultora/meetings', fields)) as { id: string }
        return process ? api('POST', `/consultora/meetings/${enc(meeting.id)}/process`) : meeting
      })
  )

  server.registerTool(
    'update_meeting',
    {
      description:
        'Edita una reunión: título, participantes, resumen, decisiones, ' +
        'action items (lista completa) o notas.',
      inputSchema: {
        id: z.string(),
        title: z.string().optional(),
        participants: z.array(z.string()).optional(),
        summaryMd: z.string().optional(),
        decisionsMd: z.string().optional(),
        actionItems: z
          .array(
            z.object({
              text: z.string(),
              owner: z.string().nullable().optional(),
              due: z.string().nullable().optional(),
              done: z.boolean().optional()
            })
          )
          .optional(),
        rawNotesMd: z.string().optional()
      }
    },
    ({ id, ...fields }) => tool(() => api('PATCH', `/consultora/meetings/${enc(id)}`, fields))
  )

  server.registerTool(
    'update_action_item',
    {
      description:
        'Marca un action item como hecho (done: true) o lo edita. index = posición en la reunión (de list_action_items).',
      inputSchema: {
        meeting_id: z.string(),
        index: z.number().int().min(0),
        done: z.boolean().optional(),
        text: z.string().optional(),
        owner: z.string().nullable().optional(),
        due: z.string().nullable().optional()
      }
    },
    ({ meeting_id, index, ...fields }) =>
      tool(() =>
        api('PATCH', `/consultora/meetings/${enc(meeting_id)}/action-items/${index}`, fields)
      )
  )

  // ---- Subir una grabación existente ----
  server.registerTool(
    'import_recording',
    {
      description:
        'Transcribe y resume una reunión ya grabada (archivo en el Mac del dueño: mp4, mov, m4v, mkv, webm, mp3, m4a, wav). ' +
        'language = idioma hablado: "es" o "en". Se copia a la carpeta de documentos; el procesado sigue en segundo plano ' +
        '(consulta con get_meeting).',
      inputSchema: {
        path: z.string().describe('Ruta absoluta del archivo'),
        language: z.enum(['es', 'en']),
        title: z.string().optional(),
        participants: z.array(z.string()).optional()
      }
    },
    (args) => tool(() => api('POST', '/consultora/meetings/import', args))
  )

  server.registerTool(
    'process_meeting',
    {
      description:
        'Vuelve a procesar una reunión: transcribe (si falta) y resume en segundo plano. Sirve para reintentar un error ' +
        'o resumir notas crudas. Consulta el resultado con get_meeting.',
      inputSchema: { id: z.string() }
    },
    ({ id }) => tool(() => api('POST', `/consultora/meetings/${enc(id)}/process`))
  )

  server.registerTool(
    'delete_meeting',
    {
      description:
        'Borra una reunión de la app (la grabación se queda en el disco). Sin confirm no borra.',
      inputSchema: { id: z.string(), confirm: z.literal(true).optional() }
    },
    ({ id, confirm }) =>
      tool(() =>
        api(
          'DELETE',
          `/consultora/meetings/${enc(id)}${query({ confirm: confirm ? 1 : undefined })}`
        )
      )
  )
}
