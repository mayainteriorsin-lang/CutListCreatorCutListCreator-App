import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCreatePlywoodBrand, usePlywoodBrands } from "@/hooks/usePlywoodGodown";

type PlywoodSelectorProps = {
  value: string;
  onChange: (value: string) => void;
  onCreate?: (value: string) => void;
};

export function PlywoodSelector({ value, onChange, onCreate }: PlywoodSelectorProps) {
  const { data: brands = [] } = usePlywoodBrands();
  const createBrand = useCreatePlywoodBrand();
  const queryClient = useQueryClient();
  const [inputValue, setInputValue] = useState(value || "");
  const [open, setOpen] = useState(false);

  const uniqueBrands = useMemo(() => {
    const seen = new Set<string>();
    return brands.filter((item) => {
      const key = item.brand.trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [brands]);

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  const filtered = useMemo(() => {
    if (!inputValue) return uniqueBrands;
    return uniqueBrands.filter((item) =>
      item.brand.toLowerCase().includes(inputValue.toLowerCase())
    );
  }, [uniqueBrands, inputValue]);

  const selectBrand = (brand: string) => {
    setInputValue(brand);
    onChange(brand);
    setOpen(false);
  };

  const handleCreate = onCreate ?? ((brand: string, skipSelect: boolean = false) => {
    const existing = uniqueBrands.find(
      (b) => b.brand.toLowerCase() === brand.toLowerCase()
    );
    if (existing) {
      if (!skipSelect) {
        selectBrand(existing.brand);
      } else {
        setOpen(false);
      }
      return;
    }

    createBrand.mutate(
      { brand },
      {
        onSuccess: (created) => {
          if (!skipSelect) {
            selectBrand(created.brand);
          } else {
            setOpen(false);
          }
        },
      }
    );
  });

  const handleEnter = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    onChange(trimmed);
    handleCreate(trimmed, true);
    setInputValue("");
    setOpen(false);
  };

  return (
    <div className="relative">
      <Input
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
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
        placeholder="Type or select plywood brand"
        className="text-sm pr-8"
      />
      <button
        type="button"
        className="absolute inset-y-0 right-2 flex items-center text-gray-400 text-xs"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Toggle plywood dropdown"
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
                  onClick={() => selectBrand(item.brand)}
                >
                  <span>{item.brand}</span>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-red-500 ml-3 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      queryClient.setQueryData(["godown", "plywood"], (prev: any) => {
                        if (!Array.isArray(prev)) return prev;
                        return prev.filter((p: any) => (p.brand || "").toLowerCase() !== item.brand.toLowerCase());
                      });
                    }}
                    aria-label={`Delete ${item.brand}`}
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
