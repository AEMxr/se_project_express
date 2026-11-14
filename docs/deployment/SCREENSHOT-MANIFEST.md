# Screenshot manifest — updated November 13, 2026 Pacific

These image assets are copies of screenshots from the original documentation archive or later captured screenshots available in the Sprint 15 session. The three hardware screenshots missing from the original ZIP were matched by **visually inspecting the screenshots**, not by guessing from filenames. They depict *historical* settings, not necessarily current persisted state.

The current archive contains **56 image files**. Screenshot files are organized by environment: `virtualbox/images/` (54 images) and `render/images/` (2 images).

## Included images

- `github-pages-workflow-success.png`
- `render-mongodb-connected.png`
- `ubuntu-jest-286-tests-passed.png`
- `ubuntu-ufw-ssh-dns-git-verified-2026-10-31.png` (October 31 post-boot validation; user-supplied screenshot)
- `ubuntu-ufw-default-memory-disk-2026-10-31.png` (October 31 database-installation preflight, UFW verbose policy and resources; user-supplied screenshot)
- `ubuntu-mongodb-8-key-fingerprint-2026-10-31.png` (October 31 downloaded MongoDB 8.0 public GPG key fingerprint; no secrets; user-supplied screenshot)
- `ubuntu-mongodb-8-keyring-installed-2026-10-31.png` (October 31 MongoDB 8.0 dearmored GPG keyring installed and fingerprint verified; public key only; user-supplied screenshot)
- `ubuntu-mongodb-8-apt-repository-configured-2026-10-31.png` (October 31 MongoDB 8.0 Noble APT signed-by source created and cat verification; user-supplied screenshot)
- `ubuntu-mongodb-8-apt-update-verified-2026-10-31.png` (October 31 APT update fetching MongoDB 8.0 repository InRelease and amd64 Packages without errors; user-supplied screenshot)
- `ubuntu-mongodb-8-install-simulation-2026-10-31.png` (October 31 apt-cache policy listing and apt-get -s install mongodb-org; selected 8.0.34, 9 new packages, no removals; screenshot does not show the entire policy listing)
- `ubuntu-avx-prerequisites-typo-2026-10-31.png` (October 31 AVX and tool verification plus `dpkg` typo; user-supplied screenshot)
- `virtualbox-created-vm-summary.png`
- `virtualbox-hardware-verified.png`
- `virtualbox-installer-custom-setup.png`
- `virtualbox-invalid-settings-warning.png`
- `virtualbox-nat-settings.png`
- `virtualbox-network-device-hardening.png`
- `virtualbox-port-forwarding-empty.png`
- `virtualbox-secure-boot-key-reset-confirmation.png`
- `virtualbox-system-firmware-settings.png`
- `virtualbox-usb-disabled-unsaved.png`
- `virtualbox-vm-hardware.png`

- `ubuntu-mongodb-8-installed-inactive-2026-10-31.png` (October 31 local / November 1 UTC, successful MongoDB 8.0.34 install, server version, mistyped `dpkg -1` and `mongod` inactive; user-supplied screenshot)

- `ubuntu-mongodb-8-config-loopback-packages-2026-10-31.png` (installed MongoDB package verification and inspected `/etc/mongod.conf` showing `bindIp: 127.0.0.1`; no secrets; user-supplied screenshot)

- `ubuntu-mongodb-8-active-loopback-ping-2026-10-31.png` (verified service `active`, local socket `127.0.0.1:27017`, shell ping `1`; no secrets visible; user-supplied screenshot)

- `ubuntu-mongodb-app-env-presence-gitignored-2026-10-31.png` (15AS.4: `.env.local` contains no `MONGODB_URI=` line, `git check-ignore` recognizes the file; no secret values printed; user-supplied screenshot)

- `ubuntu-mongoose-multiline-typing-error-2026-10-31.png` (15AS.6: first manual multiline test failed with JavaScript SyntaxError; no database connection attempted, no sensitive values displayed. Final corrected success was reported as text.)

- `ubuntu-pm2-7.1.1-installed-2026-10-31.png` (October 31 local / November 1 UTC, installed PM2 CLI v7.1.1 and started unprivileged `aem` daemon; screenshot also contains non-sensitive npm update notice)

## Unresolved references

None. All Markdown image references in the package resolve to files.

## Privacy and evidence warning

Before publishing this draft in a public GitHub repository, visually review **every included image**. Never include `.env` files, JWT secrets, the Atlas database password, a complete Atlas URI, private SSH keys, or password-bearing screenshots. Historical screenshots may show early configurations that were later changed; label each observation with its date and verification step.

- `ubuntu-pm2-express-online-2026-10-31.png` — User screenshot showing PM2 `wtwr-vm-api` online, run as `aem`, restart count zero and log messages `MongoDB connected` and `Server listening on port 3001` (checkpoint 15AT.2, Oct. 31 Pacific/Nov. 1 UTC). No secret values visible.

## Added November 12, 2026 Pacific — recovery evidence

