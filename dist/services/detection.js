// Detection service for generating Intune detection rules
import { getLogger } from '../utils/logger.js';
const logger = getLogger().child({ service: 'detection' });
/** GUID regex pattern for MSI product code validation */
const GUID_PATTERN = /^\{[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}\}$/;
/** Windows file version regex pattern (1-4 numeric parts separated by dots) */
const FILE_VERSION_PATTERN = /^(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:\.(\d+))?$/;
/**
 * Validate and normalize a Windows file version to 4-part format.
 * Windows file versions use major.minor.build.revision format (e.g., 7.13.0.0).
 * Intune's win32LobAppFileSystemDetection requires the full 4-part format.
 *
 * @param version - Version string to normalize
 * @returns Object with normalized version and whether it was modified
 */
export function normalizeFileVersion(version) {
    if (!version || typeof version !== 'string') {
        return { normalized: '', wasModified: false, error: 'Version is required' };
    }
    const trimmed = version.trim();
    const match = trimmed.match(FILE_VERSION_PATTERN);
    if (!match) {
        return { normalized: '', wasModified: false, error: `Invalid version format: "${version}". Expected numeric format like 1.0.0.0` };
    }
    const parts = [
        match[1] || '0',
        match[2] || '0',
        match[3] || '0',
        match[4] || '0',
    ];
    const normalized = parts.join('.');
    const wasModified = normalized !== trimmed;
    return { normalized, wasModified };
}
/**
 * Check if a version string is a valid Windows file version format.
 *
 * @param version - Version string to validate
 * @returns Object with isValid flag and optional error message
 */
export function isValidFileVersion(version) {
    if (!version || typeof version !== 'string') {
        return { isValid: false, error: 'Version is required' };
    }
    const trimmed = version.trim();
    const match = trimmed.match(FILE_VERSION_PATTERN);
    if (!match) {
        return { isValid: false, error: `Invalid version format: "${version}". Expected numeric format like 1.0.0.0` };
    }
    return { isValid: true };
}
/**
 * Map internal operator names to Intune API operator strings
 */
function mapOperator(operator) {
    if (!operator)
        return 'equal';
    return operator;
}
/**
 * Escape PowerShell special characters in strings
 */
