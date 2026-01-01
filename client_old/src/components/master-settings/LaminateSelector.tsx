import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCreateLaminateCode, useLaminateCodes } from "@/hooks/useLaminateGodown";
import { useMaterialStore } from "@/features/materialStore";
import { useQueryClient } from "@tanstack/react-query";
import { useUpdateMasterSettings } from "@/hooks/useMasterSettings";

import { cn } from "@/lib/utils";

type LaminateSelectorProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function LaminateSelector({ value, onChange, className }: LaminateSelectorProps) {
  const { data: laminateCodes = [] } = useLaminateCodes();
  const createLaminate = useCreateLaminateCode();
  const updateMasterSettings = useUpdateMasterSettings();
  const queryClient = useQueryClient();
  const removeLaminate = useMaterialStore((state) => state.removeLaminate);

  const [laminateInput, setLaminateInput] = useState(value || "");
  const [selectedLaminate, setSelectedLaminate] = useState(value || "");
  const [laminateOptions, setLaminateOptions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const seen = new Set<string>();
    const deduped: string[] = [];

    laminateCodes.forEach((entry) => {
      const code = (entry.code || "").trim();
      const key = code.toLowerCase();
      if (!code || seen.has(key)) return;
      seen.add(key);
      deduped.push(code);
    });

    setLaminateOptions(deduped);
  }, [laminateCodes]);

  useEffect(() => {
    setSelectedLaminate(value || "");
    setLaminateInput(value || "");
  }, [value]);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current) return;
      const target = event.target as Node;
      if (!containerRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
    };
  }, []);

  const addItemToStore = (code: string) => {
    setLaminateOptions((prev) => {
      const key = code.trim();
      if (!key) return prev;
      const lower = key.toLowerCase();
      if (prev.some((item) => item.toLowerCase() === lower)) return prev;
      return [...prev, key];
    });
  };

  const handleEnter = () => {
    const trimmed = laminateInput.trim();
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();
    if (laminateOptions.some((item) => item.toLowerCase() === lower)) return;

    addItemToStore(trimmed);
    createLaminate.mutate(
      { code: trimmed, name: trimmed },
      {
        onSuccess: (created) => addItemToStore(created.code),
      }
    );

    // ✅ Rapid Entry Mode: Clear input but keep open for next entry
    setLaminateInput("");
    setIsOpen(false); // Restore Close on Enter (User skipped "Keep Open" bonus)
    // Do NOT select (onChange) - just adding to Godown
  };

  const handleSelect = (code: string) => {
    setSelectedLaminate(code);
    setLaminateInput(code);
    onChange(code);
    updateMasterSettings.mutate({ masterLaminateCode: code });
    setIsOpen(false);
  };

  const handleDelete = (code: string) => {
    const target = code.toLowerCase();
    queryClient.setQueryData(["godown", "laminate"], (prev: any) => {
      if (!Array.isArray(prev)) return prev;
      return prev.filter((entry: any) => (entry.code || "").toLowerCase() !== target);
    });
    setLaminateOptions((prev) => prev.filter((item) => item.toLowerCase() !== target));
    removeLaminate(code);
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="dropdown-input-wrapper w-full">
        <input
          value={laminateInput}
          onChange={(e) => {
            setLaminateInput(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleEnter();
            }
          }}
          placeholder="Type or select laminate code"
          className={cn("dropdown-input w-full", className)}
        />

        <button
          type="button"
          className={`dropdown-arrow ${isOpen ? "open" : ""} text-xl pr-3`}
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label="Toggle dropdown"
        >
          ▼
        </button>
      </div>
      {isOpen && laminateOptions.length > 0 && (
        <Card className="absolute z-10 mt-1 w-full border shadow-sm">
          <ScrollArea className="max-h-52">
            <ul className="divide-y divide-gray-100">
              {laminateOptions.map((code) => (
                <li
                  key={code}
                  className="px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                  onClick={() => handleSelect(code)}
                >
                  <div className="font-medium">{code}</div>
                  <button
                    type="button"
                    className="text-red-700 font-bold hover:text-red-900 ml-3 text-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(code);
                    }}
                    aria-label={`Delete ${code}`}
                  >
                    x
                  </button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}
