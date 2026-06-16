# BlackTor Sub2API Deployment Notes

This fork keeps BlackTor's local changes on top of the upstream Sub2API source.

## Repository Layout

- `origin`: `https://github.com/BlackTor-tor/sub2api-prod.git`
- `upstream`: `https://github.com/Wei-Shaw/sub2api.git`
- Main working branch: `main`

The `main` branch contains the upstream source plus BlackTor's local payment display currency change.

## Current Production Deployment

The current server is not running Sub2API through Docker.

Production is a systemd binary deployment:

- Server: `13.222.189.234`
- SSH entry user: `ec2-user`
- Privileged operations: run through `sudo su -`
- Service: `sub2api.service`
- Working directory: `/opt/sub2api`
- Binary path: `/opt/sub2api/sub2api`
- Config/data path: `/opt/sub2api/config.yaml` and `/opt/sub2api/data`
- Service listens on: `127.0.0.1:5500`

Do not overwrite `config.yaml` or `data/` during deployment.

## Upgrade From Upstream

Use this when `Wei-Shaw/sub2api` has a new version and the local BlackTor change should be preserved.

```bash
git switch main
git fetch upstream
git rebase upstream/main
```

If there are conflicts, resolve them, then continue:

```bash
git status
git add <resolved-files>
git rebase --continue
```

After verification, push the updated fork:

```bash
git push origin main
```

If the rebase rewrites local commits that were already pushed, use:

```bash
git push --force-with-lease origin main
```

Do not use `git reset --hard upstream/main` unless you intentionally want to remove BlackTor's local changes.

## Local Verification

Run the payment-focused tests after upgrading or changing payment code:

```bash
pnpm --dir frontend exec vitest run \
  src/components/payment/__tests__/currency.spec.ts \
  src/components/payment/__tests__/SubscriptionPlanCard.spec.ts \
  src/components/payment/__tests__/PaymentStatusPanel.spec.ts \
  src/components/payment/__tests__/paymentFlow.spec.ts
```

Run frontend typecheck and build:

```bash
pnpm --dir frontend exec vue-tsc --noEmit
pnpm --dir frontend exec vite build
```

Run the payment config backend tests with Docker if Go is not installed locally:

```bash
docker run --rm \
  -v "E:/Projects/Agent_CRM/_tmp_sub2api_src:/src:ro" \
  -w /src/backend \
  golang:1.26.4-alpine \
  sh -c 'go test ./internal/service -run "Test(ParsePaymentConfig|UpdatePaymentConfig_PersistsDisplayCurrency|GetPaymentConfigKeepsStoredEnabledTypes)$"'
```

Note: local `pnpm` may rewrite `frontend/pnpm-lock.yaml` metadata. If the lockfile only changed because of pnpm warnings or deprecated metadata, restore it before committing:

```bash
git restore -- frontend/pnpm-lock.yaml
```

## Build Linux Binary

First build frontend assets into `backend/internal/web/dist`:

```bash
pnpm --dir frontend exec vue-tsc --noEmit
pnpm --dir frontend exec vite build
```

Then build the Linux release binary in Docker:

```bash
docker run --rm \
  -v "E:/Projects/Agent_CRM/_tmp_sub2api_src:/src" \
  -w /src/backend \
  golang:1.26.4-alpine \
  sh -c 'apk add --no-cache git ca-certificates tzdata >/dev/null && VERSION=$(cat ./cmd/server/VERSION | tr -d "\r\n") && DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ) && CGO_ENABLED=0 GOOS=linux go build -tags embed -ldflags="-s -w -X main.Version=$VERSION -X main.Commit=blacktor-main -X main.Date=$DATE -X main.BuildType=release" -trimpath -o /src/backend/bin/server ./cmd/server'
```

Check the binary:

```bash
Get-FileHash -Algorithm SHA256 -LiteralPath backend/bin/server
```

## Deploy To Production

The original key path used for the server is:

```text
E:\BaiduSyncdisk\工作\森识\aws.pem
```

OpenSSH on Windows may reject this file if its ACL is too broad. Use a temporary copy with restricted ACLs, and delete the copy after deployment.

Upload the binary or a gzip-compressed binary to the server:

```bash
scp -i <restricted-temp-pem> backend/bin/server ec2-user@13.222.189.234:/home/ec2-user/sub2api-new
```

Replace the production binary as root:

```bash
ssh -i <restricted-temp-pem> ec2-user@13.222.189.234
sudo su -

set -e
stamp=$(date +%Y%m%d%H%M%S)
backup="/opt/sub2api/sub2api.backup-$stamp"

cp -a /opt/sub2api/sub2api "$backup"
install -o sub2api -g sub2api -m 755 /home/ec2-user/sub2api-new /opt/sub2api/sub2api
systemctl restart sub2api
systemctl is-active sub2api
curl -sS http://127.0.0.1:5500/health
journalctl -u sub2api -n 100 --no-pager
```

Expected health response:

```json
{"status":"ok"}
```

Clean upload artifacts after verification:

```bash
rm -f /home/ec2-user/sub2api-new /tmp/sub2api-codex-server
```

## Rollback

If the new binary fails, restore the most recent backup:

```bash
sudo su -
systemctl stop sub2api
cp -a /opt/sub2api/sub2api.backup-YYYYmmddHHMMSS /opt/sub2api/sub2api
chown sub2api:sub2api /opt/sub2api/sub2api
chmod 755 /opt/sub2api/sub2api
systemctl start sub2api
systemctl is-active sub2api
curl -sS http://127.0.0.1:5500/health
```

## Docker Warning

If production is later moved to Docker, do not deploy the official upstream image directly. Official images do not include BlackTor's local display currency changes.

Use an image built from this fork:

```bash
docker build -t blacktor/sub2api-prod:<version> .
```

Then update the server's compose file or deployment command to use that image.

Keep `config.yaml` and data directories mounted as persistent volumes. Updating an image replaces application code but should not replace production config or data.
