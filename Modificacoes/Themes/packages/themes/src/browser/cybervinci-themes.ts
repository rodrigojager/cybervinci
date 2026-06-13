import type { MonacoThemeJson } from '@theia/monaco/lib/browser/monaco-theming-service';

declare const require: <T = unknown>(path: string) => T;

export interface CyberVinciThemeInfo {
    readonly id: string;
    readonly label: string;
    readonly shortLabel: string;
    readonly description: string;
    readonly family: string;
}

interface ThemePalette {
    readonly id: string;
    readonly label: string;
    readonly shortLabel?: string;
    readonly description?: string;
    readonly family?: string;
    readonly accent: string;
    readonly accent2: string;
    readonly button: string;
    readonly buttonHover: string;
    readonly status: string;
    readonly statusForeground?: string;
    readonly titlebar: string;
    readonly activity: string;
    readonly activityHover?: string;
    readonly sidebar: string;
    readonly editor: string;
    readonly tabs: string;
    readonly panel: string;
    readonly tab: string;
    readonly tabActive: string;
    readonly border: string;
    readonly hover: string;
    readonly selection: string;
    readonly glow: boolean;
    readonly input?: string;
    readonly foreground?: string;
    readonly foregroundMuted?: string;
    readonly foregroundFaint?: string;
    readonly danger?: string;
    readonly warning?: string;
    readonly success?: string;
    readonly syntax?: SyntaxPalette;
    readonly colorOverrides?: ThemeColorOverrides;
    readonly semanticTokenColors?: ThemeSemanticTokenColors;
}

interface SyntaxPalette {
    readonly comment?: string;
    readonly commentFontStyle?: string;
    readonly string?: string;
    readonly number?: string;
    readonly constant?: string;
    readonly keyword?: string;
    readonly function?: string;
    readonly type?: string;
    readonly variable?: string;
    readonly parameter?: string;
    readonly tag?: string;
    readonly attribute?: string;
    readonly invalid?: string;
}

type ThemeColorOverrides = Readonly<Record<string, string>>;
type ThemeSemanticTokenColors = Readonly<Record<string, string>>;
interface ImportedThemeDefinition {
    readonly id: string;
    readonly label: string;
    readonly shortLabel: string;
    readonly description: string;
    readonly family: string;
    readonly uiTheme?: MonacoThemeJson['uiTheme'];
    readonly json: unknown;
}

interface ImportedThemeData {
    readonly baseTokenColors: unknown[];
    readonly themes: ImportedThemeDefinition[];
}

type ResolvedThemePalette = ThemePalette & Required<Pick<ThemePalette,
    'activityHover' |
    'input' |
    'foreground' |
    'foregroundMuted' |
    'foregroundFaint' |
    'danger' |
    'warning' |
    'success' |
    'statusForeground'
>>;

const importedThemeData = require<ImportedThemeData>('../../src/browser/data/imported-themes.json');

const DEFAULTS = {
    input: '#2b2b2b',
    foreground: '#cccccc',
    foregroundMuted: '#8d8d8d',
    foregroundFaint: '#6a6a6a',
    danger: '#f14c4c',
    warning: '#cca700',
    success: '#89d185',
    statusForeground: '#ffffff'
} as const;

