import { LLMChatService } from './LLMChatService';
import type { ChatMessage, ChatResponse } from './LLMChatService';
import { chunkText } from './TextExtractionService';
import type { Label, Rule, Annotation, RuleEvaluation, ReviewData } from '../context/types';

export interface ProcessingProgress {
    stage: 'validating' | 'annotating' | 'evaluating_rules' | 'complete' | 'error';
    message: string;
    currentChunk?: number;
    totalChunks?: number;
}

export interface ProcessingResult {
    success: boolean;
    reviewData?: ReviewData;
    error?: string;
    errorType?: string;
}

type ProgressCallback = (progress: ProcessingProgress) => void;

/**
 * Build the system prompt for annotation
 */
function buildSystemPrompt(labels: Label[], rules: Rule[]): string {
    const labelDescriptions = labels.map(l =>
        `- "${l.name}"${l.desc ? `: ${l.desc}` : ''}`
    ).join('\n');

    const ruleDescriptions = rules.map(r =>
        `- "${r.name}": ${r.logic}`
    ).join('\n');

    return `You are an expert document annotator. Your task is to analyze the provided document and:

1. EXTRACT ANNOTATIONS: Find all text segments that match the defined labels. For each match:
   - Quote the EXACT VERBATIM text from the document (word-for-word)
   - Assign the appropriate label
   - Provide a confidence score (0.0 to 1.0)
   - Give a BRIEF rationale (1-2 sentences MAX)

2. EVALUATE RULES: For each rule, determine if it passes or fails based on the annotations.
   - Use in-text citations: "[1]", "[2]" directly within your rationale sentence
   - EVIDENCE REFERENCES must be EXACT VERBATIM QUOTES from the document in quotation marks
   - Rationale should be CONCISE (2-3 sentences max), citing evidence inline
   - Example: "The author claims X [1] and the actual work confirms this [2]."

LABELS TO ANNOTATE:
${labelDescriptions || '(No labels defined)'}

RULES TO EVALUATE:
${ruleDescriptions || '(No rules defined)'}

RESPOND IN JSON FORMAT ONLY:
{
    "annotations": [
        {
            "id": "ann-1",
            "labelId": "Label Name",
            "text": "exact verbatim text from document",
            "confidence": 0.95,
            "rationale": "Brief 1-2 sentence explanation"
        }
    ],
    "ruleEvaluations": [
        {
            "ruleId": "Rule Name",
            "pass": true,
            "rationale": "Concise explanation with inline citations [1] and [2].",
            "citations": ["[1] \\"exact verbatim quote from document\\"", "[2] \\"another exact quote\\""],
            "confidence": 0.9
        }
    ]
}`;
}

/**
 * Build user prompt for annotation (chunk version)
 */
function buildChunkPrompt(documentContent: string, isFirstChunk: boolean): string {
    const intro = isFirstChunk
        ? 'Analyze the following document content and extract annotations for all defined labels.'
        : 'Continue analyzing this document chunk. Extract any additional annotations.';

    return `${intro}

DOCUMENT CONTENT:
---
${documentContent}
---

Extract all matching annotations from this content. Respond with JSON only.`;
}

/**
 * Build prompt for rules evaluation (separate pass for local LLM)
 */
function buildRulesPrompt(annotations: Annotation[], documentContent: string): string {
    const annotationSummary = annotations.map(a =>
        `- [${a.labelId}]: "${a.text}"`
    ).join('\n');

    return `Based on the following annotations extracted from the document, evaluate each rule.

ANNOTATIONS FOUND:
${annotationSummary || '(No annotations found)'}

DOCUMENT EXCERPT:
${documentContent.substring(0, 5000)}...

Evaluate all rules and respond with JSON:
{
    "ruleEvaluations": [
        {
            "ruleId": "Rule Name",
            "pass": true,
            "rationale": "Explanation with citations [1]",
            "citations": ["[1] evidence text"],
            "confidence": 0.9
        }
    ]
}`;
}

/**
 * Parse LLM response into structured data
 */
function parseAnnotationResponse(content: string): {
    annotations: Annotation[];
    ruleEvaluations: RuleEvaluation[]
} {
    try {
        // Try to extract JSON from response
        let json = content;

        // Handle markdown code blocks
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            json = jsonMatch[1];
        }

        const parsed = JSON.parse(json.trim());

        // Normalize annotations
        const annotations: Annotation[] = (parsed.annotations || []).map((a: any, idx: number) => ({
            id: a.id || `ann-${idx}`,
            labelId: a.labelId || a.label || 'Unknown',
            text: a.text || '',
            confidence: typeof a.confidence === 'number' ? a.confidence : 0.8,
            rationale: a.rationale || a.reason || '',
            status: 'pending' as const
        }));

        // Normalize rule evaluations
        const ruleEvaluations: RuleEvaluation[] = (parsed.ruleEvaluations || parsed.rules || []).map((r: any) => ({
            ruleId: r.ruleId || r.name || 'Unknown',
            pass: Boolean(r.pass),
            rationale: r.rationale || r.reason || '',
            citations: Array.isArray(r.citations) ? r.citations : [],
            confidence: typeof r.confidence === 'number' ? r.confidence : undefined
        }));

        return { annotations, ruleEvaluations };
    } catch (error) {
        console.error('Failed to parse LLM response:', error, content);
        return { annotations: [], ruleEvaluations: [] };
    }
}