function escapePowerShell(value) {
    return value.replace(/'/g, "''");
}
/**
 * Generate PowerShell version comparison code
 */
function generateVersionComparison(versionVar, targetVersion, operator) {
    const ops = {
        equal: '-eq',
        notEqual: '-ne',
        greaterThan: '-gt',
        greaterThanOrEqual: '-ge',
        lessThan: '-lt',
        lessThanOrEqual: '-le',
    };
    return `[version]${versionVar} ${ops[operator]} [version]'${escapePowerShell(targetVersion)}'`;
}
/**
 * Detection service class
 */
class DetectionService {
    /**
     * Generate Intune detection rule based on input
     */
    async generateDetection(input) {
        logger.debug('Generating detection rule', { type: input.detectionType });
        switch (input.detectionType) {
            case 'file':
                return this.generateFileDetection(input.file);
            case 'registry':
                return this.generateRegistryDetection(input.registry);
            case 'msi':
                return this.generateMsiDetection(input.msi);
            case 'script':
                return this.generateScriptDetection(input.script);
            default:
                throw new Error(`Unknown detection type: ${input.detectionType}`);
        }
    }
    /**
     * Generate file-based detection rule
     */
    generateFileDetection(input) {
        const detectionType = input.detectionType || 'exists';
        const operator = input.operator || 'greaterThanOrEqual';
        const recommendations = [];
        // Normalize version to 4-part format for version detection
        let normalizedVersion = input.detectionValue;
        let versionWasNormalized = false;
        if (detectionType === 'version' && input.detectionValue) {
            const result = normalizeFileVersion(input.detectionValue);
            if (result.error) {
                throw new Error(result.error);
            }
            normalizedVersion = result.normalized;
            versionWasNormalized = result.wasModified;
            if (versionWasNormalized) {
                recommendations.push(`Version was auto-normalized from "${input.detectionValue}" to "${normalizedVersion}" (Windows file versions require 4-part format: major.minor.build.revision)`);
            }
        }
        const intuneJson = {
            '@odata.type': '#microsoft.graph.win32LobAppFileSystemDetection',
            path: input.path,
            fileOrFolderName: input.fileOrFolderName,
            check32BitOn64System: input.check32BitOn64System ?? false,
            detectionType: detectionType,
        };
        if (detectionType !== 'exists' && normalizedVersion) {
            intuneJson.operator = mapOperator(input.operator);
            intuneJson.detectionValue = normalizedVersion;
        }
        // Generate PowerShell script for file detection
        const fullPath = `${input.path}\\${input.fileOrFolderName}`.replace(/\\\\/g, '\\');
        let powershellScript;
        if (detectionType === 'exists') {
            powershellScript = `# File existence detection script
# Exit 0 if detected, Exit 1 if not detected
$FilePath = '${escapePowerShell(fullPath)}'

if (Test-Path -Path $FilePath) {
    Write-Host "Detected: File exists at $FilePath"
    exit 0
}

Write-Host "Not detected: File not found at $FilePath"
exit 1
`;
        }
        else if (detectionType === 'version') {
            const versionForScript = normalizedVersion || '1.0.0.0';
            powershellScript = `# File version detection script
# Exit 0 if detected, Exit 1 if not detected
# Note: Windows file versions use 4-part format (major.minor.build.revision)
$FilePath = '${escapePowerShell(fullPath)}'
$RequiredVersion = '${escapePowerShell(versionForScript)}'

if (Test-Path -Path $FilePath) {
    $FileVersion = (Get-Item $FilePath).VersionInfo.FileVersion
    if ($FileVersion) {
        # Clean version string (remove extra info after space)
        $FileVersion = ($FileVersion -split ' ')[0]
        if (${generateVersionComparison('$FileVersion', versionForScript, operator)}) {
            Write-Host "Detected: Version $FileVersion meets requirement"
            exit 0
        }
        Write-Host "Not detected: Version $FileVersion does not meet requirement $RequiredVersion"
        exit 1
    }
    Write-Host "Not detected: Could not read version info from $FilePath"
    exit 1
}

Write-Host "Not detected: File not found at $FilePath"
exit 1
`;
        }
        else if (detectionType === 'sizeInMB') {
            const sizeInMB = parseFloat(input.detectionValue || '0');
            powershellScript = `# File size detection script
# Exit 0 if detected, Exit 1 if not detected
$FilePath = '${escapePowerShell(fullPath)}'
$RequiredSizeMB = ${sizeInMB}

if (Test-Path -Path $FilePath) {
    $FileSizeMB = (Get-Item $FilePath).Length / 1MB
    if ($FileSizeMB -ge $RequiredSizeMB) {
        Write-Host "Detected: File size $([math]::Round($FileSizeMB, 2)) MB meets requirement"
        exit 0
    }
    Write-Host "Not detected: File size $([math]::Round($FileSizeMB, 2)) MB is less than required $RequiredSizeMB MB"
    exit 1
}

Write-Host "Not detected: File not found at $FilePath"
exit 1
`;
        }
        else {
            // modifiedDate
            powershellScript = `# File modified date detection script
# Exit 0 if detected, Exit 1 if not detected
$FilePath = '${escapePowerShell(fullPath)}'
$RequiredDate = [datetime]'${escapePowerShell(input.detectionValue || new Date().toISOString().split('T')[0] || '')}'

if (Test-Path -Path $FilePath) {
    $FileDate = (Get-Item $FilePath).LastWriteTime
    if ($FileDate -ge $RequiredDate) {
        Write-Host "Detected: File date $FileDate meets requirement"
        exit 0
    }
    Write-Host "Not detected: File date $FileDate is before required $RequiredDate"
    exit 1
}

Write-Host "Not detected: File not found at $FilePath"
exit 1
`;
        }
        if (detectionType === 'version') {
            recommendations.push('Version-based file detection is reliable for applications that update the file version on upgrade.');
        }
        if (detectionType === 'exists') {
            recommendations.push('Existence-only detection may not distinguish between versions. Consider version detection for updatable apps.');
        }
        if (input.check32BitOn64System) {
            recommendations.push('check32BitOn64System is enabled - this will check Program Files (x86) on 64-bit systems.');
        }
        return {
            success: true,
            detectionMethod: `File ${detectionType} detection`,
            configuration: {
                type: 'file',
                details: input,
            },
            intuneJson,
            powershellScript,
            recommendations,
        };
    }
    /**
     * Generate registry-based detection rule
     */
    generateRegistryDetection(input) {
        const detectionType = input.detectionType || 'exists';
        const operator = input.operator || 'equal';
        const intuneJson = {
            '@odata.type': '#microsoft.graph.win32LobAppRegistryDetection',
            keyPath: input.keyPath,
            valueName: input.valueName || '',
            check32BitOn64System: input.check32BitOn64System ?? false,
            detectionType: detectionType === 'exists' ? 'exists' : detectionType,
        };
        if (detectionType !== 'exists' && input.detectionValue) {
            intuneJson.operator = mapOperator(input.operator);
            intuneJson.detectionValue = input.detectionValue;
        }
        // Convert registry path to PowerShell format
        const psKeyPath = input.keyPath
            .replace(/^HKEY_LOCAL_MACHINE\\?/i, 'HKLM:\\')
            .replace(/^HKEY_CURRENT_USER\\?/i, 'HKCU:\\')
            .replace(/^HKLM\\?/i, 'HKLM:\\')
            .replace(/^HKCU\\?/i, 'HKCU:\\');
        let powershellScript;
        if (detectionType === 'exists') {
            if (input.valueName) {
                powershellScript = `# Registry value existence detection script
# Exit 0 if detected, Exit 1 if not detected
$RegPath = '${escapePowerShell(psKeyPath)}'
$ValueName = '${escapePowerShell(input.valueName)}'

try {
    $Value = Get-ItemProperty -Path $RegPath -Name $ValueName -ErrorAction Stop
    if ($null -ne $Value.$ValueName) {
        Write-Host "Detected: Registry value '$ValueName' exists"
        exit 0
    }
} catch {
    # Value doesn't exist
}

Write-Host "Not detected: Registry value '$ValueName' not found"
exit 1
`;
            }
            else {
                powershellScript = `# Registry key existence detection script
# Exit 0 if detected, Exit 1 if not detected
$RegPath = '${escapePowerShell(psKeyPath)}'

if (Test-Path -Path $RegPath) {
    Write-Host "Detected: Registry key exists"
    exit 0
}

Write-Host "Not detected: Registry key not found"
exit 1
`;
            }
        }
        else if (detectionType === 'version') {
            powershellScript = `# Registry version detection script
# Exit 0 if detected, Exit 1 if not detected
$RegPath = '${escapePowerShell(psKeyPath)}'
$ValueName = '${escapePowerShell(input.valueName || '')}'
$RequiredVersion = '${escapePowerShell(input.detectionValue || '1.0.0')}'

try {
    $Value = (Get-ItemProperty -Path $RegPath -Name $ValueName -ErrorAction Stop).$ValueName
    if ($Value) {
        if (${generateVersionComparison('$Value', input.detectionValue || '1.0.0', operator)}) {
            Write-Host "Detected: Version $Value meets requirement"
            exit 0
        }
        Write-Host "Not detected: Version $Value does not meet requirement $RequiredVersion"
        exit 1
    }
} catch {
    # Value doesn't exist or can't be read
}

Write-Host "Not detected: Registry value not found"
exit 1
`;
        }
        else {
            // string or integer comparison
            const compareOp = detectionType === 'integer'
                ? operator === 'equal'
                    ? '-eq'
                    : operator === 'notEqual'
                        ? '-ne'
                        : operator === 'greaterThan'
                            ? '-gt'
                            : operator === 'greaterThanOrEqual'
                                ? '-ge'
                                : operator === 'lessThan'
                                    ? '-lt'
                                    : '-le'
                : operator === 'equal'
                    ? '-eq'
                    : '-ne';
            powershellScript = `# Registry ${detectionType} value detection script
# Exit 0 if detected, Exit 1 if not detected
$RegPath = '${escapePowerShell(psKeyPath)}'
$ValueName = '${escapePowerShell(input.valueName || '')}'
$RequiredValue = ${detectionType === 'integer' ? input.detectionValue || '0' : `'${escapePowerShell(input.detectionValue || '')}'`}

try {
    $Value = (Get-ItemProperty -Path $RegPath -Name $ValueName -ErrorAction Stop).$ValueName
    if ($Value ${compareOp} $RequiredValue) {
        Write-Host "Detected: Value '$Value' matches requirement"
        exit 0
    }
    Write-Host "Not detected: Value '$Value' does not match requirement '$RequiredValue'"
    exit 1
} catch {
    # Value doesn't exist or can't be read
}

Write-Host "Not detected: Registry value not found"
exit 1
`;
        }
        const recommendations = [];
        recommendations.push('Registry detection is useful for applications that create uninstall registry keys.');
        if (input.keyPath.includes('Uninstall')) {
            recommendations.push('Using the Uninstall registry key is a common and reliable detection method.');
        }
        if (input.check32BitOn64System) {
            recommendations.push('check32BitOn64System is enabled - this will check Wow6432Node on 64-bit systems.');
        }
        return {
            success: true,
            detectionMethod: `Registry ${detectionType} detection`,
            configuration: {
                type: 'registry',
                details: input,
            },
            intuneJson,
            powershellScript,
            recommendations,
        };
    }
    /**
     * Generate MSI product code detection rule
     */
    generateMsiDetection(input) {
        // Validate product code format
        if (!GUID_PATTERN.test(input.productCode)) {
            throw new Error(`Invalid MSI product code format. Expected GUID format: {xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx}, got: ${input.productCode}`);
        }
        const operator = input.productVersionOperator || 'greaterThanOrEqual';
        const version = input.productVersion || '0.0.0';
        const intuneJson = {
            '@odata.type': '#microsoft.graph.win32LobAppProductCodeDetection',
            productCode: input.productCode.toUpperCase(),
            productVersionOperator: mapOperator(operator),
            productVersion: version,
        };
        // Generate PowerShell script for MSI detection
        const powershellScript = `# MSI product code detection script
# Exit 0 if detected, Exit 1 if not detected
$ProductCode = '${input.productCode.toUpperCase()}'
$RequiredVersion = '${escapePowerShell(version)}'

# Check both 64-bit and 32-bit uninstall locations
$UninstallPaths = @(
    "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\$ProductCode",
    "HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\$ProductCode"
)

foreach ($Path in $UninstallPaths) {
    if (Test-Path -Path $Path) {
        $InstalledVersion = (Get-ItemProperty -Path $Path -ErrorAction SilentlyContinue).DisplayVersion
        if ($InstalledVersion) {
            if (${generateVersionComparison('$InstalledVersion', version, operator)}) {
                Write-Host "Detected: MSI Product $ProductCode version $InstalledVersion"
                exit 0
            }
            Write-Host "Not detected: Version $InstalledVersion does not meet requirement $RequiredVersion"
            exit 1
        }
        # Product exists but no version - still detected
        Write-Host "Detected: MSI Product $ProductCode installed (no version info)"
        exit 0
    }
}

Write-Host "Not detected: MSI Product $ProductCode not found"
exit 1
`;
        const recommendations = [];
        recommendations.push('MSI product code detection is the most reliable method for MSI-based installers.');
        recommendations.push('The product code can be found in the MSI file properties or using: Get-WmiObject Win32_Product');
        if (input.productVersion && input.productVersion !== '0.0.0') {
            recommendations.push(`Version requirement set to ${operator} ${input.productVersion}.`);
        }
        return {
            success: true,
            detectionMethod: 'MSI product code detection',
            configuration: {
                type: 'msi',
                details: input,
            },
            intuneJson,
            powershellScript,
            recommendations,
        };
    }
    /**
     * Generate script-based detection rule
     */
    generateScriptDetection(input) {
        const operator = input.operator || 'greaterThanOrEqual';
        const recommendations = [];
        let powershellScript;
        // Normalize version if provided
        let normalizedVersion = input.version;
        let versionWasNormalized = false;
        if (input.version) {
            const result = normalizeFileVersion(input.version);
            if (result.error) {
                throw new Error(result.error);
            }
            normalizedVersion = result.normalized;
            versionWasNormalized = result.wasModified;
            if (versionWasNormalized) {
                recommendations.push(`Version was auto-normalized from "${input.version}" to "${normalizedVersion}" (Windows file versions require 4-part format: major.minor.build.revision)`);
            }
        }
        if (input.installPath && input.fileName) {
            // File-based script detection
            const fullPath = `${input.installPath}\\${input.fileName}`.replace(/\\\\/g, '\\');
            if (normalizedVersion) {
                powershellScript = `# Detection script for ${input.applicationName}
# Exit 0 if detected, Exit 1 if not detected
# Note: Windows file versions use 4-part format (major.minor.build.revision)

$AppPath = '${escapePowerShell(fullPath)}'
$RequiredVersion = '${escapePowerShell(normalizedVersion)}'

if (Test-Path -Path $AppPath) {
    $FileVersion = (Get-Item $AppPath).VersionInfo.FileVersion
    if ($FileVersion) {
        # Clean version string
        $FileVersion = ($FileVersion -split ' ')[0]
        try {
            if (${generateVersionComparison('$FileVersion', normalizedVersion, operator)}) {
                Write-Host "Detected: ${input.applicationName} version $FileVersion"
                exit 0
            }
            Write-Host "Not detected: Version $FileVersion does not meet requirement $RequiredVersion"
        } catch {
            Write-Host "Not detected: Could not parse version '$FileVersion'"
        }
        exit 1
    }
    # File exists but no version - still may be detected based on existence
    Write-Host "Detected: ${input.applicationName} found at $AppPath (no version info)"
    exit 0
}

Write-Host "Not detected: ${input.applicationName} not found at $AppPath"
exit 1
`;
            }
            else {
                powershellScript = `# Detection script for ${input.applicationName}
# Exit 0 if detected, Exit 1 if not detected

$AppPath = '${escapePowerShell(fullPath)}'

if (Test-Path -Path $AppPath) {
    Write-Host "Detected: ${input.applicationName} found at $AppPath"
    exit 0
}

Write-Host "Not detected: ${input.applicationName} not found at $AppPath"
exit 1
`;
            }
        }
        else if (input.registryKey) {
            // Registry-based script detection
            const psKeyPath = input.registryKey
                .replace(/^HKEY_LOCAL_MACHINE\\?/i, 'HKLM:\\')
                .replace(/^HKEY_CURRENT_USER\\?/i, 'HKCU:\\')
                .replace(/^HKLM\\?/i, 'HKLM:\\')
                .replace(/^HKCU\\?/i, 'HKCU:\\');
            if (input.registryValueName && normalizedVersion) {
                powershellScript = `# Detection script for ${input.applicationName}
# Exit 0 if detected, Exit 1 if not detected
# Note: Windows file versions use 4-part format (major.minor.build.revision)

$RegPath = '${escapePowerShell(psKeyPath)}'
$ValueName = '${escapePowerShell(input.registryValueName)}'
$RequiredVersion = '${escapePowerShell(normalizedVersion)}'

try {
    $InstalledVersion = (Get-ItemProperty -Path $RegPath -Name $ValueName -ErrorAction Stop).$ValueName
    if ($InstalledVersion) {
        try {
            if (${generateVersionComparison('$InstalledVersion', normalizedVersion, operator)}) {
                Write-Host "Detected: ${input.applicationName} version $InstalledVersion"
                exit 0
            }
            Write-Host "Not detected: Version $InstalledVersion does not meet requirement $RequiredVersion"
        } catch {
            Write-Host "Not detected: Could not parse version '$InstalledVersion'"
        }
        exit 1
    }
} catch {
    # Registry value not found
}

Write-Host "Not detected: ${input.applicationName} registry key not found"
exit 1
`;
            }
            else {
                powershellScript = `# Detection script for ${input.applicationName}
# Exit 0 if detected, Exit 1 if not detected

$RegPath = '${escapePowerShell(psKeyPath)}'

if (Test-Path -Path $RegPath) {
    Write-Host "Detected: ${input.applicationName} registry key found"
    exit 0
}

Write-Host "Not detected: ${input.applicationName} registry key not found"
exit 1
`;
            }
        }
        else {
            // Generic detection script template
            powershellScript = `# Detection script for ${input.applicationName}
# Exit 0 if detected, Exit 1 if not detected
# Customize this script with your detection logic

# Example: Check for application in common locations
$PossiblePaths = @(
    "$env:ProgramFiles\\${input.applicationName}\\*.exe",
    "$env:ProgramFiles(x86)\\${input.applicationName}\\*.exe"
)

foreach ($PathPattern in $PossiblePaths) {
    $Found = Get-ChildItem -Path $PathPattern -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($Found) {
        Write-Host "Detected: ${input.applicationName} found at $($Found.FullName)"
        exit 0
    }
}

# Example: Check uninstall registry
$UninstallKeys = @(
    "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
    "HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall"
)

foreach ($Key in $UninstallKeys) {
    $App = Get-ChildItem -Path $Key -ErrorAction SilentlyContinue |
           Get-ItemProperty |
           Where-Object { $_.DisplayName -like "*${input.applicationName}*" } |
           Select-Object -First 1
    if ($App) {
        Write-Host "Detected: ${input.applicationName} found in registry (Version: $($App.DisplayVersion))"
        exit 0
    }
}

Write-Host "Not detected: ${input.applicationName} not found"
exit 1
`;
        }
        recommendations.push('Script-based detection is the most flexible option but requires PowerShell execution.');
        recommendations.push('Ensure the script exits with code 0 for detected and 1 for not detected.');
        recommendations.push('Test the detection script thoroughly before deployment as debugging is limited.');
        if (!input.installPath && !input.registryKey) {
            recommendations.push('Consider providing installPath/fileName or registryKey for more accurate detection.');
        }
        return {
            success: true,
            detectionMethod: 'PowerShell script detection',
            configuration: {
                type: 'script',
                details: input,
            },
            intuneJson: null, // Script detection doesn't have a JSON representation
            powershellScript,
            recommendations,
        };
    }
    /**
     * Recommend the best detection type based on installer characteristics
     */
    recommendDetectionType(installerType, hasProductCode, hasVersionFile) {
        if (installerType === 'msi' || hasProductCode) {
            return {
                recommended: 'msi',
                reason: 'MSI product code detection is the most reliable for MSI installers.',
                alternatives: [
                    { type: 'registry', reason: 'Registry detection using the uninstall key is also reliable.' },
                    { type: 'file', reason: 'File detection works if you know the installation path.' },
                ],
            };
        }
        if (hasVersionFile) {
            return {
                recommended: 'file',
                reason: 'File version detection is reliable for executables with version information.',
                alternatives: [
                    { type: 'registry', reason: 'Registry detection using uninstall key as backup.' },
                    { type: 'script', reason: 'Script for complex multi-condition detection.' },
                ],
            };
        }
        return {
            recommended: 'registry',
            reason: 'Registry detection using the uninstall key works for most installers.',
            alternatives: [
                { type: 'file', reason: 'File existence check if you know the installation path.' },
                { type: 'script', reason: 'Script for complex or custom detection scenarios.' },
            ],
        };
    }
}
// Singleton instance
let detectionServiceInstance = null;
/**
 * Get the detection service instance
 */
export function getDetectionService() {
    if (!detectionServiceInstance) {
        detectionServiceInstance = new DetectionService();
    }
    return detectionServiceInstance;
}
/**
 * Reset the detection service (for testing)
 */
export function resetDetectionService() {
    detectionServiceInstance = null;
}
export { DetectionService };
//# sourceMappingURL=detection.js.map