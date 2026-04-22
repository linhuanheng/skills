#!/usr/bin/env node
/**
 * json-helper.mjs - Node.js replacement for jq
 *
 * Usage: node scripts/json-helper.mjs <subcommand> [args...]
 *
 * Subcommands:
 *   read <file> <expr>              Read field from file (eq. jq -r '<expr>' <file>)
 *   read-stdin <expr>               Read field from stdin (eq. echo $VAR | jq -r '<expr>')
 *   save-pretty <file>              Pretty-print JSON from stdin and save to file
 *   pretty-stdin                    Pretty-print JSON from stdin to stdout
 *   url-encode                      URL-encode stdin (eq. jq -Rr @uri)
 *   length-stdin                    Get length of stdin JSON array (eq. jq 'length')
 *   add-page-number <pageNumber>    Add pageNumber field to each element of stdin array
 *   merge-arrays <newArrayJSON>     Merge stdin array with argument array (eq. jq '. + $new')
 *   build-final-json --papers <json> --query <str> --topic <str>
 *                    --journal <str> --year-range <str>
 *                    --timestamp <str> --total-pages <num>
 *                                   Build final search result JSON
 *   extract-field-stdin <expr>      Extract field from stdin with compact output (eq. jq -c '<expr>')
 *   merge-page-files <dir>          Read page_NNN.json files from dir, merge papers arrays
 *   build-final-from-pages <dir>    Merge page files + build final JSON + save to --output
 *
 * Expression syntax (simplified, covers SKILL.md usage only):
 *   .field                          Read field
 *   .field.subfield                 Read nested field
 *   .field // "default"             Read field with fallback default
 *   length                          Array length
 */

import { readFileSync, readdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';

// ====== stdin helpers ======

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

function readStdinJson() {
  return readStdin().then(data => JSON.parse(data));
}

// ====== CDP Proxy unwrap ======

/**
 * Unwrap CDP Proxy { value: ... } envelope
 * CDP Proxy /eval endpoint returns { value: <actual result> }
 * Must strip this wrapper to access the real data
 */
function unwrapCdpProxy(obj) {
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    const keys = Object.keys(obj);
    if (keys.length === 1 && keys[0] === 'value') {
      return obj.value;
    }
  }
  return obj;
}

// ====== Expression parser ======

/**
 * Parse simplified jq expression, returns { path: string[], fallback: any }
 *
 * Supported:
 *   .field.subfield
 *   .field // "default"
 *   .field // false
 *   .field // 0
 *   .field // ""          (empty string default)
 *   length
 */
function parseExpr(expr) {
  expr = expr.trim();

  // length special case
  if (expr === 'length') {
    return { path: ['length'], fallback: undefined, isLength: true };
  }

  // check // default value syntax
  let fallback = undefined;
  let pathExpr = expr;

  const altMatch = expr.match(/^(.+?)\s*\/\/\s*(.+)$/);
  if (altMatch) {
    pathExpr = altMatch[1].trim();
    let fbStr = altMatch[2].trim();
    // parse default value type
    if (fbStr === 'false') fallback = false;
    else if (fbStr === 'true') fallback = true;
    else if (fbStr === '0') fallback = 0;
    else if (fbStr === '[]') fallback = [];
    else if (/^-?\d+$/.test(fbStr)) fallback = parseInt(fbStr, 10);
    else if (fbStr.startsWith('"') && fbStr.endsWith('"')) fallback = fbStr.slice(1, -1);
    else fallback = fbStr;
  }

  // parse path .field.subfield
  if (!pathExpr.startsWith('.')) {
    throw new Error(`Unsupported expression: ${pathExpr}`);
  }

  const path = pathExpr.slice(1).split('.').filter(p => p.length > 0);
  return { path, fallback, isLength: false };
}

/**
 * Get value from object by parsed expression
 */
function getByExpr(obj, parsed) {
  if (parsed.isLength) {
    if (Array.isArray(obj)) return obj.length;
    if (typeof obj === 'string') return obj.length;
    return 0;
  }

  let current = obj;
  for (const key of parsed.path) {
    if (current === null || current === undefined) {
      return parsed.fallback;
    }
    current = current[key];
  }

  if (current === undefined || current === null) {
    return parsed.fallback;
  }

  return current;
}

// ====== Subcommand implementations ======

async function cmdRead(args) {
  const [file, expr] = args;
  if (!file || !expr) {
    console.error('Usage: json-helper.mjs read <file> <expr>');
    process.exit(1);
  }

  const content = readFileSync(file, 'utf8');
  const obj = unwrapCdpProxy(JSON.parse(content));
  const parsed = parseExpr(expr);
  const value = getByExpr(obj, parsed);
  console.log(value);
}

