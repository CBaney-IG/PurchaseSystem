'use client'

import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { Vendor } from '@/types/domain'

interface VendorComboboxProps {
  vendors: Vendor[]
  value: string | null
  onChange: (vendorId: string | null) => void
  disabled?: boolean
  placeholder?: string
}

export function VendorCombobox({
  vendors,
  value,
  onChange,
  disabled,
  placeholder = 'Search vendors...',
}: VendorComboboxProps) {
  const [open, setOpen] = useState(false)

  const preferred = vendors.filter((v) => v.preferred)
  const others = vendors.filter((v) => !v.preferred)
  const selected = vendors.find((v) => v.id === value)

  function handleSelect(vendorId: string) {
    onChange(vendorId === value ? null : vendorId)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          {selected ? (
            <span className="truncate">{selected.name}</span>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search vendors..." />
          <CommandList>
            <CommandEmpty>No vendor found.</CommandEmpty>

            {preferred.length > 0 && (
              <CommandGroup heading="Preferred">
                {preferred.map((vendor) => (
                  <CommandItem
                    key={vendor.id}
                    value={vendor.name}
                    onSelect={() => handleSelect(vendor.id)}
                  >
                    <Check
                      className={cn('mr-2 h-4 w-4', value === vendor.id ? 'opacity-100' : 'opacity-0')}
                    />
                    {vendor.name}
                    <span className="ml-auto text-xs text-slate-400">{vendor.category}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {preferred.length > 0 && others.length > 0 && <CommandSeparator />}

            {others.length > 0 && (
              <CommandGroup heading={preferred.length > 0 ? 'Other vendors' : undefined}>
                {others.map((vendor) => (
                  <CommandItem
                    key={vendor.id}
                    value={vendor.name}
                    onSelect={() => handleSelect(vendor.id)}
                  >
                    <Check
                      className={cn('mr-2 h-4 w-4', value === vendor.id ? 'opacity-100' : 'opacity-0')}
                    />
                    {vendor.name}
                    <span className="ml-auto text-xs text-slate-400">{vendor.category}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
