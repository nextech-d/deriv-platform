# AWS ECS (Fargate) — infra templates

Region: **`af-south-1`**. Replace placeholders before apply.

## Files

| File | Purpose |
| --- | --- |
| `ecs-task-definition.json` | Fargate task (port 3000, health check, secrets refs) |
| `README.md` | This guide |

## 1. One-time AWS setup

```bash
export AWS_REGION=af-south-1
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export ECR_REPO=deriv-platform

aws ecr create-repository --repository-name "$ECR_REPO" --region "$AWS_REGION" || true
```

Create Secrets Manager entries (or SSM parameters) for:

- `SESSION_SECRET`
- `ADMIN_SECRET`
- `NEXT_PUBLIC_DERIV_APP_ID` (build arg — also set in GitHub Actions)
- `NEXT_PUBLIC_DERIV_SIGNUP_URL` (build arg — partner signup URL)
- Optional: `DERIV_OAUTH_CLIENT_SECRET`, `SENTRY_DSN`

Create an **EFS** file system + access point mounted at `/app/data` for admin JSON persistence.

## 2. Build & push image (no local Docker)

GitHub Actions workflow `.github/workflows/docker-build.yml` builds the image on `ubuntu-latest` and pushes to ECR when you add repository secrets:

| Secret | Example |
| --- | --- |
| `AWS_ACCESS_KEY_ID` | IAM user/role with ECR push |
| `AWS_SECRET_ACCESS_KEY` | … |
| `AWS_REGION` | `af-south-1` |
| `ECR_REPOSITORY` | `deriv-platform` |
| `NEXT_PUBLIC_DERIV_APP_ID` | Production app ID |
| `NEXT_PUBLIC_DERIV_SIGNUP_URL` | Partner signup URL |

Trigger: **Actions → Docker build & push → Run workflow**, or push to `main`.

## 3. Register task definition

Edit `ecs-task-definition.json`:

- Replace `ACCOUNT_ID`, `REGION`, `ECR_IMAGE_TAG`
- Wire `secrets` ARNs from Secrets Manager
- Attach EFS volume for `deriv-admin-data` → `/app/data`

```bash
aws ecs register-task-definition \
  --cli-input-json file://infra/ecs-task-definition.json \
  --region af-south-1
```

## 4. Service + ALB

- Target group health check: `GET /api/health` → HTTP 200
- Listener: HTTPS (ACM cert) → forward to task port 3000
- Desired count: 1 (MVP)

## 5. Deriv OAuth

Register redirect URI: `https://tradecity.trade/api/auth/callback`

Set build arg / env `NEXT_PUBLIC_DEMO_MODE=false` for production images.

## 6. Post-deploy

Run checklist in `docs/PRE-LAUNCH.md` → **Post-deploy smoke**.
