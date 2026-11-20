# Cleanup fase 2. Clientes, Proyectos y email de marketing

Branch: cleanup/modulos-marketing
Delivery strategy: ask-on-risk
Test runner: npm run check, vitest via ELECTRON_RUN_AS_NODE=1

## Estado de partida

Contactos, Pipeline, Fuentes, Outreach y Newsletter ya se eliminaron en esta rama.
Ver cleanup-modulos.md y cleanup-auditoria-legado.md.
La rama no está fusionada a main ni publicada. La app instalada 1.0.3 todavía los muestra.

Quedan pendientes.
1. Módulo Clientes y su dependiente Proyectos.
2. Capa email-delivery completa con Apollo, roles marketing y outreach, audiencias, broadcasts y secuencias.

## Specs

S1: Eliminar Clientes por completo. Pantallas Clients y Client, ClientFiles, DeleteClientModal, entrada de navegación, IPC, preload, rutas, controller, service, model, client-folders.migration, MCP tools/clients.ts, tests.
S2: Eliminar Proyectos por completo. Pantalla Project, project.controller, project.service, project.model, tools MCP de proyectos, tests.
S3: Quitar vínculos clientId y projectId de Tareas, Reuniones y Notas. Contratos shared, models, views, services, controllers, renderer, MCP, context.service y dashboard. Quitar link_note_client y unlink_note_client.
S4: Automatizaciones sin sujeto client. Quitar trigger client.created y nodos create_client, create_project, assign_client, unassign_client, assign_project. Mantener compatibilidad de lectura de definiciones guardadas como nodos retirados, igual que en fase 1.
S5: Sync y edición. Quitar clients y projects de ACTIVE_SYNC_TABLES, activity, sync-protocol, SyncIndicator y services/cloud. Migración nueva en cloud que borra esas tablas. Tablas históricas solo para migraciones publicadas.
S6: Email. Dejar Resend solo para notificaciones internas.
  Mantener un puerto único NotificationSender con su adaptador Resend.
  Lo usan el nodo email_owner, notify de la app y las invitaciones de organización en services/cloud.
  Eliminar provider Apollo, puertos audience, broadcasts, sequences y events, DeliveryRouter con roles, ProviderRegistry, apolloKey, emailRoles, webhooks y sequences de Resend, ajustes de proveedores en la UI.
  Mantener resendKey, from, replyTo y ownerEmail.
S7: Base local. Migración nueva final que borra tablas clients y projects y columnas client_id y project_id. Nunca editar migraciones publicadas.
S8: Archivos del usuario. La carpeta Clientes del workspace queda como carpeta normal. No se borra ningún archivo del disco.
S9: Verificación. npm run check en cero, vitest completo, build, smoke de Inicio, Workspace, Tareas, Reuniones, Tags y Automatizaciones, grep sin referencias a client, project, apollo, outreach, newsletter, prospect en src.

## Decisiones abiertas

D1: Proyectos se elimina junto con Clientes porque cuelga de ellos. Recomendado sí.
D2: Respaldo antes de borrar tablas. Recomendado exportar clients y projects una vez a JSON en userData/backup.
D3: Flujo de release. Recomendado terminar en esta rama, el usuario hace merge a main y publica 1.1.0.

## Tasks

T1 | S6 | route: inline | status: done | Reducir email-delivery a NotificationSender con Resend en app y cloud
T2 | S4 | route: inline | status: done | Automatizaciones sin sujeto client ni nodos de clientes y proyectos
T3 | S3 | route: inline | status: done | Quitar clientId y projectId de tareas, reuniones, notas, MCP y dashboard
T4 | S1,S2,S8 | route: inline | status: done | Borrar módulos Clientes y Proyectos en main, renderer, preload y MCP
T5 | S5 | route: inline | status: done | Sync, activity, edición y services/cloud
T6 | S7,D2 | route: inline | status: done | Migración final local con respaldo previo
T7 | S9 | route: inline | status: done | Verificación completa y docs README, PRODUCT, DESIGN

## Log

L1: User request (verbatim): "Quiero que hagas un reporte/recorrido por el codigo de la app y elimines todo el codigo muerto, archivos innecesarios, todo lo que tiene que ver con el envio de email en fuentes, outreach y newsletter. tambien elimina todo lo del pipeline, clientes y contactos. Asegurate que durante todo el proceso completo no solo se elimine de la UI, si no tambien de todos los lugares donde se conecta. Primero empecemos por aqui. Ya iremos eliminando todo lo demas. Si tienes una propuesta, hazla. creame un plan con odd para proceder con la eliminacion de toda la logica relacionada a estos modulos. Sin embargo, dejame activo el uso de resend para enviar emails de notificaciones internos en la app. de resto, elimina todo lo demas."
L2: Auditoría. Fase 1 ya hecha en la rama, 218 archivos, 31696 líneas borradas. Pendiente Clientes, Proyectos y email-delivery con Apollo.
L3: Decisiones D1 a D4 aprobadas por el usuario: "Si, perfecto. apruebo todo. limpia todo eso".
L4: T1. email-delivery queda en el puerto EmailSender, EmailProviderError y el adaptador HTTP de Resend con Idempotency-Key. Fuera Apollo, roles, registro, audiencias, broadcasts, secuencias, webhooks, hub y la dependencia resend. Nueva pestaña Ajustes, Email.
L5: T2. Sujeto client, trigger client.created y nodos create_client y create_project pasan a retirados. Fuera referencias, opciones y nombres de clientes del editor y del servicio.
L6: T3 y T4. Borrados los módulos Clientes, Proyectos y Documentos por cliente, su IPC, preload, rutas, MCP, pantallas y vínculos en tareas, reuniones y notas. Fuera la tabla tags de marketing y los archivos huérfanos.
L7: T5 y T6. Sync activo sin clients, projects ni tags. Fuera el relleno local y la reubicación de carpetas. Mantenimiento usa ACTIVE_SOFT_DELETE_TABLES. Migración RemoveClientsProjects1729900000000 con respaldo JSON en userData/backup.
L8: T7. npm run typecheck y ESLint en cero errores, 3 avisos previos en archivos no tocados. Vitest 39 archivos, 268 pruebas pasan. typecheck:cloud sin node_modules de services/cloud, revisado sin errores fuera de módulos faltantes. CI pasa a pnpm.

