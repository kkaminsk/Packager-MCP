import type { WingetManifest, SearchWingetInput, SearchWingetOutput, GetSilentInstallArgsInput, GetSilentInstallArgsOutput } from '../types/winget.js';
export declare class WingetService {
    private logger;
    private searchCache;
    private manifestCache;
    private silentArgsDb;
    private githubToken?;
    constructor();
    private loadSilentArgsDatabase;
    searchPackages(input: SearchWingetInput): Promise<SearchWingetOutput>;
    private searchGitHub;
    private parseManifestPath;
    getManifest(packageId: string, version?: string): Promise<WingetManifest | undefined>;
    private findLatestVersion;
    private fetchGitHubFile;
    private mergeManifests;
    private parseInstaller;
    private normalizeInstallerType;
    getSilentInstallArgs(input: GetSilentInstallArgsInput): Promise<GetSilentInstallArgsOutput>;
    private detectInstallerTypeFromUrl;
    private fetchGitHub;
    private isNewerVersion;
    private compareVersions;
}
export declare function getWingetService(): WingetService;
//# sourceMappingURL=winget.d.ts.map