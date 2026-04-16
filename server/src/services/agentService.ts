import Anthropic from '@anthropic-ai/sdk';
import logger from '../config/logger.js';
import { toolInputSchema, toolDefinition, CONTRACT_KEYS, AnalysisItem } from '../schemas/toolSchemas.js';

const SYSTEM_PROMPT = `You are a legal contract analyst. Your task is to carefully read the provided contract document and extract information for exactly 9 predefined clause categories.

For each category, extract the relevant text from the contract. If a category is not addressed in the contract, use "NO_DATA_AVAILABLE" as the content.

The 9 clause categories are:
1. intellectual_property_ownership — Any clauses about IP ownership, assignment, or work product ownership
2. limitation_of_liability — Caps on liability, exclusions of certain damages
3. warranty_disclaimer — Disclaimers of warranties, "as-is" provisions
4. indemnification — Obligations to indemnify, defend, or hold harmless
5. data_processing_terms — Data handling, privacy, GDPR/CCPA compliance, data security
6. termination_for_convenience — Rights to terminate without cause, notice periods
7. non_solicitation — Restrictions on soliciting employees, clients, or customers
8. payment_terms — Payment schedules, invoicing, late fees, compensation details
9. confidentiality — Confidentiality obligations, NDA terms, information protection

Instructions:
- Derive a concise, descriptive contract name from the document content (e.g., "Nexis AI - VP Engineering Employment Offer")
- Use the SAME contract_name for all 9 entries
- Extract the actual relevant text for each clause category
- If a clause category is NOT present in the contract, set content to exactly "NO_DATA_AVAILABLE"
- Call the store_contract_analysis tool exactly ONCE with all 9 results`;

export class AgentService {
  private client: Anthropic;
  private model: string;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.model = 'claude-sonnet-4-20250514';
  }

  async analyzeContract(markdownText: string): Promise<AnalysisItem[]> {
    logger.info('Starting contract analysis with Claude agent');

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [toolDefinition as Anthropic.Tool],
      tool_choice: { type: 'tool', name: 'store_contract_analysis' },
      messages: [
        {
          role: 'user',
          content: `Please analyze the following contract document and extract information for all 9 clause categories:\n\n${markdownText}`,
        },
      ],
    });

    logger.info(
      `Claude API response — model: ${response.model}, input_tokens: ${response.usage.input_tokens}, output_tokens: ${response.usage.output_tokens}`
    );

    const toolUseBlock = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    );

    if (!toolUseBlock) {
      throw new Error('Claude did not return a tool_use block');
    }

    if (toolUseBlock.name !== 'store_contract_analysis') {
      throw new Error(`Unexpected tool call: ${toolUseBlock.name}`);
    }

    const parsed = toolInputSchema.safeParse(toolUseBlock.input);

    if (!parsed.success) {
      logger.error(`Zod validation failed: ${JSON.stringify(parsed.error.issues)}`);
      throw new Error(`Tool input validation failed: ${parsed.error.message}`);
    }

    const analyses = parsed.data.analyses;

    const returnedKeys = analyses.map((a) => a.key_name).sort();
    const expectedKeys = [...CONTRACT_KEYS].sort();
    if (JSON.stringify(returnedKeys) !== JSON.stringify(expectedKeys)) {
      throw new Error(
        `Missing or duplicate keys. Expected: ${expectedKeys.join(', ')}. Got: ${returnedKeys.join(', ')}`
      );
    }

    logger.info(
      `Analysis complete — contract: "${analyses[0].contract_name}", keys with data: ${analyses.filter((a) => a.content !== 'NO_DATA_AVAILABLE').length}/9`
    );

    return analyses;
  }
}

export const agentService = new AgentService();
