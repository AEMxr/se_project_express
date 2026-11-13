# TripleTen Sprint 15 — Deployment Documentation Package

**Documentation maintained through November 12, 2026 Pacific** from the supplied historical VM log and verified setup/deployment checkpoints. This is a **draft for review**, not yet committed to GitHub. The October 31 Windows inspection found a NAT localhost-reachability mismatch (`1`). The user subsequently shut the VM down and **verified that the saved setting was corrected to `0`**, with localhost-only SSH forwarding preserved. The user then restarted the VM and verified SSH connectivity, the running kernel, and the NAT restriction persisted after reboot. **Post-boot guest UFW rules, SSH service, DNS resolver and Git checkout were also verified** (checkpoint 15AL). A subsequent database pre-installation readiness check (15AM) verified UFW default-deny policy, disk and RAM headroom, and no `mongod` executable; see section 05.

This guide is part of `docs/deployment/virtualbox/` in the Express repository. The companion Render guide is under `../render/`, and the shared verification runbook is at `../04-verification-and-runbook.md`.



## Latest checkpoint — 15AT.11: Express listening address (verified)

On November 12 Pacific / November 13 UTC the user ran `sudo ss -lntp | grep ':3001'` and observed `LISTEN ... *:3001 ... node ... pid=4633`. **Express is bound to a wildcard guest listening address**, not restricted to `127.0.0.1`. This is not evidence of public internet reachability: the VirtualBox NAT configuration includes only the localhost SSH forward, and guest UFW default-denies unsolicited incoming connections, subject to separately verifying the current complete firewall rules. See section 05 and the new listener screenshot. **Do not add host/router forwards or open guest port 3001.** Before Nginx, decide whether to make the Express listen host configurable (lab `127.0.0.1`, cloud Render `0.0.0.0`); the source code has **not** been changed.

The user requested a **JavaScript-first automated health-check workflow**. An assistant-generated standalone draft was **prepared but not adopted or executed on Ubuntu**, at [`scripts/vm-healthcheck.js`](scripts/vm-healthcheck.js). It checks MongoDB active/enabled, PM2 process online, listening socket and local `/` + `/items` HTTP responses without requiring a Python runtime or displaying secrets. It is not yet installed in the Ubuntu checkout, scheduled at boot, or verified against the live guest. Startup automation must be configured separately with `systemd` for MongoDB and PM2 startup/save for Express. **Next:** develop a replacement JavaScript checker collaboratively, decide the Express listener restriction, then configure and test PM2 boot persistence.

## November 12, 2026 Pacific — reboot/network-move recovery (checkpoints 15AT.3–15AT.8)

After relocating to another household network and rebooting the VM, the user verified that the VirtualBox NAT guest still had `enp0s3` address `10.0.2.15/24`. Initial local HTTP requests to port 3000 and to Express port 3001 failed with `curl: (7) Failed to connect`. `pm2 list` started a fresh user daemon but showed no applications. MongoDB was `inactive` and `disabled`. The user manually started MongoDB, verified `active`, enabled it for future boots and confirmed `enabled`. The user then restored the Express app under PM2 as `aem`, again saw `online` with zero restarts, and observed fresh logs `MongoDB connected` and `Server listening on port 3001`. **A subsequent root-endpoint HTTP test passed (`HTTP/1.1 200 OK`, `{"status":"ok"}`) at checkpoint 15AT.9. `/items`, the listener interface, PM2 save/startup and actual reboot-persistence tests remain pending.** Five new screenshots are included; see [05 — Recovery checkpoints](05-vm-application-deployment.md).

**Verified since that earlier snapshot:** `/items` returned HTTP 200 and `[]`; listener inspection found `*:3001`. Next: collaboratively implement JavaScript health checks and verify PM2 boot persistence with a controlled reboot. No network ports were opened. Portability/export-to-external-SSD is a future design/documentation goal, not a completed implementation.

## Reading order

1. [01 — VirtualBox and historical pre-boot security baseline](01-virtual-machine.md)
2. [02 — Ubuntu operations and backend tests](02-ubuntu-operations.md)
3. [03 — Render, GitHub Pages and MongoDB Atlas deployment](../render/03-cloud-deployment.md)
4. [04 — Verification, risks and recovery runbook](../04-verification-and-runbook.md)
5. [05 — Private VM application deployment log](05-vm-application-deployment.md)

## Quick outcomes

