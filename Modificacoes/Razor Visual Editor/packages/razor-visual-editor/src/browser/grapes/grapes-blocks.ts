import type { Editor } from 'grapesjs';

export function registerGrapesBlocks(editor: Editor): void {
    const blocks = editor.BlockManager;
    const add = (id: string, label: string, category: string, content: string): void => {
        blocks.add(id, { label, category, content, media: blockIcon(id) });
    };

    add('cv-container', 'Container', 'Layout', '<div class="container"><p>Container</p></div>');
    add('cv-row', 'Row', 'Layout', '<div class="row"><div class="col">Column</div><div class="col">Column</div></div>');
    add('cv-columns-2', '2 Columns', 'Layout', '<div class="row"><div class="col-md-6"><p>Column</p></div><div class="col-md-6"><p>Column</p></div></div>');
    add('cv-columns-3', '3 Columns', 'Layout', '<div class="row"><div class="col-md-4"><p>Column</p></div><div class="col-md-4"><p>Column</p></div><div class="col-md-4"><p>Column</p></div></div>');
    add('cv-div', 'Div', 'Layout', '<div class="cv-box"><p>Div content</p></div>');
    add('cv-section', 'Section', 'Layout', '<section><h2>Section</h2><p>Content</p></section>');
    add('cv-header', 'Header', 'Layout', '<header><h1>Page title</h1></header>');
    add('cv-footer', 'Footer', 'Layout', '<footer><p>Footer</p></footer>');
    add('cv-spacer', 'Spacer', 'Layout', '<div style="height: 32px;"></div>');

    add('cv-heading', 'Heading', 'Text', '<h2>Heading</h2>');
    add('cv-paragraph', 'Paragraph', 'Text', '<p>Paragraph text</p>');
    add('cv-text', 'Text', 'Text', '<span>Text</span>');
    add('cv-link', 'Link', 'Text', '<a href="#">Link</a>');
    add('cv-list', 'List', 'Text', '<ul><li>Item</li><li>Item</li></ul>');
    add('cv-quote', 'Quote', 'Text', '<blockquote>Quote</blockquote>');
    add('cv-table', 'Table', 'Text', '<table class="table"><tbody><tr><td>Cell</td><td>Cell</td></tr><tr><td>Cell</td><td>Cell</td></tr></tbody></table>');
    add('cv-divider', 'Divider', 'Text', '<hr />');

    add('cv-image', 'Image', 'Media', '<img src="" alt="Image" />');
    add('cv-video-placeholder', 'Video', 'Media', '<div class="cv-video-placeholder">Video</div>');

    add('cv-form', 'Form', 'Forms', '<form><label>Name<input class="form-control" name="name" /></label><button type="submit">Submit</button></form>');
    add('cv-input', 'Input', 'Forms', '<input class="form-control" name="field" placeholder="Field" />');
    add('cv-select', 'Select', 'Forms', '<select class="form-control" name="choice"><option>Option</option></select>');
    add('cv-checkbox', 'Checkbox', 'Forms', '<label><input type="checkbox" name="enabled" /> Enabled</label>');
    add('cv-button', 'Button', 'Forms', '<button class="btn btn-primary" type="button">Button</button>');

    add('cv-bootstrap-card', 'Card', 'Bootstrap', '<div class="card"><div class="card-body"><h5 class="card-title">Card</h5><p class="card-text">Content</p></div></div>');
    add('cv-bootstrap-alert', 'Alert', 'Bootstrap', '<div class="alert alert-primary" role="alert">Alert</div>');
    add('cv-bootstrap-badge', 'Badge', 'Bootstrap', '<span class="badge bg-primary">Badge</span>');
    add('cv-bootstrap-navbar', 'Navbar', 'Bootstrap', '<nav class="navbar navbar-expand-lg navbar-light bg-light"><a class="navbar-brand" href="#">Navbar</a></nav>');
    add('cv-bootstrap-button-group', 'Button Group', 'Bootstrap', '<div class="btn-group"><button class="btn btn-secondary">Left</button><button class="btn btn-secondary">Right</button></div>');
}

function blockIcon(id: string): string {
    if (id.includes('image')) {
        return DEMO_ICONS.image;
    }
    if (id.includes('video')) {
        return DEMO_ICONS.video;
    }
    if (id.includes('form')) {
        return DEMO_ICONS.form;
    }
    if (id.includes('input')) {
        return DEMO_ICONS.input;
    }
    if (id.includes('select')) {
        return DEMO_ICONS.select;
    }
    if (id.includes('checkbox')) {
        return DEMO_ICONS.checkbox;
    }
    if (id.includes('button')) {
        return DEMO_ICONS.button;
    }
    if (id.includes('heading')) {
        return DEMO_ICONS.text;
    }
    if (id.includes('paragraph')) {
        return DEMO_ICONS.textSection;
    }
    if (id.includes('text')) {
        return DEMO_ICONS.text;
    }
    if (id.includes('quote')) {
        return DEMO_ICONS.quote;
    }
    if (id.includes('list')) {
        return DEMO_ICONS.textSection;
    }
    if (id.includes('link')) {
        return DEMO_ICONS.link;
    }
    if (id.includes('table')) {
        return DEMO_ICONS.columns3;
    }
    if (id.includes('spacer')) {
        return DEMO_ICONS.oneColumn;
    }
    if (id.includes('divider')) {
        return DEMO_ICONS.textSection;
    }
    if (id.includes('bootstrap')) {
        return DEMO_ICONS.oneColumn;
    }
    if (id.includes('header')) {
        return DEMO_ICONS.textSection;
    }
    if (id.includes('footer')) {
        return DEMO_ICONS.textSection;
    }
    if (id.includes('section')) {
        return DEMO_ICONS.oneColumn;
    }
    if (id.includes('columns-3')) {
        return DEMO_ICONS.columns3;
    }
    if (id.includes('columns-2') || id.includes('row')) {
        return DEMO_ICONS.columns2;
    }
    return DEMO_ICONS.oneColumn;
}

