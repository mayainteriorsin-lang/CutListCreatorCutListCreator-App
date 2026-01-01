import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCreateLaminateCode, useLaminateCodes } from "@/hooks/useLaminateGodown";
import { useQueryClient } from "@tanstack/react-query";
import { useUpdateMasterSettings } from "@/hooks/useMasterSettings";

type LaminateSelectorProps = {
  value: string;
  onChange: (value: string) => void;
};

export function LaminateSelector({ value, onChange }: LaminateSelectorProps) {
  const { data: laminateCodes = [] } = useLaminateCodes();
  const createLaminate = useCreateLaminateCode();
  const updateMasterSettings = useUpdateMasterSettings();
  const queryClient = useQueryClient();
  const [inputValue, setInputValue] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const uniqueLaminateCodes = useMemo(() => {
    const seen = new Set<string>();
    return laminateCodes.filter((item) => {
      const key = item.code.trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [laminateCodes]);

  useEffect(() => {
    if (justSaved) return;
    setInputValue(value || "");
  }, [value, justSaved]);

  const filtered = useMemo(() => {
    if (!inputValue) return uniqueLaminateCodes;
    return uniqueLaminateCodes.filter((item) =>
      item.code.toLowerCase().includes(inputValue.toLowerCase())
    );
  }, [uniqueLaminateCodes, inputValue]);

  const persistMasterLaminate = (code: string | null) => {
    updateMasterSettings.mutate({ masterLaminateCode: code });
  };

  const selectLaminate = (code: string) => {
    setSelectedValue(code);
    onChange(code);
    persistMasterLaminate(code);
    setOpen(false);
  };

  const handleEnter = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    setJustSaved(true);
    const existing = uniqueLaminateCodes.find(
      (item) => item.code.toLowerCase() === trimmed.toLowerCase()
    );

    if (existing) {
      selectLaminate(existing.code);
      setInputValue("");
      setSelectedValue(null);
      setOpen(false);
      return;
    }

    createLaminate.mutate(
      { code: trimmed, name: trimmed },
      {
        onSuccess: (created) => {
          selectLaminate(created.code);
          setInputValue("");
          setSelectedValue(null);
          setOpen(false);
        },
      }
    );
  };

  return (
    <div className="relative">
      <Input
        value={inputValue || selectedValue || ""}
        onChange={(e) => {
          setInputValue(e.target.value);
          setJustSaved(false);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleEnter();
          }
        }}
        placeholder="Type or select laminate code"
        className="text-sm"
      />
      <button
        type="button"
        className="absolute inset-y-0 right-2 flex items-center text-gray-400 text-xs"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Toggle laminate dropdown"
      >
        ▼
      </button>
      {open && filtered.length > 0 && (
        <Card className="absolute z-10 mt-1 w-full border shadow-sm">
          <ScrollArea className="max-h-52">
            <ul className="divide-y divide-gray-100">
              {filtered.map((item) => (
                <li
                  key={item.id}
                  className="px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                  onClick={() => selectLaminate(item.code)}
                >
                  <div className="font-medium">{item.code}</div>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-red-500 ml-3 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      queryClient.setQueryData(["godown", "laminate"], (prev: any) => {
                        if (!Array.isArray(prev)) return prev;
                        return prev.filter((p: any) => (p.code || "").toLowerCase() !== item.code.toLowerCase());
                      });
                    }}
                    aria-label={`Delete ${item.code}`}
                  >
                    ×
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
