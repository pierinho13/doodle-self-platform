import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/**
 * Runs a local CLI command and returns stdout. Throws with stderr attached
 * on non-zero exit. Deliberately uses execFile (not exec) so arguments are
 * never shell-interpreted.
 */
export async function runCommand(
  command: string,
  args: string[],
  options?: { timeoutMs?: number }
): Promise<string> {
  try {
    const { stdout } = await execFileAsync(command, args, {
      maxBuffer: 1024 * 1024 * 64,
      timeout: options?.timeoutMs ?? 30_000,
      env: {
        ...process.env,
        PATH: `/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:${process.env.PATH ?? ""}`,
        // `gh` only reads GH_TOKEN for ambient (non `gh auth login`) auth;
        // GITHUB_TOKEN alone isn't recognized by all gh versions, so mirror
        // it across both names for compatibility.
        GH_TOKEN: process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN,
      },
    });
    return stdout;
  } catch (err: unknown) {
    const e = err as { stderr?: string; message?: string };
    throw new Error(
      `Command failed: ${command} ${args.join(" ")}\n${e.stderr ?? e.message ?? String(err)}`
    );
  }
}

export async function runJson<T>(command: string, args: string[]): Promise<T> {
  const stdout = await runCommand(command, args);
  return JSON.parse(stdout) as T;
}
