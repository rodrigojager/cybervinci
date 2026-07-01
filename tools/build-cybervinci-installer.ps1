[CmdletBinding()]
param(
    [string]$SourceTheia = "Workload/theia",
    [string]$OutputRoot = "dist/cybervinci-installer",
    [string]$StagingRoot,
    [string]$ComponentsManifest = "installer/cybervinci-components.json",

    [switch]$WithCSharp,
    [switch]$WithoutCSharp,
    [switch]$WithCodex,
    [switch]$WithoutCodex,

    [switch]$NoWizard,
    [switch]$DryRun,
    [switch]$SkipCopy,
    [switch]$SkipNpmInstall,
    [switch]$SkipBuild,
    [switch]$PackagePortable,
    [switch]$CompileInno,
    [string]$InnoSetupCompiler,
    [string]$AppVersion = "0.1.2",
    [string]$ReleaseRepository = $env:CYBERVINCI_RELEASE_REPOSITORY,
    [string]$ReleasesUrl = $env:CYBERVINCI_RELEASES_URL
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot

function Resolve-RepoPath([string]$Path) {
    if ([System.IO.Path]::IsPathRooted($Path)) {
        return [System.IO.Path]::GetFullPath($Path)
    }
    return [System.IO.Path]::GetFullPath((Join-Path $repoRoot $Path))
}

function Resolve-CyberVinciReleasesUrl([string]$Repository, [string]$ExplicitUrl) {
    if (![string]::IsNullOrWhiteSpace($ExplicitUrl)) {
        return $ExplicitUrl.Trim()
    }
    if (![string]::IsNullOrWhiteSpace($Repository)) {
        $normalized = $Repository.Trim().Trim([char[]]@('/'))
        if ($normalized -notmatch '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$') {
            throw "Release repository must be in owner/repo form: $Repository"
        }
        return "https://github.com/$normalized/releases/latest"
    }
    return $null
}

$script:ReleaseRepository = if ([string]::IsNullOrWhiteSpace($ReleaseRepository)) { $null } else { $ReleaseRepository.Trim().Trim([char[]]@('/')) }
$script:ResolvedReleasesUrl = Resolve-CyberVinciReleasesUrl $script:ReleaseRepository $ReleasesUrl

function Read-JsonFile([string]$Path) {
    return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

function Write-JsonFile([string]$Path, [object]$Value) {
    $parent = Split-Path -Parent $Path
    if (!(Test-Path -LiteralPath $parent)) {
        New-Item -ItemType Directory -Force -Path $parent | Out-Null
    }
    $Value | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $Path -Encoding UTF8
}

function Assert-ChildPath([string]$Parent, [string]$Child) {
    $parentFull = [System.IO.Path]::GetFullPath($Parent).TrimEnd('\', '/')
    $childFull = [System.IO.Path]::GetFullPath($Child).TrimEnd('\', '/')
    if (!$childFull.StartsWith($parentFull, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to write outside expected root. Parent=$parentFull Child=$childFull"
    }
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

function Get-OptionalComponent([object]$Manifest, [string]$Id) {
    foreach ($component in $Manifest.optionalComponents) {
        if ($component.id -eq $Id) {
            return $component
        }
    }
    throw "Optional component not found in manifest: $Id"
}

function Get-ComponentPackages([object[]]$Components) {
    $packages = New-Object System.Collections.Generic.List[string]
    foreach ($component in @($Components)) {
        foreach ($packageName in @($component.packages)) {
            if (![string]::IsNullOrWhiteSpace($packageName)) {
                [void]$packages.Add($packageName)
            }
        }
    }
    return $packages.ToArray()
}

function Show-BuildWizard([object]$Manifest, [string]$DefaultSource, [string]$DefaultOutput, [string]$DefaultStaging) {
    try {
        Add-Type -AssemblyName System.Windows.Forms
        Add-Type -AssemblyName System.Drawing
    } catch {
        Write-Warning "Windows Forms is unavailable; using command-line defaults. $_"
        return $null
    }

    $form = New-Object System.Windows.Forms.Form
    $form.Text = "CyberVinci Installer Build Wizard"
    $form.StartPosition = 'CenterScreen'
    $form.Width = 760
    $form.Height = 560
    $form.FormBorderStyle = 'FixedDialog'
    $form.MaximizeBox = $false
    $form.MinimizeBox = $false

    $title = New-Object System.Windows.Forms.Label
    $title.Text = "CyberVinci Desktop Installer"
    $title.Font = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)
    $title.Left = 24
    $title.Top = 20
    $title.Width = 690
    $title.Height = 32
    $form.Controls.Add($title)

    $intro = New-Object System.Windows.Forms.Label
    $intro.Text = "Build a local release payload from the current CyberVinci/Theia tree. The core desktop includes themes, AI Chat, Canvas, Flow, visual HTML/cshtml editing, virtual goal/reasoning, playbooks and agency agents."
    $intro.Left = 24
    $intro.Top = 62
    $intro.Width = 690
    $intro.Height = 54
    $form.Controls.Add($intro)

    function Add-Label([string]$Text, [int]$Top) {
        $label = New-Object System.Windows.Forms.Label
        $label.Text = $Text
        $label.Left = 24
        $label.Top = $Top
        $label.Width = 160
        $label.Height = 22
        $form.Controls.Add($label)
        return $label
    }

    function Add-TextBox([string]$Value, [int]$Top) {
        $box = New-Object System.Windows.Forms.TextBox
        $box.Left = 190
        $box.Top = $Top
        $box.Width = 500
        $box.Text = $Value
        $form.Controls.Add($box)
        return $box
    }

    Add-Label "Source Theia" 130 | Out-Null
    $sourceBox = Add-TextBox $DefaultSource 128
    Add-Label "Output root" 164 | Out-Null
    $outputBox = Add-TextBox $DefaultOutput 162
    Add-Label "Staging root" 198 | Out-Null
    $stagingBox = Add-TextBox $DefaultStaging 196

    $componentsGroup = New-Object System.Windows.Forms.GroupBox
    $componentsGroup.Text = "Components"
    $componentsGroup.Left = 24
    $componentsGroup.Top = 240
    $componentsGroup.Width = 690
    $componentsGroup.Height = 130
    $form.Controls.Add($componentsGroup)

    $core = New-Object System.Windows.Forms.CheckBox
    $core.Text = "CyberVinci Desktop core (required)"
    $core.Left = 18
    $core.Top = 28
    $core.Width = 640
    $core.Checked = $true
    $core.Enabled = $false
    $componentsGroup.Controls.Add($core)

    $csharp = New-Object System.Windows.Forms.CheckBox
    $csharp.Text = "C# and .NET tooling (C# Kit, tests, LSP/debug readiness)"
    $csharp.Left = 18
    $csharp.Top = 58
    $csharp.Width = 640
    $csharp.Checked = [bool](Get-OptionalComponent $Manifest "csharp-dotnet").defaultSelected
    $componentsGroup.Controls.Add($csharp)

    $codex = New-Object System.Windows.Forms.CheckBox
    $codex.Text = "Codex extension sidebar/webview"
    $codex.Left = 18
    $codex.Top = 88
    $codex.Width = 640
    $codex.Checked = [bool](Get-OptionalComponent $Manifest "codex-extension").defaultSelected
    $componentsGroup.Controls.Add($codex)

    $actionsGroup = New-Object System.Windows.Forms.GroupBox
    $actionsGroup.Text = "Build actions"
    $actionsGroup.Left = 24
    $actionsGroup.Top = 385
    $actionsGroup.Width = 690
    $actionsGroup.Height = 84
    $form.Controls.Add($actionsGroup)

    $skipInstallBox = New-Object System.Windows.Forms.CheckBox
    $skipInstallBox.Text = "Skip npm install"
    $skipInstallBox.Left = 18
    $skipInstallBox.Top = 28
    $skipInstallBox.Width = 180
    $skipInstallBox.Checked = $false
    $actionsGroup.Controls.Add($skipInstallBox)

    $skipBuildBox = New-Object System.Windows.Forms.CheckBox
    $skipBuildBox.Text = "Skip Electron build"
    $skipBuildBox.Left = 210
    $skipBuildBox.Top = 28
    $skipBuildBox.Width = 180
    $skipBuildBox.Checked = $false
    $actionsGroup.Controls.Add($skipBuildBox)

    $portableBox = New-Object System.Windows.Forms.CheckBox
    $portableBox.Text = "Create portable payload"
    $portableBox.Left = 400
    $portableBox.Top = 28
    $portableBox.Width = 220
    $portableBox.Checked = $true
    $actionsGroup.Controls.Add($portableBox)

    $ok = New-Object System.Windows.Forms.Button
    $ok.Text = "Build"
    $ok.Left = 540
    $ok.Top = 485
    $ok.Width = 84
    $ok.DialogResult = [System.Windows.Forms.DialogResult]::OK
    $form.AcceptButton = $ok
    $form.Controls.Add($ok)

    $cancel = New-Object System.Windows.Forms.Button
    $cancel.Text = "Cancel"
    $cancel.Left = 630
    $cancel.Top = 485
    $cancel.Width = 84
    $cancel.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
    $form.CancelButton = $cancel
    $form.Controls.Add($cancel)

    $result = $form.ShowDialog()
    if ($result -ne [System.Windows.Forms.DialogResult]::OK) {
        throw "Installer build canceled."
    }

    return @{
        SourceTheia = $sourceBox.Text
        OutputRoot = $outputBox.Text
        StagingRoot = $stagingBox.Text
        WithCSharp = $csharp.Checked
        WithCodex = $codex.Checked
        SkipNpmInstall = $skipInstallBox.Checked
        SkipBuild = $skipBuildBox.Checked
        PackagePortable = $portableBox.Checked
    }
}

function Copy-TheiaToStaging([string]$Source, [string]$Destination) {
    Assert-ChildPath $script:InstallerOutputRoot $Destination
    if ($DryRun) {
        Write-Host "Would mirror $Source -> $Destination"
        return
    }
    if (Test-Path -LiteralPath $Destination) {
        Remove-Item -LiteralPath $Destination -Recurse -Force
    }
    New-Item -ItemType Directory -Force -Path $Destination | Out-Null
    robocopy $Source $Destination /MIR /XD .git node_modules .browser_modules .codex-run .playwright-mcp .cache coverage .nyc_output /XF *.log *.tmp *.tsbuildinfo /NFL /NDL /NJH /NJS /NP | Out-Null
    if ($LASTEXITCODE -gt 7) {
        throw "robocopy failed for $Source -> $Destination ($LASTEXITCODE)"
    }
}

function Update-AppPackageDependencies([string]$TheiaRoot, [string[]]$PackagesToRemove) {
    $relativePackageJsons = @(
        "examples/browser/package.json",
        "examples/electron/package.json"
    )
    foreach ($relativePackageJson in $relativePackageJsons) {
        $packageJsonPath = Join-Path $TheiaRoot $relativePackageJson
        if (!(Test-Path -LiteralPath $packageJsonPath)) {
            throw "Application package.json not found: $packageJsonPath"
        }
        $json = Read-JsonFile $packageJsonPath
        if ($null -eq $json.dependencies) {
            continue
        }
        foreach ($packageName in $PackagesToRemove) {
            if ($json.dependencies.PSObject.Properties.Name -contains $packageName) {
                Write-Host "Removing optional package from ${relativePackageJson}: $packageName"
                if (!$DryRun) {
                    $json.dependencies.PSObject.Properties.Remove($packageName)
                }
            }
        }
        if (!$DryRun) {
            Write-JsonFile $packageJsonPath $json
        }
    }
}

function Remove-WorkspacePackageDirectories([string]$TheiaRoot, [string[]]$PackageNames) {
    $excluded = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
    foreach ($packageName in $PackageNames) {
        if (![string]::IsNullOrWhiteSpace($packageName)) {
            [void]$excluded.Add($packageName)
        }
    }
    if ($excluded.Count -eq 0) {
        return
    }
    foreach ($relativeRoot in @("packages", "vendor/openpencil/packages")) {
        $workspacePackagesRoot = Join-Path $TheiaRoot $relativeRoot
        if (!(Test-Path -LiteralPath $workspacePackagesRoot)) {
            continue
        }
        foreach ($packageDirectory in Get-ChildItem -LiteralPath $workspacePackagesRoot -Directory) {
            $packageJsonPath = Join-Path $packageDirectory.FullName "package.json"
            if (!(Test-Path -LiteralPath $packageJsonPath)) {
                continue
            }
            $packageJson = Read-JsonFile $packageJsonPath
            if ([string]::IsNullOrWhiteSpace($packageJson.name)) {
                continue
            }
            if (!$excluded.Contains([string]$packageJson.name)) {
                continue
            }
            Assert-ChildPath $workspacePackagesRoot $packageDirectory.FullName
            Write-Host "Removing package source from release staging: $($packageJson.name)"
            if (!$DryRun) {
                Remove-Item -LiteralPath $packageDirectory.FullName -Recurse -Force
            }
        }
    }
}

function Write-ReleaseProfile([string]$TheiaRoot, [object]$Manifest, [bool]$IncludeCSharp, [bool]$IncludeCodex, [bool]$IncludeLocalOnly) {
    $components = @(
        [ordered]@{
            id = $Manifest.core.id
            label = $Manifest.core.label
            selected = $true
            required = $true
            packages = @($Manifest.core.packages)
        },
        [ordered]@{
            id = "csharp-dotnet"
            label = (Get-OptionalComponent $Manifest "csharp-dotnet").label
            selected = $IncludeCSharp
            required = $false
            packages = @((Get-OptionalComponent $Manifest "csharp-dotnet").packages)
        },
        [ordered]@{
            id = "codex-extension"
            label = (Get-OptionalComponent $Manifest "codex-extension").label
            selected = $IncludeCodex
            required = $false
            packages = @((Get-OptionalComponent $Manifest "codex-extension").packages)
        }
    )
    foreach ($component in @($Manifest.localOnlyComponents)) {
        $components += [ordered]@{
            id = $component.id
            label = $component.label
            selected = $IncludeLocalOnly
            required = $false
            packages = @($component.packages)
        }
    }
    $profile = [ordered]@{
        schemaVersion = 1
        productName = $Manifest.productName
        generatedAt = (Get-Date).ToUniversalTime().ToString("o")
        sourceTheia = $TheiaRoot
        components = $components
    }
    if ($script:ResolvedReleasesUrl) {
        $profile.updates = [ordered]@{
            provider = "github-releases"
            repository = $script:ReleaseRepository
            releasesUrl = $script:ResolvedReleasesUrl
        }
    }
    $profilePath = Join-Path $TheiaRoot "examples/electron/resources/cybervinci-install-profile.json"
    Write-Host "Writing release profile: $profilePath"
    if (!$DryRun) {
        Write-JsonFile $profilePath $profile
    }
}

function Copy-PayloadDirectory(
    [string]$Source,
    [string]$Destination,
    [string[]]$ExcludeDirectories = @(),
    [string[]]$ExcludeFiles = @(),
    [switch]$ExcludeJunctions
) {
    if (!(Test-Path -LiteralPath $Source)) {
        return
    }
    New-Item -ItemType Directory -Force -Path $Destination | Out-Null
    $robocopyArgs = @($Source, $Destination, "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/NP")
    if ($ExcludeJunctions) {
        $robocopyArgs += "/XJ"
    }
    if ($ExcludeDirectories.Count -gt 0) {
        $robocopyArgs += "/XD"
        $robocopyArgs += $ExcludeDirectories
    }
    if ($ExcludeFiles.Count -gt 0) {
        $robocopyArgs += "/XF"
        $robocopyArgs += $ExcludeFiles
    }
    robocopy @robocopyArgs | Out-Null
    if ($LASTEXITCODE -gt 7) {
        throw "robocopy failed for $Source -> $Destination ($LASTEXITCODE)"
    }
}

function Copy-WorkspacePackagesToNodeModules(
    [string]$WorkspacePackagesRoot,
    [string]$NodeModulesRoot,
    [string[]]$ExcludeDirectories,
    [string[]]$ExcludeFiles,
    [string[]]$ExcludedPackageNames = @()
) {
    if (!(Test-Path -LiteralPath $WorkspacePackagesRoot)) {
        return
    }
    $excluded = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
    foreach ($packageName in $ExcludedPackageNames) {
        [void]$excluded.Add($packageName)
    }
    foreach ($packageDirectory in Get-ChildItem -LiteralPath $WorkspacePackagesRoot -Directory) {
        $packageJsonPath = Join-Path $packageDirectory.FullName "package.json"
        if (!(Test-Path -LiteralPath $packageJsonPath)) {
            continue
        }
        $packageJson = Read-JsonFile $packageJsonPath
        if ([string]::IsNullOrWhiteSpace($packageJson.name)) {
            continue
        }
        if ($excluded.Contains([string]$packageJson.name)) {
            Write-Host "Skipping package in release payload: $($packageJson.name)"
            continue
        }
        $relativeModulePath = $packageJson.name.Replace('/', '\')
        $destination = Join-Path $NodeModulesRoot $relativeModulePath
        Copy-PayloadDirectory `
            -Source $packageDirectory.FullName `
            -Destination $destination `
            -ExcludeDirectories $ExcludeDirectories `
            -ExcludeFiles $ExcludeFiles
    }
}

function Remove-PackagesFromNodeModules([string]$NodeModulesRoot, [string[]]$PackageNames) {
    foreach ($packageName in $PackageNames) {
        if ([string]::IsNullOrWhiteSpace($packageName)) {
            continue
        }
        $relativeModulePath = $packageName.Replace('/', '\')
        $target = Join-Path $NodeModulesRoot $relativeModulePath
        if (!(Test-Path -LiteralPath $target)) {
            continue
        }
        Assert-ChildPath $NodeModulesRoot $target
        Write-Host "Removing package from release payload: $packageName"
        Remove-Item -LiteralPath $target -Recurse -Force
    }
}

function New-PortablePayload([string]$TheiaRoot, [string]$Destination, [string]$InstallerScript, [string[]]$PackagesToExclude = @()) {
    Assert-ChildPath $script:InstallerOutputRoot $Destination
    if ($DryRun) {
        Write-Host "Would mirror portable payload $TheiaRoot -> $Destination"
        return
    }
    $electron = Join-Path $TheiaRoot "node_modules/electron/dist/electron.exe"
    $main = Join-Path $TheiaRoot "examples/electron/lib/backend/main.js"
    if (!(Test-Path -LiteralPath $electron)) {
        throw "Electron runtime not found. Run npm install first: $electron"
    }
    if (!(Test-Path -LiteralPath $main)) {
        throw "Built Electron app not found. Run npm run build:electron first: $main"
    }
    if (Test-Path -LiteralPath $Destination) {
        Remove-Item -LiteralPath $Destination -Recurse -Force
    }
    New-Item -ItemType Directory -Force -Path $Destination | Out-Null

    Write-Host "Creating runtime payload: $Destination"
    $commonExcludeFiles = @("*.log", "*.tmp", "*.tsbuildinfo", ".eslintcache", "*.map")
    $workspaceExcludeDirs = @(
        ".git",
        ".cache",
        ".codex-run",
        ".playwright-mcp",
        ".nyc_output",
        "coverage",
        "node_modules",
        "test",
        "tests",
        "__tests__"
    )
    $compiledPackageExcludeDirs = $workspaceExcludeDirs + @("src")

    Copy-PayloadDirectory `
        -Source (Join-Path $TheiaRoot "node_modules") `
        -Destination (Join-Path $Destination "node_modules") `
        -ExcludeDirectories @(".cache", ".nyc_output", "coverage", "test", "tests", "__tests__") `
        -ExcludeFiles $commonExcludeFiles `
        -ExcludeJunctions

    Copy-WorkspacePackagesToNodeModules `
        -WorkspacePackagesRoot (Join-Path $TheiaRoot "packages") `
        -NodeModulesRoot (Join-Path $Destination "node_modules") `
        -ExcludeDirectories $compiledPackageExcludeDirs `
        -ExcludeFiles $commonExcludeFiles `
        -ExcludedPackageNames $PackagesToExclude

    Copy-WorkspacePackagesToNodeModules `
        -WorkspacePackagesRoot (Join-Path $TheiaRoot "vendor/openpencil/packages") `
        -NodeModulesRoot (Join-Path $Destination "node_modules") `
        -ExcludeDirectories $compiledPackageExcludeDirs `
        -ExcludeFiles $commonExcludeFiles `
        -ExcludedPackageNames $PackagesToExclude

    Remove-PackagesFromNodeModules `
        -NodeModulesRoot (Join-Path $Destination "node_modules") `
        -PackageNames $PackagesToExclude

    Copy-PayloadDirectory `
        -Source (Join-Path $TheiaRoot "examples/electron") `
        -Destination (Join-Path $Destination "examples/electron") `
        -ExcludeDirectories $workspaceExcludeDirs `
        -ExcludeFiles $commonExcludeFiles

    Copy-PayloadDirectory `
        -Source (Join-Path $TheiaRoot "plugins") `
        -Destination (Join-Path $Destination "plugins") `
        -ExcludeDirectories $workspaceExcludeDirs `
        -ExcludeFiles $commonExcludeFiles

    Copy-PayloadDirectory `
        -Source (Join-Path $TheiaRoot "Skills") `
        -Destination (Join-Path $Destination "Skills") `
        -ExcludeDirectories $workspaceExcludeDirs `
        -ExcludeFiles $commonExcludeFiles

    $manualSkillsSource = Resolve-RepoPath "Modificacoes/Skills/Manual"
    if (Test-Path -LiteralPath $manualSkillsSource) {
        Copy-PayloadDirectory `
            -Source $manualSkillsSource `
            -Destination (Join-Path $Destination "Skills/Manual") `
            -ExcludeDirectories $workspaceExcludeDirs `
            -ExcludeFiles $commonExcludeFiles
    }

    foreach ($fileName in @("package.json", "package-lock.json", "lerna.json")) {
        $sourceFile = Join-Path $TheiaRoot $fileName
        if (Test-Path -LiteralPath $sourceFile) {
            Copy-Item -LiteralPath $sourceFile -Destination (Join-Path $Destination $fileName) -Force
        }
    }

    $resourcesDir = Join-Path $Destination "resources"
    New-Item -ItemType Directory -Force -Path $resourcesDir | Out-Null
    $iconSource = Resolve-RepoPath "installer/windows/assets/cybervinci.ico"
    if (Test-Path -LiteralPath $iconSource) {
        Copy-Item -LiteralPath $iconSource -Destination (Join-Path $resourcesDir "cybervinci.ico") -Force
    }

    $launcherLines = @(
        "@echo off",
        "setlocal",
        'set "CYBERVINCI_HOME=%~dp0"',
        'set "CYBERVINCI_INSTALL_PROFILE=%~dp0examples\electron\resources\cybervinci-install-profile.json"'
    )
    if ($script:ResolvedReleasesUrl) {
        $launcherLines += "set `"CYBERVINCI_RELEASES_URL=$($script:ResolvedReleasesUrl)`""
    }
    if ($script:ReleaseRepository) {
        $launcherLines += "set `"CYBERVINCI_RELEASE_REPOSITORY=$($script:ReleaseRepository)`""
    }
    $launcherLines += '"%~dp0node_modules\electron\dist\electron.exe" "%~dp0examples\electron" %*'
    $launcher = ($launcherLines -join "`r`n") + "`r`n"
    Set-Content -LiteralPath (Join-Path $Destination "CyberVinci.cmd") -Value $launcher -Encoding ASCII

    $hiddenLauncherLines = @(
        "Option Explicit",
        "Dim shell, fso, appDir, command, i, argument",
        'Set shell = CreateObject("WScript.Shell")',
        'Set fso = CreateObject("Scripting.FileSystemObject")',
        "appDir = fso.GetParentFolderName(WScript.ScriptFullName)",
        "shell.CurrentDirectory = appDir",
        'shell.Environment("PROCESS")("CYBERVINCI_HOME") = appDir & "\"',
        'shell.Environment("PROCESS")("CYBERVINCI_INSTALL_PROFILE") = appDir & "\examples\electron\resources\cybervinci-install-profile.json"'
    )
    if ($script:ResolvedReleasesUrl) {
        $escapedReleasesUrl = $script:ResolvedReleasesUrl.Replace('"', '""')
        $hiddenLauncherLines += "shell.Environment(""PROCESS"")(""CYBERVINCI_RELEASES_URL"") = ""$escapedReleasesUrl"""
    }
    if ($script:ReleaseRepository) {
        $escapedReleaseRepository = $script:ReleaseRepository.Replace('"', '""')
        $hiddenLauncherLines += "shell.Environment(""PROCESS"")(""CYBERVINCI_RELEASE_REPOSITORY"") = ""$escapedReleaseRepository"""
    }
    $hiddenLauncherLines += @(
        'command = """" & appDir & "\node_modules\electron\dist\electron.exe" & """ """ & appDir & "\examples\electron" & """"',
        "For i = 0 To WScript.Arguments.Count - 1",
        '    argument = Replace(WScript.Arguments.Item(i), """", """""")',
        '    command = command & " """ & argument & """"',
        "Next",
        "shell.Run command, 0, False"
    )
    $hiddenLauncher = ($hiddenLauncherLines -join "`r`n") + "`r`n"
    Set-Content -LiteralPath (Join-Path $Destination "CyberVinci.vbs") -Value $hiddenLauncher -Encoding ASCII

    if (Test-Path -LiteralPath $InstallerScript) {
        Copy-Item -LiteralPath $InstallerScript -Destination (Join-Path $Destination "install-cybervinci.ps1") -Force
    }
}

function Invoke-InnoCompiler([string]$Compiler, [string]$PayloadDir, [string]$OutDir, [string]$Version, [string]$VariantName) {
    if (!$Compiler) {
        $cmd = Get-Command ISCC.exe -ErrorAction SilentlyContinue
        if ($cmd) {
            $Compiler = $cmd.Source
        }
        if (!$Compiler) {
            foreach ($candidate in @(
                "C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
                "C:\Program Files\Inno Setup 6\ISCC.exe",
                "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe"
            )) {
                if (Test-Path -LiteralPath $candidate) {
                    $Compiler = $candidate
                    break
                }
            }
        }
    }
    if (!$Compiler -or !(Test-Path -LiteralPath $Compiler)) {
        throw "Inno Setup compiler not found. Install Inno Setup or pass -InnoSetupCompiler <path-to-ISCC.exe>."
    }
    $iss = Resolve-RepoPath "installer/windows/cybervinci.iss"
    Invoke-CheckedCommand $Compiler @(
        "/DPayloadDir=$PayloadDir",
        "/DOutputDir=$OutDir",
        "/DAppVersion=$Version",
        "/DVariantName=$VariantName",
        "/DOutputBaseFilename=CyberVinci-Setup-$Version-$VariantName",
        $iss
    ) $repoRoot
}

$manifestPath = Resolve-RepoPath $ComponentsManifest
$manifest = Read-JsonFile $manifestPath
$source = Resolve-RepoPath $SourceTheia
$output = Resolve-RepoPath $OutputRoot
if (!$StagingRoot) {
    $StagingRoot = Join-Path $output "staging/theia"
}
$staging = Resolve-RepoPath $StagingRoot
$wizardSelection = $null

if (!$NoWizard -and !$PSBoundParameters.ContainsKey('WithCSharp') -and !$PSBoundParameters.ContainsKey('WithoutCSharp') -and !$PSBoundParameters.ContainsKey('WithCodex') -and !$PSBoundParameters.ContainsKey('WithoutCodex')) {
    $wizard = Show-BuildWizard $manifest $SourceTheia $OutputRoot $StagingRoot
    if ($wizard) {
        $wizardSelection = $wizard
        $source = Resolve-RepoPath $wizard.SourceTheia
        $output = Resolve-RepoPath $wizard.OutputRoot
        $staging = Resolve-RepoPath $wizard.StagingRoot
        $SkipNpmInstall = [System.Management.Automation.SwitchParameter]::new([bool]$wizard.SkipNpmInstall)
        $SkipBuild = [System.Management.Automation.SwitchParameter]::new([bool]$wizard.SkipBuild)
        $PackagePortable = [System.Management.Automation.SwitchParameter]::new([bool]$wizard.PackagePortable)
    }
}

if (!(Test-Path -LiteralPath $source)) {
    throw "Source Theia directory not found: $source"
}
$script:InstallerOutputRoot = $output

$includeCSharp = if ($PSBoundParameters.ContainsKey('WithCSharp')) {
    $true
} elseif ($PSBoundParameters.ContainsKey('WithoutCSharp')) {
    $false
} elseif ($wizardSelection) {
    [bool]$wizardSelection.WithCSharp
} else {
    [bool](Get-OptionalComponent $manifest "csharp-dotnet").defaultSelected
}

$includeCodex = if ($PSBoundParameters.ContainsKey('WithCodex')) {
    $true
} elseif ($PSBoundParameters.ContainsKey('WithoutCodex')) {
    $false
} elseif ($wizardSelection) {
    [bool]$wizardSelection.WithCodex
} else {
    [bool](Get-OptionalComponent $manifest "codex-extension").defaultSelected
}

$variantParts = New-Object System.Collections.Generic.List[string]
if ($includeCSharp) {
    [void]$variantParts.Add("csharp")
}
if ($includeCodex) {
    [void]$variantParts.Add("codex")
}
$variantName = if ($variantParts.Count -eq 0) {
    "core"
} elseif ($variantParts.Count -eq 2) {
    "full"
} else {
    $variantParts -join "-"
}
$includeLocalOnly = $variantName -eq "full"

Write-Host "CyberVinci installer profile" -ForegroundColor Green
Write-Host "  Source:  $source"
Write-Host "  Staging: $staging"
Write-Host "  Output:  $output"
Write-Host "  Version: $AppVersion"
Write-Host "  Variant: $variantName"
Write-Host "  C#/.NET tooling: $includeCSharp"
Write-Host "  Codex extension: $includeCodex"
Write-Host "  All local/factory components: $includeLocalOnly"
if ($manifest.PSObject.Properties.Name -contains 'localOnlyComponents') {
    $localOnlyLabels = New-Object System.Collections.Generic.List[string]
    foreach ($component in @($manifest.localOnlyComponents)) {
        [void]$localOnlyLabels.Add([string]$component.label)
    }
    $localOnlyDisposition = if ($includeLocalOnly) { "included" } else { "excluded" }
    Write-Host "  Local/factory components ${localOnlyDisposition}: $($localOnlyLabels.ToArray() -join ', ')"
}

if (!$SkipCopy) {
    Copy-TheiaToStaging $source $staging
}

$packagesToRemove = New-Object System.Collections.Generic.List[string]
if (!$includeLocalOnly) {
    foreach ($pkg in (Get-ComponentPackages @($manifest.localOnlyComponents))) {
        [void]$packagesToRemove.Add($pkg)
    }
}
if (!$includeCSharp) {
    foreach ($pkg in (Get-OptionalComponent $manifest "csharp-dotnet").packages) {
        [void]$packagesToRemove.Add($pkg)
    }
}
if (!$includeCodex) {
    foreach ($pkg in (Get-OptionalComponent $manifest "codex-extension").packages) {
        [void]$packagesToRemove.Add($pkg)
    }
}

if ($packagesToRemove.Count -gt 0) {
    Update-AppPackageDependencies $staging $packagesToRemove.ToArray()
    Remove-WorkspacePackageDirectories $staging $packagesToRemove.ToArray()
}
Write-ReleaseProfile $staging $manifest $includeCSharp $includeCodex $includeLocalOnly

if (!$SkipNpmInstall) {
    Invoke-CheckedCommand "npm.cmd" @("install") $staging
}
if (!$SkipBuild) {
    Invoke-CheckedCommand "npm.cmd" @("run", "compile") $staging
    Invoke-CheckedCommand "npm.cmd" @("run", "build:electron") $staging
}

$payload = Join-Path $output "payload/CyberVinci"
if ($PackagePortable) {
    New-PortablePayload $staging $payload (Resolve-RepoPath "installer/windows/install-cybervinci.ps1") $packagesToRemove.ToArray()
}
if ($CompileInno) {
    Invoke-InnoCompiler $InnoSetupCompiler $payload (Join-Path $output "windows") $AppVersion $variantName
}

Write-Host "Done." -ForegroundColor Green
Write-Host "Release profile: $(Join-Path $staging 'examples/electron/resources/cybervinci-install-profile.json')"
if ($PackagePortable) {
    Write-Host "Portable payload: $payload"
}
