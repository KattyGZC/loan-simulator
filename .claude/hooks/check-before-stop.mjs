// Stop: when the working tree changed, runs lint, types and tests before Claude ends its turn.
import { spawnSync } from 'node:child_process';

const input = JSON.parse(await new Response(process.stdin).text());
// Claude is already fixing what the last run found; let it finish this time.
if (input.stop_hook_active) process.exit(0);

const run = (command) =>
  spawnSync(command, { cwd: process.env.CLAUDE_PROJECT_DIR, encoding: 'utf8', shell: true });
if (run('git status --porcelain').stdout.trim() === '') process.exit(0);

for (const script of ['lint', 'typecheck', 'knip', 'test:coverage']) {
  const result = run(`npm run ${script}`);
  if (result.status !== 0) {
    const output = `${result.stdout}${result.stderr}`.trim().split('\n').slice(-40).join('\n');
    console.log(
      JSON.stringify({
        decision: 'block',
        reason: `npm run ${script} fails. Fix the cause before ending the turn:\n${output}`,
      }),
    );
    process.exit(0);
  }
}