/**
 * Process document annotation with cloud LLM (single request)
 */
async function processWithCloudLLM(
    provider: string,
    apiKey: string,
    model: string,
    documentContent: string,
    labels: Label[],
    rules: Rule[],
    baseUrl?: string,
    onProgress?: ProgressCallback
): Promise<ProcessingResult> {
    onProgress?.({ stage: 'annotating', message: 'Sending document to LLM...' });

    const systemPrompt = buildSystemPrompt(labels, rules);
    const userPrompt = buildChunkPrompt(documentContent, true);

    const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];

    const response = await LLMChatService.chat(provider, apiKey, model, messages, baseUrl);

    if (!response.success) {
        return {
            success: false,
            error: response.error,
            errorType: response.errorType
        };
    }

    onProgress?.({ stage: 'evaluating_rules', message: 'Parsing results...' });

    const parsed = parseAnnotationResponse(response.content || '');

    return {
        success: true,
        reviewData: {
            annotations: parsed.annotations,
            ruleEvaluations: parsed.ruleEvaluations,
            processedAt: new Date().toISOString(),
            modelUsed: model,
            inputTokens: response.inputTokens,
            outputTokens: response.outputTokens
        }
    };
}

/**
 * Process document annotation with local LLM (chunked)
 */
async function processWithLocalLLM(
    provider: string,
    model: string,
    documentContent: string,
    labels: Label[],
    rules: Rule[],
    baseUrl?: string,
    onProgress?: ProgressCallback
): Promise<ProcessingResult> {
    const chunks = chunkText(documentContent, 800, 100);
    const totalChunks = chunks.length;
    const allAnnotations: Annotation[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    onProgress?.({
        stage: 'annotating',
        message: `Processing ${totalChunks} chunks...`,
        currentChunk: 0,
        totalChunks
    });

    const systemPrompt = buildSystemPrompt(labels, rules);

    // Process each chunk for annotations
    for (let i = 0; i < chunks.length; i++) {
        onProgress?.({
            stage: 'annotating',
            message: `Annotating chunk ${i + 1} of ${totalChunks}...`,
            currentChunk: i + 1,
            totalChunks
        });

        const userPrompt = buildChunkPrompt(chunks[i], i === 0);

        const messages: ChatMessage[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ];

        const response = await LLMChatService.chat(provider, '', model, messages, baseUrl);

        if (!response.success) {
            return {
                success: false,
                error: response.error,
                errorType: response.errorType
            };
        }

        const parsed = parseAnnotationResponse(response.content || '');

        // Add chunk-specific ID prefix to avoid duplicates
        parsed.annotations.forEach(a => {
            a.id = `chunk${i}-${a.id}`;
            allAnnotations.push(a);
        });

        totalInputTokens += response.inputTokens || 0;
        totalOutputTokens += response.outputTokens || 0;
    }

    // Evaluate rules in separate request
    onProgress?.({ stage: 'evaluating_rules', message: 'Evaluating rules...' });

    const rulesPrompt = buildRulesPrompt(allAnnotations, documentContent);
    const rulesMessages: ChatMessage[] = [
        { role: 'system', content: buildSystemPrompt(labels, rules) },
        { role: 'user', content: rulesPrompt }
    ];

    const rulesResponse = await LLMChatService.chat(provider, '', model, rulesMessages, baseUrl);

    let ruleEvaluations: RuleEvaluation[] = [];
    if (rulesResponse.success && rulesResponse.content) {
        const parsed = parseAnnotationResponse(rulesResponse.content);
        ruleEvaluations = parsed.ruleEvaluations;
        totalInputTokens += rulesResponse.inputTokens || 0;
        totalOutputTokens += rulesResponse.outputTokens || 0;
    }

    return {
        success: true,
        reviewData: {
            annotations: allAnnotations,
            ruleEvaluations,
            processedAt: new Date().toISOString(),
            modelUsed: model,
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens
        }
    };
}

/**
 * Main annotation processor function
 */
export async function processAnnotation(
    provider: string,
    apiKey: string,
    model: string,
    documentContent: string,
    labels: Label[],
    rules: Rule[],
    baseUrl?: string,
    onProgress?: ProgressCallback
): Promise<ProcessingResult> {
    const isLocalProvider = provider === 'ollama' || provider === 'lmstudio';

    if (isLocalProvider) {
        return processWithLocalLLM(provider, model, documentContent, labels, rules, baseUrl, onProgress);
    } else {
        return processWithCloudLLM(provider, apiKey, model, documentContent, labels, rules, baseUrl, onProgress);
    }
}

/**
 * Validate LLM connectivity before processing
 */
export async function validateLLMConnection(
    provider: string,
    apiKey: string,
    model: string,
    baseUrl?: string
): Promise<ChatResponse> {
    return LLMChatService.testConnection(provider, apiKey, model, baseUrl);
}
