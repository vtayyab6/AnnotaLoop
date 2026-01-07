import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { isTauri } from '@tauri-apps/api/core';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface ChatResponse {
    success: boolean;
    content?: string;
    error?: string;
    errorType?: 'auth' | 'credits' | 'rate_limit' | 'timeout' | 'network' | 'unknown';
    inputTokens?: number;
    outputTokens?: number;
}

interface ProviderConfig {
    url: string;
    headers: Record<string, string>;
    buildBody: (messages: ChatMessage[], model: string) => Record<string, unknown>;
    parseResponse: (data: any) => { content: string; inputTokens?: number; outputTokens?: number };
}

/**
 * LLM Chat Service - Handles chat completions for all supported providers
 */
export class LLMChatService {

    private static getProviderConfig(
        provider: string,
        apiKey: string,
        model: string,
        baseUrl?: string
    ): ProviderConfig {
        switch (provider.toLowerCase()) {
            case 'openai':
                return {
                    url: 'https://api.openai.com/v1/chat/completions',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    buildBody: (messages, model) => ({
                        model,
                        messages,
                        temperature: 0.1,
                        response_format: { type: 'json_object' }
                    }),
                    parseResponse: (data) => ({
                        content: data.choices?.[0]?.message?.content || '',
                        inputTokens: data.usage?.prompt_tokens,
                        outputTokens: data.usage?.completion_tokens
                    })
                };

            case 'anthropic':
                return {
                    url: 'https://api.anthropic.com/v1/messages',
                    headers: {
                        'x-api-key': apiKey,
                        'anthropic-version': '2023-06-01',
                        'Content-Type': 'application/json'
                    },
                    buildBody: (messages, model) => {
                        // Anthropic requires system message separately
                        const systemMsg = messages.find(m => m.role === 'system');
                        const otherMsgs = messages.filter(m => m.role !== 'system');
                        return {
                            model,
                            max_tokens: 4096,
                            system: systemMsg?.content || '',
                            messages: otherMsgs.map(m => ({ role: m.role, content: m.content }))
                        };
                    },
                    parseResponse: (data) => ({
                        content: data.content?.[0]?.text || '',
                        inputTokens: data.usage?.input_tokens,
                        outputTokens: data.usage?.output_tokens
                    })
                };

            case 'gemini':
                return {
                    url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    buildBody: (messages) => ({
                        contents: messages
                            .filter(m => m.role !== 'system')
                            .map(m => ({
                                role: m.role === 'assistant' ? 'model' : 'user',
                                parts: [{ text: m.content }]
                            })),
                        systemInstruction: {
                            parts: [{ text: messages.find(m => m.role === 'system')?.content || '' }]
                        },
                        generationConfig: {
                            temperature: 0.1,
                            responseMimeType: 'application/json'
                        }
                    }),
                    parseResponse: (data) => ({
                        content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
                        inputTokens: data.usageMetadata?.promptTokenCount,
                        outputTokens: data.usageMetadata?.candidatesTokenCount
                    })
                };

            case 'mistral':
            case 'mistral ai':
                return {
                    url: 'https://api.mistral.ai/v1/chat/completions',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    buildBody: (messages, model) => ({
                        model,
                        messages,
                        temperature: 0.1,
                        response_format: { type: 'json_object' }
                    }),
                    parseResponse: (data) => ({
                        content: data.choices?.[0]?.message?.content || '',
                        inputTokens: data.usage?.prompt_tokens,
                        outputTokens: data.usage?.completion_tokens
                    })
                };

            case 'openrouter':
                return {
                    url: 'https://openrouter.ai/api/v1/chat/completions',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': window.location.origin,
                        'X-Title': 'AnotaLoop'
                    },
                    buildBody: (messages, model) => ({
                        model,
                        messages,
                        temperature: 0.1
                    }),
                    parseResponse: (data) => ({
                        content: data.choices?.[0]?.message?.content || '',
                        inputTokens: data.usage?.prompt_tokens,
                        outputTokens: data.usage?.completion_tokens
                    })
                };

            case 'ollama': {
                const ollamaBase = baseUrl || 'http://localhost:11434';
                return {
                    url: `${ollamaBase.replace(/\/$/, '')}/api/chat`,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    buildBody: (messages, model) => ({
                        model,
                        messages,
                        stream: false,
                        format: 'json'
                    }),
                    parseResponse: (data) => ({
                        content: data.message?.content || '',
                        inputTokens: data.prompt_eval_count,
                        outputTokens: data.eval_count
                    })
                };
            }

            case 'lmstudio': {
                const lmBase = baseUrl || 'http://localhost:1234/v1';
                return {
                    url: `${lmBase.replace(/\/$/, '')}/chat/completions`,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    buildBody: (messages, model) => ({
                        model,
                        messages,
                        temperature: 0.1,
                        response_format: { type: 'json_object' }
                    }),
                    parseResponse: (data) => ({
                        content: data.choices?.[0]?.message?.content || '',
                        inputTokens: data.usage?.prompt_tokens,
                        outputTokens: data.usage?.completion_tokens
                    })
                };
            }

            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
    }

