#!/usr/bin/env bash
# Inventory + copy a GCE VM from applied-ai-practice00 when billing is off.
#
# Without billing you usually cannot:
#   - create new VMs / machine images / image exports to GCS
#   - call Vertex (LLM) APIs
#
# You often still can (if IAM allows):
#   - list instances / disks
#   - SSH into a RUNNING VM
#   - tar/rsync home + project dirs to your laptop / another billed project
#
# Usage:
#   gcloud auth login
#   gcloud auth application-default login   # optional
#   ./scripts/export-sandbox-vm.sh                 # inventory only
#   ./scripts/export-sandbox-vm.sh --copy          # SSH + tar home
#   ./scripts/export-sandbox-vm.sh --try-image     # attempt machine image (may fail)
#   PROJECT=applied-ai-practice00 ZONE=us-central1-a INSTANCE=my-vm ./scripts/export-sandbox-vm.sh --copy

set -euo pipefail

PROJECT="${PROJECT:-applied-ai-practice00}"
ZONE="${ZONE:-}"
INSTANCE="${INSTANCE:-}"
OUT_DIR="${OUT_DIR:-$HOME/sandbox-export-$(date +%Y%m%d)}"
DO_COPY=0
TRY_IMAGE=0

for arg in "$@"; do
  case "$arg" in
    --copy) DO_COPY=1 ;;
    --try-image) TRY_IMAGE=1 ;;
    -h|--help)
      sed -n '2,20p' "$0"
      exit 0
      ;;
  esac
done

need() { command -v "$1" >/dev/null || { echo "missing: $1"; exit 1; }; }
need gcloud

echo "== auth =="
gcloud auth list
ACCOUNT="$(gcloud config get-value account 2>/dev/null || true)"
if [[ -z "$ACCOUNT" || "$ACCOUNT" == "(unset)" ]]; then
  echo "No active gcloud account. Run: gcloud auth login"
  exit 1
fi

echo
echo "== project access: $PROJECT =="
if ! gcloud projects describe "$PROJECT" --format='value(projectId,name,lifecycleState)'; then
  echo "Cannot describe $PROJECT — removed from project or no permission."
  exit 1
fi

echo
echo "== compute instances =="
if ! gcloud compute instances list --project="$PROJECT" --format='table(name,zone,status,machineType.basename(),networkInterfaces[0].networkIP)'; then
  echo "Cannot list instances (IAM or Compute API). Falling back to code-only replicate advice."
  exit 2
fi

if [[ -z "$INSTANCE" ]]; then
  # Pick first RUNNING instance if any
  mapfile -t PICK < <(gcloud compute instances list --project="$PROJECT" --filter='status=RUNNING' --format='value(name,zone)' | head -1)
  if [[ ${#PICK[@]} -ge 1 && -n "${PICK[0]:-}" ]]; then
    # format value(name,zone) may be "name\tzone"
    INSTANCE="$(echo "${PICK[0]}" | awk '{print $1}')"
    ZONE="$(echo "${PICK[0]}" | awk '{print $2}' | sed 's|.*/||')"
    echo "Auto-selected RUNNING instance: $INSTANCE (zone=$ZONE)"
  else
    echo "No RUNNING instance found. Start one in console (if allowed) or set INSTANCE=... ZONE=..."
    INSTANCE=""
  fi
fi

if [[ -n "$INSTANCE" && -z "$ZONE" ]]; then
  ZONE="$(gcloud compute instances list --project="$PROJECT" --filter="name=$INSTANCE" --format='value(zone)' | sed 's|.*/||' | head -1)"
fi

mkdir -p "$OUT_DIR"
META="$OUT_DIR/inventory.txt"
{
  echo "account=$ACCOUNT"
  echo "project=$PROJECT"
  echo "instance=${INSTANCE:-none}"
  echo "zone=${ZONE:-none}"
  echo "ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  gcloud compute instances list --project="$PROJECT" --format=json || true
} >"$META"
echo "Wrote inventory: $META"

if [[ "$TRY_IMAGE" -eq 1 && -n "$INSTANCE" && -n "$ZONE" ]]; then
  echo
  echo "== try machine image (often fails without billing) =="
  IMG_NAME="export-${INSTANCE}-$(date +%Y%m%d%H%M)"
  if gcloud compute machine-images create "$IMG_NAME" \
      --project="$PROJECT" \
      --source-instance="$INSTANCE" \
      --source-instance-zone="$ZONE"; then
    echo "Machine image created: $IMG_NAME"
    echo "To move to a billed project (run there):"
    echo "  gcloud compute machine-images describe $IMG_NAME --project=$PROJECT"
    echo "  # then create instance from image in YOUR billed project"
  else
    echo "Machine image create failed (expected if billing disabled)."
    echo "Use --copy instead to pull files over SSH."
  fi
fi

if [[ "$DO_COPY" -eq 1 ]]; then
  if [[ -z "$INSTANCE" || -z "$ZONE" ]]; then
    echo "--copy needs a RUNNING INSTANCE and ZONE"
    exit 3
  fi
  echo
  echo "== SSH tar copy from $INSTANCE =="
  ARCHIVE="$OUT_DIR/${INSTANCE}-home.tgz"
  # Copy common workspace locations; adjust REMOTE_PATHS if needed
  REMOTE_PATHS='${HOME}/atelier ${HOME}/CodeWiki ${HOME}/codewiki ${HOME}/projects ${HOME}/.codewiki ${HOME}/work 2>/dev/null; ls -la ${HOME}'
  gcloud compute ssh "$INSTANCE" --project="$PROJECT" --zone="$ZONE" --command='
    set -e
    echo "host=$(hostname) user=$(whoami) home=$HOME"
    df -h | head -20
    ls -la "$HOME" | head -50
  '
  echo "Creating remote tarball of \$HOME (may be large)..."
  gcloud compute ssh "$INSTANCE" --project="$PROJECT" --zone="$ZONE" --command='
    set -e
    cd "$HOME"
    tar --exclude=.cache --exclude=.npm --exclude=node_modules --exclude=.local/share/Trash \
      -czf /tmp/home-export.tgz .
    ls -lh /tmp/home-export.tgz
  '
  gcloud compute scp --project="$PROJECT" --zone="$ZONE" \
    "${INSTANCE}:/tmp/home-export.tgz" "$ARCHIVE"
  echo "Copied to $ARCHIVE"
  echo "Extract with: mkdir -p \"$OUT_DIR/home\" && tar -xzf \"$ARCHIVE\" -C \"$OUT_DIR/home\""
fi

echo
echo "== done =="
echo "Inventory: $OUT_DIR"
echo
echo "If image/VM create is blocked by billing, replicate the *workload* instead:"
echo "  1) git clone https://github.com/ShreyasPatel031/atelier"
echo "  2) docker compose -f docker/docker-compose.yml up   # or use Claude provider"
echo "  3) Viewer already public: https://atelier-viewer.vercel.app/?repo=medhelm"