const DEMO_ICONS = {
    oneColumn: svg('0 0 24 24', 'M2 20h20V4H2v16Zm-1 0V4a1 1 0 0 1 1-1h20a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1Z'),
    columns2: svg('0 0 23 24', 'M2 20h8V4H2v16Zm-1 0V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1ZM13 20h8V4h-8v16Zm-1 0V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1Z'),
    columns3: svg('0 0 23 24', 'M2 20h4V4H2v16Zm-1 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1ZM17 20h4V4h-4v16Zm-1 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1ZM9.5 20h4V4h-4v16Zm-1 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1Z'),
    text: svg('0 0 24 24', 'M18.5,4L19.66,8.35L18.7,8.61C18.25,7.74 17.79,6.87 17.26,6.43C16.73,6 16.11,6 15.5,6H13V16.5C13,17 13,17.5 13.33,17.75C13.67,18 14.33,18 15,18V19H9V18C9.67,18 10.33,18 10.67,17.75C11,17.5 11,17 11,16.5V6H8.5C7.89,6 7.27,6 6.74,6.43C6.21,6.87 5.75,7.74 5.3,8.61L4.34,8.35L5.5,4H18.5Z'),
    textSection: svg('0 0 24 24', 'M21,6V8H3V6H21M3,18H12V16H3V18M3,13H21V11H3V13Z'),
    link: svg('0 0 24 24', 'M3.9,12C3.9,10.29 5.29,8.9 7,8.9H11V7H7A5,5 0 0,0 2,12A5,5 0 0,0 7,17H11V15.1H7C5.29,15.1 3.9,13.71 3.9,12M8,13H16V11H8V13M17,7H13V8.9H17C18.71,8.9 20.1,10.29 20.1,12C20.1,13.71 18.71,15.1 17,15.1H13V17H17A5,5 0 0,0 22,12A5,5 0 0,0 17,7Z'),
    image: svg('0 0 24 24', 'M21,3H3C2,3 1,4 1,5V19A2,2 0 0,0 3,21H21C22,21 23,20 23,19V5C23,4 22,3 21,3M5,17L8.5,12.5L11,15.5L14.5,11L19,17H5Z'),
    video: svg('0 0 24 24', 'M10,15L15.19,12L10,9V15M21.56,7.17C21.69,7.64 21.78,8.27 21.84,9.07C21.91,9.87 21.94,10.56 21.94,11.16L22,12C22,14.19 21.84,15.8 21.56,16.83C21.31,17.73 20.73,18.31 19.83,18.56C19.36,18.69 18.5,18.78 17.18,18.84C15.88,18.91 14.69,18.94 13.59,18.94L12,19C7.81,19 5.2,18.84 4.17,18.56C3.27,18.31 2.69,17.73 2.44,16.83C2.31,16.36 2.22,15.73 2.16,14.93C2.09,14.13 2.06,13.44 2.06,12.84L2,12C2,9.81 2.16,8.2 2.44,7.17C2.69,6.27 3.27,5.69 4.17,5.44C4.64,5.31 5.5,5.22 6.82,5.16C8.12,5.09 9.31,5.06 10.41,5.06L12,5C16.19,5 18.8,5.16 19.83,5.44C20.73,5.69 21.31,6.27 21.56,7.17Z'),
    quote: svg('0 0 24 24', 'M14,17H17L19,13V7H13V13H16M6,17H9L11,13V7H5V13H8L6,17Z'),
    form: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M22 5.5c0-.3-.5-.5-1.3-.5H3.4c-.8 0-1.3.2-1.3.5v3c0 .3.5.5 1.3.5h17.4c.8 0 1.3-.2 1.3-.5v-3zM21 8H3V6h18v2zM22 10.5c0-.3-.5-.5-1.3-.5H3.4c-.8 0-1.3.2-1.3.5v3c0 .3.5.5 1.3.5h17.4c.8 0 1.3-.2 1.3-.5v-3zM21 13H3v-2h18v2z"></path><rect fill="currentColor" width="10" height="3" x="2" y="15" rx=".5"></rect></svg>',
    input: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M22 9c0-.6-.5-1-1.3-1H3.4C2.5 8 2 8.4 2 9v6c0 .6.5 1 1.3 1h17.4c.8 0 1.3-.4 1.3-1V9zm-1 6H3V9h18v6z"></path><path fill="currentColor" d="M4 10h1v4H4z"></path></svg>',
    select: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M22 9c0-.6-.5-1-1.3-1H3.4C2.5 8 2 8.4 2 9v6c0 .6.5 1 1.3 1h17.4c.8 0 1.3-.4 1.3-1V9zm-1 6H3V9h18v6z"></path><path fill="currentColor" d="M18.5 13l1.5-2h-3zM4 11.5h11v1H4z"></path></svg>',
    button: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M22 9c0-.6-.5-1-1.3-1H3.4C2.5 8 2 8.4 2 9v6c0 .6.5 1 1.3 1h17.4c.8 0 1.3-.4 1.3-1V9zm-1 6H3V9h18v6z"></path><path fill="currentColor" d="M4 11.5h16v1H4z"></path></svg>',
    checkbox: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M10 17l-5-5 1.41-1.42L10 14.17l7.59-7.59L19 8m0-5H5c-1.11 0-2 .89-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5a2 2 0 0 0-2-2z"></path></svg>'
};

function svg(viewBox: string, path: string): string {
    return `<svg viewBox="${viewBox}"><path fill="currentColor" d="${path}"></path></svg>`;
}
