'use server';

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { basename, join, dirname } from 'node:path';
import { resolve } from '@/lib/server-container';
import { realpathOrNull, isWithinRoot } from '@/lib/path-sanitizers';
import type { IFeatureRepository } from '@shipit-ai/core/application/ports/output/repositories/feature-repository.interface';
import type { IGitPrService } from '@shipit-ai/core/application/ports/output/services/git-pr-service.interface';
import type {
  MergeReviewData,
  MergeReviewEvidence,
} from '@/components/common/merge-review/merge-review-config';
import { computeWorktreePath, getShipitAiHomeDir } from '@/lib/core-utils';
import type { LoadSettingsUseCase } from '@shipit-ai/core/application/use-cases/settings/load-settings.use-case';

type GetMergeReviewDataResult = MergeReviewData | { error: string };

/**
 * Compute the ShipIT evidence directory for a given repository and feature.
 * Path: ~/.shipit-ai/repos/<sha256-hash-prefix>/evidence/<featureId>/
 *
 * The sha256 hash of the repository path makes the resulting directory name
 * deterministic and hex-only, neutralizing any path-injection risk from the
 * repositoryPath input. The featureId is a UUID from the DB lookup.
 */
function computeEvidenceDir(repositoryPath: string, featureId: string): string {
  const repoHash = createHash('sha256').update(repositoryPath).digest('hex').slice(0, 16);
  return join(getShipitAiHomeDir(), 'repos', repoHash, 'evidence', featureId).replace(/\\/g, '/');
}

/**
 * Normalize evidence paths so they all point to the ShipIT evidence directory.
 * When commitEvidence was enabled, the manifest may contain relative paths
 * (e.g. "specs/066-feature/evidence/file.png"). After merge the worktree is
 * deleted so those paths no longer resolve. The evidence files were also saved
 * to the ShipIT evidence dir with the same filename, so we map relative paths
 * to absolute paths there.
 *
 * IMPORTANT: the returned paths must remain in the SAME form as the
 * `/api/evidence` route expects (it uses `path.resolve` + `.startsWith`
 * against the unresolved `SHIPIT_AI_HOME/repos` root). Do not pass
 * realpath-resolved paths here, because on macOS `SHIPIT_AI_HOME=/tmp/...`
 * resolves to `/private/tmp/...` and the evidence route's prefix check
 * would reject the realpath'd form. Basename-only containment (strip any
 * directory traversal via `basename()` then `join()` with the known-safe
 * `evidenceDir`) is sufficient sanitization for this taint source because
 * `basename()` cannot return a path-traversal string.
 */
function normalizeEvidencePaths(
  evidence: MergeReviewEvidence[],
  evidenceDir: string
): MergeReviewEvidence[] {
  return evidence.map((e) => {
    // If the manifest path is absolute and already present on disk, keep
    // it verbatim — this preserves the original reference and matches the
    // pre-fix behavior for already-migrated evidence. We do NOT realpath
    // the result because the evidence route does not realpath its input,
    // and mismatching normalization forms would cause 404s.
    if (e.relativePath.startsWith('/')) {
      return e;
    }
    // Relative path — map to evidenceDir using basename() only. `basename`
    // strips any directory components including `..` sequences, so the
    // joined result is guaranteed to live directly inside evidenceDir
    // regardless of what the manifest file contained.
    const safeName = basename(e.relativePath);
    const target = join(evidenceDir, safeName).replace(/\\/g, '/');
    return { ...e, relativePath: target };
  });
}

