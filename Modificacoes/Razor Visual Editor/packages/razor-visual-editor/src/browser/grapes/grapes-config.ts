import type { EditorConfig } from 'grapesjs';
import { createCyberVinciStyleSectors } from './grapes-style-manager';

export interface GrapesEditorInitOptions {
    container: HTMLElement;
    html: string;
    css: string[];
    scriptsEnabled: boolean;
    blocksContainer?: HTMLElement;
    layersContainer?: HTMLElement;
    selectorsContainer?: HTMLElement;
    traitsContainer?: HTMLElement;
    stylesContainer?: HTMLElement;
}

const CYBERVINCI_CANVAS_FRAME_STYLE = `
* {
  box-sizing: border-box;
}

html {
  min-height: 100%;
  background: #e8edf3;
}

body {
  min-height: 100vh;
  margin: 0;
  color: #172033;
  background: #f5f7fa;
  font-family: Inter, "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, Arial, sans-serif;
  line-height: 1.5;
}

img,
svg,
video {
  max-width: 100%;
  height: auto;
}

a {
  color: #0f6cbd;
}

button,
input,
select,
textarea {
  font: inherit;
}

.cv-razor-token {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  min-height: 24px;
  padding: 2px 8px;
  border: 1px solid #f59e0b;
  border-radius: 6px;
  color: #78350f;
  background: #fffbeb;
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.14);
  font-family: "Cascadia Code", "SFMono-Regular", Consolas, monospace;
  font-size: 0.9em;
  font-weight: 600;
  vertical-align: baseline;
  overflow-wrap: anywhere;
}

.cv-razor-block {
  display: block;
  width: 100%;
  margin: 16px 0;
  padding: 14px 16px;
  border-style: dashed;
  border-color: #d97706;
  color: #713f12;
  background: #fff7ed;
}

.cv-razor-block::before {
  content: "Protected Razor block";
  display: block;
  margin-bottom: 6px;
  color: #9a3412;
  font: 700 11px/1.2 "Segoe UI", system-ui, sans-serif;
  text-transform: uppercase;
}

.cv-razor-inline {
  white-space: normal;
}

.cv-razor-directive,
template[data-cv-razor-token] {
  display: none !important;
}
`;

export function createGrapesConfig(options: GrapesEditorInitOptions): EditorConfig {
    return {
        container: options.container,
        height: '100%',
        width: '100%',
        fromElement: false,
        storageManager: {
            type: 'cybervinci-file-storage',
            autosave: false,
            autoload: false
        },
        blockManager: {
            appendTo: options.blocksContainer,
            appendOnClick: true
        },
        layerManager: {
            appendTo: options.layersContainer,
            showWrapper: true,
            sortable: true,
            hidable: true,
            showHover: true,
            scrollCanvas: {
                behavior: 'smooth',
                block: 'nearest'
            },
            scrollLayers: {
                behavior: 'auto',
                block: 'nearest'
            }
        },
        selectorManager: {
            appendTo: options.selectorsContainer,
            componentFirst: true
        },
        traitManager: {
            appendTo: options.traitsContainer
        },
        styleManager: {
            appendTo: options.stylesContainer,
            sectors: createCyberVinciStyleSectors(),
            showComputed: true,
            clearProperties: true
        },
        canvas: {
            frameStyle: CYBERVINCI_CANVAS_FRAME_STYLE,
            scripts: options.scriptsEnabled ? [] : [],
            styles: []
        },
        canvasCss: `
            .gjs-highlighter,
            .gjs-highlighter-sel {
                outline-color: #0f6cbd !important;
            }
        `,
        components: '',
        style: '',
        deviceManager: {
            devices: [
                { id: 'desktop', name: 'Desktop', width: '' },
                { id: 'tablet', name: 'Tablet', width: '768px' },
                { id: 'mobile', name: 'Mobile', width: '390px' }
            ]
        }
    };
}
