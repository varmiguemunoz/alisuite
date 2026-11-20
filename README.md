# DayliOS

Tareas del día (máximo 8) en el menubar de macOS. SQLite local y servidor MCP para Claude Desktop.

## Uso

```bash
npm install
npm run dev        # desarrollo
npm run build:mac  # genera el .dmg en dist/
```

Datos: `~/Library/Application Support/daily-os/daylios.db`

## La interfaz se recuerda

Como Obsidian, las ventanas vuelven como las dejaste. El estado vive en `ui-state.json`, en la carpeta
de datos de la app, nunca en la caché del navegador interno, y no se sincroniza.

- **Menubar**: cada pestaña conserva su scroll, el periodo y la página de Historial, la página de Notas
  y lo escrito en «Añade una tarea…». Volver de una tarea o nota deja la lista donde estaba. Al
  reiniciar se abre lo último, también una tarea o nota.
- **Fijar** con la chincheta de arriba a la derecha: la ventana no se oculta al cambiar de app, se
  mueve arrastrando el borde de arriba o la barra inferior y se puede hacer más alta. Recuerda su sitio.
- **Consultora**: última pantalla con su historial de atrás y adelante, la última pantalla de cada
  sección, filtros y páginas de las listas, scroll de cada pantalla, zoom de cada board, scroll de
  cada nota y tamaño de la ventana.
- **Restablecer**: Ajustes, General, «Restablecer el diseño de las ventanas».

## Instalar como servicio (macOS)

```bash
npm run service:install     # compila, copia a /Applications, arranca siempre y configura el MCP en Claude
npm run service:uninstall   # quita todo (pregunta antes de borrar tus tareas; --purge para no preguntar)
```

El servicio es un LaunchAgent (`~/Library/LaunchAgents/com.bloomilite.daylios.plist`): arranca al iniciar sesión y, si la app se cierra o falla, launchd la vuelve a abrir. Logs en `~/Library/Logs/daylios.log`. Después de instalar o desinstalar, reinicia Claude (⌘Q) para que cargue el cambio del MCP.

## Arquitectura

```
src/shared/            dominio: tipos, contrato TasksApi, techo de 8, fechas
src/main/
  index.ts             arranque
  window.ts            ventana popover + icono del menubar
  ipc.ts               UI → servicio
  server.ts            Express (127.0.0.1 + token) → lo usa el MCP
  db/                  DataSource de TypeORM + migraciones
  models/              M: modelos Task y Note (EntitySchema)
  views/               V: forma del JSON
  controllers/         C: petición → servicio → vista
  routes/              rutas → controlador
  services/            reglas: tareas, notas y consultora (reuniones, AI, grabación)
  consultora.ts        crea los servicios de la consultora
  consultora-window.ts ventana grande + captura de pantalla con audio del sistema
  config.ts            ajustes (settings.json), editables desde la ventana
  guards/              transacciones: todo o nada, de una en una
  middlewares/         token, aviso a la ventana, errores
src/mcp/               servidor MCP stdio → API local
src/preload/           puente seguro window.api
src/renderer/          UI React
```

Specs (SDD) en `.kiro/specs/`. Consultora: `.kiro/specs/consultora-context/`.

Tests: `npm test` (Vitest dentro de Electron, porque better-sqlite3 está compilado para su ABI; base SQLite en memoria con las migraciones reales y proveedores de email falsos). Incluye la lógica del Worker `workers/leads-hub`.

La app es la única que abre la base de datos. La UI y Claude pasan por el mismo servicio, así que las reglas (techo de 8, validación) son idénticas. Si Claude cambia algo, la ventana se refresca sola.

Al arrancar, la app escribe `connection.json` (puerto + token, permisos 600) junto a la base de datos. El MCP lo lee en cada llamada. **La app tiene que estar abierta** para que Claude pueda usarla; con `npm run service:install` queda siempre corriendo.

## Ediciones y nube

DayliOS arranca en la edición Local: SQLite y la bóveda en este Mac, sin cuenta y sin conexiones
de nube. La edición Equipo, en construcción, suma cuenta, organización y sincronización. Ajustes,
«Cuenta y equipo», muestra la activa.

