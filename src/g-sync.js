#!/usr/bin/env node

const cp = require('child_process');
const path = require('path');
const program = require('commander');

const evmConfig = require('./evm-config');
const { fatal } = require('./utils/logging');
const { ensureDir } = require('./utils/paths');
const depot = require('./utils/depot-tools');

function setRemotes(cwd, repo) {
  for (const remote in repo) {
    cp.execSync(`git remote set-url ${remote} ${repo[remote]}`, { cwd });
    cp.execSync(`git remote set-url --push ${remote} ${repo[remote]}`, { cwd });
  }
}

function runGClientSync(config, syncArgs, syncOpts) {
  const srcdir = path.resolve(config.root, 'src');
  ensureDir(srcdir);

  if (config.env.GIT_CACHE_PATH) {
    ensureDir(config.env.GIT_CACHE_PATH);
  }

  depot.ensure();

  const exec = 'python';
  const args = ['gclient.py', 'sync', '--no-history', '--nohooks', '-vv', ...syncArgs];
  const opts = {
    cwd: srcdir,
    env: syncOpts.threeWay
      ? {
          ELECTRON_USE_THREE_WAY_MERGE_FOR_PATCHES: 'true',
        }
      : {},
  };
  depot.execFileSync(config, exec, args, opts);

  const solutionPath = path.resolve(srcdir, 'solution');

  setRemotes(solutionPath, config.remotes.solution);
}

const opts = program
  .option(
    '--3|--three-way',
    'Apply Electron patches using a three-way merge, useful when upgrading Chromium',
  )
  .arguments('[gclientArgs...]')
  .allowUnknownOption()
  .description('Fetch source / synchronize repository checkouts')
  .parse(process.argv);

try {
  const { threeWay } = opts;
  const { unknown: syncArgs } = program.parseOptions(process.argv);
  runGClientSync(evmConfig.current(), syncArgs, {
    threeWay,
  });
} catch (e) {
  fatal(e);
}
