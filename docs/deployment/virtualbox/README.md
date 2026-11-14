# Sprint 15 — VirtualBox / Ubuntu Private Server

**Last verified:** November 13, 2026 (Pacific). This directory documents the **private Ubuntu VM lab**, not the public Render deployment.

## Current operational status

| Component | Configuration | Observed verification |
| --- | --- | --- |
| Ubuntu VM | Ubuntu Server 24.04.5 LTS, VirtualBox NAT (`enp0s3` = `10.0.2.15`) | Booted after move to a different household network; kernel 6.8.0-149 at final reboot |
| SSH | Windows localhost port `2222` forwarded to VM SSH | Previously verified with ED25519 key; no public router forwarding |
| Firewall | UFW default-deny guest policy | Previously inspected; host isolation still requires separate verification |
| MongoDB | Community Server 8.0.34, `127.0.0.1:27017`, `wtwr_vm_lab` | Service active after reboot; database ping and app connection previously passed |
| PM2 | Process `wtwr-vm-api` as non-root `aem`; `pm2-aem` systemd service | Active after reboot; application restored and online |
| Express | Node 24, `BIND_HOST=127.0.0.1`, port `3001` | Root and `/items` returned HTTP 200; backend listening loopback-only |
| Nginx | 1.24.0, `127.0.0.1:80` → `127.0.0.1:3001` | Active after reboot; proxied root and `/items` returned HTTP 200 |
| Health monitoring | `healthcheck.js` + systemd oneshot/timer, checks API/MongoDB/PM2 | Timer active after reboot; journaled 3/3 PASS results; a manual 3/3 PASS after reboot |

**Full reboot test:** `systemctl is-active mongod pm2-aem nginx wtwr-healthcheck.timer` returned four lines of `active`; `curl -sS http://127.0.0.1/` returned `{"status":"ok"}`; `node .../scripts/healthcheck.js` returned 3/3 checks passed. This is a real reboot verification, not merely an enabled startup setting. See [15AW evidence](05-vm-application-deployment.md).

## Read these guides

1. [01 — VirtualBox VM setup and security](01-virtual-machine.md)
2. [02 — Ubuntu operations and backend tests](02-ubuntu-operations.md)
3. [05 — Database, PM2, health monitoring, Nginx and reboot checkpoint log](05-vm-application-deployment.md)
4. [Shared verification and recovery runbook](../04-verification-and-runbook.md)
5. [Render deployment (separate public environment)](../render/03-cloud-deployment.md)
6. [Screenshot manifest](../SCREENSHOT-MANIFEST.md)

The deployment log preserves earlier incomplete stages, mistakes, commands, and troubleshooting evidence as dated history; its [November 13 continuation](05-vm-application-deployment.md) provides the current state.

## VM-only operational files

- [`scripts/healthcheck.js`](scripts/healthcheck.js) — project-authored checker using the existing `mongoose` dependency and Node built-ins; runs in the VM repository checkout; detects failure with a nonzero exit code. It does **not** modify services.
- [`systemd/wtwr-healthcheck.service`](systemd/wtwr-healthcheck.service) — one-shot health-check invocation as `aem` using an **installation-specific** home directory and path.
- [`systemd/wtwr-healthcheck.timer`](systemd/wtwr-healthcheck.timer) — schedule after boot and every five minutes following execution.
- [`nginx/wtwr-vm-api.conf`](nginx/wtwr-vm-api.conf) — loopback-only reverse-proxy server block, installed under `/etc/nginx/conf.d/`.
- [`images/`](images/) — user-provided evidence screenshots of actual operations.

Changes were developed on Windows in VS Code, committed and pushed to GitHub, and pulled on Ubuntu using `git pull --ff-only origin main`. The application code remains shared with Render; the VM uses private `.env.local` with `BIND_HOST=127.0.0.1` and a local MongoDB URI. Do not commit `.env.local` or copy its JWT secret to another environment.

## Daily checks

From the Ubuntu VM:

```bash
systemctl is-active mongod pm2-aem nginx wtwr-healthcheck.timer
node ~/projects/se_project_express/docs/deployment/virtualbox/scripts/healthcheck.js
curl -sS --max-time 5 http://127.0.0.1/
systemctl list-timers --all wtwr-healthcheck.timer
journalctl -u wtwr-healthcheck.service -n 20 --no-pager
```

No daily manual service starts are expected when boot recovery is healthy. LUKS disk unlocking is still interactive during startup.

## Boundaries and remaining work

- **Render is separate:** Public API and Atlas `wtwr_render` are **not** controlled by the VM's systemd, Nginx, or PM2 configurations.
- **Network isolation:** Local sockets, VirtualBox NAT and guest UFW help restrict exposure. These do not alone prove the Windows host or physical LAN cannot reach the guest. No HTTP/MongoDB port forwards were configured in this lab.
- **No guaranteed uptime:** Monitoring writes status into the journal but is not remote alerting or auto-repair. Nginx/PM2/DB all recovered in the observed controlled reboot; future failures remain possible.
- **Submission gaps to check:** Compare actual TripleTen Sprint 15 instructions with evidence, especially whether serving built React locally from Nginx is mandatory, authenticated CRUD checks, backup/restore, and the expected deployment demonstration.
- **Portability:** VirtualBox NAT survived a change of home Wi-Fi; external SSD export/import is an untested future requirement, not currently implemented.

The temporary cleanup of nested downloaded ZIP directories is intentionally excluded from the deployment tutorial.