- Los servicios locales hablan con puertos (`src/main/ports`). En Local los atienden adaptadores
  vacíos; el código de nube (`src/main/cloud`) solo se carga en Equipo.
- Cada cambio en las tablas sincronizables deja una fila en `change_log` por triggers de SQLite.
  En Local se queda en las últimas 10 000.
- Borrar reuniones, automatizaciones o tareas marca `deleted_at`. Se purgan a los 30 días.
- Nunca salen del Mac: `settings.json`, claves de API, tokens, `ui-state.json`, secretos de las
  la cola de voz y grabaciones en curso (`NEVER_SYNC`).
- Microservicio en `services/cloud`, NestJS hexagonal sobre Supabase. Ver su README.

### Cuenta

Ajustes, «Cuenta y equipo»: «Continuar con Google» o un código por email, sin contraseñas.
Iniciar sesión activa la edición Equipo pero no sube datos. La sesión se cifra con el Llavero de
macOS y se renueva sola; si caduca, la app sigue en local y la franja muestra «Volver a entrar».
Desde ahí también se cambia el nombre, se ven los dispositivos, se cierra sesión aquí o en los
demás y se borra la cuenta. Configuración en `.env` con las variables de `.env.example`.

### Organizaciones

Con sesión, el botón de abajo en la cinta cambia entre Local y tus organizaciones, o crea una nueva.
Cada organización tiene su propia base y su bóveda en `Organizaciones` dentro de tu carpeta de
documentos; Local queda intacto. Cambiar de espacio reinicia la app. En «Cuenta y equipo» se ven
los miembros con su rol, las invitaciones por email o por enlace, salir, transferir y borrar. Las
tareas y reuniones ganan «Responsable», y Tareas e Inicio tienen «Mis
tareas».

### Sincronización

Dentro de una organización, cada cambio llega a los demás miembros en segundos y todo sigue
funcionando sin red: los cambios esperan en cola. Si dos personas cambian campos distintos se
conservan los dos; si cambian el mismo, gana el último. El icono de nube de la franja muestra el
estado, lo que hay en cola, permite pausar, sincronizar ahora o volver a descargar, y lista lo que
otra persona borró con la opción de restaurarlo. En Local no hay ningún proceso de sincronización.

### Equipo en tiempo real

En la franja aparecen las iniciales de quien está conectado en la organización. Si otra persona
tiene abierta la misma ficha o nota se ve junto al título, y mientras escribe aparece «Ana está
editando». No bloquea, solo avisa. La pestaña «Actividad» de la barra lateral lista por día lo que
hizo el equipo: crear, cambiar, mover de etapa, ganar o perder, completar, asignar, subir, renombrar
o borrar archivos, invitar y unirse. Se filtra por persona, tipo y elemento, muestra cuántas
novedades no has visto y un clic abre el elemento. Cada ficha muestra su propia actividad al final.
Cuando te asignan una tarea o una reunión llega un aviso del sistema. En Ajustes,
Cuenta, Equipo se apagan los avisos por tipo y se puede ocultar la propia presencia. Lo que otra
persona acaba de cambiar se resalta un momento en tareas y reuniones.

### Archivos

Dentro de una organización, la carpeta de documentos de la organización se sube a la nube de
Cloudflare R2 y llega a los demás miembros. Solo se sube el contenido que cambió: renombrar o
mover una carpeta no vuelve a subir nada y el mismo archivo en dos lugares se guarda una vez. Los
archivos grandes suben por partes y, si se corta la red, siguen donde quedaron. Si dos personas
editan el mismo archivo sin conexión, queda una copia con el nombre de quien la hizo. Lo que otro
borra va a la papelera del sistema y a la papelera de la organización por 30 días, desde donde se
restaura en Ajustes, Cuenta. Las grabaciones de reuniones no se suben salvo que se active el
interruptor. Un punto junto a cada archivo del explorador muestra si está en la nube, subiendo,
bajando o en conflicto.

## Workspace (notas, boards y archivos)

