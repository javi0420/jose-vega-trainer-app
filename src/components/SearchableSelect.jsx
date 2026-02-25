import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { clsx } from 'clsx';

export default function SearchableSelect({
    options = [],
    value = '',
    onChange,
    placeholder = 'Selecciona una opción...',
    disabled = false
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeIndex, setActiveIndex] = useState(-1);
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    const toggleDropdown = () => {
        if (disabled) return;
        setIsOpen(!isOpen);
        if (!isOpen) {
            setSearchTerm('');
            setTimeout(() => inputRef.current?.focus(), 10);
        }
    };

    const filteredOptions = options.filter(option =>
        option.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelect = (option) => {
        onChange(option.id);
        setIsOpen(false);
        setSearchTerm('');
        setActiveIndex(-1);
    };

    const handleKeyDown = (e) => {
        if (!isOpen) {
            if (e.key === 'Enter' || e.key === 'ArrowDown') {
                setIsOpen(true);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setActiveIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setActiveIndex(prev => (prev > 0 ? prev - 1 : prev));
                break;
            case 'Enter':
                e.preventDefault();
                if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
                    handleSelect(filteredOptions[activeIndex]);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                break;
            case 'Tab':
                setIsOpen(false);
                break;
            default:
                break;
        }
    };

    const handleClickOutside = (event) => {
        if (containerRef.current && !containerRef.current.contains(event.target)) {
            setIsOpen(false);
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.id === value);

    return (
        <div className="relative w-full" ref={containerRef}>
            <div
                onClick={toggleDropdown}
                data-testid="searchable-select-toggle"
                className={clsx(
                    "flex items-center justify-between bg-gray-800/60 backdrop-blur-xl border border-white/10 p-4 rounded-xl cursor-pointer hover:bg-gray-700/60 transition-all shadow-lg",
                    disabled && "opacity-50 cursor-not-allowed",
                    isOpen && "ring-2 ring-gold-500/50 border-gold-500/50"
                )}
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    <Search className="h-4 w-4 text-gray-500" />
                    <span className={clsx("truncate text-sm font-medium", !selectedOption ? "text-gray-500" : "text-white")}>
                        {selectedOption ? selectedOption.name : placeholder}
                    </span>
                </div>
                <ChevronDown className={clsx("h-4 w-4 text-gray-400 transition-transform duration-200", isOpen && "rotate-180")} />
            </div>

            {
                isOpen && (
                    <div className="absolute z-50 w-full mt-2 bg-gray-900/95 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-3 border-b border-white/5">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    data-testid="exercise-search-input"
                                    className="w-full bg-black/30 border border-white/5 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-gold-500/50 transition-all"
                                    placeholder="Buscar ejercicio..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setActiveIndex(0);
                                    }}
                                    onKeyDown={handleKeyDown}
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <ul className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((option, index) => (
                                    <li
                                        key={option.id}
                                        data-testid={`exercise-option-${option.id}`}
                                        onClick={() => handleSelect(option)}
                                        onMouseEnter={() => setActiveIndex(index)}
                                        className={clsx(
                                            "px-4 py-3 rounded-lg cursor-pointer flex items-center justify-between text-sm transition-colors",
                                            activeIndex === index ? "bg-gold-500/20 text-gold-500" : "text-gray-300 hover:bg-white/5",
                                            value === option.id && "bg-white/5 font-bold"
                                        )}
                                    >
                                        <span className="truncate">{option.name}</span>
                                        {value === option.id && <Check className="h-4 w-4 text-gold-500" />}
                                    </li>
                                ))
                            ) : (
                                <li className="px-4 py-8 text-center text-gray-500 text-sm">
                                    <p>No se encontraron resultados</p>
                                </li>
                            )}
                        </ul>
                    </div>
                )
            }
        </div >
    );
}
