[CmdletBinding()]
param(
    [string]$SourceTheia = "Workload/theia",
    [string]$OutputRoot = "dist/cvi",
    [string]$ComponentsManifest = "installer/cybervinci-components.json",
    [string]$InnoSetupCompiler,
    [string]$AppVersion = "1.72.0",
    [string[]]$OnlyVariant,
    [string]$ReleaseRepository = $env:CYBERVINCI_RELEASE_REPOSITORY,
    [string]$ReleasesUrl = $env:CYBERVINCI_RELEASES_URL,
    [switch]$SkipNpmInstall,
    [switch]$SkipBuild,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot

function Resolve-RepoPath([string]$Path) {
    if ([System.IO.Path]::IsPathRooted($Path)) {
        return [System.IO.Path]::GetFullPath($Path)
    }
    return [System.IO.Path]::GetFullPath((Join-Path $repoRoot $Path))
}

function Invoke-CheckedCommand([string]$FilePath, [string[]]$Arguments, [string]$WorkingDirectory) {
    Write-Host "> $FilePath $($Arguments -join ' ')" -ForegroundColor Cyan
    if ($DryRun) {
        return
    }
    Push-Location $WorkingDirectory
    try {
        & $FilePath @Arguments
        if ($LASTEXITCODE -ne 0) {
            throw "Command failed with exit code ${LASTEXITCODE}: $FilePath $($Arguments -join ' ')"
        }
    } finally {
        Pop-Location
    }
}

function Resolve-InnoCompiler([string]$Compiler) {
    if ($Compiler -and (Test-Path -LiteralPath $Compiler)) {
        return $Compiler
    }
    $cmd = Get-Command ISCC.exe -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Source
    }
    foreach ($candidate in @(
        "C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
        "C:\Program Files\Inno Setup 6\ISCC.exe",
        "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe"
    )) {
        if (Test-Path -LiteralPath $candidate) {
            return $candidate
        }
    }
    throw "Inno Setup compiler not found. Install Inno Setup or pass -InnoSetupCompiler <path-to-ISCC.exe>."
}

$output = Resolve-RepoPath $OutputRoot
$source = Resolve-RepoPath $SourceTheia
$manifest = Resolve-RepoPath $ComponentsManifest
$builder = Resolve-RepoPath "tools/build-cybervinci-installer.ps1"

$allVariants = @(
    @{ Name = "core"; WithCSharp = $false; WithCodex = $false },
    @{ Name = "csharp"; WithCSharp = $true; WithCodex = $false },
    @{ Name = "codex"; WithCSharp = $false; WithCodex = $true },
    @{ Name = "full"; WithCSharp = $true; WithCodex = $true }
)

$selectedVariants = @()
foreach ($entry in @($OnlyVariant)) {
    foreach ($name in ([string]$entry -split ',')) {
        $trimmed = $name.Trim()
        if ($trimmed) {
            $selectedVariants += $trimmed
        }
    }
}

if ($selectedVariants.Count -gt 0) {
    $allowed = @("core", "csharp", "codex", "full")
    foreach ($name in $selectedVariants) {
        if ($allowed -notcontains $name) {
            throw "Unknown variant '$name'. Allowed variants: $($allowed -join ', ')"
        }
    }
    $requested = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
    foreach ($name in $selectedVariants) {
        [void]$requested.Add($name)
    }
    $variants = @($allVariants | Where-Object { $requested.Contains($_.Name) })
} else {
    $variants = $allVariants
}

Write-Host "CyberVinci variant installers" -ForegroundColor Green
Write-Host "  Source: $source"
Write-Host "  Output: $output"
Write-Host "  Version: $AppVersion"

$compiler = Resolve-InnoCompiler $InnoSetupCompiler
$iss = Resolve-RepoPath "installer/windows/cybervinci.iss"
$windowsOut = Join-Path $output "windows"
if (!$DryRun) {
    New-Item -ItemType Directory -Force -Path $windowsOut | Out-Null
}

foreach ($variant in $variants) {
    $variantRoot = Join-Path $output $variant.Name
    $stagingRoot = Join-Path $variantRoot "s"
    $args = @(
        $builder,
        "-NoWizard",
        "-SourceTheia", $source,
        "-OutputRoot", $variantRoot,
        "-StagingRoot", $stagingRoot,
        "-ComponentsManifest", $manifest,
        "-AppVersion", $AppVersion,
        "-PackagePortable"
    )
    if ($variant.WithCSharp) {
        $args += "-WithCSharp"
    } else {
        $args += "-WithoutCSharp"
    }
    if ($variant.WithCodex) {
        $args += "-WithCodex"
    } else {
        $args += "-WithoutCodex"
    }
    if ($SkipNpmInstall) {
        $args += "-SkipNpmInstall"
    }
    if ($SkipBuild) {
        $args += "-SkipBuild"
    }
    if ($ReleaseRepository) {
        $args += @("-ReleaseRepository", $ReleaseRepository)
    }
    if ($ReleasesUrl) {
        $args += @("-ReleasesUrl", $ReleasesUrl)
    }
    if ($DryRun) {
        $args += "-DryRun"
    }
    Invoke-CheckedCommand "pwsh" $args $repoRoot

    $payload = Join-Path $variantRoot "payload/CyberVinci"
    if (!$DryRun -and !(Test-Path -LiteralPath $payload)) {
        throw "Variant payload not found: $payload"
    }

    Invoke-CheckedCommand $compiler @(
        "/DPayloadDir=$payload",
        "/DOutputDir=$windowsOut",
        "/DAppVersion=$AppVersion",
        "/DVariantName=$($variant.Name)",
        "/DOutputBaseFilename=CyberVinci-Setup-$AppVersion-$($variant.Name)",
        $iss
    ) $repoRoot
}

Write-Host "Done." -ForegroundColor Green
Write-Host "Variant installer output: $windowsOut"