Primera sección de Consultora, con el aspecto de Obsidian. Es una carpeta real: por defecto
`<carpeta de documentos>/Workspace`, se cambia en Ajustes. Lo que hay dentro se ve igual en Finder, en Obsidian y en la
app; si cambias algo fuera, la app lo ve en menos de 2 s.

- **Atajo global**: ⌥⌘W abre el workspace en la última nota desde cualquier app; otra vez lo oculta. Se cambia en
  Ajustes. Dentro no hay barra lateral ni cabecera de Consultora; la cinta de la izquierda abre la navegación.
- **Atajos dentro**: ⌘O o ⌘F buscar y abrir, ⌘K buscar en todo, ⌘N nota nueva, ⌘\ mostrar u ocultar la barra lateral.
- **Explorador**: un árbol de carpetas y archivos. Arrastra para mover, suelta archivos de Finder para subirlos
  (50 MB máximo), clic derecho para el menú. Borrar manda a la Papelera.
- **Notas**: archivos `.md`. El primer título de la nota es el nombre del archivo. Doble clic para escribir; al
  salir o tras 2 s sin teclear vuelve a la lectura. Las del menubar y las de voz caen en `Notas rápidas/`. Pega una
  imagen y se guarda en `Adjuntos/`.
- **Boards**: archivos `.canvas` (JSON Canvas, se abren también en Obsidian). Tarjetas, formas, imágenes, notas
  incrustadas, grupos y flechas con rótulo. Doble clic en el fondo crea una tarjeta; soltar una flecha en el vacío
  crea una tarjeta conectada. ⌘G agrupa y lo que está dentro se mueve con el grupo. ⌘C, ⌘V, ⌘D, ⌘Z, ⇧⌘Z, flechas
  para mover, ⌥ para colocar sin rejilla.
- Mover o renombrar actualiza los enlaces de notas e imágenes de boards que apuntan a lo movido.

## Consultora (tareas, reuniones y workspace)

Ventana aparte para el contexto de la consultora: clic derecho en el icono del menubar → **Abrir Consultora**, o el botón del maletín junto a las pestañas.

Toda la ventana tiene el aspecto de Obsidian: franja superior con atrás, adelante y la ruta; cinta de iconos; barra
lateral con las pestañas **Secciones** y **Archivos**. Atajos: ⌘K buscar en todo, ⌘O abrir un archivo de la bóveda,
⌘N nota nueva, ⌘\ barra lateral, ⌘[ y ⌘] atrás y adelante, ⌘, Ajustes.

- **Reuniones**: «Grabar reunión» graba pantalla + micrófono + audio del sistema. Al detener se transcribe (OpenAI Whisper) y se resume: resumen ejecutivo, decisiones y action items. También se pueden crear sin grabar.

### Ajustes

Todo se configura desde la app: **Consultora → Ajustes**.

- **API key de OpenAI**: pégala y pulsa Guardar (se prueba sola). La ventana nunca vuelve a mostrarla completa.
- **Carpeta de documentos**: por defecto `~/Desktop/alimunozadvisory`; «Cambiar…» abre el selector de macOS.
- **Email**: API key de Resend, remitente y tu email. Solo para avisos internos, como el paso «Avisarme por email» de las automatizaciones.
- **Modelos e idioma del resumen**: `whisper-1`, `gpt-4o-mini`, español por defecto.

Se guardan en `~/Library/Application Support/daily-os/settings.json` (permisos 600) y aplican al momento, sin reiniciar.

### Permisos de macOS

La primera grabación pide **Micrófono** y **Grabación de pantalla y audio del sistema** (Ajustes del Sistema → Privacidad). La carpeta raíz en el Escritorio también puede pedir acceso. La app lleva firma local (ad-hoc): tras reinstalar, macOS puede volver a pedirlos.

Grabaciones: `<carpeta de documentos>/_reuniones/`. Coste orientativo: 1 h ≈ 0,36 USD de transcripción.

### MCP y boards

