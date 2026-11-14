# Sprint 15 — Verification Matrix and Recovery Runbook

> **October 31 host-side correction:** The initial check found `localhostReachable="1"`. After a shutdown, the user successfully restored the saved setting to `localhostReachable="0"` and confirmed `VMState="poweroff"` and localhost-only SSH forwarding. **Post-boot SSH access and `localhostReachable="0"` persistence were subsequently verified while the VM was running.** See [05-vm-application-deployment.md](virtualbox/05-vm-application-deployment.md).


> **Historical baseline:** October 31, 2026, updated through November 13. Dated pending items are preserved as history; use the latest status matrix in section 9.

> **Current verified result (Nov. 13, 2026 Pacific):** The private Ubuntu lab recovered all four components after a full controlled reboot: `mongod`, `pm2-aem`, `nginx`, and `wtwr-healthcheck.timer` reported `active`. Nginx at `127.0.0.1:80` returned `{"status":"ok"}` from Express, and the JavaScript checker reported **3/3 PASS** (Express, MongoDB, PM2). `GET /items` via Nginx returned 200 and `[]`. See [15AU–15AW dated checkpoint evidence](virtualbox/05-vm-application-deployment.md). Earlier "pending" lists below are dated snapshots and do **not** override this current status. This is a VM-local operational verification, not a final rubric assessment.

## 1. Completed checkpoints

| Area | Actual evidence | Status |
|---|---|---|
| Windows backend dependency patch | `body-parser` 2.4.0, production npm audit zero at check time | Verified |
| Windows backend regression | 14/14 suites, 286/286 tests, ESLint and Prettier passed | Verified |
| Ubuntu backend regression | Same 14/14 suites, 286/286 tests passed | Verified |
| Ubuntu SSH/patching | Localhost-only NAT SSH, public-key auth, patched boot, git/npm installed | Verified again October 31 after correction: SSH returned `aem`, `tripleten-project15`, kernel `6.8.0-147-generic` |
| October 31 NAT host-loopback correction | `poweroff`, `--nat-localhostreachable1 off`, saved `localhostReachable="0"`, SSH forward preserved; post-boot running `localhostReachable="0"` reverified | Verified after reboot, running |
| October 31 guest UFW/SSH/DNS/Git baseline | UFW active with ten expected rules; SSH `active`; DNS `10.0.2.3`; checkout `## main...origin/main` clean | Verified 15AL; host-enforced isolation not independently retested |
| October 31 database pre-installation resources | UFW default deny incoming/outgoing, routed disabled, `/` has 30G available; RAM 3.4Gi available, no `mongod` executable found | Verified checkpoint 15AM; AVX and release `noble` verified 15AM.1; corrected `dpkg --print-architecture` returned `amd64`; MongoDB 8.0 signing key, scoped keyring, official APT repository, and successful package-index refresh verified (15AO–15AR); installation simulation passed (15AS: 9 new, 0 removed); MongoDB 8.0.34 installed (15AS.1), `mongod` was inactive; 15AS.2 confirmed package statuses `ii` and `/etc/mongod.conf` binding `127.0.0.1:27017`; 15AS.3 confirmed running service, loopback-only listening socket, and local ping; 15AS.4 confirmed `.env.local` Git-ignored and initially no `MONGODB_URI`; 15AS.5 user-reported local `wtwr_vm_lab` URI with `600` file mode and clean Git tracking; Mongoose connection verified 15AS.6 (`Connected: wtwr_vm_lab`); as of Nov 12, mongod manually restarted and `enabled`, reboot verification pending |
| Public Render | Build, MongoDB connection, HTTP 200 root and `/items` | Verified |
| GitHub Pages | Verify + Publish jobs successful, frontend visible in browsers | Verified |
| Cloud database write/read | Registration, item creation, Data Explorer record, refresh persistence | Verified |
| Weather/UI | Weather and wardrobe recommendation visible in late screenshot | Observed |


### November 12 Pacific / November 13 UTC — VM restart and relocated-network recovery (15AT.3–15AT.8)