const palettes: ThemePalette[] = [
    {
        id: 'blue-v1',
        label: 'CyberVinci Blue V1',
        accent: '#00a8ff',
        accent2: '#66d9ff',
        button: '#007acc',
        buttonHover: '#0698f2',
        status: '#007acc',
        titlebar: '#141821',
        activity: '#141821',
        activityHover: '#2a3548',
        sidebar: '#181c26',
        editor: '#171b24',
        tabs: '#151923',
        panel: '#161a22',
        tab: '#202634',
        tabActive: '#171b24',
        border: '#30394b',
        hover: '#00a8ff1f',
        selection: '#00a8ff42',
        glow: true
    },
    {
        id: 'blue-v2',
        label: 'CyberVinci Blue V2',
        accent: '#4b9eff',
        accent2: '#8fc5ff',
        button: '#2f75d6',
        buttonHover: '#3f85e5',
        status: '#285b9a',
        titlebar: '#171b22',
        activity: '#171b22',
        activityHover: '#222a36',
        sidebar: '#1b2028',
        editor: '#1b1f26',
        tabs: '#181d24',
        panel: '#1a1f27',
        tab: '#222833',
        tabActive: '#1b1f26',
        border: '#2a3340',
        hover: '#ffffff0e',
        selection: '#4b9eff2e',
        glow: false
    },
    {
        id: 'blue-v3',
        label: 'CyberVinci Blue V3',
        accent: '#6aa9ff',
        accent2: '#a5cdfb',
        button: '#365f98',
        buttonHover: '#416da9',
        status: '#243c5e',
        titlebar: '#1b1e23',
        activity: '#1b1e23',
        activityHover: '#252b33',
        sidebar: '#1e2228',
        editor: '#20242b',
        tabs: '#1c2026',
        panel: '#1d2127',
        tab: '#242a32',
        tabActive: '#20242b',
        border: '#252b33',
        hover: '#ffffff0a',
        selection: '#6aa9ff24',
        glow: false
    },
    {
        id: 'copper-v1',
        label: 'CyberVinci Copper V1',
        accent: '#d7823b',
        accent2: '#ffbd7a',
        button: '#a85e25',
        buttonHover: '#c06b2a',
        status: '#9a531e',
        titlebar: '#1f1712',
        activity: '#1b130f',
        activityHover: '#35261c',
        sidebar: '#211812',
        editor: '#1d1814',
        tabs: '#1b140f',
        panel: '#201711',
        tab: '#2d2119',
        tabActive: '#1d1814',
        border: '#463225',
        hover: '#d7823b1f',
        selection: '#d7823b3d',
        glow: true
    },
    {
        id: 'copper-v2',
        label: 'CyberVinci Copper V2',
        accent: '#bf8a62',
        accent2: '#d9b18f',
        button: '#8e6448',
        buttonHover: '#9e7152',
        status: '#76513b',
        titlebar: '#1d1a17',
        activity: '#1d1a17',
        activityHover: '#2a2520',
        sidebar: '#211f1c',
        editor: '#22201d',
        tabs: '#1e1b18',
        panel: '#211e1b',
        tab: '#2a2621',
        tabActive: '#22201d',
        border: '#332c26',
        hover: '#ffffff0d',
        selection: '#bf8a6229',
        glow: false
    },
    {
        id: 'copper-v3',
        label: 'CyberVinci Copper V3',
        accent: '#c9a27e',
        accent2: '#e1c0a1',
        button: '#70533e',
        buttonHover: '#7f6048',
        status: '#574132',
        titlebar: '#201e1b',
        activity: '#201e1b',
        activityHover: '#2b2824',
        sidebar: '#25221f',
        editor: '#272421',
        tabs: '#211f1c',
        panel: '#24211e',
        tab: '#2c2925',
        tabActive: '#272421',
        border: '#2f2b26',
        hover: '#ffffff09',
        selection: '#c9a27e21',
        glow: false
    },
    {
        id: 'emerald-v1',
        label: 'CyberVinci Emerald V1',
        accent: '#00c889',
        accent2: '#7fffd4',
        button: '#00875f',
        buttonHover: '#00a776',
        status: '#007d5c',
        titlebar: '#101b18',
        activity: '#101b18',
        activityHover: '#1b332b',
        sidebar: '#14211d',
        editor: '#121d1a',
        tabs: '#101a17',
        panel: '#121f1b',
        tab: '#1d2d28',
        tabActive: '#121d1a',
        border: '#28443b',
        hover: '#00c8891f',
        selection: '#00c8893d',
        glow: true
    },
    {
        id: 'emerald-v2',
        label: 'CyberVinci Emerald V2',
        accent: '#55c49b',
        accent2: '#91d9bd',
        button: '#3e876e',
        buttonHover: '#4b9a7f',
        status: '#356f5c',
        titlebar: '#171d1b',
        activity: '#171d1b',
        activityHover: '#232d29',
        sidebar: '#1b2320',
        editor: '#1c2220',
        tabs: '#181f1d',
        panel: '#1a211f',
        tab: '#242d2a',
        tabActive: '#1c2220',
        border: '#2b3934',
        hover: '#ffffff0d',
        selection: '#55c49b29',
        glow: false
    },
    {
        id: 'emerald-v3',
        label: 'CyberVinci Emerald V3',
        accent: '#84cdb0',
        accent2: '#b4e1cf',
        button: '#4b6f61',
        buttonHover: '#587e6e',
        status: '#344d44',
        titlebar: '#1d211f',
        activity: '#1d211f',
        activityHover: '#28302d',
        sidebar: '#212724',
        editor: '#232925',
        tabs: '#1f2421',
        panel: '#202622',
        tab: '#29302c',
        tabActive: '#232925',
        border: '#2b332f',
        hover: '#ffffff09',
        selection: '#84cdb01f',
        glow: false
    },
    {
        id: 'purple-v1',
        label: 'CyberVinci Purple V1',
        accent: '#9d5cff',
        accent2: '#66e0ff',
        button: '#6f42c1',
        buttonHover: '#8251dc',
        status: '#5c3ba0',
        titlebar: '#171222',
        activity: '#171222',
        activityHover: '#2b2140',
        sidebar: '#1d1728',
        editor: '#1a1722',
        tabs: '#171321',
        panel: '#1b1625',
        tab: '#282037',
        tabActive: '#1a1722',
        border: '#3c3150',
        hover: '#9d5cff21',
        selection: '#9d5cff3d',
        glow: true
    },
    {
        id: 'purple-v2',
        label: 'CyberVinci Purple V2',
        accent: '#8f7bdc',
        accent2: '#a99ee8',
        button: '#6658a8',
        buttonHover: '#7466b9',
        status: '#554b86',
        titlebar: '#1b1922',
        activity: '#1b1922',
        activityHover: '#292633',
        sidebar: '#201e28',
        editor: '#201f27',
        tabs: '#1c1a22',
        panel: '#1f1d25',
        tab: '#292733',
        tabActive: '#201f27',
        border: '#302d3d',
        hover: '#ffffff0d',
        selection: '#8f7bdc29',
        glow: false
    },
    {
        id: 'purple-v3',
        label: 'CyberVinci Purple V3',
        accent: '#aaa0d8',
        accent2: '#c5bff0',
        button: '#5d5578',
        buttonHover: '#6c638a',
        status: '#46405c',
        titlebar: '#202027',
        activity: '#202027',
        activityHover: '#2d2d37',
        sidebar: '#24242d',
        editor: '#262630',
        tabs: '#21212a',
        panel: '#23232b',
        tab: '#2d2d37',
        tabActive: '#262630',
        border: '#2e2e38',
        hover: '#ffffff09',
        selection: '#aaa0d81f',
        glow: false
    },
    {
        id: 'arctic-v1',
        label: 'CyberVinci Arctic V1',
        accent: '#6ea8ff',
        accent2: '#b7d4ff',
        button: '#376fb7',
        buttonHover: '#4580cc',
        status: '#315f9b',
        titlebar: '#1c2128',
        activity: '#1c2128',
        activityHover: '#303944',
        sidebar: '#222832',
        editor: '#242b34',
        tabs: '#1f252d',
        panel: '#202731',
        tab: '#2c3541',
        tabActive: '#242b34',
        border: '#3b4653',
        hover: '#6ea8ff1f',
        selection: '#6ea8ff38',
        glow: true
    },
    {
        id: 'arctic-v2',
        label: 'CyberVinci Arctic V2',
        accent: '#8db6ef',
        accent2: '#bed7f7',
        button: '#557497',
        buttonHover: '#6686aa',
        status: '#465e7a',
        titlebar: '#21252b',
        activity: '#21252b',
        activityHover: '#303740',
        sidebar: '#262b32',
        editor: '#292f36',
        tabs: '#23282f',
        panel: '#252b32',
        tab: '#303741',
        tabActive: '#292f36',
        border: '#333b45',
        hover: '#ffffff0d',
        selection: '#8db6ef26',
        glow: false
    },
    {
        id: 'arctic-v3',
        label: 'CyberVinci Arctic V3',
        accent: '#a9bfdc',
        accent2: '#ccd9ea',
        button: '#5b6878',
        buttonHover: '#687687',
        status: '#434c58',
        titlebar: '#26292e',
        activity: '#26292e',
        activityHover: '#353a41',
        sidebar: '#2b2f35',
        editor: '#30343a',
        tabs: '#282c31',
        panel: '#2a2f35',
        tab: '#353a41',
        tabActive: '#30343a',
        border: '#373d44',
        hover: '#ffffff09',
        selection: '#a9bfdc1f',
        glow: false
    },
    {
        id: 'terminal-v1',
        label: 'CyberVinci Terminal V1',
        accent: '#00d26a',
        accent2: '#8cffb6',
        button: '#008f49',
        buttonHover: '#00aa58',
        status: '#007a3e',
        titlebar: '#0e1812',
        activity: '#0d160f',
        activityHover: '#1b2f20',
        sidebar: '#111c14',
        editor: '#0f1711',
        tabs: '#0e160f',
        panel: '#101a13',
        tab: '#1a2a1e',
        tabActive: '#0f1711',
        border: '#284632',
        hover: '#00d26a21',
        selection: '#00d26a3b',
        glow: true
    },
    {
        id: 'terminal-v2',
        label: 'CyberVinci Terminal V2',
        accent: '#67c98f',
        accent2: '#a6ddb9',
        button: '#4a805e',
        buttonHover: '#58936d',
        status: '#3d684e',
        titlebar: '#171d18',
        activity: '#171d18',
        activityHover: '#242d26',
        sidebar: '#1b231d',
        editor: '#1c221d',
        tabs: '#181f19',
        panel: '#1a211c',
        tab: '#242d26',
        tabActive: '#1c221d',
        border: '#2b392e',
        hover: '#ffffff0d',
        selection: '#67c98f26',
        glow: false
    },
    {
        id: 'terminal-v3',
        label: 'CyberVinci Terminal V3',
        accent: '#96c7a7',
        accent2: '#bddfc8',
        button: '#526c5a',
        buttonHover: '#607c68',
        status: '#3f5246',
        titlebar: '#1f221f',
        activity: '#1f221f',
        activityHover: '#2d332d',
        sidebar: '#242824',
        editor: '#262b26',
        tabs: '#212521',
        panel: '#232823',
        tab: '#2d332d',
        tabActive: '#262b26',
        border: '#303730',
        hover: '#ffffff09',
        selection: '#96c7a71f',
        glow: false
    },
    {
        id: 'vscode-default',
        label: 'VS Code Default Dark',
        shortLabel: 'VS Code Default',
        description: 'VS Code Dark+ default workbench colors',
        family: 'VS Code',
        accent: '#007acc',
        accent2: '#9cdcfe',
        button: '#0e639c',
        buttonHover: '#1177bb',
        status: '#007acc',
        statusForeground: '#ffffff',
        titlebar: '#3c3c3c',
        activity: '#333333',
        activityHover: '#333333',
        sidebar: '#252526',
        editor: '#1e1e1e',
        tabs: '#252526',
        panel: '#1e1e1e',
        tab: '#2d2d2d',
        tabActive: '#1e1e1e',
        border: '#3c3c3c',
        hover: '#2a2d2e',
        selection: '#264f78',
        glow: false,
        input: '#3c3c3c',
        foreground: '#cccccc',
        foregroundMuted: '#858585',
        foregroundFaint: '#6a6a6a',
        danger: '#f44747',
        warning: '#cca700',
        success: '#89d185',
        syntax: {
            comment: '#6a9955',
            commentFontStyle: '',
            string: '#ce9178',
            number: '#b5cea8',
            constant: '#569cd6',
            keyword: '#569cd6',
            function: '#dcdcaa',
            type: '#4ec9b0',
            variable: '#9cdcfe',
            parameter: '#9cdcfe',
            tag: '#569cd6',
            attribute: '#9cdcfe',
            invalid: '#f44747'
        },
        semanticTokenColors: {
            newOperator: '#c586c0',
            stringLiteral: '#ce9178',
            customLiteral: '#dcdcaa',
            numberLiteral: '#b5cea8'
        },
        colorOverrides: {
            'checkbox.border': '#6b6b6b',
            'descriptionForeground': '#ccccccb3',
            'editor.foreground': '#d4d4d4',
            'editor.inactiveSelectionBackground': '#3a3d41',
            'editor.selectionHighlightBackground': '#add6ff26',
            'editorIndentGuide.background1': '#404040',
            'editorIndentGuide.activeBackground1': '#707070',
            'list.activeSelectionBackground': '#04395e',
            'list.activeSelectionForeground': '#ffffff',
            'list.inactiveSelectionBackground': '#37373d',
            'list.hoverBackground': '#2a2d2e',
            'list.focusBackground': '#04395e',
            'list.dropBackground': '#383b3d',
            'list.activeSelectionIconForeground': '#ffffff',
            'activityBar.background': '#333333',
            'activityBar.foreground': '#ffffff',
            'activityBar.inactiveForeground': '#ffffff66',
            'activityBar.activeBackground': '#333333',
            'activityBar.activeBorder': '#ffffff',
            'activityBar.border': '#00000000',
            'activityBarBadge.background': '#007acc',
            'activityBarBadge.foreground': '#ffffff',
            'sideBar.background': '#252526',
            'sideBarTitle.foreground': '#bbbbbb',
            'sideBarSectionHeader.background': '#00000000',
            'sideBarSectionHeader.border': '#cccccc33',
            'menu.background': '#252526',
            'menu.foreground': '#cccccc',
            'menu.separatorBackground': '#454545',
            'menu.border': '#454545',
            'menu.selectionBackground': '#0078d4',
            'menu.selectionForeground': '#ffffff',
            'menu.selectionBorder': '#00000000',
            'editorGroupHeader.tabsBackground': '#252526',
            'editorGroupHeader.tabsBorder': '#252526',
            'tab.activeBackground': '#1e1e1e',
            'tab.activeForeground': '#ffffff',
            'tab.inactiveBackground': '#2d2d2d',
            'tab.inactiveForeground': '#ffffff80',
            'tab.hoverBackground': '#2d2d2d',
            'tab.border': '#252526',
            'tab.activeBorder': '#1e1e1e',
            'tab.activeBorderTop': '#007acc',
            'panel.background': '#1e1e1e',
            'panel.border': '#80808059',
            'statusBar.background': '#007acc',
            'statusBar.foreground': '#ffffff',
            'statusBar.noFolderBackground': '#68217a',
            'statusBar.noFolderForeground': '#ffffff',
            'statusBarItem.hoverBackground': '#ffffff1f',
            'input.background': '#3c3c3c',
            'input.foreground': '#cccccc',
            'input.placeholderForeground': '#a6a6a6',
            'button.background': '#0e639c',
            'button.foreground': '#ffffff',
            'button.hoverBackground': '#1177bb',
            'button.secondaryBackground': '#3a3d41',
            'button.secondaryForeground': '#cccccc',
            'button.secondaryHoverBackground': '#45494e',
            'dropdown.background': '#3c3c3c',
            'dropdown.foreground': '#cccccc',
            'dropdown.listBackground': '#252526',
            'badge.background': '#4d4d4d',
            'badge.foreground': '#ffffff',
            'quickInput.background': '#252526',
            'quickInputTitle.background': '#3c3c3c',
            'quickInputList.focusBackground': '#04395e',
            'quickInputList.focusForeground': '#ffffff',
            'pickerGroup.border': '#3c3c3c',
            'terminal.background': '#1e1e1e',
            'terminal.foreground': '#cccccc',
            'terminal.ansiBlack': '#000000',
            'terminal.ansiRed': '#cd3131',
            'terminal.ansiGreen': '#0dbc79',
            'terminal.ansiYellow': '#e5e510',
            'terminal.ansiBlue': '#2472c8',
            'terminal.ansiMagenta': '#bc3fbc',
            'terminal.ansiCyan': '#11a8cd',
            'terminal.ansiWhite': '#e5e5e5',
            'terminal.ansiBrightBlack': '#666666',
            'terminal.ansiBrightRed': '#f14c4c',
            'terminal.ansiBrightGreen': '#23d18b',
            'terminal.ansiBrightYellow': '#f5f543',
            'terminal.ansiBrightBlue': '#3b8eea',
            'terminal.ansiBrightMagenta': '#d670d6',
            'terminal.ansiBrightCyan': '#29b8db',
            'terminal.ansiBrightWhite': '#e5e5e5',
            'widget.border': '#303031'
        }
    },
    {
        id: 'cursor-ide',
        label: 'Cursor IDE',
        shortLabel: 'Cursor IDE',
        description: 'Cursor IDE dark modern workbench colors',
        family: 'Cursor',
        accent: '#0078d4',
        accent2: '#40a6ff',
        button: '#0078d4',
        buttonHover: '#026ec1',
        status: '#181818',
        statusForeground: '#cccccc',
        titlebar: '#181818',
        activity: '#181818',
        activityHover: '#1f1f1f',
        sidebar: '#181818',
        editor: '#1f1f1f',
        tabs: '#181818',
        panel: '#181818',
        tab: '#181818',
        tabActive: '#1f1f1f',
        border: '#2b2b2b',
        hover: '#2b2b2b',
        selection: '#2489db82',
        glow: false,
        input: '#313131',
        foreground: '#cccccc',
        foregroundMuted: '#9d9d9d',
        foregroundFaint: '#6e7681',
        danger: '#f85149',
        warning: '#e2c08d',
        success: '#2ea043',
        syntax: {
            comment: '#6a9955',
            commentFontStyle: '',
            string: '#ce9178',
            number: '#b5cea8',
            constant: '#569cd6',
            keyword: '#569cd6',
            function: '#dcdcaa',
            type: '#4ec9b0',
            variable: '#9cdcfe',
            parameter: '#9cdcfe',
            tag: '#569cd6',
            attribute: '#9cdcfe',
            invalid: '#f85149'
        },
        semanticTokenColors: {
            newOperator: '#c586c0',
            stringLiteral: '#ce9178',
            customLiteral: '#dcdcaa',
            numberLiteral: '#b5cea8'
        },
        colorOverrides: {
            'activityBar.activeBorder': '#0078d4',
            'activityBar.background': '#181818',
            'activityBar.border': '#2b2b2b',
            'activityBar.foreground': '#d7d7d7',
            'activityBar.inactiveForeground': '#868686',
            'activityBarBadge.background': '#0078d4',
            'activityBarBadge.foreground': '#ffffff',
            'badge.background': '#616161',
            'badge.foreground': '#f8f8f8',
            'button.background': '#0078d4',
            'button.border': '#ffffff12',
            'button.foreground': '#ffffff',
            'button.hoverBackground': '#026ec1',
            'button.secondaryBackground': '#313131',
            'button.secondaryForeground': '#cccccc',
            'button.secondaryHoverBackground': '#3c3c3c',
            'checkbox.background': '#313131',
            'checkbox.border': '#3c3c3c',
            'debugToolBar.background': '#181818',
            'descriptionForeground': '#9d9d9d',
            'dropdown.background': '#313131',
            'dropdown.border': '#3c3c3c',
            'dropdown.foreground': '#cccccc',
            'dropdown.listBackground': '#1f1f1f',
            'editor.background': '#1f1f1f',
            'editor.findMatchBackground': '#9e6a03',
            'editor.foreground': '#cccccc',
            'editorGroup.border': '#ffffff17',
            'editorGroupHeader.tabsBackground': '#181818',
            'editorGroupHeader.tabsBorder': '#2b2b2b',
            'editorGutter.addedBackground': '#2ea043',
            'editorGutter.deletedBackground': '#f85149',
            'editorGutter.modifiedBackground': '#0078d4',
            'editorLineNumber.activeForeground': '#cccccc',
            'editorLineNumber.foreground': '#6e7681',
            'editorOverviewRuler.border': '#010409',
            'editorWidget.background': '#202020',
            'errorForeground': '#f85149',
            'focusBorder': '#0078d4',
            'foreground': '#cccccc',
            'icon.foreground': '#cccccc',
            'input.background': '#313131',
            'input.border': '#3c3c3c',
            'input.foreground': '#cccccc',
            'input.placeholderForeground': '#989898',
            'inputOption.activeBackground': '#2489db82',
            'inputOption.activeBorder': '#2488db',
            'keybindingLabel.foreground': '#cccccc',
            'list.activeSelectionBackground': '#04395e',
            'list.activeSelectionForeground': '#ffffff',
            'list.inactiveSelectionBackground': '#37373d',
            'list.hoverBackground': '#2a2d2e',
            'list.focusBackground': '#04395e',
            'list.dropBackground': '#383b3d',
            'list.activeSelectionIconForeground': '#ffffff',
            'menu.background': '#1f1f1f',
            'menu.foreground': '#cccccc',
            'menu.selectionBackground': '#0078d4',
            'menu.selectionForeground': '#ffffff',
            'notificationCenterHeader.background': '#1f1f1f',
            'notificationCenterHeader.foreground': '#cccccc',
            'notifications.background': '#1f1f1f',
            'notifications.border': '#2b2b2b',
            'notifications.foreground': '#cccccc',
            'panel.background': '#181818',
            'panel.border': '#2b2b2b',
            'panelInput.border': '#2b2b2b',
            'panelTitle.activeBorder': '#0078d4',
            'panelTitle.activeForeground': '#cccccc',
            'panelTitle.inactiveForeground': '#9d9d9d',
            'pickerGroup.border': '#3c3c3c',
            'progressBar.background': '#0078d4',
            'quickInput.background': '#222222',
            'quickInput.foreground': '#cccccc',
            'quickInputList.focusBackground': '#04395e',
            'quickInputList.focusForeground': '#ffffff',
            'sideBar.background': '#181818',
            'sideBar.border': '#2b2b2b',
            'sideBar.foreground': '#cccccc',
            'sideBarSectionHeader.background': '#181818',
            'sideBarSectionHeader.border': '#2b2b2b',
            'sideBarSectionHeader.foreground': '#cccccc',
            'sideBarTitle.foreground': '#cccccc',
            'statusBar.background': '#181818',
            'statusBar.border': '#2b2b2b',
            'statusBar.debuggingBackground': '#0078d4',
            'statusBar.debuggingForeground': '#ffffff',
            'statusBar.focusBorder': '#0078d4',
            'statusBar.foreground': '#cccccc',
            'statusBar.noFolderBackground': '#1f1f1f',
            'statusBar.noFolderForeground': '#cccccc',
            'statusBarItem.focusBorder': '#0078d4',
            'statusBarItem.hoverBackground': '#2b2b2b',
            'statusBarItem.prominentBackground': '#6e768166',
            'statusBarItem.remoteBackground': '#0078d4',
            'statusBarItem.remoteForeground': '#ffffff',
            'tab.activeBackground': '#1f1f1f',
            'tab.activeBorder': '#1f1f1f',
            'tab.activeBorderTop': '#0078d4',
            'tab.activeForeground': '#ffffff',
            'tab.selectedBorderTop': '#6caddf',
            'tab.border': '#2b2b2b',
            'tab.hoverBackground': '#1f1f1f',
            'tab.inactiveBackground': '#181818',
            'tab.inactiveForeground': '#9d9d9d',
            'tab.unfocusedActiveBorder': '#1f1f1f',
            'tab.unfocusedActiveBorderTop': '#2b2b2b',
            'tab.unfocusedHoverBackground': '#1f1f1f',
            'terminal.background': '#1f1f1f',
            'terminal.foreground': '#cccccc',
            'textLink.activeForeground': '#4daafc',
            'textLink.foreground': '#4daafc',
            'titleBar.activeBackground': '#181818',
            'titleBar.activeForeground': '#cccccc',
            'titleBar.border': '#2b2b2b',
            'titleBar.inactiveBackground': '#1f1f1f',
            'titleBar.inactiveForeground': '#9d9d9d',
            'widget.border': '#313131'
        }
    }
];

