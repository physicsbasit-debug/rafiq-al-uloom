import type {
  AiGenerationOptions,
  AiGenerationRequest,
  AiGenerationResult,
} from './ai-authoring.types';

export interface AiAuthoringProvider {
  generate(
    request: AiGenerationRequest,
    options?: AiGenerationOptions
  ): Promise<AiGenerationResult>;
}
