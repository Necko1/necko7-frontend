#!/bin/sh
set -e

# Extract environment variables
API_BASE_URL="${API_BASE_URL:-}"
BACKEND_URL="${BACKEND_URL:-https://7.necko.moe}"

# Generate runtime config.js loaded by index.html before app bundle execution
cat <<EOF > /usr/share/nginx/html/config.js
window.__APP_CONFIG__ = {
  API_BASE_URL: "${API_BASE_URL}",
  BACKEND_URL: "${BACKEND_URL}",
};
EOF

echo "[necko7-frontend] Runtime configuration injected into /config.js:"
echo "  API_BASE_URL=${API_BASE_URL}"
echo "  BACKEND_URL=${BACKEND_URL}"

exec "$@"
