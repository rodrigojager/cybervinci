param(
    [Parameter(Mandatory = $true)]
    [string]$Feature,

    [string]$TargetTheia = "Baseline/theia",

    [string]$FeaturesRoot = "Modificacoes",

    [switch]$WithDependencies,

    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

$workspace = Split-Path -Parent $PSScriptRoot
$target = if ([System.IO.Path]::IsPathRooted($TargetTheia)) { $TargetTheia } else { Join-Path $workspace $TargetTheia }
$featuresRootPath = if ([System.IO.Path]::IsPathRooted($FeaturesRoot)) { $FeaturesRoot } else { Join-Path $workspace $FeaturesRoot }

if (!(Test-Path -LiteralPath $target)) {
    throw "Target Theia directory not found: $target"
}

$dependencies = @{
    'AI Output Cleaner' = @('Distribution')
    'Arena' = @('Distribution', 'Branding')
    'Branding' = @('Distribution')
    'Builder' = @('Distribution', 'Branding')
    'Codex' = @('Distribution', 'Branding', 'Codex-Provider')
    'Codex-Provider' = @('Distribution', 'Branding')
    'Design' = @('Distribution', 'Branding')
    'Flow' = @('Distribution', 'Branding', 'Codex-Provider', 'Library', 'Memory')
    'Library' = @('Distribution', 'Branding')
    'Memory' = @('Distribution', 'Branding', 'Library')
    'Distribution' = @()
}

$allFeatures = @(
    'Distribution',
    'Branding',
    'AI Output Cleaner',
    'Arena',
    'Builder',
    'Library',
    'Design',
    'Codex-Provider',
    'Codex',
    'Memory',
    'Flow'
)

$aliases = @{
    'Common' = 'Distribution'
    'Agency-Studio' = 'Flow'
    'Agency Studio' = 'Flow'
    'Prompt-Arena' = 'Arena'
    'Prompt Arena' = 'Arena'
    'Docs-Context' = 'Library'
    'Docs Context' = 'Library'
    'AI Docs Context' = 'Library'
    'Project-Intelligence' = 'Memory'
    'Project Intelligence' = 'Memory'
    'Codex-Cli' = 'Codex-Provider'
    'Codex CLI' = 'Codex-Provider'
    'Product-Shell' = 'Branding'
    'Product Shell' = 'Branding'
    'CVUI' = 'Builder'
}

$installed = New-Object 'System.Collections.Generic.HashSet[string]'

function Resolve-FeatureRoot([string]$name) {
    $candidate = Join-Path $featuresRootPath $name
    if (Test-Path -LiteralPath $candidate) {
        return $candidate
    }

    $legacyCandidate = Join-Path $workspace $name
    if (Test-Path -LiteralPath $legacyCandidate) {
        return $legacyCandidate
    }

    throw "Feature folder not found: $candidate"
}

function Copy-TreeContent([string]$sourceRoot, [string]$targetRoot) {
    if (!(Test-Path -LiteralPath $sourceRoot)) {
        return
    }
    if (!(Test-Path -LiteralPath $targetRoot)) {
        if ($DryRun) {
            Write-Host "Would create $targetRoot"
        } else {
            New-Item -ItemType Directory -Force -Path $targetRoot | Out-Null
        }
    }

    Get-ChildItem -LiteralPath $sourceRoot -Directory | ForEach-Object {
        $destination = Join-Path $targetRoot $_.Name
        if ($DryRun) {
            Write-Host "Would copy $($_.FullName) -> $destination"
            return
        }
        robocopy $_.FullName $destination /E /XD node_modules lib coverage .nyc_output .git obj bin .cache dist .turbo /XF tsconfig.tsbuildinfo .eslintcache *.log *.tmp package-lock.json /NFL /NDL /NJH /NJS /NP | Out-Null
        if ($LASTEXITCODE -gt 7) {
            throw "robocopy failed for $($_.FullName) -> $destination ($LASTEXITCODE)"
        }
    }
}

function Apply-Patches([string]$featureRoot) {
    $patchRoot = Join-Path $featureRoot 'patches'
    if (!(Test-Path -LiteralPath $patchRoot)) {
        return
    }

    Get-ChildItem -LiteralPath $patchRoot -Filter '*.patch' -File | Sort-Object Name | ForEach-Object {
        if ($DryRun) {
            Write-Host "Would apply patch $($_.FullName) to $target"
            return
        }
        git -C $target apply --check -- $_.FullName
        if ($LASTEXITCODE -ne 0) {
            throw "Patch check failed: $($_.FullName)"
        }
        git -C $target apply -- $_.FullName
        if ($LASTEXITCODE -ne 0) {
            throw "Patch apply failed: $($_.FullName)"
        }
    }
}

function Install-Feature([string]$name) {
    if ($aliases.ContainsKey($name)) {
        $name = $aliases[$name]
    }
    if ($installed.Contains($name)) {
        return
    }
    if (!$dependencies.ContainsKey($name)) {
        throw "Unknown feature '$name'. Known features: $($dependencies.Keys -join ', ')"
    }

    if ($WithDependencies) {
        foreach ($dependency in $dependencies[$name]) {
            Install-Feature $dependency
        }
    }

    $featureRoot = Resolve-FeatureRoot $name

    Write-Host "Installing $name -> $target"
    Copy-TreeContent (Join-Path $featureRoot 'packages') (Join-Path $target 'packages')
    Copy-TreeContent (Join-Path $featureRoot 'vendor') (Join-Path $target 'vendor')
    Copy-TreeContent (Join-Path $featureRoot 'examples') (Join-Path $target 'examples')
    Apply-Patches $featureRoot

    [void]$installed.Add($name)
}

if ($Feature -eq 'All') {
    foreach ($name in $allFeatures) {
        Install-Feature $name
    }
} else {
    Install-Feature $Feature
}

Write-Host 'Done. Run npm install/compile/build from the target Theia root next.'
