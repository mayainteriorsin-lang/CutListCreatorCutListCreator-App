import * as React from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/lib/queryClient"
import { GodownMemory } from "@shared/schema"

interface GodownComboboxProps {
    value?: string
    onChange: (value: string) => void
    placeholder?: string
    type?: 'plywood' | 'laminate' | 'general'
}

export function GodownCombobox({ value, onChange, placeholder = "Select godown...", type = 'general' }: GodownComboboxProps) {
    const [open, setOpen] = React.useState(false)
    const [inputValue, setInputValue] = React.useState("")
    const queryClient = useQueryClient()

    const { data: godowns = [] } = useQuery<GodownMemory[]>({
        queryKey: ['/api/godown-memory'],
    })

    const saveGodownMutation = useMutation({
        mutationFn: async (name: string) => {
            return apiRequest('POST', '/api/godown-memory', { name, type })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/godown-memory'] })
        },
    })

    // Filter godowns based on input if needed, but Command does this.
    // We want to handle "Create new" logic.

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                >
                    {value
                        ? godowns.find((g) => g.name === value)?.name || value
                        : placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                    <CommandInput
                        placeholder={`Search ${placeholder.toLowerCase()}...`}
                        value={inputValue}
                        onValueChange={setInputValue}
                    />
                    <CommandList>
                        <CommandEmpty>
                            <div className="p-2">
                                <p className="text-sm text-muted-foreground mb-2">No godown found.</p>
                                <Button
                                    size="sm"
                                    className="w-full"
                                    onClick={() => {
                                        saveGodownMutation.mutate(inputValue)
                                        onChange(inputValue)
                                        setOpen(false)
                                    }}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create "{inputValue}"
                                </Button>
                            </div>
                        </CommandEmpty>
                        <CommandGroup>
                            {godowns.map((godown) => (
                                <CommandItem
                                    key={godown.id}
                                    value={godown.name}
                                    onSelect={(currentValue) => {
                                        onChange(currentValue === value ? "" : currentValue)
                                        setOpen(false)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === godown.name ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {godown.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
