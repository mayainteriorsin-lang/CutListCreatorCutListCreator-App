import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCreatePlywoodBrand, usePlywoodBrands } from "@/hooks/usePlywoodGodown";

type PlywoodSelectorProps = {
  value: string;
  onChange: (value: string) => void;
};

export function PlywoodSelector({ value, onChange }: PlywoodSelectorProps) {
  const { data: brands = [] } = usePlywoodBrands();
  const createBrand = useCreatePlywoodBrand();
  const [inputValue, setInputValue] = useState(value || "");

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  const filtered = useMemo(() => {
    if (!inputValue) return brands;
    return brands.filter((item) =>
      item.brand.toLowerCase().includes(inputValue.toLowerCase())
    );
  }, [brands, inputValue]);

  const selectBrand = (brand: string) => {
    setInputValue(brand);
    onChange(brand);
  };

  const handleEnter = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    const existing = brands.find(
      (b) => b.brand.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      selectBrand(existing.brand);
      return;
    }

    createBrand.mutate(
      { brand: trimmed },
      {
        onSuccess: (created) => {
          selectBrand(created.brand);
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
        placeholder="Type or select plywood brand"
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
                  onClick={() => selectBrand(item.brand)}
                >
                  {item.brand}
                </li>
              ))}
            </ul>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}
