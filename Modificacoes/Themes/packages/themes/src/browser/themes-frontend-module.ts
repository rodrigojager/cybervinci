import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { CommandContribution, MenuContribution } from '@theia/core/lib/common';
import { ContainerModule } from '@theia/core/shared/inversify';
import { CyberVinciLanguageTokenizationContribution } from './cybervinci-language-tokenization-contribution';
import { CyberVinciThemeContribution } from './cybervinci-theme-contribution';

import '../../src/browser/style/cybervinci-themes.css';

export default new ContainerModule(bind => {
    bind(CyberVinciLanguageTokenizationContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(CyberVinciLanguageTokenizationContribution);
    bind(CyberVinciThemeContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(CyberVinciThemeContribution);
    bind(CommandContribution).toService(CyberVinciThemeContribution);
    bind(MenuContribution).toService(CyberVinciThemeContribution);
});
