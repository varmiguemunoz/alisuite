# Cleanup of CRM / marketing modules

Branch: cleanup/modulos-marketing
Delivery strategy: ask-on-risk
Test runner: npm test (node scripts/test.mjs), npm run typecheck

## Specs

S1: Remove the Contactos module completely: screens, routes, navigation, controller, service, model, tests, MCP tools, and sync/hub integration.
S2: Remove the Pipeline/Prospectos module completely: screens, routes, navigation, service, model, stages, metrics, tests, MCP tools.
S3: Remove Fuentes (lead sources), Outreach (Apollo cold sequences), and Newsletter modules: screens, routes, navigation, services, models, tests, MCP tools.
S4: Remove email marketing infrastructure that is only used by the removed modules: email-delivery providers, marketing sync, hub sync, outbox, audience reset, worker leads-hub, and the Marketing IPC/server wiring.
S5: Keep other functionality intact: Tareas, Notas, Clientes, Proyectos, Reuniones, Workspace, Automations, Tags (task tags only), Dashboard (tasks/meetings/action items/overdue), and metrics for tasks/meetings.
S6: Adapt Automations to no longer support contact/prospect subjects, triggers, handlers, or scope views.
S7: Adapt Dashboard and metrics to remove pipeline/contact widgets and metrics; keep task/meeting widgets.
S8: Database changes are additive migrations only: drop removed tables/columns in a new final migration; never edit published migrations.
S9: App must typecheck, lint, and tests pass; smoke test of remaining screens; no leftover references to removed modules in src.

## Tasks

T1 | S1,S2,S3 | route: inline | status: pending | commit: -
T2 | S1 | route: inline | status: pending | commit: -
T3 | S2 | route: inline | status: pending | commit: -
T4 | S3,S4 | route: inline | status: pending | commit: -
T5 | S6 | route: inline | status: pending | commit: -
T6 | S7 | route: inline | status: pending | commit: -
T7 | S8 | route: inline | status: pending | commit: -
T8 | S9 | route: inline | status: pending | commit: -

## Log

L1: User request (verbatim): "Requiero hacer una limpieza de este proyecto. Tenemos muchas funciones y la gran no se estan usando actualmente. Por lo tanto se debe eliminar completamente de la UI y de la logica de la app. Tenemos el mismo requisito comentado en otro chat esto es demasiado pesado, debe ser lo mas ligero posible de modo que a mi mac no le cueste correrlo. Por lo tanto hay que hacer un rediseño de la estructura. Tenemos un modulo de crm, pipeline, contactos, email, fuentes, outreach, newsletter. Inicialmente quiero eliminar todos estos modulos del sistema. tablas, pantallas, logica, test, todo lo relacionado con este sistema quiero poder eliminarlo, sin dañar las otras funcionalidades. Ayudame con un plan con odd para realizar esta limpieza."
L2: Assumed scope: keep Clientes, Proyectos, Reuniones, Tareas, Notas, Workspace, Automations, Tags (task tags), Dashboard base. Remove Contactos, Pipeline/Prospectos, Fuentes, Outreach, Newsletter, email marketing infra. User confirmed "adelante".
