import { injectable } from 'tsyringe';
import type { IProcessMonitor } from '../../../application/ports/output/services/process-monitor.interface.js';

/**
 * Cross-platform process liveness checker.
 * Uses `process.kill(pid, 0)` which sends signal 0 (no-op) to test existence.
 */
@injectable()
export class ProcessMonitorService implements IProcessMonitor {
  isProcessAlive(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }
}
