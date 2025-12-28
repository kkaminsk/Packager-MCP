function Set-PackagerMcpCertificate {
  <#
    .SYNOPSIS
    Creates and configures a self-signed certificate for Packager-MCP authentication.

    .DESCRIPTION
    Creates a self-signed certificate for client credential authentication,
    exports it to a PFX file, and uploads the public key to the Azure AD
    application registration.

    .PARAMETER Application
    The application object to configure.

    .PARAMETER CertificatePath
    Path where the PFX file should be saved.

    .PARAMETER CertificatePassword
    SecureString password for the PFX file. If not provided, prompts for one.

    .PARAMETER ValidityYears
    How many years the certificate should be valid. Default: 2

    .OUTPUTS
    Hashtable containing:
      - Thumbprint: The certificate thumbprint
      - Path: Full path to the PFX file
      - Subject: Certificate subject name

    .EXAMPLE
    $certInfo = Set-PackagerMcpCertificate -Application $app -CertificatePath './packager-mcp.pfx'
    Creates a certificate and returns its details.
  #>
  [CmdletBinding()]
  param(
    [Parameter(Mandatory)]
    $Application,

    [Parameter(Mandatory)]
    [string]$CertificatePath,

    [SecureString]$CertificatePassword,

    [int]$ValidityYears = 2
  )

  $certSubject = "CN=Packager-MCP-$($Application.AppId.Substring(0, 8))"

  Write-Host "Creating self-signed certificate..." -ForegroundColor Cyan
  Write-Host " - Subject: $certSubject" -ForegroundColor Cyan
  Write-Host " - Validity: $ValidityYears years" -ForegroundColor Cyan

  # Prompt for password if not provided
  if (-not $CertificatePassword) {
    $CertificatePassword = Read-Host -Prompt 'Enter password for certificate PFX file' -AsSecureString
  }

  # Create the self-signed certificate
  $certParams = @{
    Subject           = $certSubject
    CertStoreLocation = 'Cert:\CurrentUser\My'
    KeyExportPolicy   = 'Exportable'
    KeySpec           = 'Signature'
    KeyLength         = 2048
    KeyAlgorithm      = 'RSA'
    HashAlgorithm     = 'SHA256'
    NotAfter          = (Get-Date).AddYears($ValidityYears)
    FriendlyName      = 'Packager-MCP Authentication Certificate'
  }

  try {
    $cert = New-SelfSignedCertificate @certParams
  }
  catch {
    throw "Failed to create self-signed certificate: $($_.Exception.Message)"
  }

  Write-PackagerMcpLog "Created certificate with thumbprint: $($cert.Thumbprint)" 'INFO'

  # Export to PFX
  $fullPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($CertificatePath)

  try {
    Export-PfxCertificate -Cert $cert -FilePath $fullPath -Password $CertificatePassword | Out-Null
    Write-Host " - Exported PFX to: $fullPath" -ForegroundColor Cyan
    Write-PackagerMcpLog "Exported certificate to: $fullPath" 'INFO'
  }
  catch {
    throw "Failed to export certificate to PFX: $($_.Exception.Message)"
  }

  # Export to PEM format (required by @azure/identity v4.x)
  $pemPath = $fullPath -replace '\.pfx$', '.pem'
  try {
    # Get RSA private key using extension method (works across .NET versions)
    $rsa = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($cert)
    if (-not $rsa) {
      throw "Failed to extract RSA private key from certificate"
    }

    # Export private key in PEM format
    $privateKeyPem = $rsa.ExportRSAPrivateKeyPem()

    # Export certificate in PEM format
    $certBase64 = [Convert]::ToBase64String($cert.RawData, 'InsertLineBreaks')
    $certPem = "-----BEGIN CERTIFICATE-----`n$certBase64`n-----END CERTIFICATE-----"

    # Combine private key and certificate into single PEM file
    $pemContent = "$privateKeyPem`n$certPem"
    Set-Content -LiteralPath $pemPath -Value $pemContent -Encoding ASCII -Force

    Write-Host " - Exported PEM to: $pemPath" -ForegroundColor Cyan
    Write-PackagerMcpLog "Exported PEM certificate to: $pemPath" 'INFO'
  }
  catch {
    throw "Failed to export certificate to PEM: $($_.Exception.Message)"
  }

  # Get the public key for upload to Azure AD
  $keyCredential = @{
    Type             = 'AsymmetricX509Cert'
    Usage            = 'Verify'
    Key              = $cert.RawData
    DisplayName      = "Packager-MCP Certificate ($(Get-Date -Format 'yyyy-MM-dd'))"
    StartDateTime    = $cert.NotBefore.ToUniversalTime()
    EndDateTime      = $cert.NotAfter.ToUniversalTime()
  }

  # Check for existing certificates and append new one
  $existingCerts = @()
  if ($Application.KeyCredentials) {
    $existingCerts = @($Application.KeyCredentials | ForEach-Object {
      @{
        Type          = $_.Type
        Usage         = $_.Usage
        Key           = $_.Key
        DisplayName   = $_.DisplayName
        StartDateTime = $_.StartDateTime
        EndDateTime   = $_.EndDateTime
        KeyId         = $_.KeyId
      }
    })
  }

  $allCerts = $existingCerts + @($keyCredential)

  # Upload public key to Azure AD application
  Write-Host ' - Uploading public key to Azure AD...' -ForegroundColor Cyan

  Invoke-GraphWithRetry -OperationName 'Update-KeyCredentials' -Script {
    Update-MgApplication -ApplicationId $Application.Id -KeyCredentials $allCerts -ErrorAction Stop
  }

  Write-Host 'Certificate configured successfully.' -ForegroundColor Green
  Write-PackagerMcpLog 'Certificate public key uploaded to Azure AD' 'INFO'

  # Clean up from local cert store (optional - user may want to keep it)
  # We leave it in the store in case they need to re-export

  return @{
    Thumbprint = $cert.Thumbprint
    Path       = $fullPath
    PemPath    = $pemPath
    Subject    = $certSubject
    NotAfter   = $cert.NotAfter
  }
}
