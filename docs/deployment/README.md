# Sprint 15 — Deployment documentation

This folder contains the deployment records for the **same WTWR Express application** running in two separate environments. They use independent process management, databases, networking and credentials.

## Private VirtualBox / Ubuntu VM

- [VirtualBox / Ubuntu overview](virtualbox/README.md)
- [01 — Virtual machine setup and security baseline](virtualbox/01-virtual-machine.md)
- [02 — Ubuntu operations and backend tests](virtualbox/02-ubuntu-operations.md)
- [05 — MongoDB, PM2 and VM deployment checkpoints](virtualbox/05-vm-application-deployment.md)
- Screenshots: [`virtualbox/images/`](virtualbox/images/)

## Public Render deployment

- [03 — Render, MongoDB Atlas, and GitHub Pages](render/03-cloud-deployment.md)
- Screenshots: [`render/images/`](render/images/)

## Shared documentation

- [04 — Verification matrix and recovery runbook](04-verification-and-runbook.md)
- [Screenshot manifest and evidence limitations](SCREENSHOT-MANIFEST.md)

## Current verified state (November 13, 2026 Pacific) — full stack restart confirmed

**Private Ubuntu / VirtualBox lab — VERIFIED:** After a controlled reboot and disk unlock, `systemctl is-active mongod pm2-aem nginx wtwr-healthcheck.timer` returned four `active` statuses. Nginx on `127.0.0.1:80` forwarded successfully to Express on `127.0.0.1:3001`; `curl -sS http://127.0.0.1/` returned `{"status":"ok"}`. The JavaScript checker reported Express, MongoDB and PM2 passing (**3/3**). MongoDB listens on `127.0.0.1:27017` and uses the VM-only database `wtwr_vm_lab`. The VM retained `10.0.2.15` behind VirtualBox NAT after changing household networks.

**Automated operations — VERIFIED:** PM2 process list saved and PM2 startup registered via `pm2-aem.service`; MongoDB enabled at boot; Nginx service active; `wtwr-healthcheck.timer` enabled and active with a successful journaled JavaScript health-check run. The check reports results, it does **not** restart services or notify externally. The timer's exact schedule is defined in `virtualbox/systemd/wtwr-healthcheck.timer`.

**Public Render deployment — SEPARATE:** React frontend on GitHub Pages; Express API on Render, using the Atlas `wtwr_render` database. The VM-specific JavaScript, systemd units, and Nginx configuration are stored under `virtualbox/`; they are **not** Render startup commands. Do not reuse local VM environment secrets on Render.

**Limitations:** A one-time reboot and smoke tests establish startup and route availability, not continuous uptime, backup recovery, end-to-end authenticated writes, or host-enforced internet isolation. See the [runbook](04-verification-and-runbook.md) and [VM checkpoint log](virtualbox/05-vm-application-deployment.md) for evidence and outstanding items.

**Deployment-specific files included:** `virtualbox/scripts/healthcheck.js`, `virtualbox/systemd/wtwr-healthcheck.{service,timer}`, and `virtualbox/nginx/wtwr-vm-api.conf`. These are actual GitHub-tracked configurations; the prior unused assistant-drafted `vm-healthcheck.js` was removed. The private `.env.local` is intentionally excluded.

## Using this folder

This archive's top level is `deployment/`. Extract it into the repository's `docs/` directory so that the result is `se_project_express/docs/deployment/`. **Do not extract it inside an existing `docs/deployment/` folder**, which would recreate the unwanted nesting. Review changes with `git status` and `git diff` before committing. Keep all environment secrets out of Git.

Historical errors and troubleshooting evidence belong in the dated checkpoint logs, but temporary ZIP cleanup work is intentionally excluded from the server tutorial.