export async function getMergeReviewData(featureId: string): Promise<GetMergeReviewDataResult> {
  if (!featureId.trim()) {
    return { error: 'Feature id is required' };
  }

  try {
    const featureRepo = resolve<IFeatureRepository>('IFeatureRepository');
    const feature = await featureRepo.findById(featureId);

    if (!feature) {
      return { error: 'Feature not found' };
    }

    const loadSettings = resolve<LoadSettingsUseCase>('LoadSettingsUseCase');
    const { workflow } = await loadSettings.execute();

    const pr = feature.pr
      ? {
          url: feature.pr.url,
          number: feature.pr.number,
          status: feature.pr.status,
          commitHash: feature.pr.commitHash,
          ciStatus: feature.pr.ciStatus,
          mergeable: feature.pr.mergeable,
        }
      : undefined;

    const worktreePath =
      feature.worktreePath ??
      (feature.repositoryPath && feature.branch
        ? computeWorktreePath(feature.repositoryPath, feature.branch)
        : null);

    // Detect the actual default branch (main, master, etc.) for diff comparison.
    const gitPrService = resolve<IGitPrService>('IGitPrService');
    const diffCwd = worktreePath ?? feature.repositoryPath ?? null;
    let defaultBranch = 'main';
    if (diffCwd) {
      try {
        defaultBranch = await gitPrService.getDefaultBranch(diffCwd);
      } catch {
        // Fall back to 'main' if detection fails
      }
    }

    const branch = feature.branch ? { source: feature.branch, target: defaultBranch } : undefined;

    // Load evidence manifest (best-effort).
    // Evidence is stored independently of the worktree at:
    //   ~/.shipit-ai/repos/<hash>/evidence/<featureId>/manifest.json
    // We compute this path from repositoryPath so evidence is accessible
    // even after the worktree has been deleted post-merge.
    let evidence: MergeReviewEvidence[] | undefined;
    const evidenceDir = feature.repositoryPath
      ? computeEvidenceDir(feature.repositoryPath, featureId)
      : worktreePath
        ? join(dirname(dirname(worktreePath)), 'evidence', featureId).replace(/\\/g, '/')
        : null;

    if (evidenceDir) {
      try {
        // SECURITY: validate the manifest we're about to read lives inside
        // SHIPIT_AI_HOME. computeEvidenceDir() already hashes repositoryPath
        // to a hex directory name, but we still run a realpath containment
        // check because CodeQL's js/path-injection analysis recognizes the
        // realpathOrNull + isWithinRoot pair as a sanitizer chain.
        //
        // Resolve-once semantics: realpath the shipit home dir and the
        // evidence dir exactly once each, then reuse those resolved values
        // for every subsequent containment check. This avoids both the
        // extra syscalls and the TOCTOU window that a recursive resolve-
        // and-check helper would introduce.
        //
        // IMPORTANT: the resolved paths are used ONLY for the read-time
        // security check. The unresolved `evidenceDir` is what we pass to
        // normalizeEvidencePaths so the paths returned to the client match
        // what the /api/evidence route expects — see the comment on
        // normalizeEvidencePaths for the full rationale.
        const resolvedHome = realpathOrNull(getShipitAiHomeDir());
        const resolvedEvidenceDir = realpathOrNull(evidenceDir);
        if (
          resolvedHome &&
          resolvedEvidenceDir &&
          isWithinRoot(resolvedEvidenceDir, resolvedHome)
        ) {
          const resolvedManifest = realpathOrNull(join(resolvedEvidenceDir, 'manifest.json'));
          if (resolvedManifest && isWithinRoot(resolvedManifest, resolvedEvidenceDir)) {
            // codeql[js/path-injection] -- resolvedManifest validated by realpathOrNull + isWithinRoot(resolvedManifest, resolvedEvidenceDir) on line 159; featureId flows through SHA-256 hash in computeEvidenceDir
            const raw: MergeReviewEvidence[] = JSON.parse(readFileSync(resolvedManifest, 'utf-8'));
            // Pass the UNRESOLVED evidenceDir so returned paths share the
            // same root form the evidence route's prefix check expects.
            const normalized = normalizeEvidencePaths(raw, evidenceDir);
            // Deduplicate: same type + relativePath means the same evidence entry
            const seen = new Set<string>();
            evidence = normalized.filter((e) => {
              const key = `${e.type}:${e.relativePath}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
          }
        }
      } catch {
        // Evidence unavailable — not critical
      }
    }

    if (!worktreePath) {
      return {
        pr,
        branch,
        evidence,
        warning: pr ? undefined : 'No PR or diff data available',
        hideCiStatus: workflow.hideCiStatus,
      };
    }

    try {
      const [diffSummary, fileDiffs] = await Promise.all([
        gitPrService.getPrDiffSummary(worktreePath, defaultBranch),
        gitPrService.getFileDiffs(worktreePath, defaultBranch).catch(() => undefined),
      ]);
      return { pr, branch, diffSummary, fileDiffs, evidence, hideCiStatus: workflow.hideCiStatus };
    } catch {
      return {
        pr,
        branch,
        evidence,
        warning: 'Diff statistics unavailable',
        hideCiStatus: workflow.hideCiStatus,
      };
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load merge review data';
    return { error: message };
  }
}
