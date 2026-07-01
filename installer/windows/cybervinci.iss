#ifndef PayloadDir
#error Build with /DPayloadDir=<path-to-payload>
#endif

#ifndef OutputDir
#define OutputDir ".\dist\cybervinci-installer\windows"
#endif

#ifndef AppVersion
#define AppVersion "0.1.2"
#endif

#ifndef VariantName
#define VariantName "full"
#endif

#ifndef OutputBaseFilename
#define OutputBaseFilename "CyberVinci-Setup-" + AppVersion + "-" + VariantName
#endif

[Setup]
AppId={{E63D4C08-1B92-4C53-9EA9-CF2B2E04B811}
AppName=CyberVinci
AppVersion={#AppVersion}
AppVerName=CyberVinci {#AppVersion} ({#VariantName})
AppPublisher=CyberVinci
DefaultDirName={localappdata}\Programs\CyberVinci
DefaultGroupName=CyberVinci
DisableProgramGroupPage=no
AllowNoIcons=yes
OutputDir={#OutputDir}
OutputBaseFilename={#OutputBaseFilename}
Compression=lzma2/max
SolidCompression=no
LZMANumBlockThreads=2
WizardStyle=modern
SetupLogging=yes
SetupIconFile=assets\cybervinci.ico
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
UninstallDisplayName=CyberVinci
UninstallDisplayIcon={app}\resources\cybervinci.ico
VersionInfoCompany=CyberVinci
VersionInfoDescription=CyberVinci Desktop Installer
VersionInfoProductName=CyberVinci
VersionInfoProductVersion={#AppVersion}
VersionInfoVersion={#AppVersion}.0
InfoBeforeFile=setup-info.txt

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[InstallDelete]
; Remove optional or local-only packages from previous installs before copying this variant.
; Selected packages are copied again by the current payload.
Type: filesandordirs; Name: "{app}\node_modules\@cybervinci\ai-output-cleaner"
Type: filesandordirs; Name: "{app}\node_modules\@cybervinci\arena"
Type: filesandordirs; Name: "{app}\node_modules\@cybervinci\builder"
Type: filesandordirs; Name: "{app}\node_modules\@cybervinci\builder-ai"
Type: filesandordirs; Name: "{app}\node_modules\@cybervinci\builder-editor-puck"
Type: filesandordirs; Name: "{app}\node_modules\@cybervinci\builder-export-html"
Type: filesandordirs; Name: "{app}\node_modules\@cybervinci\builder-export-react"
Type: filesandordirs; Name: "{app}\node_modules\@cybervinci\builder-property-panel-rjsf"
Type: filesandordirs; Name: "{app}\node_modules\@cybervinci\builder-registry"
Type: filesandordirs; Name: "{app}\node_modules\@cybervinci\builder-renderer-mantine"
Type: filesandordirs; Name: "{app}\node_modules\@cybervinci\builder-schema"
Type: filesandordirs; Name: "{app}\node_modules\@cybervinci\codex"
Type: filesandordirs; Name: "{app}\node_modules\@cybervinci\csharp-kit"
Type: filesandordirs; Name: "{app}\node_modules\@cybervinci\library"
Type: filesandordirs; Name: "{app}\node_modules\@cybervinci\memory"
Type: filesandordirs; Name: "{app}\node_modules\@cybervinci\memory-roslyn"

[Files]
Source: "{#PayloadDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Dirs]
Name: "{userappdata}\CyberVinci"

[Icons]
Name: "{group}\CyberVinci"; Filename: "{win}\System32\wscript.exe"; Parameters: """{app}\CyberVinci.vbs"""; WorkingDir: "{app}"; IconFilename: "{app}\resources\cybervinci.ico"; AppUserModelID: "CyberVinci.CyberVinci"
Name: "{autodesktop}\CyberVinci"; Filename: "{win}\System32\wscript.exe"; Parameters: """{app}\CyberVinci.vbs"""; WorkingDir: "{app}"; IconFilename: "{app}\resources\cybervinci.ico"; AppUserModelID: "CyberVinci.CyberVinci"; Tasks: desktopicon

[Run]
Filename: "{win}\System32\wscript.exe"; Parameters: """{app}\CyberVinci.vbs"""; Description: "{cm:LaunchProgram,CyberVinci}"; Flags: nowait postinstall skipifsilent