- El servidor local vive mientras Alisuite esté abierta, aunque la ventana esté cerrada. En Mac, Cmd+Q solo oculta las ventanas; para salir de verdad usa «Salir de Alisuite» en la bandeja. La app evita App Nap para responder rápido en segundo plano.
- Si Alisuite está cerrada, el MCP la abre solo y espera hasta 20 segundos. Cada petición tiene 30 segundos de límite.
- `board_edit` valida todas las operaciones y devuelve todos los errores juntos, acomoda los nodos nuevos con `layout` y responde corto por defecto. `board_diagram` dibuja un diagrama completo en una llamada. Si el board está abierto sin cambios pendientes, se recarga solo.

## Automatizaciones

Motor de flujos dentro de la Consultora. Spec e investigación: `.kiro/specs/automations/`.

- **Qué es**: triggers (tarea completada, reunión lista, una hora fija o a mano) que inscriben a un sujeto (tarea, reunión o ninguno) en un árbol de pasos: control, email al responsable, tareas, notas, notificaciones del Mac, webhooks y esperas.
- **Editor**: lienzo en árbol de arriba abajo. «+» entre pasos y al final de cada rama. Se arrastra un paso, o con ⌥ el paso con lo que cuelga, a cualquier «+». ⌘Z y ⇧⌘Z, ⌘C y ⇧⌘C para copiar con lo que cuelga, ⌘V en un «+».
- **Borrador y versiones**: el borrador se guarda solo. Publicar crea una versión inmutable y la activa. Las ejecuciones en curso siguen con su versión. Se guardan las últimas 10 y se puede restaurar cualquiera.
- **Probar** simula sobre un sujeto real sin escribir nada. **Ejecutar** corre la versión publicada a mano.
- **Ejecuciones**: corren en este Mac. Sobreviven al cierre de la app y lo vencido corre al abrir, marcado «con retraso». Los pasos externos reintentan a 1, 5 y 30 minutos. Anti bucles: cadena de 5, sin auto disparo y bloqueo a 20 entradas del mismo sujeto en 30 minutos. Se guardan 60 días.
- **Equipo**: las definiciones se sincronizan; las ejecuciones son de cada Mac y un cambio que llega de otro Mac no dispara nada en el tuyo.
- **Ampliar**: un nodo nuevo es su especificación en `src/shared/automations/catalog.ts` y su handler en `src/main/automations/handlers`. Un test falla si falta uno de los dos.

## Tareas: tags y esfuerzo

Escribe `Propuesta Acme #ventas !alto` y se guarda la tarea «Propuesta Acme» con el tag `ventas` y esfuerzo alto (`!a`, `!m`, `!b` también valen). En el detalle se editan ambos. Arrastra las filas de Hoy para ordenarlas.

## Inicio

Primera sección de Consultora. Dashboard con componentes base de tareas, reuniones, action items y pendientes vencidos. Cada número se compara con el periodo anterior y un clic en el título abre su origen filtrado. «Editar dashboard» permite añadir, quitar, mover y ajustar componentes. El diseño se guarda en la base.

## Tablero de tareas

En Consultora, sección Tareas. Las mismas tareas del menubar con tres estados: Pendiente, En curso y Hecha. Se ven como tablero o como lista ordenable, con filtros por periodo, texto, tags, esfuerzo y responsable. Arrastrar una tarjeta cambia su estado; Hecha equivale a marcarla en el menubar. El límite de ocho por día se mantiene.

## Nota de voz

Mantén pulsado **⌥ Espacio** en cualquier app, habla y suelta. Aparece una pastilla arriba («● Escuchando»); al soltar, DayliOS transcribe (Whisper), escribe la nota en markdown (título, listas, casillas para tareas) y la guarda en **Notas**. La notificación «Nota creada» abre la nota.

- El atajo se cambia o desactiva en **Consultora → Ajustes → Nota de voz**.
- «Mantener pulsado» necesita el permiso de **Accesibilidad** (solo para saber cuándo sueltas la tecla). Sin él, funciona como interruptor: pulsa para empezar y otra vez para terminar.
- Menos de 1 s se ignora; máximo 10 min. El audio se borra al terminar; si la transcripción falla, queda en Ajustes con «Reintentar».

## Firma y permisos

