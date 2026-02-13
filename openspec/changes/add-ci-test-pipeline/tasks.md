## 1. Fix Existing Test Failures
- [x] 1.1 Fix `should override transport port with TRANSPORT_PORT env var` test using `vi.stubEnv()` or process isolation
- [x] 1.2 Fix `should override transport host with TRANSPORT_HOST env var` test
- [x] 1.3 Verify all tests pass locally with `npm test`

## 2. Create CI Workflow
- [x] 2.1 Create `.github/workflows/ci.yml` with:
  - Trigger on push to `main` and pull requests
  - Node.js matrix: [20, 24]
  - Steps: checkout, setup-node, `npm ci`, `npm run build`, `npm test`
- [ ] 2.2 Add status badge to README

## 3. Validate
- [ ] 3.1 Push branch and verify CI passes on GitHub Actions
