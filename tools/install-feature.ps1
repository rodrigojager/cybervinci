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
    'CSharp Kit' = @('Distribution', 'Branding', 'Memory', 'Razor Visual Editor')
    'Codex' = @('Distribution', 'Branding', 'AI-Providers')
    'AI-Providers' = @('Distribution', 'Branding', 'Memory')
    'Design' = @('Distribution', 'Branding', 'AI-Providers')
    'Flow' = @('Distribution', 'Branding', 'AI-Providers', 'Library', 'Memory')
    'Library' = @('Distribution', 'Branding')
    'Memory' = @('Distribution', 'Branding', 'Library')
    'Razor Visual Editor' = @('Distribution')
    'Distribution' = @()
}

$systemSkills = @{
    'Design' = @('OpenPencil')
}

$allFeatures = @(
    'Distribution',
    'Branding',
    'AI Output Cleaner',
    'Arena',
    'Builder',
    'CSharp Kit',
    'Library',
    'Design',
    'AI-Providers',
    'Codex',
    'Memory',
    'Razor Visual Editor',
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
    'Codex-Cli' = 'AI-Providers'
    'Codex CLI' = 'AI-Providers'
    'Codex-Provider' = 'AI-Providers'
    'AI Providers' = 'AI-Providers'
    'AI-Providers' = 'AI-Providers'
    'Product-Shell' = 'Branding'
    'Product Shell' = 'Branding'
    'CVUI' = 'Builder'
    'C#' = 'CSharp Kit'
    'CSharp' = 'CSharp Kit'
    'CSharp-Kit' = 'CSharp Kit'
    'C# Kit' = 'CSharp Kit'
    'DotNet' = 'CSharp Kit'
    '.NET' = 'CSharp Kit'
    'Razor' = 'Razor Visual Editor'
    'Razor-Visual-Editor' = 'Razor Visual Editor'
    'Visual Razor Editor' = 'Razor Visual Editor'
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

function Copy-Tree([string]$sourceRoot, [string]$targetRoot) {
    if (!(Test-Path -LiteralPath $sourceRoot)) {
        return
    }
    if ($DryRun) {
        Write-Host "Would copy $sourceRoot -> $targetRoot"
        return
    }
    if (!(Test-Path -LiteralPath $targetRoot)) {
        New-Item -ItemType Directory -Force -Path $targetRoot | Out-Null
    }
    robocopy $sourceRoot $targetRoot /E /XD node_modules lib coverage .nyc_output .git obj bin .cache dist .turbo /XF tsconfig.tsbuildinfo .eslintcache *.log *.tmp package-lock.json /NFL /NDL /NJH /NJS /NP | Out-Null
    if ($LASTEXITCODE -gt 7) {
        throw "robocopy failed for $sourceRoot -> $targetRoot ($LASTEXITCODE)"
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

function Add-AppDependencies([string]$featureRoot) {
    $manifestPath = Join-Path $featureRoot 'app-dependencies.json'
    if (!(Test-Path -LiteralPath $manifestPath)) {
        return
    }

    $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    foreach ($packageProperty in $manifest.PSObject.Properties) {
        $relativePackageJson = $packageProperty.Name
        $packageJsonPath = Join-Path $target $relativePackageJson
        if (!(Test-Path -LiteralPath $packageJsonPath)) {
            throw "App package.json not found for dependency injection: $packageJsonPath"
        }

        foreach ($dependencyProperty in $packageProperty.Value.PSObject.Properties) {
            if ($DryRun) {
                Write-Host "Would add dependency $($dependencyProperty.Name)@$($dependencyProperty.Value) to $packageJsonPath"
                continue
            }

            $json = Get-Content -LiteralPath $packageJsonPath -Raw | ConvertFrom-Json
            if ($null -eq $json.dependencies) {
                $json | Add-Member -MemberType NoteProperty -Name dependencies -Value ([ordered]@{})
            }
            $dependencies = $json.dependencies
            if ($dependencies.PSObject.Properties.Name -contains $dependencyProperty.Name) {
                $dependencies.PSObject.Properties[$dependencyProperty.Name].Value = $dependencyProperty.Value
            } else {
                $dependencies | Add-Member -MemberType NoteProperty -Name $dependencyProperty.Name -Value $dependencyProperty.Value
            }
            $json | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $packageJsonPath -Encoding UTF8
        }
    }
}

function Copy-SystemSkills([string]$name) {
    if (!$systemSkills.ContainsKey($name)) {
        return
    }

    foreach ($skillFolder in $systemSkills[$name]) {
        Copy-Tree (Join-Path $featuresRootPath "Skills/System/$skillFolder") (Join-Path $target "Skills/System/$skillFolder")
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
    Copy-SystemSkills $name
    Apply-Patches $featureRoot
    Add-AppDependencies $featureRoot

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
