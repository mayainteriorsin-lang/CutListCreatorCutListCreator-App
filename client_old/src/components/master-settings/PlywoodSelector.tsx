import { useEffect, useRef, useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useMaterialStore } from "@/features/materialStore";
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
  const removePlywood = useMaterialStore((state) => state.removePlywood);

  const [plywoodInput, setPlywoodInput] = useState(value || "");
  const [selectedPlywood, setSelectedPlywood] = useState<string | null>(value || null);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const plywoodOptions = useMemo(() => {
    const seen = new Set<string>();
    const deduped: string[] = [];

    brands.forEach((entry) => {
      const brand = (entry.brand || "").trim();
      const key = brand.toLowerCase();
      if (!brand || seen.has(key)) return;
      seen.add(key);
      deduped.push(brand);
    });

    return deduped;
  }, [brands]);

  useEffect(() => {
    setSelectedPlywood(value || null);
    setPlywoodInput(value || "");
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



  const handleEnter = () => {
    const trimmed = plywoodInput.trim();
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();
    const exists = plywoodOptions.some((item) => item.toLowerCase() === lower);

    if (!exists) {
      if (onCreate) {
        onCreate(trimmed);
      } else {
        createBrand.mutate({ brand: trimmed });
      }
    }

    // ✅ Rapid Entry Mode: Clear input but keep open for next entry
    setSelectedPlywood(null);
    setPlywoodInput("");
    setIsOpen(false);
  };

  const handleSelect = (brand: string) => {
    setSelectedPlywood(brand);
    setPlywoodInput(brand);
    onChange(brand);
    setIsOpen(false);
  };

  const handleDelete = (brand: string) => {
    const target = brand.toLowerCase();
    queryClient.setQueryData(["godown", "plywood"], (prev: any) => {
      if (!Array.isArray(prev)) return prev;
      return prev.filter((entry: any) => (entry.brand || "").toLowerCase() !== target);
    });
    removePlywood(brand);
    if (selectedPlywood && selectedPlywood.toLowerCase() === target) {
      setSelectedPlywood(null);
      setPlywoodInput("");
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="dropdown-input-wrapper w-full">
        <input
          value={plywoodInput}
          onChange={(e) => {
            setPlywoodInput(e.target.value);
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
          placeholder="Type or select plywood brand"
          className="dropdown-input w-full"
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
      {isOpen && plywoodOptions.length > 0 && (
        <Card className="absolute z-10 mt-1 w-full border shadow-sm">
          <ScrollArea className="max-h-52">
            <ul className="divide-y divide-gray-100">
              {plywoodOptions.map((brand) => (
                <li
                  key={brand}
                  className="px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                  onClick={() => handleSelect(brand)}
                >
                  <span>{brand}</span>
                  <button
                    type="button"
                    className="text-red-700 font-bold hover:text-red-900 ml-3 text-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(brand);
                    }}
                    aria-label={`Delete ${brand}`}
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
