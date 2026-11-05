// PostToolUse: lints the file Claude just wrote, so the mistake comes back while it is fresh.
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const input = JSON.parse(await new Response(process.stdin).text());
const filePath = input.tool_input?.file_path;
if (!filePath || !/\.(js|mjs|ts|tsx)$/.test(filePath)) process.exit(0);

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const eslint = join(projectDir, 'node_modules', 'eslint', 'bin', 'eslint.js');
const lint = spawnSync(
  process.execPath,
  [eslint, '--max-warnings', '0', '--no-warn-ignored', filePath],
  { cwd: projectDir, encoding: 'utf8' },
);
if (lint.status !== 0) {
  console.error(
    `ESLint found problems in ${filePath}. Fix the cause; do not silence the rule.\n${lint.stdout}${lint.stderr}`,
  );
  process.exit(2);
}
