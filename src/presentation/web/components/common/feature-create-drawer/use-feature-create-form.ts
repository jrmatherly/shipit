'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSoundAction } from '@/hooks/use-sound-action';
import { useGuardedDrawerClose } from '@/hooks/drawer-close-guard';
import { getViewerPermission } from '@/app/actions/get-viewer-permission';
import type { WorkflowDefaults } from '@/app/actions/get-workflow-defaults';
import { pickFiles } from './pick-files';
import type { FormAttachment, RepositoryOption, FeatureCreatePayload } from './types';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.bmp',
  '.ico',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.md',
  '.csv',
  '.json',
  '.yaml',
  '.yml',
  '.xml',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.py',
  '.rb',
  '.go',
  '.rs',
  '.java',
  '.c',
  '.cpp',
  '.h',
  '.hpp',
  '.cs',
  '.swift',
  '.kt',
  '.html',
  '.css',
  '.scss',
  '.less',
  '.sh',
  '.bash',
  '.zsh',
  '.fish',
  '.toml',
  '.ini',
  '.cfg',
  '.conf',
  '.env',
  '.zip',
  '.tar',
  '.gz',
  '.log',
]);

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot >= 0 ? filename.slice(dot).toLowerCase() : '';
}

const EMPTY_GATES: Record<string, boolean> = {
  allowPrd: false,
  allowPlan: false,
  allowMerge: false,
};

export interface UseFeatureCreateFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: FeatureCreatePayload) => void;
  repositoryPath: string;
  workflowDefaults?: WorkflowDefaults;
  repositories?: RepositoryOption[];
  initialParentId?: string;
  currentAgentType?: string;
  currentModel?: string;
  initialDescription?: string;
  canPushDirectly?: boolean;
}

