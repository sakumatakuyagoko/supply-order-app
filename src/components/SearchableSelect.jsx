import React, { useState, useEffect, useMemo, useRef } from 'react';

const SearchableSelect = ({ value, onChange, options, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    // Determine displayed options:
    const displayedOptions = useMemo(() => {
        if (!value) return options;
        if (options.includes(value)) return options;

        const filtered = options.filter(opt =>
            opt.toLowerCase().includes(value.toLowerCase())
        );
        return filtered.length > 0 ? filtered : [];
    }, [value, options]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (opt) => {
        onChange(opt === 'すべて' ? '' : opt);
        setIsOpen(false);
    };

    return (
        <div className="relative text-sm" ref={wrapperRef}>
            <div className="relative">
                <input
                    type="text"
                    className="w-full border border-gray-300 rounded px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none pr-8"
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={(e) => {
                        e.target.select();
                        setIsOpen(true);
                    }}
                    onClick={() => setIsOpen(true)}
                />
                {/* Clear 'X' Button (visible if value exists) */}
                {value && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onChange('');
                            setIsOpen(true);
                        }}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                )}
            </div>

            {/* Dropdown Options */}
            {isOpen && displayedOptions.length > 0 && (
                <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded mt-1 shadow-lg max-h-60 overflow-auto">
                    {displayedOptions.map((opt, idx) => (
                        <li
                            key={idx}
                            className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${opt === value ? 'bg-blue-100 font-bold text-blue-800' : 'text-gray-700'}`}
                            onClick={() => handleSelect(opt)}
                        >
                            {opt}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default SearchableSelect;