- Verified network interface `enp0s3` remained `UP` with `inet 10.0.2.15/24` despite moving to grandparents' internet; this is guest NAT addressing, not the external router's assigned IP. **No conclusion about unrestricted internet access or host-enforced isolation follows.**
- Before recovery, read-only `curl -i --max-time 5 http://127.0.0.1:3000` and equivalent port `3001` test returned curl error 7, connection refused/no listener.
- `pm2 list` showed a new user daemon and an **empty process table**; the Express application was not restored.
- `systemctl is-active mongod; systemctl is-enabled mongod` returned `inactive` then `disabled`.
- `sudo systemctl start mongod` followed by `systemctl is-active mongod` returned `active`. `sudo systemctl enable mongod` created a symlink into `multi-user.target.wants`; `systemctl is-enabled mongod` returned `enabled`. **A further reboot is required to verify persistence empirically.**
- `pm2 start app.js --name wtwr-vm-api --time`, `pm2 list`, and `pm2 logs wtwr-vm-api --lines 10 --nostream` showed status `online` under `aem`, zero PM2 restarts and fresh application messages `MongoDB connected` and `Server listening on port 3001`.
- **Outstanding:** HTTP verification *after* recovery; socket binding; PM2 `save` and `startup` under `aem`; start ordering/retry; controlled full reboot; Nginx.

Screenshots: [network](virtualbox/images/ubuntu-nat-enp0s3-verified-2026-11-12.png), [empty PM2](virtualbox/images/ubuntu-curl-fail-pm2-empty-2026-11-12.png), [MongoDB recovery](virtualbox/images/ubuntu-mongod-enabled-2026-11-12.png), [Express recovery](virtualbox/images/ubuntu-pm2-express-restored-2026-11-12.png).

## 2. Historical priorities and unresolved risks (initial list; November 13 updates in section 9)

1. **Credential exposure:** Rotate the previously displayed `wtwr_render_app` Atlas password. Update secret `MONGODB_URI` in Render without revealing its value. Verify connections with the new password, and if feasible verify the old password no longer authenticates. User previously declined rotation; this remains unresolved, not silently remediated.
2. **Record deployment evidence:** Save redacted screenshots of service configuration, successful Render logs, GitHub Pages workflow, Atlas role/scope, and database document counts. Avoid screenshots with secret fields revealed.
3. **Public application smoke test:** Logged-out browsing, signup, signin, `users/me`, item add/like/unlike/delete, ownership restrictions, logout/login/refresh; weather, error and retry states. Use disposable test accounts/items and clean them up deliberately.
4. **VM PM2/Nginx lab:** Decide the VM backend's *isolated* database strategy before running real Express; install/configure PM2, use Nginx on guest loopback, serve built React, test process restart/reboot. Don't expose home router or LAN ports.
5. **Infrastructure tests:** Check reverse-proxy forwarding, trusted IP headers/rate limit isolation, SSH/UFW/DNS, DB failure/recovery, process startup, and root health semantics.
6. **Backup and recovery:** Verify an Atlas backup policy; perform controlled isolated restore with sample data, not the live user database. Verify restoration by document IDs/counts and data integrity.
7. **Course rubric:** Compare the approved Render alternative with each required Google Cloud VM exercise. Confirm whether local VM lab evidence is accepted for VM-specific requirements. Document any gaps.
8. **CI maintenance:** Review Node 22 CI vs Node 24 deployment; investigate full dev-dependency audit findings, GitHub action runtime warnings and Ubuntu runner image changes.

## 3. Read-only smoke checks for the live cloud service

From a Windows Git Bash terminal (no API credentials needed):

```bash
curl.exe -i 'https://wtwr-express-api.onrender.com/'
curl.exe -i 'https://wtwr-express-api.onrender.com/items?verify=1'
```

Expected *when the service is awake*: HTTP 200, JSON `{ "status": "ok" }` for root and JSON array for `/items`. The array may now contain created clothing records; do **not** hardcode `[]` as the expected result after data creation.