async function cmdReadStdin(args) {
  const [expr] = args;
  if (!expr) {
    console.error('Usage: json-helper.mjs read-stdin <expr>');
    process.exit(1);
  }

  const obj = unwrapCdpProxy(await readStdinJson());
  const parsed = parseExpr(expr);
  const value = getByExpr(obj, parsed);
  console.log(value);
}

async function cmdSavePretty(args) {
  const [file] = args;
  if (!file) {
    console.error('Usage: json-helper.mjs save-pretty <file>');
    process.exit(1);
  }

  const data = await readStdin();
  const obj = unwrapCdpProxy(JSON.parse(data));
  await writeFile(file, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

async function cmdPrettyStdin() {
  const obj = unwrapCdpProxy(await readStdinJson());
  console.log(JSON.stringify(obj, null, 2));
}

async function cmdUrlEncode() {
  const data = await readStdin();
  // strip trailing newline
  const text = data.replace(/\r?\n$/, '');
  console.log(encodeURIComponent(text));
}

async function cmdLengthStdin() {
  const obj = unwrapCdpProxy(await readStdinJson());
  if (Array.isArray(obj)) {
    console.log(obj.length);
  } else {
    console.log(0);
  }
}

async function cmdAddPageNumber(args) {
  const [pageNumber] = args;
  if (!pageNumber) {
    console.error('Usage: json-helper.mjs add-page-number <pageNumber>');
    process.exit(1);
  }

  const arr = unwrapCdpProxy(await readStdinJson());
  if (!Array.isArray(arr)) {
    console.error('stdin is not a JSON array');
    process.exit(1);
  }

  const pg = parseInt(pageNumber, 10);
  const result = arr.map(item => ({ ...item, pageNumber: pg }));
  process.stdout.write(JSON.stringify(result));
}

async function cmdMergeArrays(args) {
  // args[0] is the new array JSON string to merge
  const [newArrayJSON] = args;
  if (!newArrayJSON) {
    console.error('Usage: json-helper.mjs merge-arrays <newArrayJSON>');
    process.exit(1);
  }

  const existingArr = unwrapCdpProxy(await readStdinJson());
  const newArr = JSON.parse(newArrayJSON);

  if (!Array.isArray(existingArr) || !Array.isArray(newArr)) {
    console.error('Both arguments must be JSON arrays');
    process.exit(1);
  }

  const result = existingArr.concat(newArr);
  process.stdout.write(JSON.stringify(result));
}

async function cmdBuildFinalJson(args) {
  // parse named args: --papers <json> --query <str> ...
  const params = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      params[key] = args[i + 1];
      i++;
    }
  }

  const papers = params.papers ? JSON.parse(params.papers) : [];
  const totalPages = params['total-pages'] ? parseInt(params['total-pages'], 10) : 0;

  const result = {
    success: true,
    timestamp: params.timestamp || new Date().toISOString(),
    searchQuery: params.query || '',
    topic: params.topic || '',
    journalScope: params.journal || '',
    yearRange: params['year-range'] || '',
    totalPages: totalPages,
    totalPapers: Array.isArray(papers) ? papers.length : 0,
    papers: papers
  };

  process.stdout.write(JSON.stringify(result));
}

async function cmdExtractFieldStdin(args) {
  const [expr] = args;
  if (!expr) {
    console.error('Usage: json-helper.mjs extract-field-stdin <expr>');
    process.exit(1);
  }

  const obj = unwrapCdpProxy(await readStdinJson());
  const parsed = parseExpr(expr);

  // handle .field // [] pattern - return empty array if field missing
  let value = getByExpr(obj, parsed);
  if (value === undefined) {
    value = parsed.fallback;
  }

  // compact output
  process.stdout.write(JSON.stringify(value));
}

async function cmdMergePageFiles(args) {
  // Parse args: <dir> [--output <file>]
  let dir = null;
  let outputFile = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output') {
      outputFile = args[i + 1];
      i++;
    } else if (!dir) {
      dir = args[i];
    }
  }

  if (!dir) {
    console.error('Usage: json-helper.mjs merge-page-files <dir> [--output <file>]');
    process.exit(1);
  }

  // Read page_NNN.json files sorted by NNN
  let files;
  try {
    files = readdirSync(dir)
      .filter(f => /^page_\d+\.json$/.test(f))
      .sort((a, b) => {
        const na = parseInt(a.match(/\d+/)[0], 10);
        const nb = parseInt(b.match(/\d+/)[0], 10);
        return na - nb;
      });
  } catch (err) {
    console.error(`Error reading directory: ${err.message}`);
    process.exit(1);
  }

  if (files.length === 0) {
    console.error('No page_NNN.json files found in directory');
    process.exit(1);
  }

  // Merge all papers arrays
  const allPapers = [];
  for (const file of files) {
    try {
      const content = JSON.parse(readFileSync(`${dir}/${file}`, 'utf8'));
      const obj = unwrapCdpProxy(content);
      // Support two formats: { papers: [...] } or plain array [...]
      let papers;
      if (Array.isArray(obj)) {
        papers = obj;
      } else if (obj && obj.papers) {
        papers = obj.papers;
      } else {
        papers = [];
      }
      // Add pageNumber if not present (use filename number)
      const pageNum = parseInt(file.match(/\d+/)[0], 10);
      for (const p of papers) {
        if (!p.pageNumber) p.pageNumber = pageNum;
        allPapers.push(p);
      }
    } catch (err) {
      console.error(`Warning: failed to read ${file}: ${err.message}`);
    }
  }

  if (outputFile) {
    await writeFile(outputFile, JSON.stringify(allPapers) + '\n', 'utf8');
    console.log(allPapers.length);
  } else {
    process.stdout.write(JSON.stringify(allPapers));
  }
}

