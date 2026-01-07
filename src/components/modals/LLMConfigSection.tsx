import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, RefreshCw, Key, HelpCircle } from 'lucide-react';
import { LLMService } from '../../services/LLMService';
import type { SettingsState } from '../../context/types';
import CustomSelect from '../ui/CustomSelect';
import { useToast } from '../../context/ToastContext';

interface LLMConfigSectionProps {
    provider: string;
    settings: SettingsState;
    setSettings: React.Dispatch<React.SetStateAction<SettingsState>>;
}

const LLMConfigSection: React.FC<LLMConfigSectionProps> = ({ provider, settings, setSettings }) => {
    // State
    const [inputValue, setInputValue] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [confirmRemove, setConfirmRemove] = useState(false);
    const { addToast } = useToast();

    // Reset local state when provider changes
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setStatus('idle');
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setErrorMsg('');
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShowKey(false);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setConfirmRemove(false);

        // Only keep input value for local if auto-filled, otherwise clear
        if (provider === 'ollama') setInputValue('http://localhost:11434');
        else if (provider === 'lmstudio') setInputValue('http://localhost:1234');
        else setInputValue('');

    }, [provider]);

    // Check if configuration exists
    const hasConfig = settings.providers[provider]?.apiKey || settings.providers[provider]?.baseUrl;
    const modelCount = settings.providers[provider]?.models?.length || 0;
    const models = settings.providers[provider]?.models || [];

    // Local Helper for display
    const isLocal = provider === 'ollama' || provider === 'lmstudio' || provider === 'local';
    const inputPlaceholder = isLocal ? "Enter Base URL (e.g. http://localhost:11434)" : "Enter API Key";
    const inputType = isLocal ? 'text' : (showKey ? 'text' : 'password');

    // Auto-fill input if local default - (Removed redundant effect, merged logic above)

    const handleVerifyAndLoad = async () => {
        setStatus('loading');
        setErrorMsg('');

        // Use saved base URL if local and input is empty (or input value if new)
        const baseUrlToUse = isLocal ? (inputValue || settings.providers[provider]?.baseUrl) : undefined;
        const apiKeyToUse = isLocal ? 'local' : inputValue;

        if (!apiKeyToUse && !isLocal) {
            setStatus('error');
            setErrorMsg("Please enter an API Key");
            return;
        }

        const res = await LLMService.verifyAndFetchModels(provider, apiKeyToUse!, baseUrlToUse);

        if (res.success && res.models) {
            // Update global settings state
            setSettings(prev => ({
                ...prev,
                providers: {
                    ...prev.providers,
                    [provider]: {
                        apiKey: isLocal ? undefined : apiKeyToUse,
                        baseUrl: isLocal ? baseUrlToUse : undefined,
                        models: res.models || []
                    }
                }
            }));
            setStatus('success');
            addToast(`${provider} connected successfully!`, 'success');
        } else {
            setStatus('error');
            setErrorMsg(res.error || 'Verification failed');
            addToast(`Connection failed: ${res.error} `, 'error');
        }
    };


    const confirmRemoval = () => {
        setSettings(prev => ({
            ...prev,
            providers: {
                ...prev.providers,
                [provider]: {
                    apiKey: undefined,
                    baseUrl: undefined,
                    models: []
                }
            }
        }));
        setInputValue('');
        setConfirmRemove(false);
        setStatus('idle');
        addToast(`${provider} configuration removed.`, 'info');
    };

    const handleDefaultModelChange = (model: string) => {
        // Update both default model AND default provider when a model is selected
        const providerDisplay = provider === 'openai' ? 'OpenAI' :
            provider === 'anthropic' ? 'Anthropic' :
                provider === 'openrouter' ? 'OpenRouter' :
                    provider === 'mistral' ? 'Mistral AI' :
                        provider === 'gemini' ? 'Gemini' :
                            provider === 'ollama' ? 'Ollama' :
                                provider === 'lmstudio' ? 'LM Studio' :
                                    provider.charAt(0).toUpperCase() + provider.slice(1);

        setSettings(prev => ({
            ...prev,
            defaultModel: model,
            defaultProvider: providerDisplay
        }));
        addToast(`Default model updated to ${model}`, 'success');
    };


    return (
        <>
            <div className="animate-in fade-in duration-300 w-full max-w-full">
                {/* Header / Title */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 dark:text-gray-100 capitalize">
                            {provider.replace('lmstudio', 'LM Studio')} Configuration
                        </h3>
                        {/* Status removed from header as per new design */}
                    </div>

                    {isLocal && (
                        <div className="group relative">
                            <HelpCircle className="w-5 h-5 text-gray-400 hover:text-primary cursor-help transition-colors" />
                            <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300 z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all">
                                <p className="font-bold mb-1">Local LLM Guide</p>
                                <p className="mb-1">1. Ensure your server is running.</p>
                                <p className="mb-1">2. Allow CORS connections.</p>
                                <p>3. Default: {provider === 'ollama' ? 'http://localhost:11434' : 'http://localhost:1234'}</p>
                            </div>
                        </div>
                    )}
                </div>

                {hasConfig ? (
                    // SAVED STATE - Neutral Card
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-4 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-4 overflow-hidden">
                            <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center shrink-0 border border-gray-100 dark:border-gray-700">
                                <CheckCircle className="w-5 h-5 text-green-500" />
                            </div>
                            <div className="min-w-0">
                                <div className="font-medium text-gray-900 dark:text-gray-100 truncate flex items-center gap-2">
                                    {isLocal ? settings.providers[provider].baseUrl : `${provider === 'openai' ? 'sk-...' : 'Key ending in ' + settings.providers[provider].apiKey?.slice(-4)}`}
                                    {isLocal && <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded uppercase">Local</span>}
                                </div>
                                <div className={`text-xs font-medium mt-0.5 truncate ${modelCount === 0 ? 'text-orange-500' : 'text-gray-500 dark:text-gray-400'}`}>
                                    {modelCount > 0 ? (
                                        <>✓ Connected · {modelCount} models available</>
                                    ) : (
                                        <>Connected · No models available. Add a model to continue.</>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={() => setConfirmRemove(true)}
                                className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-red-500 transition-colors"
                            >
                                Disconnect
                            </button>
                        </div>
                    </div>
                ) : (
                    // INPUT STATE
                    <div className="mb-4">
                        <div className="flex gap-3">
                            <div className="relative flex-1 min-w-0">
                                <input
                                    type={inputType}
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder={inputPlaceholder}
                                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono"
                                />
                                {!isLocal && inputValue && (
                                    <button
                                        onClick={() => setShowKey(!showKey)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                    >
                                        <Key className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={handleVerifyAndLoad}
                                disabled={status === 'loading' || (!inputValue && !isLocal)}
                                className="px-5 py-2.5 bg-primary hover:bg-primary-hover active:scale-95 text-white font-bold text-sm rounded-xl shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap shrink-0"
                            >
                                {status === 'loading' ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                    'Connect'
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Error Message - Constrained Width Container */}
                <div className={`overflow-hidden transition-all duration-300 ${errorMsg ? 'max-h-32 opacity-100 mb-4' : 'max-h-0 opacity-0'}`}>
                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-3 w-full max-w-full box-border">
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                            <p className="text-sm text-red-700 dark:text-red-300 leading-snug break-words break-all whitespace-normal">
                                {errorMsg}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Model Selection (Only if models available) */}
                {hasConfig && (
                    <div className="animate-in slide-in-from-bottom-2 fade-in duration-300">
                        <label className={`block text-xs font-bold uppercase mb-2 ${!settings.providers[provider]?.models?.length ? 'text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}>
                            Select Default Model
                        </label>
                        <div className="relative z-10 text-left">
                            <CustomSelect
                                options={models.map(m => ({ value: m, label: m }))}
                                value={settings.defaultModel || ''}
                                onChange={(val) => handleDefaultModelChange(val)}
                                placeholder="Choose a model..."
                                className="w-full"
                                disabled={!hasConfig || models.length === 0}
                            />
                        </div>
                    </div>
                )}

                {!hasConfig && !isLocal && (
                    <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
                        <AlertCircle className="w-3 h-3" />
                        Keys are stored securely in your browser locally.
                    </p>
                )}
            </div>

            {/* Disconnect Warning Modal - CRITICAL: High z-index to appear above settings modal */}
            {confirmRemove && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setConfirmRemove(false)} />
                    <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Disconnect {provider}?</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            This will remove the API key and disable this provider. You will need to re-enter your key to use it again.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setConfirmRemove(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmRemoval}
                                className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors"
                            >
                                Disconnect
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default LLMConfigSection;