**Avoid automated high-frequency polling:** Free Render services may spin down; a first request may exceed the frontend's 15-second timeout. Do not infer deployment failure from a single cold-start timeout.

## 4. Read-only VM smoke checks (after boot/unlock)

```bash
uname -r
cat /etc/os-release
sudo ufw status numbered
resolvectl status enp0s3
ss -lntp
git -C ~/projects/se_project_express status --short --branch
git -C ~/projects/se_project_express log -1 --oneline
```

From Windows PowerShell after the guest has booted and SSH is available:

```powershell
ssh -i "$HOME\.ssh\tripleten-project15_ed25519" -p 2222 `
  -o IdentitiesOnly=yes -o PreferredAuthentications=publickey `
  -o PasswordAuthentication=no -o KbdInteractiveAuthentication=no `
  aem@127.0.0.1 'whoami; hostname; uname -r'
```

These commands gather evidence and do not intentionally reconfigure the system. `sudo` may require the guest user's local password, which must **not** be recorded.

## 5. Deployment verification after a code change

- Check the Git commit SHA against the expected deployment; a successful Pages deployment does not automatically prove the backend deployed the same source revision.
- Backend: Windows changes → lint/format/tests/audit → commit/push → Render auto/manual deploy → review logs, HTTP health and database operations.
- Frontend: GitHub Actions `Frontend checks` → `verify` → `Publish the verified frontend`; confirm repository Actions **variable** `VITE_API_BASE_URL` is correct before building.
- Use a test account that does not contain personal secrets; inspect real browser Network requests and CORS failures if they occur.
- Validate changes against authorization errors and data isolation; a 200 on `/` does not imply protected routes work.

## 6. Recovery and safe troubleshooting

| Symptom | First investigation | Avoid |
|---|---|---|
| Render cannot connect to Atlas | Render Logs, Atlas IP Access List, DNS, URI database path and user role | `0.0.0.0/0` blanket exposure or admin credentials |
| MongoDB connected but `/items` returns 500 | Correct `wtwr_render` path, `authSource`, `readWrite@wtwr_render`; inspect **redacted** error name | Broadening database roles to admin |
| Backend succeeds but frontend times out | Render free cold start, 15-second frontend timeout, Network panel | Assuming all timeouts are CORS failures |
| Frontend loads but weather unavailable | Backend-only OpenWeather key, backend `/weather`, provider response, location permission | Adding API key to Vite `VITE_` variables |
| Avatar initial instead of image | Test direct public image URL; inspect browser network/CSP/hotlink restrictions | Exposing avatar URLs requiring private tokens |
| Unmatched route returns 404 | Identify actual URL in browser Network panel | Equating 404 with database outage |
| VM network unavailable | Adapter cable, NAT DNS, resolver and UFW order | Disabling firewall or opening ports broadly |
| VM boot freeze | Check VirtualBox 1-vCPU configuration and VBS/NEM constraints | Disabling Windows host security without analysis |

## 7. Evidence requirements for student submission

Attach redacted screenshots / text showing:

- VM hardware and isolation-related settings, guest version, SSH configuration and local forwarding.
- `uname -r`, services, UFW, DNS and package-update evidence.
- Backend test summary (286 passed), npm audit and dependency patch commit.
- Render build success, Express listening and Atlas connection; public API requests.
- Atlas user role `readWrite@wtwr_render`, relevant IP allowlist entries, no credentials exposed.
- Pages Actions `verify` and `publish`, published frontend link.
- End-to-end registration, clothing item in Atlas and frontend, refresh persistence, live weather screenshot.
- Later PM2/Nginx, restart and recovery evidence once **actually completed**.

### Screenshots and privacy hygiene

Never add `.env.local`, API keys, database passwords, JWT secrets, private SSH keys, or unredacted password-bearing screenshots to GitHub. A screenshot of a connection string can expose an entire database credential even if other fields are hidden. Scrub output and check every image before committing a public repository.

## 8. Earlier recommended checkpoints (historical)

**The VM has passed post-boot NAT/SSH/UFW/DNS/Git and the database resource/default-firewall preflight (15AM).** The guest AVX, `noble`, `amd64`, curl and gpg checks passed. MongoDB's 8.0 release key was inspected, the scoped binary keyring was installed, the official Noble APT source was configured, and `apt-get update` retrieved its metadata/package indexes without error (15AO–15AR). **Completed (15AS.3):** MongoDB service started successfully, `systemctl is-active mongod` returned `active`, `ss` confirmed the loopback-only `127.0.0.1:27017` listening socket, and `mongosh` ping returned `1`. Installed MongoDB is 8.0.34. **Next:** app-level Mongoose connection succeeded against `wtwr_vm_lab` (15AS.6), and PM2 now supervises Express (15AT.2), with verified MongoDB startup and port 3001 messages. The next verification is guest-local HTTP and interface binding, followed by database authorization, boot persistence, Nginx, restore testing, and rubric review. `security.authorization` was not enabled in the inspected default configuration. Production Atlas remains separate and unchanged.

### October 31, 2026 — PM2 discovery (15AT.0)

Read-only guest checks confirmed `pm2` was not installed and npm reports latest version `7.1.1`. Version/path validation and global installation were subsequently completed at 15AT.1. The Express service was subsequently started under PM2 (15AT.2). See checkpoint log `05-vm-application-deployment.md`.

### October 31, 2026 — PM2 installation verification (15AT.1)

Ubuntu successfully installed `pm2@7.1.1` using `sudo npm install -g pm2@7.1.1`. The user verified `pm2 --version` printed `7.1.1`, first invocation launched a PM2 daemon using `/home/aem/.pm2`, and `command -v pm2` returned `/usr/bin/pm2`. Screenshot in section 05. **Installation and daemon startup were verified at 15AT.1.** Express process supervision was subsequently verified at 15AT.2. HTTP responses, recovery-on-failure, persistence after reboot and Nginx remain pending. This package does not claim any of those are complete.

### October 31, 2026 — PM2 application startup (15AT.2)

Verified PM2 managed `wtwr-vm-api` as `aem` in fork mode, showing `online` with initial restart count zero. Express logged `MongoDB connected` and `Server listening on port 3001`. Evidence: `virtualbox/05-vm-application-deployment.md` and `virtualbox/images/ubuntu-pm2-express-online-2026-10-31.png`. This is **not yet proof** of a successful local HTTP response, loopback-only Express binding, Nginx, auto-start after reboot, or recovery from a failure. Next perform the read-only `/`, `/items` and `ss` checks.

### November 12, 2026 Pacific — Express root HTTP response (15AT.9)

Following recovery from a reboot on another household network, the user executed `curl -i --max-time 5 http://127.0.0.1:3001/` in the guest. HTTP returned `200 OK`, `Content-Type: application/json; charset=utf-8` and `{"status":"ok"}`. Headers included the app's security middleware headers. Screenshot: [root HTTP smoke-test evidence](virtualbox/images/ubuntu-express-root-http-200-2026-11-12.png). This proves local HTTP health response only. `/items`, socket binding, PM2 auto-start/reboot, and Nginx remain unverified.