async function cmdBuildFinalFromPages(args) {
  // Parse args: <dir> --query ... --topic ... etc. --output <file>
  let dir = null;
  const params = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      params[key] = args[i + 1];
      i++;
    } else if (!dir) {
      dir = args[i];
    }
  }

  if (!dir || !params.output) {
    console.error('Usage: json-helper.mjs build-final-from-pages <dir> --query ... --topic ... --output <file>');
    process.exit(1);
  }

  // Read and merge page files
  let files;
  try {
    files = readdirSync(dir)
      .filter(f => /^page_\d+\.json$/.test(f))
      .sort((a, b) => {
        const na = parseInt(a.match(/\d+/)[0], 10);
        const nb = parseInt(b.match(/\d+/)[0], 10);
        return na - nb;
      });
  } catch (err) {
    console.error(`Error reading directory: ${err.message}`);
    process.exit(1);
  }

  if (files.length === 0) {
    console.error('No page_NNN.json files found');
    process.exit(1);
  }

  const allPapers = [];
  for (const file of files) {
    try {
      const content = JSON.parse(readFileSync(`${dir}/${file}`, 'utf8'));
      const obj = unwrapCdpProxy(content);
      // Support two formats: { papers: [...] } or plain array [...]
      let papers;
      if (Array.isArray(obj)) {
        papers = obj;
      } else if (obj && obj.papers) {
        papers = obj.papers;
      } else {
        papers = [];
      }
      const pageNum = parseInt(file.match(/\d+/)[0], 10);
      for (const p of papers) {
        if (!p.pageNumber) p.pageNumber = pageNum;
        allPapers.push(p);
      }
    } catch (err) {
      console.error(`Warning: failed to read ${file}: ${err.message}`);
    }
  }

  const totalPages = files.length;

  const result = {
    success: true,
    timestamp: params.timestamp || new Date().toISOString(),
    searchQuery: params.query || '',
    topic: params.topic || '',
    journalScope: params.journal || '',
    yearRange: params['year-range'] || '',
    totalPages: totalPages,
    totalPapers: allPapers.length,
    papers: allPapers
  };

  await writeFile(params.output, JSON.stringify(result, null, 2) + '\n', 'utf8');
  console.log(`Merged ${allPapers.length} papers from ${totalPages} pages -> ${params.output}`);
}

// ====== Main entry ======

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.error('Usage: node scripts/json-helper.mjs <subcommand> [args...]');
    console.error('Subcommands: read, read-stdin, save-pretty, pretty-stdin, url-encode,');
    console.error('             length-stdin, add-page-number, merge-arrays, build-final-json,');
    console.error('             extract-field-stdin, merge-page-files, build-final-from-pages');
    process.exit(1);
  }

  const rest = args.slice(1);

  switch (command) {
    case 'read':
      await cmdRead(rest);
      break;
    case 'read-stdin':
      await cmdReadStdin(rest);
      break;
    case 'save-pretty':
      await cmdSavePretty(rest);
      break;
    case 'pretty-stdin':
      await cmdPrettyStdin();
      break;
    case 'url-encode':
      await cmdUrlEncode();
      break;
    case 'length-stdin':
      await cmdLengthStdin();
      break;
    case 'add-page-number':
      await cmdAddPageNumber(rest);
      break;
    case 'merge-arrays':
      await cmdMergeArrays(rest);
      break;
    case 'build-final-json':
      await cmdBuildFinalJson(rest);
      break;
    case 'extract-field-stdin':
      await cmdExtractFieldStdin(rest);
      break;
    case 'merge-page-files':
      await cmdMergePageFiles(rest);
      break;
    case 'build-final-from-pages':
      await cmdBuildFinalFromPages(rest);
      break;
    default:
      console.error(`Unknown subcommand: ${command}`);
      process.exit(1);
  }
}

main().catch(err => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
