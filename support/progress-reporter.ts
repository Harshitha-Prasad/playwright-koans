import { appendFileSync } from 'node:fs';
import { basename, relative } from 'node:path';
import type { FullConfig, Reporter, Suite, TestCase } from '@playwright/test/reporter';

/**
 * A small custom reporter: after the normal output it prints how many koans are green per module
 * and which one to look at next. It is also a worked example for note 08 (reporting).
 */
class ProgressReporter implements Reporter {
  private rootDir = process.cwd();
  private root: Suite | undefined;

  onBegin(config: FullConfig, suite: Suite) {
    this.rootDir = config.rootDir;
    this.root = suite;
  }

  onEnd() {
    const all = this.root?.allTests() ?? [];
    const ran = all.filter((test) => test.results.length > 0 && test.outcome() !== 'skipped');
    if (ran.length === 0) return;

    const solved = (test: TestCase) => test.outcome() === 'expected' || test.outcome() === 'flaky';
    const project = (test: TestCase) => test.parent.project()?.name ?? '';

    // One row per project + file, in file order.
    const rows = new Map<string, { label: string; solved: number; total: number }>();
    for (const test of ran) {
      const key = `${project(test)}/${basename(test.location.file)}`;
      const row = rows.get(key) ?? { label: key.replace(/\.spec\.ts$/, ''), solved: 0, total: 0 };
      row.total += 1;
      if (solved(test)) row.solved += 1;
      rows.set(key, row);
    }
    const sorted = [...rows.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, row]) => row);
    const width = Math.max(...sorted.map((row) => row.label.length));

    const lines = ['', '  Progress'];
    for (const row of sorted) {
      const filled = Math.round((row.solved / row.total) * 10);
      const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
      const mark = row.solved === row.total ? '✔' : '·';
      lines.push(`  ${mark} ${row.label.padEnd(width)}  ${bar}  ${row.solved}/${row.total}`);
    }

    const solvedCount = ran.filter(solved).length;
    lines.push('', `  ${solvedCount} of ${ran.length} green in this run.`);
    if (all.length > ran.length) lines.push(`  ${all.length - ran.length} more were not run.`);

    const next = ran
      .filter((test) => !solved(test) && project(test) === 'koans')
      .sort(
        (a, b) => a.location.file.localeCompare(b.location.file) || a.location.line - b.location.line,
      )[0];
    if (next) {
      const where = `${relative(this.rootDir, next.location.file).replaceAll('\\', '/')}:${next.location.line}`;
      lines.push(`  Next koan: ${where} › ${next.title}`);
    } else if (ran.some((test) => project(test) === 'koans') && all.length === ran.length) {
      lines.push('  Every koan in this run is green. Nicely done.');
    }
    lines.push('');
    console.log(lines.join('\n'));

    // On GitHub Actions, also write the table to the job summary page.
    const summaryFile = process.env.GITHUB_STEP_SUMMARY;
    if (summaryFile) {
      const table = [
        '### Progress',
        '',
        '| Module | Green | Total |',
        '| --- | ---: | ---: |',
        ...sorted.map((row) => `| ${row.label} | ${row.solved} | ${row.total} |`),
        '',
        `**${solvedCount} of ${ran.length} green.**`,
        '',
      ];
      appendFileSync(summaryFile, table.join('\n'));
    }
  }
}

export default ProgressReporter;