### November 12, 2026 Pacific — Express `/items` HTTP response (15AT.10)

After successful PM2 and MongoDB manual restoration and the root HTTP test, the user executed:

```bash
curl -i --max-time 5 http://127.0.0.1:3001/items
```

**Observed:** `HTTP/1.1 200 OK`, JSON content type, body `[]`, and security response headers. The empty array is consistent with a new, unpopulated lab collection. This verifies an unauthenticated local clothing-list response, **not** end-to-end authenticated read/write, persistence across reboot, or a particular socket binding. Screenshot: [items HTTP response evidence](virtualbox/images/ubuntu-express-items-http-200-empty-2026-11-12.png).

**Next:** Inspect `sudo ss -lntp | grep ':3001'` for actual listening address before configuring PM2 auto-start and Nginx.


### 15AT.11–12 — Listener verified; JS health check staged (November 12 Pacific)

- **Verified:** `ss -lntp` showed Node listening on `*:3001` (wildcard guest interface). This is **not evidence of external reachability**; host NAT and UFW are distinct controls. Screenshot in section 05.
- **Not yet completed:** Restrict Express to lab loopback if appropriate, PM2 saved process list, PM2 systemd startup integration, reboot persistence test, and Nginx.
- **Prepared only:** `scripts/vm-healthcheck.js` checks service status, socket, and both local GET routes. It has not been run in Ubuntu or scheduled at boot. No Python dependency. Do not claim its checks passed until the user provides output.

