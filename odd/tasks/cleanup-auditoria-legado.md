# Cleanup audit leftovers (legacy CRM/marketing)

Branch: cleanup/modulos-marketing
Delivery strategy: ask-on-risk
Test runner: npm test (node scripts/test.mjs), npm run typecheck, npm run lint, npm run build

## Specs

S1: Remove build artifacts and local caches to free space: `dist/`, `out/`, `.eslintcache` (gitignored/regenerable).
S2: Remove safe-dead runtime/test-helper source files with no usages: `src/main/services/delivery.ts`, `src/main/test/fake-apollo.ts`, `src/main/test/fake-resend.ts`, `src/main/test/email-delivery.ts`, `src/main/test/email-delivery-contract.ts`.
S3: Align stale sync/activity/contracts for removed modules where safe: `src/shared/edition.ts`, `src/shared/activity.ts`, and direct dependent code/tests so sync/activity no longer reference removed tables/entities/kinds.
S4: Remove/clean stale pipeline/prospect/contact/marketing remnants in shared types, models, services, renderer, MCP, and dashboard leftovers that are clearly unused or misleading, without breaking kept functionality (tasks, meetings, clients, projects, workspace, automations, tags, dashboard base).
S5: Decide and clean email-delivery/automation email legacy (`src/shared/email-delivery/`, `src/main/email.ts`, config/settings fields, send_email automation wiring) or document blocked dependency if unsafe to remove now.
S6: Update stale docs (`README.md`, `PRODUCT.md`, `DESIGN.md`) and classify/archive historical specs outside src as appropriate (no blind deletion of third-party skills).
S7: Keep published migrations untouched; typecheck/lint/test/build pass.

## Tasks

T1 | S1 | route: inline | status: done | commit: n/a (removed gitignored dist/, out/, .eslintcache; ~1GB freed)
T2 | S2 | route: inline | status: done | commit: 89b3e41 (dead unused files deleted)
T3 | S3 | route: inline | status: done | commit: 590324d (active sync/activity/contracts aligned; tests/typecheck/lint pass for scope)
T4 | S4 | route: inline | status: done | commit: (slices: f519c35,8b1e2e5,7730c39,b3c9179,9ce207e)
T5 | S5 | route: inline | status: done | commit: 1833e99
T6 | S6 | route: inline | status: done | commit: abdec3b
T7 | S7 | route: inline | status: done | commit: 45b9cf1

## Log

L1: User request (verbatim): "Veo demasiados archivos de este tipo, referencia a las tablas antiguas de las funcionalidades que tenemos. Quiero que hagas una auditoria completa para eliminar todo el codigo inutil y liberar espacio de esta manera. dame el resultado de la auditoria"
L2: User follow-up (verbatim): "Perfecto, adelante"
L3: Audit delivered; proceeding with phased cleanup starting from safe space wins and dead source files.
L4: T1 complete: removed gitignored `dist/`, `out/`, `.eslintcache`.
L5: T2 complete: deleted unused `src/main/services/delivery.ts`, `src/main/test/fake-apollo.ts`, `src/main/test/fake-resend.ts`, `src/main/test/email-delivery.ts`, `src/main/test/email-delivery-contract.ts`.
L6: T3 complete: kept historical `SYNC_TABLES`/`SOFT_DELETE_TABLES` for published migration compatibility, added `ACTIVE_SYNC_TABLES`/`ACTIVE_SOFT_DELETE_TABLES` for runtime; aligned `src/shared/activity.ts`, cloud mutation-policy/activity, local sync store/incoming/engine, SyncIndicator, and affected tests to removed CRM/marketing entities/tables. Evidence: `npm run typecheck` OK; `npm run lint` 0 errors (6 pre-existing warnings in unrelated files); targeted vitest `edition, cloud-domain, activity-domain, sync-end-to-end` 25/25 passed. Published migrations untouched.
L7: Commits: T2=`89b3e41`, T3=`590324d`.
L8: T4 in progress: removed legacy CRM dashboard widgets/metrics contracts (pipeline/prospect/deals/win-rate/contacts/overdue steps) and aligned controller/service/types; `npm run typecheck` (node+web) OK. Commit `f519c35`.
L9: T4 slice: removed `prospectId`/`prospect` linkage from shared task/meeting contracts, models, views, services, controllers, renderer task helpers, and MCP tools/index; cleaned related stale MCP/UI strings. `npm run typecheck` (node+web) OK. Commit `8b1e2e5`.
L10: T4 slice: trimmed automations shared model/catalog/fields/validate/templates to active subjects/triggers/nodes (client/task/meeting/none), kept legacy subject/trigger/node compatibility and retired specs for stored defs/migrations, cleaned renderer automation UI/context, and updated automation domain/graph/migration/routes tests to active behavior while preserving migration compatibility. Evidence: `npx tsc --noEmit -p tsconfig.node.json --composite false` OK; `npx tsc --noEmit -p tsconfig.web.json --composite false` OK; vitest `automations-domain, automations-graph, automations-migration, automations-mcp, automations.routes` 42/42 passed. Commit `7730c39`.
L11: T4 slice: removed stale pipeline wording from App title, Settings help text, and Home dashboard copy/comments. `tsc web` OK. Commit `b3c9179`.
L12: T4 slice: removed stale pipeline/contacto group entries from automation NodePicker/Canvas, dropped legacy `pipeline.` ui-state migration key, and removed unused `Overview.pipeline`/`Overview.nextSteps` from shared consultora types and context service. `tsc node/web` OK. Commit `9ce207e`.

L13: T5 slice: removed dead newsletter/outreach config fields and wiring (`newsletterPaused`, `outreachDailyCap`, `outreachFooter`, `outreachCursor`/`saveOutreachCursor`) from `src/main/config.ts`, `src/shared/consultora.ts`, and `src/main/email.ts` (apollo no longer receives outreach footer). Kept email delivery/`email_owner` transactional path intact. `tsc node/web` OK. Commit `1833e99`.
L14: T6: updated `README.md`, `PRODUCT.md`, `DESIGN.md` to remove stale CRM/marketing/outreach/newsletter/pipeline module references and align automations/dashboard/tasks/MCP docs with active functionality. Archived historical specs outside src: `.impeccable/.kiro/specs/{email-automations,outreach-editor-mcp-canvas,multi-pipeline}` -> `.impeccable/.kiro/specs-archive/`. Commit `abdec3b`.
L15: T7 verification: `npm run typecheck` OK; `npm run lint` 0 errors (8 pre-existing prettier warnings in untouched files); `ELECTRON_RUN_AS_NODE=1 node node_modules/vitest/vitest.mjs run` **39 files / 278 tests passed** (`npm test` script unavailable here: Electron binary missing in `node_modules/electron/dist`); `npm run build` OK (electron-vite main/preload/renderer built). Lint fixes + tracker finalized in `45b9cf1`.
