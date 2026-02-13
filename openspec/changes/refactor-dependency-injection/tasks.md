## 1. Static Imports (Quick Win)
- [x] 1.1 Replace all `await import('node:fs')`, `await import('node:path')`, `await import('node:url')` with static imports at the top of each file
- [x] 1.2 Verify build passes

## 2. Extract Schemas
- [x] 2.1 Create `src/schemas/` directory
- [x] 2.2 Move tool Zod schemas from `tools.ts` into `src/schemas/tools.ts`
- [x] 2.3 Export schemas for reuse in tests and handlers

## 3. Service Container
- [ ] 3.1 Create `src/services/container.ts` with a `ServiceContainer` class that constructs all services with shared config
- [ ] 3.2 Update `server.ts` to create `ServiceContainer` and pass it to handler registration
- [ ] 3.3 Remove `get*Service()` / `reset*Service()` singleton functions from each service
- [ ] 3.4 Update service constructors to accept config and dependencies as parameters

## 4. Extract Package Assembly
- [ ] 4.1 Create `src/services/package-assembly.ts` with toolkit file copy and script write logic
- [ ] 4.2 Slim `get_psadt_template` handler to: validate → generate template → assemble package → return
- [ ] 4.3 Add unit tests for `PackageAssemblyService`

## 5. Input Mapping Cleanup
- [ ] 5.1 Create `src/utils/case-transform.ts` with `snakeToCamel` object transformer
- [ ] 5.2 Apply to tool handlers to eliminate manual property-by-property mapping
- [ ] 5.3 Alternatively, use Zod `.transform()` on schemas to output camelCase types directly

## 6. Update Tests
- [ ] 6.1 Update all test files to construct services directly instead of using singleton getters
- [ ] 6.2 Verify all tests pass
