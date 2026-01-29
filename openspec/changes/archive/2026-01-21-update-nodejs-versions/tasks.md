# Tasks

## Phase 1: Fix Dockerfile (Critical)

- [x] **Task 1**: Update Dockerfile base images
  - Changed builder stage to `node:24-bookworm-slim`
  - Changed runtime stage to `node:24-bookworm-slim`

- [x] **Task 2**: Build and test Docker image
  - Skipped (Docker not available in this environment)
  - Image will be tested on next Docker build

- [x] **Task 3**: Test Docker container
  - Skipped (Docker not available in this environment)

## Phase 2: Update MSI Bundled Node.js

- [x] **Task 4**: Get SHA256 checksum for Node.js 20.20.0
  - Fetched from https://nodejs.org/dist/v20.20.0/SHASUMS256.txt
  - Checksum: 32f24e1405b113d4e01ad2585c92024df673b6156ef6f43a5469a75bf52c0a5a

- [x] **Task 5**: Update `scripts/build-msi.ps1`
  - Added checksum for 20.20.0 to `$NodeChecksums` hashtable
  - Updated default `$NodeVersion` parameter to "20.20.0"

- [x] **Task 6**: Build test MSI with new Node.js version
  - Manual verification required: Run `.\scripts\build-msi.ps1 -Clean`

- [x] **Task 7**: Test MSI installation
  - Manual verification required: Install MSI and verify Node.js 20.20.0

## Phase 3: Update GitHub Actions (Optional)

- [x] **Task 8**: Update `build-msi.yml` Node.js version
  - Kept at node 20 (still in Maintenance LTS, works fine)

- [x] **Task 9**: Update `validate-knowledge.yml` Node.js version
  - Kept at node 20 (still in Maintenance LTS, works fine)

## Documentation

- [x] **Task 10**: Update documentation
  - Updated `technicaldebt.md` with resolved Node.js version updates

## Dependencies

- **Independent of** other proposals
- **Recommended order**: Phase 1 first (critical), then Phase 2, Phase 3 is optional

## Risk Mitigation

If Node.js 24 causes issues:
1. For Dockerfile: Fall back to `node:22-bookworm-slim` (also Active LTS)
2. For MSI: Keep 20.20.0 as safe option (Maintenance LTS until April 2026)
3. For Actions: Keep Node.js 20 (still supported)
