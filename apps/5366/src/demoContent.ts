/**
 * Two versions of a SuperPlane canvas config (YAML). The pair is hand-tuned so
 * the diff is visually compelling:
 *  - many identical lines (no background),
 *  - whole lines added / removed,
 *  - several *modified* lines where only a few characters change — the headline
 *    case for intra-line (GitHub-style) highlighting.
 */
export const OLD_VERSION = `canvas: deploy-pipeline
version: 3
runtime: node18
region: us-east-1
replicas: 2
concurrency: 4
timeout: 30s

stages:
  - name: build
    image: node:18-alpine
    command: npm run build
    cache: false

  - name: test
    command: npm test
    retries: 1

  - name: deploy
    target: render
    healthcheck: /healthz
    promote: manual

notifications:
  slack: "#deploys"
`;

export const NEW_VERSION = `canvas: deploy-pipeline
version: 4
runtime: node20
region: us-west-2
replicas: 3
concurrency: 4
timeout: 45s

stages:
  - name: build
    image: node:20-alpine
    command: npm run build
    cache: true

  - name: test
    command: npm run test:ci
    retries: 3
    coverage: 80

  - name: deploy
    target: render
    healthcheck: /healthz
    promote: auto

notifications:
  slack: "#release-train"
  email: oncall@superplane.dev
`;
