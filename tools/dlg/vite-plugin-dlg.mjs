import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { compileCorpus, printCompileSummary } from './compile.mjs';
import { renderDialogsModule } from './generate.mjs';

const REPO_DIR = path.resolve(import.meta.dirname, '../..');
const DIALOG_DIR = path.join(REPO_DIR, 'src/data/dialogs');
const DIALOG_MODULE_FILE = path.join(DIALOG_DIR, 'index.js');
const LOCK_FILE = path.join(DIALOG_DIR, 'dialogs.lock.json');
const normalizePath = (filePath) => filePath.split(path.sep).join('/');
const DIALOG_DIR_ID = normalizePath(DIALOG_DIR);
const DIALOG_MODULE_ID = normalizePath(DIALOG_MODULE_FILE);
const LOCK_ID = normalizePath(LOCK_FILE);

function cleanId(id) {
  return normalizePath(id.split('?')[0]);
}

function isWatchedSource(filePath) {
  const id = cleanId(path.resolve(filePath));
  return id === LOCK_ID || (path.posix.dirname(id) === DIALOG_DIR_ID && id.endsWith('.dlg'));
}

export default function dlgPlugin() {
  let lastGoodSource;
  let logger;

  const reportThrownError = (error) => {
    const message = `[dlg] compile failed; keeping the last good module\n${error.stack || error.message}`;
    if (logger) logger.error(message, { error });
    else process.stderr.write(`${message}\n`);
  };

  const compileForDev = async () => {
    try {
      const result = await compileCorpus();
      if (result.errorCount > 0) {
        process.stderr.write('[dlg] compile failed; keeping the last good module\n');
        printCompileSummary(result, 'dev');
        return { ok: false };
      }
      lastGoodSource = renderDialogsModule(result.dialogs);
      return { ok: true, result, source: lastGoodSource };
    } catch (error) {
      reportThrownError(error);
      return { ok: false };
    }
  };

  const lastGood = async () => {
    if (lastGoodSource === undefined) lastGoodSource = await readFile(DIALOG_MODULE_FILE, 'utf8');
    return lastGoodSource;
  };

  return {
    name: 'trust-issues-dlg',
    apply: 'serve',

    async load(id) {
      if (cleanId(id) !== DIALOG_MODULE_ID) return null;
      const compiled = await compileForDev();
      return compiled.ok ? compiled.source : lastGood();
    },

    configureServer(server) {
      logger = server.config.logger;
      server.watcher.add([DIALOG_DIR, LOCK_FILE]);

      let timer;
      const rebuild = (event, filePath) => {
        if (!['add', 'change', 'unlink'].includes(event) || !isWatchedSource(filePath)) return;
        clearTimeout(timer);
        timer = setTimeout(async () => {
          const compiled = await compileForDev();
          if (!compiled.ok) return;

          const modules = server.moduleGraph.getModulesByFile(DIALOG_MODULE_ID);
          if (modules) {
            for (const module of modules) server.moduleGraph.invalidateModule(module);
          }
          const module = server.moduleGraph.getModuleById(DIALOG_MODULE_ID);
          if (module && !modules?.has(module)) server.moduleGraph.invalidateModule(module);
          server.config.logger.info(`[dlg] recompiled ${Object.keys(compiled.result.dialogs).length} scenes from ${compiled.result.files.length} files`);
          server.ws.send({ type: 'full-reload', path: '*' });
        }, 25);
      };

      server.watcher.on('all', rebuild);
      server.httpServer?.once('close', () => {
        clearTimeout(timer);
        server.watcher.off('all', rebuild);
      });
    },
  };
}
