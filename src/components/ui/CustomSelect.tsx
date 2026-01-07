
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, CircuitBoard, Cloud, Laptop } from 'lucide-react';


export interface Option {
    value: string;
    label: string;
    description?: string;
    icon?: React.ReactNode;
}

export interface OptionGroup {
    label: string;
    options: Option[];
}

interface CustomSelectProps {
    options: (Option | OptionGroup)[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    compact?: boolean;
    className?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
    options,
    value,
    onChange,
    placeholder = "Select an option",
    disabled = false,
    compact = false,
    className = ""
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Helper to flatten options for finding selected
    const allOptions = options.flatMap(o => 'options' in o ? o.options : [o]);
    const selectedOption = allOptions.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (val: string) => {
        onChange(val);
        setIsOpen(false);
    };

    // Helper to render an individual option
    const renderOption = (opt: Option) => (
        <div
            key={opt.value}
            className={`px-3 py-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-all group ${value === opt.value
                ? 'bg-primary/5 text-primary'
                : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200'
                }`}
            onClick={() => handleSelect(opt.value)}
        >
            <div className="flex items-center gap-2">
                {opt.icon && <span className={`text-gray-400 group-hover:text-primary transition-colors ${value === opt.value ? 'text-primary' : ''}`}>{opt.icon}</span>}
                <div>
                    <span className="font-medium block">{opt.label}</span>
                    {opt.description && <span className="text-xs text-gray-400 block mt-0.5">{opt.description}</span>}
                </div>
            </div>
            {value === opt.value && <Check className="w-4 h-4 text-primary shrink-0" />}
        </div>
    );

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div
                className={`w-full bg-white dark:bg-gray-800 border ${isOpen ? 'border-primary shadow-sm' : 'border-gray-200 dark:border-gray-700'} rounded-xl ${compact ? 'px-3 py-1.5 min-h-[32px]' : 'px-4 py-3'} text-sm cursor-pointer flex items-center justify-between transition-all shadow-sm ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-900' : 'hover:border-gray-300 dark:hover:border-gray-600'}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2 truncate">
                    {selectedOption ? (
                        <div className="flex items-center gap-2">
                            {selectedOption.icon && <span className="text-primary">{selectedOption.icon}</span>}
                            <span className="text-gray-900 dark:text-gray-100 font-semibold">{selectedOption.label}</span>
                        </div>
                    ) : (
                        <span className="text-gray-400">{placeholder}</span>
                    )}
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-primary' : ''}`} />
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-[100] w-full mt-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top ring-1 ring-black/5">
                    <div className="max-h-72 overflow-y-auto p-2 custom-scrollbar">
                        {options.map((item, idx) => {
                            if ('options' in item) {
                                // Render Group
                                return (
                                    <div key={idx} className="mb-2 last:mb-0">
                                        <div className="px-3 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                            {item.label === 'Connected' && <CircuitBoard className="w-3 h-3" />}
                                            {item.label === 'Available Cloud' && <Cloud className="w-3 h-3" />}
                                            {item.label === 'Available Local' && <Laptop className="w-3 h-3" />}
                                            {item.label}
                                        </div>
                                        <div className="space-y-0.5">
                                            {item.options.map(renderOption)}
                                        </div>
                                        {idx < options.length - 1 && <div className="h-px bg-gray-100 dark:bg-gray-700/50 my-2 mx-3" />}
                                    </div>
                                );
                            } else {
                                // Render Single Option
                                return renderOption(item);
                            }
                        })}

                        {allOptions.length === 0 && (
                            <div className="px-3 py-4 text-center text-xs text-gray-400">
                                No models available
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomSelect;
