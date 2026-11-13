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

## Current verified state (November 12, 2026 Pacific)

The private VM has MongoDB enabled for future boots and Express running under PM2. Local `GET /` and `GET /items` both returned HTTP 200; Express is currently listening at `*:3001`, so a localhost-only binding remains a follow-up. **PM2 automatic boot restoration, Nginx, and a controlled reboot-persistence test are not yet verified.**

The public Render API and GitHub Pages frontend were verified separately using MongoDB Atlas. The VM-specific maintenance code is **not** part of Render startup.

A draft JavaScript health-check file is present at `virtualbox/scripts/vm-healthcheck.js` solely as an unapproved reference. The user intends to write and test the final version collaboratively. Do not treat the draft as deployed or configured.

## Using this folder

This archive's top level is `deployment/`. Extract it into the repository's `docs/` directory so that the result is `se_project_express/docs/deployment/`. **Do not extract it inside an existing `docs/deployment/` folder**, which would recreate the unwanted nesting. Review changes with `git status` and `git diff` before committing. Keep all environment secrets out of Git.

Historical errors and troubleshooting evidence belong in the dated checkpoint logs, but temporary ZIP cleanup work is intentionally excluded from the server tutorial.