export function useFeatureCreateForm({
  open,
  onClose,
  onSubmit,
  repositoryPath,
  workflowDefaults,
  repositories,
  initialParentId,
  currentAgentType,
  currentModel,
  initialDescription,
  canPushDirectly,
}: UseFeatureCreateFormProps) {
  const createSound = useSoundAction('create');

  // Validate repositoryPath from URL against active repos — prevents stale URL params
  // from selecting deleted repos after add/delete/re-add cycles.
  const validRepoPath = !repositoryPath
    ? ''
    : !repositories ||
        repositories.length === 0 ||
        repositories.some((r) => r.path === repositoryPath)
      ? repositoryPath
      : '';

  const defaultGates = workflowDefaults?.approvalGates ?? EMPTY_GATES;
  const defaultPush = workflowDefaults?.push ?? false;
  const defaultOpenPr = workflowDefaults?.openPr ?? false;
  const defaultCiWatch = workflowDefaults?.ciWatchEnabled !== false;
  const defaultEnableEvidence = workflowDefaults?.enableEvidence ?? false;
  const defaultCommitEvidence = workflowDefaults?.commitEvidence ?? false;
  const defaultFast = workflowDefaults?.fast !== false;

  const [description, setDescription] = useState(initialDescription ?? '');

  // Sync description when initialDescription prop changes (e.g. from session context)
  useEffect(() => {
    if (initialDescription) {
      setDescription(initialDescription);
    }
  }, [initialDescription]);

  const [attachments, setAttachments] = useState<FormAttachment[]>([]);
  const [approvalGates, setApprovalGates] = useState<Record<string, boolean>>({ ...defaultGates });
  const [push, setPush] = useState(defaultPush);
  const [openPr, setOpenPr] = useState(defaultOpenPr);
  const [ciWatchEnabled, setCiWatchEnabled] = useState(workflowDefaults?.ciWatchEnabled !== false);
  const [enableEvidence, setEnableEvidence] = useState(defaultEnableEvidence);
  const [commitEvidence, setCommitEvidence] = useState(defaultCommitEvidence);
  const [parentId, setParentId] = useState<string | undefined>(undefined);
  const [fast, setFast] = useState(defaultFast);
  const [pending, setPending] = useState(false);
  const [forkAndPr, setForkAndPr] = useState(false);
  const [commitSpecs, setCommitSpecs] = useState(true);
  const [rebaseBeforeBranch, setRebaseBeforeBranch] = useState(true);
  const [overrideAgent, setOverrideAgent] = useState<string | undefined>(undefined);
  const [overrideModel, setOverrideModel] = useState<string | undefined>(undefined);
  const [selectedRepoPath, setSelectedRepoPath] = useState<string | undefined>(
    validRepoPath || undefined
  );
  const [localRepos, setLocalRepos] = useState<RepositoryOption[]>(repositories ?? []);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isPromptFocused, setIsPromptFocused] = useState(false);

  // Stable sessionId per mount — used for upload dedup grouping
  const sessionIdRef = useRef(crypto.randomUUID());
  const dragCounterRef = useRef(0);

  // Sync state when workflowDefaults load asynchronously
  useEffect(() => {
    if (workflowDefaults) {
      setApprovalGates({ ...workflowDefaults.approvalGates });
      setPush(workflowDefaults.push);
      setOpenPr(workflowDefaults.openPr);
      setCiWatchEnabled(workflowDefaults.ciWatchEnabled !== false);
      setEnableEvidence(workflowDefaults.enableEvidence);
      setCommitEvidence(workflowDefaults.commitEvidence);
      setFast(workflowDefaults.fast !== false);
    }
  }, [workflowDefaults]);

  // Sync localRepos when repositories prop changes
  useEffect(() => {
    setLocalRepos(repositories ?? []);
  }, [repositories]);

  // Pre-select parent when initialParentId changes (e.g. (+) button on feature node)
  useEffect(() => {
    if (open && initialParentId) {
      setParentId(initialParentId);
    }
  }, [open, initialParentId]);

  // Permission-aware Fork & PR toggle visibility
  const [canPush, setCanPush] = useState(canPushDirectly ?? false);

  // Sync canPush from prop when it changes (e.g. initial server-side value)
  useEffect(() => {
    setCanPush(canPushDirectly ?? false);
  }, [canPushDirectly]);

  // Re-check permission when user switches repos via the combobox
  const prevRepoRef = useRef(selectedRepoPath);
  useEffect(() => {
    if (selectedRepoPath && selectedRepoPath !== prevRepoRef.current) {
      prevRepoRef.current = selectedRepoPath;
      getViewerPermission(selectedRepoPath)
        .then((result) => setCanPush(result.canPushDirectly))
        .catch(() => setCanPush(false));
    }
  }, [selectedRepoPath]);

  // Auto-reset forkAndPr and dependent states when canPush becomes true
  useEffect(() => {
    if (canPush) {
      setForkAndPr(false);
      setPush(defaultPush);
      setOpenPr(defaultOpenPr);
      setCommitSpecs(true);
    }
  }, [canPush, defaultPush, defaultOpenPr]);

  const resetForm = useCallback(() => {
    setDescription('');
    setAttachments([]);
    setApprovalGates({ ...defaultGates });
    setPush(defaultPush);
    setOpenPr(defaultOpenPr);
    setCiWatchEnabled(defaultCiWatch);
    setEnableEvidence(defaultEnableEvidence);
    setCommitEvidence(defaultCommitEvidence);
    setParentId(undefined);
    setSelectedRepoPath(validRepoPath || undefined);
    setLocalRepos(repositories ?? []);
    setFast(defaultFast);
    setPending(false);
    setForkAndPr(false);
    setCommitSpecs(true);
    setRebaseBeforeBranch(true);
    setOverrideAgent(undefined);
    setOverrideModel(undefined);
    setUploadError(null);
    dragCounterRef.current = 0;
    setIsDragOver(false);
  }, [
    defaultGates,
    defaultPush,
    defaultOpenPr,
    defaultEnableEvidence,
    defaultCiWatch,
    defaultCommitEvidence,
    defaultFast,
    validRepoPath,
    repositories,
  ]);

  // Track whether the form has unsaved data
  const isDirty = description.trim() !== '' || attachments.length > 0;

  // Shared close guard — shows confirmation when dirty, prevents navigation
  const { attemptClose } = useGuardedDrawerClose({ open, isDirty, onClose, onReset: resetForm });

  /** Validate and upload files from drop or paste. */
  const handleFiles = useCallback(async (fileList: File[]) => {
    setUploadError(null);

    for (const file of fileList) {
      if (file.size > MAX_FILE_SIZE) {
        setUploadError(`"${file.name}" exceeds 10 MB limit`);
        return;
      }
      const ext = getExtension(file.name);
      if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
        setUploadError(`File type "${ext}" is not allowed`);
        return;
      }
    }

    for (const file of fileList) {
      const tempId = crypto.randomUUID();

      setAttachments((prev) => [
        ...prev,
        {
          id: tempId,
          name: file.name,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          path: '',
          loading: true,
        },
      ]);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('sessionId', sessionIdRef.current);

        const res = await fetch('/api/attachments/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: 'Upload failed' }));
          setAttachments((prev) => prev.filter((a) => a.id !== tempId));
          setUploadError(body.error ?? 'Upload failed');
          return;
        }

        const uploaded = await res.json();
        setAttachments((prev) => {
          const isDupe = prev.some((a) => a.id !== tempId && a.path === uploaded.path);
          if (isDupe) return prev.filter((a) => a.id !== tempId);
          return prev.map((a) =>
            a.id === tempId ? { ...uploaded, id: tempId, loading: false } : a
          );
        });
      } catch {
        setAttachments((prev) => prev.filter((a) => a.id !== tempId));
        setUploadError('Upload failed');
      }
    }
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFiles(files);
      }
    },
    [handleFiles]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (const item of Array.from(items)) {
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }

      if (files.length > 0) {
        e.preventDefault();
        handleFiles(files);
      }
    },
    [handleFiles]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!description.trim()) return;
      const effectiveRepoPath = selectedRepoPath ?? validRepoPath;
      if (!effectiveRepoPath) return;
      createSound.play();
      onSubmit({
        description: description.trim(),
        attachments: attachments.filter((a) => !a.loading),
        repositoryPath: effectiveRepoPath,
        approvalGates: {
          allowPrd: approvalGates.allowPrd ?? false,
          allowPlan: approvalGates.allowPlan ?? false,
          allowMerge: approvalGates.allowMerge ?? false,
        },
        push: forkAndPr ? true : push || openPr,
        openPr: forkAndPr ? true : openPr,
        ciWatchEnabled,
        enableEvidence,
        commitEvidence,
        fast,
        forkAndPr,
        commitSpecs,
        rebaseBeforeBranch,
        ...(pending ? { pending } : {}),
        ...(overrideAgent ? { agentType: overrideAgent } : {}),
        ...(overrideModel ? { model: overrideModel } : {}),
        ...(parentId ? { parentId } : {}),
        sessionId: sessionIdRef.current,
      });
      resetForm();
    },
    [
      description,
      attachments,
      approvalGates,
      selectedRepoPath,
      validRepoPath,
      onSubmit,
      push,
      openPr,
      enableEvidence,
      ciWatchEnabled,
      commitEvidence,
      fast,
      forkAndPr,
      commitSpecs,
      rebaseBeforeBranch,
      pending,
      overrideAgent,
      overrideModel,
      parentId,
      createSound,
      resetForm,
    ]
  );

  const handleAddFiles = useCallback(async () => {
    try {
      const files = await pickFiles();
      if (!files) return;

      for (const file of files) {
        const tempId = crypto.randomUUID();

        setAttachments((prev) => [
          ...prev,
          {
            id: tempId,
            name: file.name,
            size: file.size,
            mimeType: 'application/octet-stream',
            path: '',
            loading: true,
          },
        ]);

        try {
          const res = await fetch('/api/attachments/upload-from-path', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: file.path, sessionId: sessionIdRef.current }),
          });

          if (!res.ok) {
            const body = await res.json().catch(() => ({ error: 'Upload failed' }));
            setAttachments((prev) => prev.filter((a) => a.id !== tempId));
            setUploadError(body.error ?? 'Upload failed');
            return;
          }

          const uploaded = await res.json();
          setAttachments((prev) => {
            const isDupe = prev.some((a) => a.id !== tempId && a.path === uploaded.path);
            if (isDupe) return prev.filter((a) => a.id !== tempId);
            return prev.map((a) =>
              a.id === tempId ? { ...uploaded, id: tempId, loading: false } : a
            );
          });
        } catch {
          setAttachments((prev) => prev.filter((a) => a.id !== tempId));
          setUploadError('Upload failed');
        }
      }
    } catch {
      // Native dialog failed — silently ignore (user can retry)
    }
  }, []);

  const handleRemoveFile = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleNotesChange = useCallback((id: string, notes: string) => {
    setAttachments((prev) => prev.map((f) => (f.id === id ? { ...f, notes } : f)));
  }, []);

  const computedPush = forkAndPr ? true : push || openPr;
  const computedOpenPr = forkAndPr ? true : openPr;

  return {
    // Derived values
    validRepoPath,
    canPush,
    isDirty,
    computedPush,
    computedOpenPr,

    // Form state
    description,
    setDescription,
    attachments,
    approvalGates,
    setApprovalGates,
    push,
    setPush,
    openPr,
    setOpenPr,
    ciWatchEnabled,
    setCiWatchEnabled,
    enableEvidence,
    setEnableEvidence,
    commitEvidence,
    setCommitEvidence,
    parentId,
    setParentId,
    fast,
    setFast,
    pending,
    setPending,
    forkAndPr,
    setForkAndPr,
    commitSpecs,
    setCommitSpecs,
    rebaseBeforeBranch,
    setRebaseBeforeBranch,
    overrideAgent,
    setOverrideAgent,
    overrideModel,
    setOverrideModel,
    selectedRepoPath,
    setSelectedRepoPath,
    localRepos,
    setLocalRepos,
    isDragOver,
    uploadError,
    isPromptFocused,
    setIsPromptFocused,
    sessionIdRef,

    // Agent/model passthrough
    currentAgentType,
    currentModel,

    // Handlers
    attemptClose,
    handleFiles,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handlePaste,
    handleSubmit,
    handleAddFiles,
    handleRemoveFile,
    handleNotesChange,
    resetForm,
  };
}