export const CYBERVINCI_THEME_BODY_CLASS = 'cybervinci-theme';

const paletteThemeInfos: CyberVinciThemeInfo[] = palettes.map(palette => ({
    id: `cybervinci-${palette.id}`,
    label: palette.label,
    shortLabel: palette.shortLabel ?? palette.label,
    description: palette.description ?? toCyberVinciFamilyLabel(palette.id),
    family: palette.family ?? toCyberVinciFamilyLabel(palette.id)
}));

const importedThemeInfos: CyberVinciThemeInfo[] = importedThemeData.themes.map(theme => ({
    id: `cybervinci-${theme.id}`,
    label: theme.label,
    shortLabel: theme.shortLabel,
    description: theme.description,
    family: theme.family
}));

export const CYBERVINCI_THEME_INFOS: CyberVinciThemeInfo[] = [
    ...paletteThemeInfos,
    ...importedThemeInfos
];

export const CYBERVINCI_THEME_IDS = CYBERVINCI_THEME_INFOS.map(theme => theme.id);
export const CYBERVINCI_THEME_CLASS_NAMES = CYBERVINCI_THEME_IDS.map(themeId => `cybervinci-theme-${themeId.replace(/^cybervinci-/, '')}`);

export const CYBERVINCI_THEMES: MonacoThemeJson[] = [
    ...palettes.map((palette, index) => ({
        id: paletteThemeInfos[index].id,
        label: paletteThemeInfos[index].label,
        description: paletteThemeInfos[index].description,
        uiTheme: 'vs-dark' as const,
        json: createThemeJson(palette)
    })),
    ...importedThemeData.themes.map(theme => ({
        id: `cybervinci-${theme.id}`,
        label: theme.label,
        description: theme.description,
        uiTheme: theme.uiTheme ?? 'vs-dark',
        json: normalizeImportedThemeJson(theme)
    }))
];

