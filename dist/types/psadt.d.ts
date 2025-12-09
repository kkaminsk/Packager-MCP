import type { InstallerType } from './winget.js';
/**
 * Template complexity level
 * - basic: Minimal script for simple installers
 * - standard: Full workflow with pre/post phases, user prompts
 * - advanced: Multi-phase, prerequisites, custom actions, repair support
 */
export type TemplateComplexity = 'basic' | 'standard' | 'advanced';
/**
 * Deployment type for the package
 */
export type DeploymentType = 'Install' | 'Uninstall' | 'Repair';
/**
 * Options for generating a PSADT template
 */
export interface TemplateOptions {
    /** Application name (e.g., "Google Chrome") */
    applicationName: string;
    /** Application vendor/publisher (e.g., "Google") */
    applicationVendor: string;
    /** Application version (e.g., "120.0.6099.109") */
    applicationVersion: string;
    /** Type of installer */
    installerType: InstallerType;
    /** Template complexity level */
    complexity: TemplateComplexity;
    /** Installer filename (e.g., "ChromeSetup.exe") */
    installerFileName?: string;
    /** Silent install arguments (e.g., "/S /norestart") */
    silentArgs?: string;
    /** Silent uninstall arguments */
    uninstallArgs?: string;
    /** Product code for MSI (e.g., "{12345678-1234-1234-1234-123456789ABC}") */
    productCode?: string;
    /** Whether to close running applications before install */
    closeApps?: string[];
    /** Required disk space in MB */
    requiredDiskSpace?: number;
    /** Minimum Windows version required */
    minimumWindowsVersion?: string;
    /** Whether to require admin rights */
    requireAdmin?: boolean;
    /** Post-install reboot behavior: 'never' | 'prompt' | 'force' */
    rebootBehavior?: 'never' | 'prompt' | 'force';
    /** Additional script comments */
    comments?: string;
    /** Whether to include uninstall logic */
    includeUninstall?: boolean;
    /** Whether to include repair logic (advanced only) */
    includeRepair?: boolean;
    /** Log file path pattern */
    logPath?: string;
    /** Transform file for MSI (.mst) */
    transformFile?: string;
    /** Additional MSI properties */
    msiProperties?: string;
    /** Pre-installation script block */
    preInstallScript?: string;
    /** Post-installation script block */
    postInstallScript?: string;
}
/**
 * A customization point in the generated template
 */
export interface CustomizationPoint {
    /** Unique identifier for the customization point */
    id: string;
    /** Human-readable name */
    name: string;
    /** Description of what this customization point does */
    description: string;
    /** Line number in the generated script where this appears */
    lineNumber: number;
    /** The marker/comment in the script (e.g., "# CUSTOMIZE: Add prerequisites here") */
    marker: string;
    /** Example code for this customization */
    example?: string;
    /** Whether this customization is required or optional */
    required: boolean;
}
/**
 * Generated file in the template output
 */
export interface GeneratedFile {
    /** Relative path within the package structure */
    path: string;
    /** File contents */
    content: string;
    /** Description of the file's purpose */
    description: string;
}
/**
 * Output from template generation
 */
export interface TemplateOutput {
    /** The main deployment script content */
    script: string;
    /** Additional files to include in the package */
    files: GeneratedFile[];
    /** Customization points in the generated script */
    customizationPoints: CustomizationPoint[];
    /** Metadata about the generated template */
    metadata: TemplateMetadata;
}
/**
 * Metadata about the generated template
 */
export interface TemplateMetadata {
    /** Template complexity level used */
    complexity: TemplateComplexity;
    /** Installer type the template was generated for */
    installerType: InstallerType;
    /** PSADT version this template targets */
    psadtVersion: string;
    /** Timestamp when the template was generated */
    generatedAt: string;
    /** Template engine version */
    templateVersion: string;
}
/**
 * Input schema for the get_psadt_template tool
 */
export interface GetPsadtTemplateInput {
    /** Application name */
    applicationName: string;
    /** Application vendor/publisher */
    applicationVendor: string;
    /** Application version */
    applicationVersion: string;
    /** Type of installer */
    installerType: InstallerType;
    /** Template complexity level (default: 'standard') */
    complexity?: TemplateComplexity;
    /** Installer filename */
    installerFileName?: string;
    /** Silent install arguments */
    silentArgs?: string;
    /** Silent uninstall arguments */
    uninstallArgs?: string;
    /** Product code for MSI */
    productCode?: string;
    /** Apps to close before installation */
    closeApps?: string[];
    /** Whether to include uninstall logic (default: true) */
    includeUninstall?: boolean;
    /** Whether to include repair logic (default: false, advanced only) */
    includeRepair?: boolean;
    /** Transform file for MSI */
    transformFile?: string;
    /** Additional MSI properties */
    msiProperties?: string;
    /** Reboot behavior: 'never' | 'prompt' | 'force' (default: 'never') */
    rebootBehavior?: 'never' | 'prompt' | 'force';
}
/**
 * Output schema for the get_psadt_template tool
 */
export interface GetPsadtTemplateOutput {
    /** Success indicator */
    success: boolean;
    /** The generated template */
    template: TemplateOutput;
    /** Recommendations for the user */
    recommendations: string[];
}
/**
 * Resource content structure for PSADT documentation
 */
export interface PsadtResource {
    /** Resource URI */
    uri: string;
    /** Resource title */
    title: string;
    /** Resource content (markdown) */
    content: string;
    /** Last updated timestamp */
    lastUpdated: string;
}
/**
 * Registry of available resources
 */
export interface ResourceRegistry {
    /** PSADT documentation resources */
    psadtDocs: Map<string, PsadtResource>;
    /** Installer type guides */
    installerGuides: Map<string, PsadtResource>;
    /** Pattern documentation */
    patterns: Map<string, PsadtResource>;
    /** Reference documentation */
    references: Map<string, PsadtResource>;
}
//# sourceMappingURL=psadt.d.ts.map