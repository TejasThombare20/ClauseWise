import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export const CONTRACT_KEYS = [
  'intellectual_property_ownership',
  'limitation_of_liability',
  'warranty_disclaimer',
  'indemnification',
  'data_processing_terms',
  'termination_for_convenience',
  'non_solicitation',
  'payment_terms',
  'confidentiality',
] as const;

export type ContractKey = (typeof CONTRACT_KEYS)[number];

export const analysisItemSchema = z.object({
  contract_name: z
    .string()
    .min(1)
    .describe('A concise, descriptive name for the contract derived from the document content'),
  key_name: z
    .enum(CONTRACT_KEYS)
    .describe('The contract clause category being analyzed'),
  content: z
    .string()
    .min(1)
    .describe(
      'The relevant contract text for this clause. Use "NO_DATA_AVAILABLE" if the clause is not present in the contract'
    ),
});

export type AnalysisItem = z.infer<typeof analysisItemSchema>;

export const toolInputSchema = z.object({
  analyses: z
    .array(analysisItemSchema)
    .length(9)
    .describe('Exactly 9 analysis results, one for each contract key'),
});

export type ToolInput = z.infer<typeof toolInputSchema>;

export const toolDefinition = {
  name: 'store_contract_analysis' as const,
  description:
    'Store the analysis results for all 9 contract clause categories. You MUST call this tool exactly once with all 9 results. Each of the 9 contract keys must appear exactly once. If a clause is not found in the contract, set content to "NO_DATA_AVAILABLE".',
  input_schema: (() => {
    const schema = zodToJsonSchema(toolInputSchema);
    delete (schema as Record<string, unknown>)['$schema'];
    return schema;
  })(),
};