**Operational separation:** `systemd` starts MongoDB on boot (verified enabled); PM2 must be configured to restore Express and manage failure/restart; JavaScript health checks report status and may later run via `systemd` on a delayed schedule. A health check alone cannot resurrect the application.


## 9. November 13 operational verification — current guidance

### Verified matrix

| Area | Check performed | Observed result |
| --- | --- | --- |
| MongoDB startup | `systemctl is-active mongod` after reboot | `active` |
| PM2 startup | `systemctl is-active pm2-aem`; `pm2 list` | `active`; `wtwr-vm-api` online |
| Nginx startup | `systemctl is-active nginx` after reboot | `active` |
| Timer persistence | `systemctl is-active wtwr-healthcheck.timer` after reboot | `active` |
| Nginx root | `curl -sS http://127.0.0.1/` | `{"status":"ok"}` |
| Nginx database-backed read | `curl -sS -i http://127.0.0.1/items` before final reboot | `HTTP/1.1 200 OK`, `[]` |
| Node health check | `node docs/deployment/virtualbox/scripts/healthcheck.js` | 3/3 PASS |
| Express bind | `ss -lntp` | `127.0.0.1:3001` |
| Nginx bind | `ss -lntp` | `127.0.0.1:80` |
| MongoDB bind | `ss -lntp` earlier | `127.0.0.1:27017` |

### Routine check (run inside the Ubuntu VM)

```bash
systemctl is-active mongod pm2-aem nginx wtwr-healthcheck.timer
node ~/projects/se_project_express/docs/deployment/virtualbox/scripts/healthcheck.js
curl -sS --max-time 5 http://127.0.0.1/
systemctl list-timers --all wtwr-healthcheck.timer
journalctl -u wtwr-healthcheck.service -n 20 --no-pager
```

The timer runs a one-shot JS check, not a repair loop. If the timer is active but a check fails, inspect its journal and the relevant service (`systemctl status mongod`, `systemctl status pm2-aem`, `systemctl status nginx`, or `pm2 logs wtwr-vm-api`). Do not unnecessarily change firewall/NAT policy or expose localhost services.

**Deployment files:** [`virtualbox/scripts/healthcheck.js`](virtualbox/scripts/healthcheck.js), [`virtualbox/systemd/wtwr-healthcheck.service`](virtualbox/systemd/wtwr-healthcheck.service), [`virtualbox/systemd/wtwr-healthcheck.timer`](virtualbox/systemd/wtwr-healthcheck.timer), [`virtualbox/nginx/wtwr-vm-api.conf`](virtualbox/nginx/wtwr-vm-api.conf). Do not start these units on Render.

### Remaining work before final submission (NOT VERIFIED)

- Compare the actual TripleTen Sprint 15 rubric with the deployed backend/frontend and demonstration requirements. Do not infer acceptance from these operational checks alone.
- Assess whether the assignment requires the frontend to be served from VM Nginx in addition to the public GitHub Pages deployment; only API proxying has been verified locally.
- Test authenticated create/update/delete and data persistence with disposable VM-only records if required; the `/items` read test by itself is not a full database lifecycle test.
- Test host/hypervisor isolation, backup restoration and recovery separately if required by the rubric; guest UFW and NAT are not proof of host-enforced isolation.
- Apply Ubuntu updates in a scheduled maintenance window and recheck health. Cloud credential exposure/rotation remains an acknowledged separate security issue, not resolved by VM hardening.

Historical observations remain in earlier sections for traceability. The late November 12 notes referring to PM2, reboot, Nginx and listener isolation as pending are now superseded by November 13 screenshots and evidence.
