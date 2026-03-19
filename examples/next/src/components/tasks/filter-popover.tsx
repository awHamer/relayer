'use client';

import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { PlusCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

interface FilterOption {
  value: string;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

interface FilterPopoverProps {
  title: string;
  paramName: string;
  options: FilterOption[];
}

export function FilterPopover({ title, paramName, options }: FilterPopoverProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selected = new Set(searchParams.get(paramName)?.split(',').filter(Boolean) ?? []);

  function toggle(value: string) {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);

    const params = new URLSearchParams(searchParams.toString());
    if (next.size > 0) {
      params.set(paramName, [...next].join(','));
    } else {
      params.delete(paramName);
    }
    params.set('page', '1');
    router.push(`?${params.toString()}`);
  }

  function clear() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(paramName);
    params.set('page', '1');
    router.push(`?${params.toString()}`);
  }

  return (
    <Popover>
      <PopoverTrigger className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-8 items-center gap-2 rounded-md border border-dashed px-3 text-sm">
        <PlusCircle className="h-4 w-4" />
        {title}
        {selected.size > 0 && (
          <>
            <Separator orientation="vertical" className="mx-1 h-4" />
            <Badge variant="secondary" className="rounded-sm px-1 font-normal">
              {selected.size}
            </Badge>
          </>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-2" align="start">
        <p className="text-muted-foreground mb-2 px-2 text-xs font-medium">{title}</p>
        {options.map((option) => {
          const Icon = option.icon;
          const isSelected = selected.has(option.value);
          return (
            <button
              key={option.value}
              onClick={() => toggle(option.value)}
              className="hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
            >
              <div
                className={`flex h-4 w-4 items-center justify-center rounded-sm border ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-input'}`}
              >
                {isSelected && <span className="text-xs">&#10003;</span>}
              </div>
              {Icon && <Icon className="text-muted-foreground h-4 w-4" />}
              <span className="flex-1 text-left">{option.label}</span>
              {option.count !== undefined && (
                <span className="text-muted-foreground tabular-nums text-xs">{option.count}</span>
              )}
            </button>
          );
        })}
        {selected.size > 0 && (
          <>
            <Separator className="my-1" />
            <button
              onClick={clear}
              className="text-muted-foreground hover:text-foreground w-full py-1.5 text-center text-xs"
            >
              Clear filters
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
