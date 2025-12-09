import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCreateLaminateCode, useLaminateCodes } from "@/hooks/useLaminateGodown";
import { useMasterSettings, useUpdateMasterSettings } from "@/hooks/useMasterSettings";

type LaminateSelectorProps = {
  value: string;
  onChange: (value: string) => void;
};

export function LaminateSelector({ value, onChange }: LaminateSelectorProps) {
  const { data: masterSettings } = useMasterSettings();
  const { data: laminateCodes = [] } = useLaminateCodes();
  const createLaminate = useCreateLaminateCode();
  const updateMasterSettings = useUpdateMasterSettings();
  const [inputValue, setInputValue] = useState(value || "");

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  useEffect(() => {
    if (!inputValue && masterSettings?.masterLaminateCode) {
      setInputValue(masterSettings.masterLaminateCode);
      onChange(masterSettings.masterLaminateCode);
    }
  }, [inputValue, masterSettings, onChange]);

  const filtered = useMemo(() => {
    if (!inputValue) return laminateCodes;
    return laminateCodes.filter((item) =>
      item.code.toLowerCase().includes(inputValue.toLowerCase())
    );
  }, [laminateCodes, inputValue]);

  const persistMasterLaminate = (code: string | null) => {
    updateMasterSettings.mutate({ masterLaminateCode: code });
  };

  const selectLaminate = (code: string) => {
    setInputValue(code);
    onChange(code);
    persistMasterLaminate(code);
  };

  const handleEnter = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    const existing = laminateCodes.find(
      (item) => item.code.toLowerCase() === trimmed.toLowerCase()
    );

    if (existing) {
      selectLaminate(existing.code);
      return;
    }

    createLaminate.mutate(
      { code: trimmed, name: trimmed },
      {
        onSuccess: (created) => {
          selectLaminate(created.code);
        },
      }
    );
  };

  return (
    <div className="relative">
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleEnter();
          }
        }}
        placeholder="Type or select laminate code"
        className="text-sm"
      />
      {filtered.length > 0 && (
        <Card className="absolute z-10 mt-1 w-full border shadow-sm">
          <ScrollArea className="max-h-52">
            <ul className="divide-y divide-gray-100">
              {filtered.map((item) => (
                <li
                  key={item.id}
                  className="px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                  onClick={() => selectLaminate(item.code)}
                >
                  <div className="font-medium">{item.code}</div>
                  {item.name && (
                    <div className="text-xs text-gray-500">{item.name}</div>
                  )}
                </li>
              ))}
            </ul>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}