| Area | Result |
|---|---|
| Ubuntu 24.04.5 VM | Bootable, encrypted LUKS/LVM installation, SSH and firewall/DNS configuration recorded |
| Backend tests | 286/286 passed on Windows and Ubuntu |
| Express API | Live at https://wtwr-express-api.onrender.com/ |
| React frontend | Live at https://aemxr.github.io/se_project_react/ |
| Database | Atlas `wtwr_render` with scoped `wtwr_render_app` user; creation/persistence verified |
| Current VM checkpoint | 2026-10-31: post-boot SSH/NAT/UFW/DNS/Git verified; **15AM read-only preflight verified** UFW default deny in/out, root 30G free, memory 3.4Gi available, and `mongod` not found; **15AM.1/15AN verified:** guest AVX, release `noble`, curl and gpg present; `dpkg` typo corrected, architecture `amd64`; **15AO verified:** MongoDB 8.0 public key downloaded and fingerprint inspected; **15AP verified:** ASCII key dearmored, scoped keyring installed and fingerprint verified; **15AQ verified:** official MongoDB 8.0 Noble `signed-by` APT source added and inspected; **15AR verified:** APT successfully fetched MongoDB 8.0 signed metadata and amd64 package index without errors; **15AS verified:** APT simulation selected MongoDB 8.0.34, 9 new packages, no removals; **15AS.1 installed:** MongoDB server 8.0.34 and shell 2.14.1; service inactive as intended; 15AS.2 verified `ii` package status for mongodb-org, mongodb-org-server and mongodb-mongosh, and configured loopback-only binding `127.0.0.1:27017`; 15AS.3 verified `mongod` active and localhost-only with successful ping; 15AS.4 verified `.env.local` was Git-ignored and initially lacked `MONGODB_URI`; **15AS.5 user-confirmed** guest-local `wtwr_vm_lab` URI, `600` permissions and `origin/main` Git status; Mongoose connection verified in checkpoint 15AS.6 (`Connected: wtwr_vm_lab`); MongoDB boot enablement is verified; actual reboot persistence remains untested |
| PM2 installation | **15AT.0** discovered version `7.1.1`; **15AT.1 verified** global installation, `/usr/bin/pm2`, first daemon startup under `aem`; **15AT.2 verified:** `wtwr-vm-api` online under `aem`, Express connected to the local database and listening on port 3001. Root HTTP smoke test passed at 15AT.9; `/items` returned HTTP 200 and empty JSON array at 15AT.10; wildcard listener `*:3001` verified; PM2 boot persistence pending. |
| Pending | Express loopback-binding policy decision, Nginx, local app recovery tests, guest MongoDB authorization/boot persistence, backup restore, credential rotation and rubric review |

## How to keep this package current

After each successful (or failed) manual Ubuntu checkpoint, record the exact command and observed result in **05**, then update the status matrix in **04**. Update this ZIP from its package root, preserving paths. The cloud deployment is functional; the private VM application phase is still pending. **No one should infer that simply creating a planned-checkpoint entry means the command was executed.** As of 15AT.2, MongoDB 8.0.34 has a verified loopback-only active listener and working local ping. The guest `.env.local` is Git-ignored, and the user has verified the new `MONGODB_URI` target (`wtwr_vm_lab`) and file mode `600` (15AS.5); authorization decision, boot persistence, and durable lab data remain pending; app-level Mongoose connectivity passed 15AS.6. PM2 7.1.1 now manages the Express app successfully, with startup logs confirming MongoDB connection and port 3001; The root HTTP test passed at 15AT.9 and `/items` returned HTTP 200 with `[]` at 15AT.10; wildcard socket `*:3001` verified; PM2 boot persistence remains pending.

## Evidence integrity notes

The `images/` directory includes image assets from the user's earlier documentation ZIP plus a small set of later screenshots selected because they **do not visibly contain secrets**. Three historical image references not present in the original ZIP were matched against screenshot captures from the session; all Markdown image links now resolve inside this draft. The screenshot manifest notes provenance and limits. Before publishing publicly, inspect each image again for identifying data or credentials.

**Do not include secret values in issues, commits, or exported documentation.** The cloud database password previously appeared in a chat screenshot and has **not** been recorded in these drafts.

**HTTP checkpoint (15AT.10):** After recovery, `curl -i --max-time 5 http://127.0.0.1:3001/items` returned `HTTP/1.1 200 OK` with the empty JSON array `[]`. See section 05 and screenshot. The root health endpoint passed separately at 15AT.9. **Subsequently verified:** the listener was `*:3001` at 15AT.11. Nginx and PM2 boot autostart remain pending.

**v27 evidence addition:** `ubuntu-express-wildcard-listener-2026-11-12.png`; earlier draft `scripts/vm-healthcheck.js` (not approved, deployed, or executed; final version will be written collaboratively). Neither script execution nor PM2 auto-restoration has been verified yet.
