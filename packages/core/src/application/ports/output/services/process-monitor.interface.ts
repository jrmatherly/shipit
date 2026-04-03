/**
 * Port interface for cross-platform process liveness checking.
 *
 * Infrastructure implementations use OS-level signal probing (e.g., `process.kill(pid, 0)`)
 * to determine whether a process is still running. Consumers should depend on this interface
 * rather than importing the concrete function from infrastructure.
 */
export interface IProcessMonitor {
  /**
   * Check whether a process with the given PID is still running.
   * Returns false when the PID does not exist or belongs to a zombie.
   */
  isProcessAlive(pid: number): boolean;
}
