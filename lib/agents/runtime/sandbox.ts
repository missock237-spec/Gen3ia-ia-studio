import {
  ExecutionPolicy,
  DEFAULT_EXECUTION_POLICY,
} from "@/lib/security/execution-policy";

export interface SandboxRequest {
  executionId: string;

  userId: string;

  code: string;

  input?: unknown;

  policy?: ExecutionPolicy;
}

export interface SandboxResult {
  success: boolean;

  output?: unknown;

  error?: string;

  durationMs: number;
}

export interface SandboxProvider {
  execute(
    request: SandboxRequest,
  ): Promise<SandboxResult>;
}

/**
 * IMPORTANT:
 * Cette implémentation refuse volontairement
 * toute exécution locale de code arbitraire.
 *
 * Elle doit être remplacée par un véritable
 * worker/container sandboxé.
 */
class DisabledSandbox
  implements SandboxProvider
{
  async execute(
    request: SandboxRequest,
  ): Promise<SandboxResult> {
    const started =
      Date.now();

    const policy =
      request.policy ??
      DEFAULT_EXECUTION_POLICY;

    if (
      !policy.allowCodeExecution
    ) {
      return {
        success: false,

        error:
          "Code execution is disabled by security policy.",

        durationMs:
          Date.now() - started,
      };
    }

    return {
      success: false,

      error:
        "No isolated sandbox provider is configured.",

      durationMs:
        Date.now() - started,
    };
  }
}

export const sandbox: SandboxProvider =
  new DisabledSandbox();
