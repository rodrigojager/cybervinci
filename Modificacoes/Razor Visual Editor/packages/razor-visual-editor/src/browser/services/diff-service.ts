import { injectable } from '@theia/core/shared/inversify';

@injectable()
export class RazorVisualDiffService {
    createUnifiedDiff(original: string, modified: string, contextLines = 2): string {
        const oldLines = original.split(/\r?\n/);
        const newLines = modified.split(/\r?\n/);
        const max = Math.max(oldLines.length, newLines.length);
        const changed = new Set<number>();

        for (let index = 0; index < max; index++) {
            if ((oldLines[index] ?? '') !== (newLines[index] ?? '')) {
                for (let offset = -contextLines; offset <= contextLines; offset++) {
                    const line = index + offset;
                    if (line >= 0 && line < max) {
                        changed.add(line);
                    }
                }
            }
        }

        if (changed.size === 0) {
            return 'No changes.';
        }

        const lines: string[] = ['--- original', '+++ visual'];
        let previous = -2;
        for (const index of Array.from(changed).sort((a, b) => a - b)) {
            if (index > previous + 1) {
                lines.push('@@');
            }
            const oldLine = oldLines[index];
            const newLine = newLines[index];
            if (oldLine === newLine) {
                lines.push(` ${oldLine ?? ''}`);
            } else {
                if (oldLine !== undefined) {
                    lines.push(`-${oldLine}`);
                }
                if (newLine !== undefined) {
                    lines.push(`+${newLine}`);
                }
            }
            previous = index;
        }
        return lines.join('\n');
    }
}
