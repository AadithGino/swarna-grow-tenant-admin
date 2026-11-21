#!/usr/bin/env bash
# Uploads static-dist/ to S3 with the right cache headers and clears the CloudFront cache.
#
#   S3_BUCKET=my-bucket CLOUDFRONT_DISTRIBUTION_ID=E123ABC pnpm run deploy:s3
#
# Needs the AWS CLI, signed in with permission for s3:PutObject/DeleteObject/ListBucket
# on the bucket and cloudfront:CreateInvalidation on the distribution.
set -euo pipefail

: "${S3_BUCKET:?Set S3_BUCKET (bucket name, no s3://)}"
: "${CLOUDFRONT_DISTRIBUTION_ID:?Set CLOUDFRONT_DISTRIBUTION_ID}"
# CloudFront origin path, e.g. dist for s3://bucket/dist/index.html (default: empty = bucket root)
S3_PREFIX="${S3_PREFIX:-}"
PREFIX_PATH=""
if [ -n "$S3_PREFIX" ]; then
  PREFIX_PATH="${S3_PREFIX%/}/"
fi
S3_URI="s3://$S3_BUCKET/$PREFIX_PATH"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/static-dist"
[ -f "$DIST/index.html" ] || { echo "static-dist/index.html missing. Run: pnpm run build:static"; exit 1; }

# 1. Hashed files: cache for a year. Uploaded first so a new index.html never points at missing chunks.
aws s3 sync "$DIST/_next" "${S3_URI}_next" \
  --cache-control "public, max-age=31536000, immutable"

# 2. Other static files (logos, videos, demo images): cache for a day.
aws s3 sync "$DIST" "$S3_URI" \
  --exclude "_next/*" --exclude "*.html" --exclude "_redirects" --exclude "_headers" \
  --cache-control "public, max-age=86400"

# 3. HTML shells: always revalidate so users get the new build straight away.
aws s3 sync "$DIST" "$S3_URI" \
  --exclude "*" --include "*.html" \
  --cache-control "no-cache" --content-type "text/html; charset=utf-8"

# 4. Remove files from older builds. Old chunks are kept for a while on purpose:
#    open tabs on the previous build may still lazy-load them. Clean _next/ only when
#    you want to (aws s3 sync "$DIST/_next" "${S3_URI}_next" --delete).
aws s3 sync "$DIST" "$S3_URI" --delete --exclude "_next/*" \
  --exclude "_redirects" --exclude "_headers" --size-only >/dev/null

aws cloudfront create-invalidation \
  --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
  --paths "/index.html" "/payment-return/index.html" "/*" >/dev/null

echo "Deployed to ${S3_URI} and invalidated HTML on $CLOUDFRONT_DISTRIBUTION_ID"
