import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { isTauri } from '@tauri-apps/api/core';

export interface LLMResponse {
    success: boolean;
    models?: string[];
    error?: string;
}

const PROVIDER_CONFIGS = {
    openai: {
        url: 'https://api.openai.com/v1/models',
        headers: (key: string) => ({ 'Authorization': `Bearer ${key}` })
    },
    mistral: {
        url: 'https://api.mistral.ai/v1/models',
        headers: (key: string) => ({ 'Authorization': `Bearer ${key}` })
    },
    anthropic: {
        url: 'https://api.anthropic.com/v1/models',
        headers: (key: string) => ({
            'x-api-key': key,
            'anthropic-version': '2023-06-01'
        })
    },
    gemini: {
        url: (key: string) => `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
        headers: () => ({})
    },
    openrouter: {
        url: 'https://openrouter.ai/api/v1/models',
        headers: (key: string) => ({ 'Authorization': `Bearer ${key}` })
    },
    // Local providers use dynamic URLs usually, but defaults can be defined here if needed
    ollama: {
        url: (baseUrl: string) => `${baseUrl}/api/tags`,
        headers: () => ({})
    },
    lmstudio: {
        url: (baseUrl: string) => `${baseUrl}/models`, // OpenAI compatible
        headers: () => ({})
    }
};

export class LLMService {
    static async verifyAndFetchModels(provider: string, apiKey?: string, baseUrl?: string): Promise<LLMResponse> {
        // Determine fetch function based on environment
        const useTauri = isTauri();
        const fetchFn = useTauri ? tauriFetch : fetch;
        console.log(`LLMService: Running in ${useTauri ? 'Tauri' : 'Browser'} mode`);

        try {
            let url = '';
            let headers = {};

            if (provider === 'ollama') {
                const base = baseUrl || 'http://localhost:11434';
                // Remove trailing slash if present
                const cleanBase = base.replace(/\/$/, '');
                url = `${cleanBase}/api/tags`;
            } else if (provider === 'lmstudio') {
                const base = baseUrl || 'http://localhost:1234/v1';
                // Remove trailing slash if present
                const cleanBase = base.replace(/\/$/, '');
                url = `${cleanBase}/models`;
            } else {
                const config = PROVIDER_CONFIGS[provider as keyof typeof PROVIDER_CONFIGS];
                if (!config) throw new Error(`Unknown provider: ${provider}`);

                headers = config.headers ? config.headers(apiKey || '') : {};

                // Handle URL - can be string or function
                if (typeof config.url === 'function') {
                    url = config.url(apiKey || '');
                } else {
                    url = config.url;
                }
            }


            // Special verification for OpenRouter since /models is public
            if (provider === 'openrouter') {
                const authUrl = 'https://openrouter.ai/api/v1/auth/key';
                const authCheck = await fetchFn(authUrl, { method: 'GET', headers });
                if (!authCheck.ok) {
                    throw new Error('Invalid OpenRouter API Key');
                }
            }

            const response = await fetchFn(url, { method: 'GET', headers });

            if (!response.ok) {
                const errorText = await response.text();
                let cleanError = `HTTP ${response.status}`;

                try {
                    const jsonError = JSON.parse(errorText);
                    // Handle common provider error formats
                    if (jsonError.error?.message) {
                        cleanError = jsonError.error.message;
                    } else if (jsonError.message) {
                        cleanError = jsonError.message;
                    } else if (jsonError.detail) {
                        cleanError = jsonError.detail;
                    } else {
                        cleanError = errorText; // Fallback to raw text if structure unknown
                    }
                } catch {
                    // Not JSON, use simple text or status
                    if (response.status === 401) cleanError = "Unauthorized: Invalid API Key";
                    else if (response.status === 404) cleanError = "Endpoint not found (404)";
                    else cleanError = `Request failed (HTTP ${response.status})`;
                }
                throw new Error(cleanError);
            }

            const data = await response.json();
            let models: string[] = [];

            // Parse response based on provider
            if (provider === 'openai' || provider === 'mistral' || provider === 'openrouter' || provider === 'lmstudio') {
                if (Array.isArray(data.data)) {
                    models = data.data.map((m: { id: string }) => m.id);
                }
            } else if (provider === 'anthropic') {
                // Anthropic can be data[] or similar
                if (Array.isArray(data.data)) { // Should correct this if Anthropic structure implies otherwise from logs
                    models = data.data.map((m: { id: string }) => m.id);
                } else {
                    models = [];
                }
            } else if (provider === 'gemini') {
                if (data.models) {
                    models = data.models.map((m: { name: string }) => m.name.replace('models/', ''));
                }
            } else if (provider === 'ollama') {
                if (data.models) {
                    models = data.models.map((m: { name: string }) => m.name);
                }
            }

            return { success: true, models };
        } catch (error: any) {
            console.error('LLM Fetch Error:', error);
            let userMessage = error instanceof Error ? error.message : 'Unknown error occurred';

            // Refine generic fetch errors (network, CORS)
            if (userMessage.includes('Failed to fetch') || userMessage.includes('NetworkError') || userMessage.includes('Load failed')) {
                if (provider === 'ollama' || provider === 'lmstudio' || provider === 'local') {
                    userMessage = `Connection failed. Ensure ${provider === 'lmstudio' ? 'LM Studio' : 'Ollama'} is running at ${baseUrl || 'default port'}.`;
                } else if (provider === 'anthropic' && !isTauri()) {
                    // Warning only relevant for browser
                    userMessage = 'Connection blocked by CORS? Try running the desktop app.';
                } else {
                    userMessage = 'Network error. Please check your connection.';
                }
            }

            return {
                success: false,
                error: userMessage
            };
        }
    }
}

