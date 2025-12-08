import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Handlebars from 'handlebars';
import { getLogger } from '../utils/logger.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Constants
const PSADT_VERSION = '4.0';
const TEMPLATE_VERSION = '1.0.0';
// Default silent arguments by installer type
const DEFAULT_SILENT_ARGS = {
    msi: '/qn /norestart REBOOT=ReallySuppress',
    msix: '',
    exe: '/S',
    inno: '/VERYSILENT /SUPPRESSMSGBOXES /NORESTART',
    nullsoft: '/S',
    wix: '/quiet /norestart',
    burn: '/quiet /norestart',
    zip: '',
    portable: '',
    unknown: '/S /silent /quiet',
};
// Default uninstall arguments by installer type
const DEFAULT_UNINSTALL_ARGS = {
    msi: '/qn /norestart',
    msix: '',
    exe: '/S',
    inno: '/VERYSILENT /SUPPRESSMSGBOXES /NORESTART',
    nullsoft: '/S',
    wix: '/quiet /norestart',
    burn: '/quiet /norestart',
    zip: '',
    portable: '',
    unknown: '/S /silent /quiet',
};
export class PsadtService {
    logger;
    templateCache;
    resourceCache;
    templatesDir;
    knowledgeDir;
    constructor() {
        this.logger = getLogger().child({ service: 'psadt' });
        this.templateCache = new Map();
        this.resourceCache = new Map();
        this.templatesDir = join(__dirname, '..', 'templates');
        this.knowledgeDir = join(__dirname, '..', 'knowledge');
        // Register Handlebars helpers
        this.registerHandlebarsHelpers();
        // Register partials
        this.registerPartials();
    }
    registerHandlebarsHelpers() {
        // Helper for equality comparison
        Handlebars.registerHelper('ifEquals', function (arg1, arg2, options) {
            return arg1 === arg2 ? options.fn(this) : options.inverse(this);
        });
        // Helper for not equals
        Handlebars.registerHelper('ifNotEquals', function (arg1, arg2, options) {
            return arg1 !== arg2 ? options.fn(this) : options.inverse(this);
        });
        // Helper for array join
        Handlebars.registerHelper('join', function (arr, separator) {
            if (!Array.isArray(arr))
                return '';
            return arr.join(typeof separator === 'string' ? separator : ',');
        });
    }
    registerPartials() {
        const partialsDir = join(this.templatesDir, 'partials');
        if (!existsSync(partialsDir)) {
            this.logger.warn('Partials directory not found', { path: partialsDir });
            return;
        }
        const partialFiles = readdirSync(partialsDir).filter((f) => f.endsWith('.hbs'));
        for (const file of partialFiles) {
            const partialName = file.replace('.hbs', '');
            const partialPath = join(partialsDir, file);
            const partialContent = readFileSync(partialPath, 'utf-8');
            Handlebars.registerPartial(partialName, partialContent);
            this.logger.debug('Registered partial', { name: partialName });
        }
    }
    getTemplate(templateName) {
        if (this.templateCache.has(templateName)) {
            return this.templateCache.get(templateName);
        }
        const templatePath = join(this.templatesDir, `${templateName}.hbs`);
        if (!existsSync(templatePath)) {
            throw new Error(`Template not found: ${templateName}`);
        }
        const templateContent = readFileSync(templatePath, 'utf-8');
        // Disable HTML escaping for code templates
        const compiled = Handlebars.compile(templateContent, { noEscape: true });
        this.templateCache.set(templateName, compiled);
        return compiled;
    }
    getTemplateName(installerType, complexity) {
        // Map installer types to template categories
        const typeToTemplate = {
            msi: 'msi',
            msix: 'msix',
            exe: 'exe',
            inno: 'exe',
            nullsoft: 'exe',
            wix: 'exe',
            burn: 'exe',
            zip: 'zip',
            portable: 'zip',
            unknown: 'exe',
        };
        const baseTemplate = typeToTemplate[installerType] || 'exe';
        // MSIX and ZIP don't have complexity variants
        if (baseTemplate === 'msix' || baseTemplate === 'zip') {
            return baseTemplate;
        }
        return `${baseTemplate}-${complexity}`;
    }
    generateScript(options) {
        this.logger.debug('Generating PSADT script', {
            app: options.applicationName,
            installer: options.installerType,
            complexity: options.complexity,
        });
        const templateName = this.getTemplateName(options.installerType, options.complexity);
        const template = this.getTemplate(templateName);
        // Prepare template context with defaults
        const context = {
            ...options,
            silentArgs: options.silentArgs || DEFAULT_SILENT_ARGS[options.installerType],
            uninstallArgs: options.uninstallArgs || DEFAULT_UNINSTALL_ARGS[options.installerType],
            installerFileName: options.installerFileName || this.deriveInstallerFileName(options),
            closeApps: options.closeApps?.join(',') || '',
            generatedAt: new Date().toISOString(),
            includeUninstall: options.includeUninstall !== false,
            includeRepair: options.includeRepair && options.complexity === 'advanced',
        };
        // Generate the script
        const script = template(context);
        // Extract customization points from the generated script
        const customizationPoints = this.extractCustomizationPoints(script);
        // Generate additional files
        const files = this.generateAdditionalFiles(options);
        // Create metadata
        const metadata = {
            complexity: options.complexity,
            installerType: options.installerType,
            psadtVersion: PSADT_VERSION,
            generatedAt: context.generatedAt,
            templateVersion: TEMPLATE_VERSION,
        };
        return {
            script,
            files,
            customizationPoints,
            metadata,
        };
    }
    deriveInstallerFileName(options) {
        const ext = this.getInstallerExtension(options.installerType);
        const safeName = options.applicationName.replace(/[^a-zA-Z0-9]/g, '');
        return `${safeName}_${options.applicationVersion}${ext}`;
    }
    getInstallerExtension(type) {
        const extensions = {
            msi: '.msi',
            msix: '.msix',
            exe: '.exe',
            inno: '.exe',
            nullsoft: '.exe',
            wix: '.exe',
            burn: '.exe',
            zip: '.zip',
            portable: '.zip',
            unknown: '.exe',
        };
        return extensions[type];
    }
    extractCustomizationPoints(script) {
        const points = [];
        const lines = script.split('\n');
        // Pattern to match CUSTOMIZE comments
        const customizePattern = /^(\s*)#\s*CUSTOMIZE:\s*(.+)$/;
        lines.forEach((line, index) => {
            const match = line.match(customizePattern);
            if (match && match[2]) {
                const id = `customize-${index + 1}`;
                const description = match[2].trim();
                points.push({
                    id,
                    name: this.deriveCustomizationName(description),
                    description,
                    lineNumber: index + 1,
                    marker: line.trim(),
                    required: description.toLowerCase().includes('required'),
                });
            }
        });
        return points;
    }
    deriveCustomizationName(description) {
        // Extract a short name from the description
        const words = description.split(' ').slice(0, 3);
        return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }
    generateAdditionalFiles(options) {
        const files = [];
        // Generate folder structure documentation
        files.push({
            path: 'PACKAGE_STRUCTURE.md',
            content: this.generatePackageStructureDoc(options),
            description: 'Package folder structure documentation',
        });
        // Generate detection script for Intune
        files.push({
            path: 'Detection.ps1',
            content: this.generateDetectionScript(options),
            description: 'Intune detection script',
        });
        return files;
    }
    generatePackageStructureDoc(options) {
        return `# ${options.applicationName} ${options.applicationVersion} Package Structure

## Folder Layout

\`\`\`
${options.applicationVendor}_${options.applicationName}_${options.applicationVersion}/
├── PSAppDeployToolkit/           # PSADT module files
│   ├── PSAppDeployToolkit.psd1
│   └── PSAppDeployToolkit.psm1
├── AppDeployToolkit/
│   ├── Deploy-Application.ps1    # Main deployment script
│   └── Files/                    # Installer files
│       └── ${options.installerFileName || 'installer' + this.getInstallerExtension(options.installerType)}
├── Detection.ps1                 # Intune detection script
└── PACKAGE_STRUCTURE.md          # This file
\`\`\`

## Intune Configuration

### Install Command
\`\`\`
Deploy-Application.exe -DeploymentType Install -DeployMode Silent
\`\`\`

### Uninstall Command
\`\`\`
Deploy-Application.exe -DeploymentType Uninstall -DeployMode Silent
\`\`\`

### Detection Method
Use the provided Detection.ps1 script or configure registry/file detection.

## Notes

- Generated by Intune Packaging Assistant MCP Server
- Template: ${options.installerType}-${options.complexity}
- Generated: ${new Date().toISOString()}
`;
    }
    generateDetectionScript(options) {
        let detectionScript = `# Detection Script for ${options.applicationName}
# Returns exit code 0 if application is installed, non-zero otherwise

$AppName = "${options.applicationName}"
$RequiredVersion = [version]"${options.applicationVersion}"

`;
        if (options.productCode) {
            // MSI detection by product code
            detectionScript += `# Detection by MSI Product Code
$ProductCode = "${options.productCode}"

$app = Get-WmiObject -Class Win32_Product -Filter "IdentifyingNumber='$ProductCode'" -ErrorAction SilentlyContinue
if ($app) {
    Write-Output "Detected: $($app.Name) v$($app.Version)"
    exit 0
}
`;
        }
        else if (options.installerType === 'msix') {
            // MSIX detection
            detectionScript += `# Detection by MSIX Package
$PackageName = "${options.applicationVendor}.${options.applicationName}"

$package = Get-AppxPackage -Name $PackageName -ErrorAction SilentlyContinue
if ($package -and [version]$package.Version -ge $RequiredVersion) {
    Write-Output "Detected: $($package.Name) v$($package.Version)"
    exit 0
}
`;
        }
        else {
            // Generic registry detection
            detectionScript += `# Detection by Registry
$RegistryPaths = @(
    "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*",
    "HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*"
)

$app = Get-ItemProperty -Path $RegistryPaths -ErrorAction SilentlyContinue |
    Where-Object { $_.DisplayName -like "*$AppName*" }

if ($app) {
    $installedVersion = [version]($app.DisplayVersion -replace '[^0-9.]', '')
    if ($installedVersion -ge $RequiredVersion) {
        Write-Output "Detected: $($app.DisplayName) v$($app.DisplayVersion)"
        exit 0
    }
}
`;
        }
        detectionScript += `
# Not detected
exit 1
`;
        return detectionScript;
    }
    // Tool handler method
    async generateTemplate(input) {
        const options = {
            applicationName: input.applicationName,
            applicationVendor: input.applicationVendor,
            applicationVersion: input.applicationVersion,
            installerType: input.installerType,
            complexity: input.complexity || 'standard',
            installerFileName: input.installerFileName,
            silentArgs: input.silentArgs,
            uninstallArgs: input.uninstallArgs,
            productCode: input.productCode,
            closeApps: input.closeApps,
            includeUninstall: input.includeUninstall !== false,
            includeRepair: input.includeRepair,
            transformFile: input.transformFile,
            msiProperties: input.msiProperties,
            rebootBehavior: input.rebootBehavior || 'never',
        };
        const template = this.generateScript(options);
        // Generate recommendations
        const recommendations = this.generateRecommendations(options);
        return {
            success: true,
            template,
            recommendations,
        };
    }
    generateRecommendations(options) {
        const recommendations = [];
        // Installer-type specific recommendations
        if (options.installerType === 'exe' && !options.silentArgs) {
            recommendations.push('Silent arguments were auto-detected. Test the installer manually to verify they work correctly.');
        }
        if (options.installerType === 'msi' && !options.productCode) {
            recommendations.push('Consider adding the MSI product code for more reliable detection and uninstallation.');
        }
        if (!options.closeApps?.length) {
            recommendations.push('Consider specifying applications to close before installation to prevent file-in-use errors.');
        }
        if (options.complexity === 'basic') {
            recommendations.push('The basic template is minimal. Consider using "standard" complexity for production deployments.');
        }
        if (options.installerType === 'zip') {
            recommendations.push('ZIP packages require manual registration in Add/Remove Programs. Review the generated script for customization points.');
        }
        // General recommendations
        recommendations.push('Test the deployment in a lab environment before production use.');
        recommendations.push('Review all CUSTOMIZE comments in the script and adjust as needed for your environment.');
        return recommendations;
    }
    // Resource loading methods
    loadResource(uri) {
        // Check cache first
        if (this.resourceCache.has(uri)) {
            return this.resourceCache.get(uri);
        }
        // Parse URI
        const parsed = this.parseResourceUri(uri);
        if (!parsed) {
            this.logger.warn('Invalid resource URI', { uri });
            return undefined;
        }
        const { category, name } = parsed;
        let filePath;
        // Map URI to file path
        switch (category) {
            case 'psadt':
                filePath = join(this.knowledgeDir, 'psadt', `${name}.md`);
                break;
            case 'installers':
                filePath = join(this.knowledgeDir, 'installers', `${name}.md`);
                break;
            case 'patterns':
                filePath = join(this.knowledgeDir, 'patterns', `${name}.md`);
                break;
            case 'reference':
                filePath = join(this.knowledgeDir, 'reference', `${name}.md`);
                break;
            default:
                return undefined;
        }
        if (!existsSync(filePath)) {
            this.logger.warn('Resource file not found', { uri, filePath });
            return undefined;
        }
        const content = readFileSync(filePath, 'utf-8');
        const title = this.extractTitle(content) || name;
        const resource = {
            uri,
            title,
            content,
            lastUpdated: new Date().toISOString(),
        };
        this.resourceCache.set(uri, resource);
        return resource;
    }
    parseResourceUri(uri) {
        // Supported URI patterns:
        // psadt://docs/{name} -> psadt/{name}.md
        // kb://installers/{name} -> installers/{name}.md
        // kb://patterns/{name} -> patterns/{name}.md
        // ref://exit-codes -> reference/exit-codes.md
        const patterns = [
            { regex: /^psadt:\/\/docs\/(.+)$/, category: 'psadt' },
            { regex: /^kb:\/\/installers\/(.+)$/, category: 'installers' },
            { regex: /^kb:\/\/patterns\/(.+)$/, category: 'patterns' },
            { regex: /^ref:\/\/(.+)$/, category: 'reference' },
        ];
        for (const pattern of patterns) {
            const match = uri.match(pattern.regex);
            if (match && match[1]) {
                return { category: pattern.category, name: match[1] };
            }
        }
        return undefined;
    }
    extractTitle(content) {
        // Extract title from first # heading
        const match = content.match(/^#\s+(.+)$/m);
        return match ? match[1] : undefined;
    }
    listResources() {
        return [
            // PSADT documentation
            {
                uri: 'psadt://docs/overview',
                name: 'PSADT Overview',
                description: 'Introduction to PSADT v4 architecture and concepts',
            },
            {
                uri: 'psadt://docs/functions',
                name: 'PSADT Functions',
                description: 'Reference for all ADT-prefixed functions',
            },
            {
                uri: 'psadt://docs/variables',
                name: 'PSADT Variables',
                description: 'Built-in variables and $ADTSession object',
            },
            {
                uri: 'psadt://docs/migration',
                name: 'PSADT Migration',
                description: 'Guide for migrating from PSADT v3 to v4',
            },
            {
                uri: 'psadt://docs/best-practices',
                name: 'PSADT Best Practices',
                description: 'Recommended patterns for deployment scripts',
            },
            // Installer guides
            {
                uri: 'kb://installers/msi',
                name: 'MSI Packaging',
                description: 'Guide for MSI installer packaging',
            },
            {
                uri: 'kb://installers/exe',
                name: 'EXE Packaging',
                description: 'Guide for EXE installer types (Inno, NSIS, InstallShield)',
            },
            {
                uri: 'kb://installers/msix',
                name: 'MSIX Packaging',
                description: 'Guide for MSIX/AppX packaging',
            },
            // Patterns
            {
                uri: 'kb://patterns/detection',
                name: 'Detection Rules',
                description: 'Patterns for Intune detection rules',
            },
            {
                uri: 'kb://patterns/prerequisites',
                name: 'Prerequisites',
                description: 'Handling application prerequisites',
            },
            // Reference
            {
                uri: 'ref://exit-codes',
                name: 'Exit Codes',
                description: 'Common installer exit codes reference',
            },
        ];
    }
}
// Singleton instance
let psadtService;
export function getPsadtService() {
    if (!psadtService) {
        psadtService = new PsadtService();
    }
    return psadtService;
}
//# sourceMappingURL=psadt.js.map