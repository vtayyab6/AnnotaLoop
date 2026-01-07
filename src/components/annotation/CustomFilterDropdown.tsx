import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface Option {
    value: string;
    label: string;
    render?: () => React.ReactNode;
}

export interface CustomFilterDropdownProps {
    value: string;
    options: Option[];
    onChange: (value: string) => void;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    label: string;
    renderOption?: (value: string) => React.ReactNode;
    width?: string;
}

const CustomFilterDropdown = ({
    value,
    options,
    onChange,
    isOpen,
    setIsOpen,
    label,
    renderOption,
    width = "w-32"
}: CustomFilterDropdownProps) => (
    <div className={`relative ${width}`}>
        <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:border-gray-400 dark:hover:border-gray-500 transition-colors text-gray-700 dark:text-gray-200"
        >
            <span className="truncate">{renderOption ? renderOption(value) : (options.find(o => o.value === value)?.label || label)}</span>
            <ChevronDown className="w-3 h-3 text-gray-400 shrink-0 ml-2" />
        </button>
        {isOpen && (
            <>
                <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
                <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto scroll-custom p-1">
                    {options.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => { onChange(opt.value); setIsOpen(false); }}
                            className={`flex items-center w-full px-2 py-1.5 text-xs rounded-md transition-colors ${value === opt.value ? 'bg-primary/10 text-primary font-bold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >
                            {opt.render ? opt.render() : opt.label}
                        </button>
                    ))}
                </div>
            </>
        )}
    </div>
);

export default CustomFilterDropdown;
