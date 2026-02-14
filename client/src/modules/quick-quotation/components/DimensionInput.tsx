/**
 * DimensionInput Component
 *
 * Smart input for height/width that accepts multiple formats:
 * - Feet + Inches: 7'2, 7ft2in, 7'2"
 * - Inches only: 86", 86in
 * - Plain number: 7.5
 *
 * Shows converted value hint below input.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { parseDimension, formatDimensionValue, type ParsedDimension } from '../utils/dimensionParser';

interface DimensionInputProps {
  value: number | undefined;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
}

export function DimensionInput({
  value,
  onChange,
  placeholder = "H",
  className,
}: DimensionInputProps) {
  // Track raw input for display (allows typing special formats)
  const [rawInput, setRawInput] = useState('');
  const [parsed, setParsed] = useState<ParsedDimension | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync raw input from external value changes (only when not focused)
  useEffect(() => {
    if (!isFocused) {
      setRawInput(formatDimensionValue(value));
      setParsed(null);
    }
  }, [value, isFocused]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setRawInput(input);

    // Parse the input
    const result = parseDimension(input);
    setParsed(result);

    // Update parent with parsed value
    if (result.isValid) {
      onChange(result.value);
    }
  }, [onChange]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);

    // On blur, format the input to show clean value
    if (parsed?.isValid && parsed.format !== 'decimal') {
      // Keep showing formatted value for special formats while typing
      // But after blur, show the decimal feet value
      setRawInput(formatDimensionValue(parsed.value));
    } else if (!rawInput) {
      setRawInput('');
    }
    setParsed(null);
  }, [parsed, rawInput]);

  // Determine hint to show
  const showHint = isFocused && parsed && parsed.isValid && parsed.format !== 'decimal' && parsed.hint;

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={rawInput}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={cn(
          "text-center font-medium",
          showHint && "rounded-b-none border-b-0",
          className
        )}
        placeholder={placeholder}
      />
      {showHint && (
        <div className="absolute left-0 right-0 top-full z-10 px-1 py-0.5 bg-amber-100 border border-t-0 border-amber-200 rounded-b text-[9px] sm:text-[10px] text-amber-700 text-center font-medium">
          {parsed.hint}
        </div>
      )}
    </div>
  );
}
