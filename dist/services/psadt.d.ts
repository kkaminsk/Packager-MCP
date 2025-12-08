import type { TemplateOptions, TemplateOutput, PsadtResource, GetPsadtTemplateInput, GetPsadtTemplateOutput } from '../types/psadt.js';
export declare class PsadtService {
    private logger;
    private templateCache;
    private resourceCache;
    private templatesDir;
    private knowledgeDir;
    constructor();
    private registerHandlebarsHelpers;
    private registerPartials;
    private getTemplate;
    private getTemplateName;
    generateScript(options: TemplateOptions): TemplateOutput;
    private deriveInstallerFileName;
    private getInstallerExtension;
    private extractCustomizationPoints;
    private deriveCustomizationName;
    private generateAdditionalFiles;
    private generatePackageStructureDoc;
    private generateDetectionScript;
    generateTemplate(input: GetPsadtTemplateInput): Promise<GetPsadtTemplateOutput>;
    private generateRecommendations;
    loadResource(uri: string): PsadtResource | undefined;
    private parseResourceUri;
    private extractTitle;
    listResources(): Array<{
        uri: string;
        name: string;
        description: string;
    }>;
}
export declare function getPsadtService(): PsadtService;
//# sourceMappingURL=psadt.d.ts.map