## 1. Cross-Platform Asset Copy
- [x] 1.1 Create `scripts/copy-assets.mjs` using `node:fs` `cpSync` to copy `src/templates` → `dist/templates` and `src/knowledge` → `dist/knowledge`
- [x] 1.2 Update `package.json` build script to: `tsc && node scripts/copy-assets.mjs`
- [ ] 1.3 Verify Docker build succeeds with `docker build -t packager-mcp .`
- [ ] 1.4 Verify local build succeeds on Windows with `npm run build`

## 2. Version Reconciliation
- [ ] 2.1 Set `package.json` version to `0.8.0` (or update README to match `1.0.0` — decide with maintainer)
- [ ] 2.2 Ensure `server.ts` reads version from `package.json` (already does via config)

## 3. Clean Up dist/ from Git
- [x] 3.1 Run `git rm -r --cached dist/` if any dist files are tracked
- [x] 3.2 Verify `dist/` entry in `.gitignore` is effective
