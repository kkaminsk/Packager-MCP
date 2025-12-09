export type InstallerType = 'msi' | 'msix' | 'exe' | 'zip' | 'inno' | 'nullsoft' | 'wix' | 'burn' | 'portable' | 'unknown';
export type Architecture = 'x64' | 'x86' | 'arm64' | 'neutral';
export type Scope = 'user' | 'machine';
export interface InstallerSwitches {
    silent?: string;
    silentWithProgress?: string;
    interactive?: string;
    installLocation?: string;
    log?: string;
    upgrade?: string;
    custom?: string;
}
export interface Installer {
    architecture: Architecture;
    installerType: InstallerType;
    installerUrl: string;
    installerSha256?: string;
    scope?: Scope;
    installerSwitches?: InstallerSwitches;
    productCode?: string;
    upgradeBehavior?: string;
    installerLocale?: string;
    platform?: string[];
    minimumOsVersion?: string;
    nestedInstallerType?: InstallerType;
    nestedInstallerFiles?: {
        relativeFilePath: string;
    }[];
}
export interface WingetManifest {
    packageIdentifier: string;
    packageName: string;
    packageVersion: string;
    publisher: string;
    publisherUrl?: string;
    publisherSupportUrl?: string;
    privacyUrl?: string;
    author?: string;
    moniker?: string;
    license?: string;
    licenseUrl?: string;
    copyright?: string;
    copyrightUrl?: string;
    shortDescription?: string;
    description?: string;
    tags?: string[];
    releaseNotes?: string;
    releaseNotesUrl?: string;
    installers: Installer[];
    defaultLocale?: string;
}
export interface WingetSearchResult {
    packageIdentifier: string;
    packageName: string;
    publisher: string;
    latestVersion: string;
    description?: string;
    moniker?: string;
    tags?: string[];
    manifestPath: string;
}
export interface SearchWingetInput {
    query: string;
    exactMatch?: boolean;
    includeVersions?: boolean;
    limit?: number;
}
export interface PackageVersion {
    version: string;
    manifestPath: string;
}
export interface SearchWingetResult {
    packageIdentifier: string;
    packageName: string;
    publisher: string;
    latestVersion: string;
    description?: string;
    moniker?: string;
    tags?: string[];
    versions?: PackageVersion[];
}
export interface SearchWingetOutput {
    query: string;
    totalResults: number;
    results: SearchWingetResult[];
    cached: boolean;
    message?: string;
}
export type SilentArgsConfidence = 'verified' | 'high' | 'medium' | 'low';
export type SilentArgsSource = 'winget' | 'known_installer' | 'heuristic' | 'fallback';
export interface GetSilentInstallArgsInput {
    packageId?: string;
    installerType?: InstallerType;
    installerUrl?: string;
}
export interface SilentInstallArgs {
    silent: string;
    silentWithProgress?: string;
    log?: string;
    uninstall?: string;
    confidence: SilentArgsConfidence;
    source: SilentArgsSource;
    installerType: InstallerType;
    notes?: string;
}
export interface GetSilentInstallArgsOutput {
    packageId?: string;
    installerType: InstallerType;
    args: SilentInstallArgs;
    alternatives?: SilentInstallArgs[];
    cached: boolean;
}
export interface GitHubSearchItem {
    name: string;
    path: string;
    sha: string;
    url: string;
    html_url: string;
    repository: {
        full_name: string;
    };
}
export interface GitHubSearchResponse {
    total_count: number;
    incomplete_results: boolean;
    items: GitHubSearchItem[];
}
export interface GitHubRateLimitResponse {
    resources: {
        core: {
            limit: number;
            remaining: number;
            reset: number;
        };
        search: {
            limit: number;
            remaining: number;
            reset: number;
        };
    };
}
export interface SilentArgsPattern {
    type: InstallerType;
    silent: string;
    silentWithProgress?: string;
    log?: string;
    uninstall?: string;
    notes?: string;
    patterns?: string[];
}
export interface ApplicationOverride {
    packageId: string;
    silent: string;
    silentWithProgress?: string;
    log?: string;
    uninstall?: string;
    notes?: string;
}
export interface SilentArgsDatabase {
    installerTypes: SilentArgsPattern[];
    applicationOverrides: ApplicationOverride[];
}
//# sourceMappingURL=winget.d.ts.map