import { AbstractDialog, DialogProps } from '@theia/core/lib/browser/dialogs';
import { VisualSaveDecision } from '../types/save-result';

export interface DiffBeforeSaveDialogProps extends DialogProps {
    original: string;
    modified: string;
    diff: string;
}

export class DiffBeforeSaveDialog extends AbstractDialog<VisualSaveDecision> {
    protected decision: VisualSaveDecision = 'cancel';

    constructor(protected readonly diffProps: DiffBeforeSaveDialogProps) {
        super(diffProps);
        this.contentNode.classList.add('cv-razor-diff-dialog');

        const summary = document.createElement('div');
        summary.className = 'cv-razor-diff-summary';
        summary.textContent = `Original: ${lineCount(diffProps.original)} lines. Visual result: ${lineCount(diffProps.modified)} lines.`;
        this.contentNode.appendChild(summary);

        const diff = document.createElement('pre');
        diff.textContent = diffProps.diff;
        this.contentNode.appendChild(diff);

        this.appendDecisionButton('Save without asking again for this file', 'saveWithoutAskingAgain', false);
        this.appendDecisionButton('Cancel', 'cancel', false);
        this.appendDecisionButton('Save', 'save', true);
    }

    override get value(): VisualSaveDecision {
        return this.decision;
    }

    protected appendDecisionButton(label: string, decision: VisualSaveDecision, primary: boolean): void {
        const button = this.appendButton(label, primary);
        button.addEventListener('click', () => {
            this.decision = decision;
            this.accept();
        });
    }
}

function lineCount(value: string): number {
    return value.length === 0 ? 0 : value.split(/\r?\n/).length;
}