- `ubuntu-nat-enp0s3-verified-2026-11-12.png`: `ip -4 addr show enp0s3` reported `UP`, `10.0.2.15/24` after the physical network move.
- `ubuntu-curl-fail-pm2-empty-2026-11-12.png`: Curl tests to ports 3000/3001 failed; `pm2 list` launched its daemon but returned an empty process table.
- `ubuntu-mongod-enabled-2026-11-12.png`: Initially `inactive`/`disabled`; MongoDB started and became `active`; `systemctl enable mongod` created symlink. User separately confirmed `is-enabled` returned `enabled`.
- `ubuntu-pm2-express-restored-2026-11-12.png`: `wtwr-vm-api` online as `aem`, zero restarts, fresh November 13 UTC successful MongoDB connection and Express port 3001 startup logs.

The first four screenshots show configuration and application startup, **not** an unattended reboot. Subsequent November 13 screenshots establish PM2 startup, Nginx proxying and a complete controlled reboot; see the final section of this manifest.

## Added following checkpoint 15AT.9 — local HTTP evidence

- `ubuntu-express-root-http-200-2026-11-12.png`: Ubuntu curl to `http://127.0.0.1:3001/` returned `HTTP/1.1 200 OK` and `{"status":"ok"}` with security headers. Date header shows November 13 UTC; session occurred November 12 Pacific. Screenshot contains no visible passwords, environment variables or API keys. Does not establish other endpoints or reboot persistence.

## Added following checkpoint 15AT.10 — local clothing-list HTTP evidence

- `ubuntu-express-items-http-200-empty-2026-11-12.png`: Ubuntu curl to `http://127.0.0.1:3001/items` returned `HTTP/1.1 200 OK` and JSON body `[]` with security headers. The date header is November 13 UTC; user session was November 12 Pacific. No visible credentials. This does not prove authenticated routes, persistent data writes, PM2 boot recovery, or listening interface scope.


## Added following checkpoint 15AT.11 — Express socket address evidence

- `ubuntu-express-wildcard-listener-2026-11-12.png`: `sudo ss -lntp | grep ':3001'` shows Node PID 4633 listening at `*:3001` (wildcard guest address). No credentials shown. This does not prove outside connectivity or authorization, and it does not show a new configuration change.


## Added November 13, 2026 — PM2 persistence, monitoring, Nginx, and full reboot

These user-provided terminal screenshots are captured as PNGs under `virtualbox/images/`. Sensitive credentials are not included; before publishing to a public repository, visually audit images again.

| File | Verified event |
| --- | --- |
| `ubuntu-pm2-process-save-2026-11-13.png` | `pm2 save` persisted `wtwr-vm-api` configuration |
| `ubuntu-pm2-startup-generated-2026-11-13.png` | PM2 generated its systemd startup command |
| `ubuntu-pm2-startup-systemd-enabled-2026-11-13.png` | PM2 startup service installed/enabled for `aem` |
| `ubuntu-pm2-reboot-recovery-2026-11-13.png` | MongoDB and PM2 active post-reboot; Express online and responding |
| `ubuntu-js-healthcheck-failure-exit-2026-11-13.png` | Deliberate port-3999 failure returned exit code `1` |
| `ubuntu-js-healthcheck-timeout-2026-11-13.png` | 5-second request timeout in JS with successful 200 response |
| `ubuntu-healthcheck-git-sync-2026-11-13.png` | VS Code/GitHub JS script fast-forwarded to Ubuntu and checked |
| `ubuntu-healthcheck-systemd-timer-2026-11-13.png` | systemd service/timer installed; timer schedule shown |
| `ubuntu-healthcheck-journal-success-2026-11-13.png` | journal records 3/3 passing checker result |
| `ubuntu-nginx-installed-active-2026-11-13.png` | Nginx 1.24.0 installed and service active |
| `ubuntu-nginx-default-wildcard-listeners-2026-11-13.png` | Initial default Nginx page and wildcard sockets |
| `ubuntu-nginx-config-installed-default-link-2026-11-13.png` | VM proxy config installed; legacy enabled-site symlink inspected |
| `ubuntu-nginx-reload-stale-welcome-page-2026-11-13.png` | Initial reload left stale welcome page |
| `ubuntu-nginx-config-and-socket-mismatch-2026-11-13.png` | Nginx loaded config text did not match active sockets |
| `ubuntu-nginx-bind-address-in-use-2026-11-13.png` | Error log confirms bind conflict (`98: Address already in use`) |
| `ubuntu-nginx-localhost-reverse-proxy-2026-11-13.png` | Successful Nginx restart, loopback listener, proxied root 200 |
| `ubuntu-nginx-items-http-200-2026-11-13.png` | Proxied GET `/items` returned HTTP 200 and `[]` |
| `ubuntu-express-localhost-bind-2026-11-13.png` | Express now binds `127.0.0.1:3001` |
| `ubuntu-proxy-and-js-healthcheck-pass-2026-11-13.png` | Nginx root and 3/3 JS checker both successful after binding change |
| `ubuntu-full-stack-reboot-verified-2026-11-13.png` | Four units active after reboot; corrected curl and 3/3 JS checker pass |

**Provenance:** Original screenshots from conversation evidence and the prior deployment archive; newly included screenshots correspond to observed user-provided terminal output. Logs do not prove conditions they did not test (e.g., public network reachability or backup restoration). The final reboot screenshot shows a first mistyped curl URL followed by a successful corrected command; see the dated checkpoint for interpretation.
