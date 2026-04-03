'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronsUpDown, CheckIcon, FolderPlus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useFeatureFlags } from '@/hooks/feature-flags-context';
import { addRepository } from '@/app/actions/add-repository';
import { pickFolder } from '@/components/common/add-repository-button/pick-folder';
import { ReactFileManagerDialog } from '@/components/common/react-file-manager-dialog';
import type { RepositoryOption } from './types';

export interface RepositoryComboboxProps {
  repositories: RepositoryOption[];
  value: string | undefined;
  onChange: (path: string | undefined) => void;
  onAddRepository?: (repo: RepositoryOption) => void;
  disabled?: boolean;
}

export function RepositoryCombobox({
  repositories,
  value,
  onChange,
  onAddRepository,
  disabled,
}: RepositoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [showReactPicker, setShowReactPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { reactFileManager: useReactFileManager } = useFeatureFlags();
  const { t } = useTranslation('web');

  const selectedRepo = repositories.find((r) => r.path === value);

  const filtered = query.trim()
    ? repositories.filter(
        (r) =>
          r.name.toLowerCase().includes(query.toLowerCase()) ||
          r.path.toLowerCase().includes(query.toLowerCase())
      )
    : repositories;

  const handleSelect = useCallback(
    (path: string | undefined) => {
      onChange(path);
      setOpen(false);
      setQuery('');
    },
    [onChange]
  );

  const addRepoFromPath = useCallback(
    async (folderPath: string) => {
      const result = await addRepository({ path: folderPath });
      if (result.error) {
        setAddError(result.error);
        setIsAdding(false);
        return;
      }
      if (result.repository) {
        const newRepo: RepositoryOption = {
          id: result.repository.id,
          name: result.repository.name,
          path: result.repository.path,
        };
        onAddRepository?.(newRepo);
        onChange(newRepo.path);
        setOpen(false);
        setQuery('');
      }
    },
    [onAddRepository, onChange]
  );

  const handleAddRepository = useCallback(async () => {
    if (isAdding) return;

    if (useReactFileManager) {
      setShowReactPicker(true);
      return;
    }

    setIsAdding(true);
    setAddError(null);
    try {
      const folderPath = await pickFolder();
      if (!folderPath) {
        setIsAdding(false);
        return;
      }
      await addRepoFromPath(folderPath);
    } catch {
      // Native picker failed — fall back to React file manager
      setShowReactPicker(true);
    } finally {
      setIsAdding(false);
    }
  }, [isAdding, useReactFileManager, addRepoFromPath]);

  const handleReactPickerSelect = useCallback(
    async (path: string | null) => {
      setShowReactPicker(false);
      if (!path) return;
      setIsAdding(true);
      setAddError(null);
      try {
        await addRepoFromPath(path);
      } catch (err: unknown) {
        setAddError(err instanceof Error ? err.message : 'Failed to add repository');
      } finally {
        setIsAdding(false);
      }
    },
    [addRepoFromPath]
  );

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery('');
    }
  }, [open]);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-label="Repository"
            aria-invalid={!!addError}
            aria-describedby={addError ? 'add-repository-error-msg' : undefined}
            disabled={disabled}
            data-testid="repository-combobox"
            className={cn(
              'border-input bg-background ring-offset-background focus:ring-ring flex h-9 w-full items-center justify-between rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
              !selectedRepo && 'text-muted-foreground'
            )}
          >
            <span className="truncate">
              {selectedRepo ? selectedRepo.name : 'Select repository...'}
            </span>
            <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-80 p-0"
          align="start"
          data-testid="repository-combobox-content"
        >
          <div className="flex flex-col">
            {/* Search input */}
            <div className="border-b p-2">
              <Input
                ref={inputRef}
                placeholder={t('createDrawer.searchRepositories')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-8 border-0 p-0 text-sm shadow-none focus-visible:ring-0"
                data-testid="repository-search"
              />
            </div>

            {/* Options list */}
            <div className="max-h-48 overflow-y-auto py-1" role="listbox" aria-label="Repositories">
              {filtered.length === 0 ? (
                <p
                  className="text-muted-foreground px-3 py-2 text-sm"
                  data-testid="repository-empty"
                >
                  No repositories found.
                </p>
              ) : (
                filtered.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    role="option"
                    aria-selected={value === r.path}
                    onClick={() => handleSelect(r.path)}
                    className={cn(
                      'hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 px-3 py-2 text-sm',
                      value === r.path && 'bg-accent/50'
                    )}
                    data-testid={`repository-option-${r.id}`}
                  >
                    <CheckIcon
                      className={cn('h-4 w-4 shrink-0', value !== r.path && 'invisible')}
                    />
                    <span className="flex flex-col items-start truncate">
                      <span className="truncate">{r.name}</span>
                      <span className="text-muted-foreground truncate text-xs">{r.path}</span>
                    </span>
                  </button>
                ))
              )}
            </div>

            {/* Add new repository — pinned outside scroll area */}
            <Separator />
            <button
              type="button"
              onClick={handleAddRepository}
              disabled={isAdding}
              className="hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 px-3 py-2 text-sm"
              data-testid="add-repository-item"
            >
              {isAdding ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              ) : (
                <FolderPlus className="h-4 w-4 shrink-0" />
              )}
              <span>Add new repository...</span>
            </button>
            {addError ? (
              <p
                id="add-repository-error-msg"
                className="px-3 pb-2 text-xs text-red-500"
                role="alert"
                data-testid="add-repository-error"
              >
                {addError}
              </p>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
      <ReactFileManagerDialog
        open={showReactPicker}
        onOpenChange={(isOpen) => {
          if (!isOpen) setShowReactPicker(false);
        }}
        onSelect={handleReactPickerSelect}
      />
    </>
  );
}
