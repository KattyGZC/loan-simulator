// PreToolUse: asks the person before Claude edits a file that decides what "passing" means.
import { relative, sep } from 'node:path';
import { isGuarded } from '../../scripts/guarded-files.mjs';

const input = JSON.parse(await new Response(process.stdin).text());
const filePath = input.tool_input?.file_path ?? input.tool_input?.notebook_path;
if (!filePath) process.exit(0);

const path = relative(process.env.CLAUDE_PROJECT_DIR ?? process.cwd(), filePath)
  .split(sep)
  .join('/');
if (isGuarded(path) || path === 'package.json') {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'ask',
        permissionDecisionReason: `${path} decides what passing means (tests/golden, thresholds, lint rules, CI). Changing it to make a check pass hides the problem.`,
      },
    }),
  );
}
