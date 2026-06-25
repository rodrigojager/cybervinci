import * as React from '@theia/core/shared/react';
import { CyberVinciAiExecutionSelection, CyberVinciAiProviderDescriptor, CyberVinciAiRuntimeService } from '../../common';
export interface CyberVinciAiExecutionPickerProps {
    service: CyberVinciAiRuntimeService;
    workspacePath?: string;
    value?: CyberVinciAiExecutionSelection;
    disabled?: boolean;
    onConfigureProvider?: (provider: CyberVinciAiProviderDescriptor) => void | Promise<void>;
    onSelectedProviderChange?: (provider: CyberVinciAiProviderDescriptor | undefined) => void;
    onChange: (selection: CyberVinciAiExecutionSelection) => void;
}
export declare const CyberVinciAiExecutionPicker: React.FC<CyberVinciAiExecutionPickerProps>;
//# sourceMappingURL=CyberVinciAiExecutionPicker.d.ts.map