    /**
     * Test LLM connectivity with a simple message
     */
    static async testConnection(
        provider: string,
        apiKey: string,
        model: string,
        baseUrl?: string
    ): Promise<ChatResponse> {
        const messages: ChatMessage[] = [
            { role: 'user', content: 'Say "OK" in JSON format: {"status": "OK"}' }
        ];

        return this.chat(provider, apiKey, model, messages, baseUrl);
    }

    /**
     * Send a chat completion request to the LLM
     */
    static async chat(
        provider: string,
        apiKey: string,
        model: string,
        messages: ChatMessage[],
        baseUrl?: string
    ): Promise<ChatResponse> {
        const useTauri = isTauri();
        const fetchFn = useTauri ? tauriFetch : fetch;

        try {
            const config = this.getProviderConfig(provider, apiKey, model, baseUrl);
            const body = config.buildBody(messages, model);

            console.log(`LLMChatService: Sending to ${provider} (${useTauri ? 'Tauri' : 'Browser'} mode)`);

            const response = await fetchFn(config.url, {
                method: 'POST',
                headers: config.headers,
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorText = await response.text();
                return this.handleError(response.status, errorText, provider);
            }

            const data = await response.json();
            const parsed = config.parseResponse(data);

            return {
                success: true,
                content: parsed.content,
                inputTokens: parsed.inputTokens,
                outputTokens: parsed.outputTokens
            };

        } catch (error: any) {
            console.error('LLM Chat Error:', error);

            // Network errors
            if (error.message?.includes('Failed to fetch') ||
                error.message?.includes('NetworkError') ||
                error.message?.includes('Load failed')) {

                const isLocal = provider === 'ollama' || provider === 'lmstudio';
                return {
                    success: false,
                    error: isLocal
                        ? `Connection failed. Ensure ${provider === 'lmstudio' ? 'LM Studio' : 'Ollama'} is running at ${baseUrl || 'default port'}.`
                        : 'Network error. Please check your internet connection.',
                    errorType: 'network'
                };
            }

            return {
                success: false,
                error: error.message || 'Unknown error occurred',
                errorType: 'unknown'
            };
        }
    }

    private static handleError(status: number, errorText: string, _provider?: string): ChatResponse {
        let errorMessage = `HTTP ${status}`;
        let errorType: ChatResponse['errorType'] = 'unknown';

        try {
            const jsonError = JSON.parse(errorText);

            // Extract error message from various formats
            errorMessage = jsonError.error?.message ||
                jsonError.message ||
                jsonError.detail ||
                jsonError.error?.type ||
                errorText;

            // Detect error types
            const lowerError = errorMessage.toLowerCase();

            if (status === 401 || lowerError.includes('invalid api key') || lowerError.includes('unauthorized')) {
                errorType = 'auth';
                errorMessage = 'Invalid API key. Please check your credentials.';
            } else if (lowerError.includes('insufficient') || lowerError.includes('quota') ||
                lowerError.includes('balance') || lowerError.includes('credit')) {
                errorType = 'credits';
                errorMessage = 'Insufficient API credits. Please check your account balance.';
            } else if (status === 429 || lowerError.includes('rate limit')) {
                errorType = 'rate_limit';
                errorMessage = 'Rate limit exceeded. Please try again in a moment.';
            } else if (lowerError.includes('timeout')) {
                errorType = 'timeout';
                errorMessage = 'Request timed out. The document may be too large.';
            }

        } catch {
            // Not JSON, use status-based messages
            if (status === 401) {
                errorType = 'auth';
                errorMessage = 'Invalid API key. Please check your credentials.';
            } else if (status === 402) {
                errorType = 'credits';
                errorMessage = 'Insufficient API credits. Please check your account balance.';
            } else if (status === 429) {
                errorType = 'rate_limit';
                errorMessage = 'Rate limit exceeded. Please try again in a moment.';
            } else {
                errorMessage = `Request failed (HTTP ${status})`;
            }
        }

        return {
            success: false,
            error: errorMessage,
            errorType
        };
    }
}