`service:install` firma la app con tu certificado de Xcode («Apple Development») si existe. Así macOS conserva los permisos (Grabación de pantalla, Micrófono, Accesibilidad) entre reinstalaciones. La primera vez con la firma nueva los pedirá una última vez, y macOS puede preguntar si `codesign` puede usar la clave: elige «Permitir siempre». Para forzar un certificado: `DAYLIOS_SIGN_IDENTITY="Apple Development: …" npm run service:install`.

Tras conceder **Grabación de pantalla**, macOS exige reiniciar la app: usa el botón «Reiniciar DayliOS» del aviso de permisos.

## Conectar Claude Desktop

Edita `~/Library/Application Support/Claude/claude_desktop_config.json` y reinicia Claude.

Desarrollo (después de `npm run build` o `npm run dev`):

```json
{
  "mcpServers": {
    "daylios": {
      "command": "node",
      "args": ["/Users/varmiguemunoz/varmiguemunoz/daily-os/out/main/mcp.js"]
    }
  }
}
```

App instalada en `/Applications`:

```json
{
  "mcpServers": {
    "daylios": {
      "command": "/Applications/daily-os.app/Contents/MacOS/daily-os",
      "args": ["/Applications/daily-os.app/Contents/Resources/app.asar/out/main/mcp.js"],
      "env": { "ELECTRON_RUN_AS_NODE": "1" }
    }
  }
}
```

### Herramientas

Las herramientas que borran piden `confirm: true`: sin él devuelven el impacto y no borran. Excepciones a propósito: claves y secretos,
permisos de macOS y empezar o detener una grabación en vivo.

| Dominio          | Herramientas                                                                                                                                                                                                                                                                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Día              | `get_day` · `get_history` · `create_task` (con `parent` crea una subtarea) · `get_task` · `update_task` · `delete_task` · `move_task` · `list_tasks` (tablero con estado y filtros) · `carry_over_pending` · `reorder_tasks` · `reorder_subtasks` · `complete_subtasks`                                                                      |
| Notas            | `list_notes` · `get_note` (con relaciones) · `create_note` · `update_note` · `delete_note` · `search_notes` · `link_notes` · `unlink_notes`                                                                                                                                                                                                  |
| Reuniones        | `get_overview` · `search` · `append_note` · `list_meetings` · `get_meeting` · `create_meeting` · `update_meeting` · `process_meeting` · `delete_meeting` · `list_action_items` · `update_action_item` · `import_recording`                                                                                                                   |
| Workspace        | `workspace_tree` · `workspace_list` · `workspace_search` · `workspace_read` · `workspace_write_note` · `workspace_create_folder` · `workspace_move` · `workspace_delete` (a la Papelera) · `workspace_create_board` · `board_read` · `board_edit` · `board_diagram`                                                                          |
| Automatizaciones | `list_automation_catalog` · `list_automations` · `get_automation` · `save_automation_draft` · `publish_automation` (con `confirm`) · `set_automation_status` · `delete_automation` (con `confirm`) · `test_automation` · `run_automation` · `list_automation_runs` · `get_automation_run` · `cancel_automation_run` · `retry_automation_run` |

`create_task` y `update_task` aceptan `description` (markdown), `tags` y `effort` (alto/medio/bajo). En el título también funcionan `#tag` y `!alto` / `!medio` / `!bajo`. `update_task` además acepta `status` (todo, doing, done) y `assignee`.

## Atajos

| Atajo          | Qué hace                                     |
| -------------- | -------------------------------------------- |
| `⌘1` `⌘2` `⌘3` | Hoy · Historial · Notas                      |
| `⌘N`           | Nueva tarea (en Hoy) o nueva nota (en Notas) |
| `Enter` / clic | Abrir el detalle de una tarea                |
| `Espacio`      | Completar la tarea enfocada                  |
| `⌘E`           | Escribir / Ver en descripción y notas        |
| `⌘Z`           | Deshacer el último borrado de tarea          |
| `Esc`          | Volver (en detalle) o cerrar la ventana      |

Ejemplo de tarea programada al final del día: _"Usa get_day para ver hoy. Resume lo hecho y lo pendiente, y usa carry_over_pending de hoy a mañana."_
