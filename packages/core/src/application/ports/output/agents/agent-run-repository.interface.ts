/**
 * Agent Run Repository Interface
 *
 * Output port for AgentRun persistence operations.
 * Implementations handle database-specific logic (SQLite, etc.).
 *
 * Following Clean Architecture:
 * - Domain and Application layers depend on this interface
 * - Infrastructure layer provides concrete implementations
 */

import type { AgentRun, AgentRunStatus } from '../../../../domain/generated/output.js';

/**
 * Repository interface for AgentRun entity persistence.
 *
 * Implementations must:
 * - Handle database connection management
 * - Provide thread-safe operations
 * - Support query by thread ID and PID for crash recovery
 */
export interface IAgentRunRepository {
  /**
   * Create a new agent run record.
   *
   * @param agentRun - The agent run to persist
   */
  create(agentRun: AgentRun): Promise<void>;

  /**
   * Find an agent run by its unique ID.
   *
   * @param id - The agent run ID
   * @returns The agent run or null if not found
   */
  findById(id: string): Promise<AgentRun | null>;

  /**
   * Find multiple agent runs by their IDs in a single batch query.
   *
   * @param ids - Array of agent run IDs
   * @returns Array of found agent runs (missing IDs are silently omitted)
   */
  findByIds(ids: string[]): Promise<AgentRun[]>;

  /**
   * Find an agent run by its LangGraph thread ID.
   *
   * @param threadId - The LangGraph thread ID
   * @returns The agent run or null if not found
   */
  findByThreadId(threadId: string): Promise<AgentRun | null>;

  /**
   * Update agent run status with optional additional field updates.
   *
   * @param id - The agent run ID
   * @param status - The new status
   * @param updates - Optional additional fields to update
   */
  updateStatus(id: string, status: AgentRunStatus, updates?: Partial<AgentRun>): Promise<void>;

  /**
   * Find all running agent runs for a given process ID.
   * Used for crash recovery to detect orphaned processes.
   *
   * @param pid - The process ID to search for
   * @returns Array of running agent runs with the given PID
   */
  findRunningByPid(pid: number): Promise<AgentRun[]>;

  /**
   * List all agent runs.
   *
   * @returns Array of all agent runs
   */
  list(): Promise<AgentRun[]>;

  /**
   * List only agent runs that are still active or recently completed.
   * Used by polling services to avoid loading the entire history.
   *
   * Returns runs with active statuses (pending, running, waiting_approval)
   * plus any runs updated within the last 5 minutes (so recently
   * completed/failed runs still get their notifications dispatched).
   */
  listActive(): Promise<AgentRun[]>;

  /**
   * Delete an agent run by ID.
   *
   * @param id - The agent run ID to delete
   */
  delete(id: string): Promise<void>;
}