function normalizeImportedThemeJson(theme: ImportedThemeDefinition): unknown {
    if (!isRecord(theme.json)) {
        return theme.json;
    }

    const colors = theme.json.colors;
    if (!isRecord(colors)) {
        return {
            ...theme.json,
            name: theme.label
        };
    }

    const normalizedColors: Record<string, string> = {};
    for (const [key, value] of Object.entries(colors)) {
        const color = getThemeColorValue(value);
        if (color) {
            normalizedColors[key] = color;
        }
    }

    return {
        ...theme.json,
        name: theme.label,
        colors: normalizedColors
    };
}

function getThemeColorValue(value: unknown): string | undefined {
    if (typeof value === 'string') {
        return value;
    }
    if (Array.isArray(value)) {
        return value.find((item): item is string => typeof item === 'string');
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toFamilyLabel(id: string): string {
    const family = id.split('-')[0];
    return family.charAt(0).toUpperCase() + family.slice(1);
}

function toCyberVinciFamilyLabel(id: string): string {
    return `CyberVinci ${toFamilyLabel(id)}`;
}

function createThemeJson(palette: ThemePalette): unknown {
    const p = withDefaults(palette);
    const statusHover = alpha(p.status, 0.85);
    const panelDrop = alpha(p.accent, 0.22);
    const colors = {
        'foreground': p.foreground,
        'descriptionForeground': p.foregroundMuted,
        'disabledForeground': p.foregroundFaint,
        'errorForeground': p.danger,
        'focusBorder': p.accent,
        'widget.shadow': '#00000073',
        'icon.foreground': p.foregroundMuted,
        'sash.hoverBorder': p.accent,
        'selection.background': p.selection,

        'titleBar.activeBackground': p.titlebar,
        'titleBar.activeForeground': p.foreground,
        'titleBar.inactiveBackground': p.titlebar,
        'titleBar.inactiveForeground': p.foregroundMuted,
        'titleBar.border': p.border,

        'menubar.selectionBackground': p.hover,
        'menubar.selectionForeground': p.foreground,
        'menubar.selectionBorder': p.border,
        'menu.background': p.panel,
        'menu.foreground': p.foreground,
        'menu.border': p.border,
        'menu.selectionBackground': p.hover,
        'menu.selectionForeground': p.foreground,
        'menu.selectionBorder': p.accent,
        'menu.separatorBackground': p.border,

        'activityBar.background': p.activity,
        'activityBar.foreground': p.accent,
        'activityBar.inactiveForeground': p.foregroundMuted,
        'activityBar.activeBackground': p.activityHover,
        'activityBar.activeBorder': p.accent,
        'activityBar.border': p.border,
        'activityBarBadge.background': p.accent,
        'activityBarBadge.foreground': '#ffffff',

        'sideBar.background': p.sidebar,
        'sideBar.foreground': p.foreground,
        'sideBar.border': p.border,
        'sideBarTitle.foreground': p.foreground,
        'sideBarSectionHeader.background': p.sidebar,
        'sideBarSectionHeader.foreground': p.foreground,
        'sideBarSectionHeader.border': p.border,

        'editor.background': p.editor,
        'editor.foreground': p.foreground,
        'editorLineNumber.foreground': p.foregroundFaint,
        'editorLineNumber.activeForeground': p.accent2,
        'editorCursor.foreground': p.accent2,
        'editor.selectionBackground': p.selection,
        'editor.inactiveSelectionBackground': alpha(p.accent, 0.16),
        'editor.selectionHighlightBackground': alpha(p.accent2, 0.18),
        'editor.wordHighlightBackground': alpha(p.accent, 0.16),
        'editor.wordHighlightStrongBackground': alpha(p.accent2, 0.18),
        'editor.findMatchBackground': alpha(p.warning, 0.34),
        'editor.findMatchHighlightBackground': alpha(p.warning, 0.18),
        'editor.lineHighlightBackground': p.hover,
        'editor.lineHighlightBorder': '#00000000',
        'editorWhitespace.foreground': alpha(p.foregroundMuted, 0.35),
        'editorIndentGuide.background1': alpha(p.foregroundMuted, 0.20),
        'editorIndentGuide.activeBackground1': alpha(p.accent2, 0.42),
        'editorBracketMatch.background': alpha(p.accent, 0.16),
        'editorBracketMatch.border': p.accent,
        'editorOverviewRuler.border': p.border,
        'editorGutter.background': p.editor,
        'editorWidget.background': p.panel,
        'editorWidget.foreground': p.foreground,
        'editorWidget.border': p.border,
        'editorHoverWidget.background': p.panel,
        'editorHoverWidget.foreground': p.foreground,
        'editorHoverWidget.border': p.border,
        'editorSuggestWidget.background': p.panel,
        'editorSuggestWidget.foreground': p.foreground,
        'editorSuggestWidget.border': p.border,
        'editorSuggestWidget.selectedBackground': p.hover,
        'editorSuggestWidget.highlightForeground': p.accent2,

        'editorGroup.border': p.border,
        'editorGroup.dropBackground': panelDrop,
        'editorGroupHeader.tabsBackground': p.tabs,
        'editorGroupHeader.tabsBorder': p.border,
        'editorGroupHeader.noTabsBackground': p.editor,

        'tab.activeBackground': p.tabActive,
        'tab.activeForeground': p.foreground,
        'tab.inactiveBackground': p.tab,
        'tab.inactiveForeground': p.foregroundMuted,
        'tab.hoverBackground': p.hover,
        'tab.hoverForeground': p.foreground,
        'tab.border': p.border,
        'tab.activeBorder': p.accent,
        'tab.activeBorderTop': p.accent,
        'tab.unfocusedActiveBackground': p.tabActive,
        'tab.unfocusedActiveForeground': p.foregroundMuted,
        'tab.unfocusedInactiveForeground': p.foregroundFaint,
        'tab.unfocusedActiveBorder': alpha(p.accent, 0.55),
        'tab.unfocusedActiveBorderTop': alpha(p.accent, 0.55),

        'panel.background': p.panel,
        'panel.border': p.border,
        'panel.dropBackground': panelDrop,
        'panelInput.border': p.border,
        'panelTitle.activeForeground': p.foreground,
        'panelTitle.inactiveForeground': p.foregroundMuted,
        'panelTitle.activeBorder': p.accent,

        'statusBar.background': p.status,
        'statusBar.foreground': p.statusForeground,
        'statusBar.border': p.border,
        'statusBar.noFolderBackground': p.status,
        'statusBar.noFolderForeground': p.statusForeground,
        'statusBar.noFolderBorder': p.border,
        'statusBarItem.hoverBackground': statusHover,
        'statusBarItem.activeBackground': alpha(p.statusForeground, 0.16),
        'statusBarItem.prominentBackground': p.button,
        'statusBarItem.prominentForeground': p.statusForeground,
        'statusBarItem.prominentHoverBackground': p.buttonHover,
        'statusBarItem.errorBackground': p.danger,
        'statusBarItem.errorForeground': '#ffffff',
        'statusBarItem.warningBackground': p.warning,
        'statusBarItem.warningForeground': '#1f1f1f',

        'input.background': p.input,
        'input.foreground': p.foreground,
        'input.border': p.border,
        'input.placeholderForeground': p.foregroundFaint,
        'inputOption.activeBackground': alpha(p.accent, 0.20),
        'inputOption.activeBorder': p.accent,
        'inputValidation.errorBackground': alpha(p.danger, 0.18),
        'inputValidation.errorForeground': p.foreground,
        'inputValidation.errorBorder': p.danger,
        'inputValidation.warningBackground': alpha(p.warning, 0.18),
        'inputValidation.warningForeground': p.foreground,
        'inputValidation.warningBorder': p.warning,
        'inputValidation.infoBackground': alpha(p.accent, 0.18),
        'inputValidation.infoForeground': p.foreground,
        'inputValidation.infoBorder': p.accent,

        'button.background': p.button,
        'button.foreground': '#ffffff',
        'button.hoverBackground': p.buttonHover,
        'button.secondaryBackground': p.tab,
        'button.secondaryForeground': p.foreground,
        'button.secondaryHoverBackground': p.activityHover,
        'button.disabledBackground': alpha(p.foregroundMuted, 0.18),
        'button.disabledForeground': alpha(p.foregroundMuted, 0.55),

        'dropdown.background': p.input,
        'dropdown.foreground': p.foreground,
        'dropdown.border': p.border,
        'dropdown.listBackground': p.panel,

        'badge.background': p.accent,
        'badge.foreground': '#ffffff',

        'list.activeSelectionBackground': p.selection,
        'list.activeSelectionForeground': p.foreground,
        'list.activeSelectionIconForeground': p.accent2,
        'list.inactiveSelectionBackground': alpha(p.accent, 0.16),
        'list.inactiveSelectionForeground': p.foreground,
        'list.hoverBackground': p.hover,
        'list.hoverForeground': p.foreground,
        'list.focusBackground': p.hover,
        'list.focusForeground': p.foreground,
        'list.highlightForeground': p.accent2,
        'list.dropBackground': panelDrop,
        'list.filterMatchBackground': alpha(p.warning, 0.24),

        'quickInput.background': p.panel,
        'quickInput.foreground': p.foreground,
        'quickInputTitle.background': p.titlebar,
        'quickInputList.focusBackground': p.hover,
        'quickInputList.focusForeground': p.foreground,
        'quickInputList.focusIconForeground': p.accent2,
        'pickerGroup.border': p.border,
        'pickerGroup.foreground': p.accent2,

        'commandCenter.background': p.panel,
        'commandCenter.foreground': p.foreground,
        'commandCenter.border': p.border,
        'commandCenter.activeBackground': p.hover,
        'commandCenter.activeForeground': p.foreground,
        'commandCenter.activeBorder': p.accent,

        'scrollbar.shadow': '#00000066',
        'scrollbarSlider.background': alpha(p.foregroundMuted, 0.35),
        'scrollbarSlider.hoverBackground': alpha(p.foregroundMuted, 0.52),
        'scrollbarSlider.activeBackground': alpha(p.accent, 0.65),

        'terminal.background': p.editor,
        'terminal.foreground': p.foreground,
        'terminalCursor.background': p.editor,
        'terminalCursor.foreground': p.accent2,
        'terminal.ansiBlack': p.editor,
        'terminal.ansiRed': p.danger,
        'terminal.ansiGreen': p.success,
        'terminal.ansiYellow': p.warning,
        'terminal.ansiBlue': p.accent,
        'terminal.ansiMagenta': p.accent2,
        'terminal.ansiCyan': p.accent2,
        'terminal.ansiWhite': p.foreground,
        'terminal.ansiBrightBlack': p.foregroundFaint,
        'terminal.ansiBrightRed': p.danger,
        'terminal.ansiBrightGreen': p.success,
        'terminal.ansiBrightYellow': p.warning,
        'terminal.ansiBrightBlue': p.accent2,
        'terminal.ansiBrightMagenta': p.accent2,
        'terminal.ansiBrightCyan': p.accent2,
        'terminal.ansiBrightWhite': '#ffffff',
        ...(p.colorOverrides ?? {})
    };
    const themeJson: Record<string, unknown> = {
        name: p.label,
        type: 'dark',
        semanticHighlighting: true,
        colors,
        tokenColors: createTokenColors(p)
    };

    if (p.semanticTokenColors) {
        themeJson.semanticTokenColors = p.semanticTokenColors;
    }

    return themeJson;
}

function createTokenColors(p: ResolvedThemePalette): unknown[] {
    const syntax = withSyntaxDefaults(p);

    return [
        ...importedThemeData.baseTokenColors,
        {
            scope: ['comment', 'punctuation.definition.comment', 'comment.block.documentation'],
            settings: { foreground: syntax.comment, fontStyle: syntax.commentFontStyle }
        },
        {
            scope: ['string', 'string.quoted', 'string.template', 'string.interpolated', 'constant.other.symbol'],
            settings: { foreground: syntax.string }
        },
        {
            scope: ['constant.numeric', 'keyword.other.unit', 'support.constant.property-value'],
            settings: { foreground: syntax.number }
        },
        {
            scope: ['constant.language', 'support.constant', 'variable.language', 'constant.character'],
            settings: { foreground: syntax.constant }
        },
        {
            scope: [
                'keyword',
                'keyword.control',
                'keyword.other',
                'storage',
                'storage.type',
                'storage.modifier',
                'keyword.operator.expression',
                'keyword.operator.logical'
            ],
            settings: { foreground: syntax.keyword }
        },
        {
            scope: [
                'entity.name.function',
                'support.function',
                'variable.function',
                'meta.function-call',
                'meta.function-call entity.name.function',
                'meta.method-call',
                'meta.method-call entity.name.function'
            ],
            settings: { foreground: syntax.function }
        },
        {
            scope: [
                'entity.name.type',
                'entity.name.class',
                'entity.name.struct',
                'entity.name.namespace',
                'support.class',
                'support.type',
                'storage.type.cs',
                'storage.type.java',
                'storage.type.primitive'
            ],
            settings: { foreground: syntax.type }
        },
        {
            scope: ['variable', 'variable.other', 'support.variable', 'meta.definition.variable.name'],
            settings: { foreground: syntax.variable }
        },
        {
            scope: ['variable.parameter', 'meta.function.parameters', 'meta.function-call.arguments'],
            settings: { foreground: syntax.parameter }
        },
        {
            scope: [
                'entity.name.tag',
                'punctuation.definition.tag',
                'meta.tag',
                'meta.tag entity.name.tag',
                'support.type.property-name.css',
                'support.type.property-name.scss',
                'support.type.property-name.less'
            ],
            settings: { foreground: syntax.tag }
        },
        {
            scope: [
                'entity.other.attribute-name',
                'entity.other.attribute-name.html',
                'entity.other.attribute-name.class',
                'entity.other.attribute-name.id',
                'meta.object-literal.key',
                'support.type.property-name.json',
                'meta.structure.dictionary.json support.type.property-name'
            ],
            settings: { foreground: syntax.attribute }
        },
        {
            scope: ['keyword.operator', 'punctuation', 'punctuation.separator', 'punctuation.terminator'],
            settings: { foreground: p.foregroundMuted }
        },
        {
            scope: ['invalid', 'invalid.illegal'],
            settings: { foreground: syntax.invalid }
        }
    ];
}

function withSyntaxDefaults(p: ResolvedThemePalette): Required<SyntaxPalette> {
    return {
        comment: p.syntax?.comment ?? p.foregroundFaint,
        commentFontStyle: p.syntax?.commentFontStyle ?? 'italic',
        string: p.syntax?.string ?? p.success,
        number: p.syntax?.number ?? p.warning,
        constant: p.syntax?.constant ?? p.warning,
        keyword: p.syntax?.keyword ?? p.accent,
        function: p.syntax?.function ?? p.accent2,
        type: p.syntax?.type ?? p.accent2,
        variable: p.syntax?.variable ?? p.foreground,
        parameter: p.syntax?.parameter ?? p.foregroundMuted,
        tag: p.syntax?.tag ?? p.accent,
        attribute: p.syntax?.attribute ?? p.accent2,
        invalid: p.syntax?.invalid ?? p.danger
    };
}

function withDefaults(palette: ThemePalette): ResolvedThemePalette {
    return {
        ...palette,
        input: palette.input ?? DEFAULTS.input,
        foreground: palette.foreground ?? DEFAULTS.foreground,
        foregroundMuted: palette.foregroundMuted ?? DEFAULTS.foregroundMuted,
        foregroundFaint: palette.foregroundFaint ?? DEFAULTS.foregroundFaint,
        danger: palette.danger ?? DEFAULTS.danger,
        warning: palette.warning ?? DEFAULTS.warning,
        success: palette.success ?? DEFAULTS.success,
        statusForeground: palette.statusForeground ?? DEFAULTS.statusForeground,
        activityHover: palette.activityHover ?? palette.tab
    };
}

function alpha(hex: string, opacity: number): string {
    const normalized = hex.replace('#', '').slice(0, 6);
    const channel = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, '0');
    return `#${normalized}${channel}`;
}
