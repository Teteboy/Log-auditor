import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from 'react';
import { t as translate, getStoredLang, storeLang, type Lang } from '@/locales';
import { loadFromStore, saveToStore } from '@/persistence';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  Archive,
  ArrowDownToLine,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  CirclePause,
  CirclePlay,
  Clipboard,
  Copy,
  File as FileIcon,
  FileJson,
  FolderOpen,
  Gauge,
  HardDrive,
  Info,
  Link2,
  LayoutList,
  List,
  Maximize2,
  Pause,
  Play,
  Plus,
  RefreshCcw,
  Search,
  Server,
  SlidersHorizontal,
  Table2,
  Terminal,
  Trash2,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';

type LogFormat = 'PM2' | 'Nginx' | 'JSON / JSONL' | 'Timestamped' | 'Plain text';
type Level = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'TRACE';

type LogEntry = {
  id: string;
  line: number;
  timestamp: string;
  level: Level;
  message: string;
  raw: string;
  format: LogFormat;
  fields: Record<string, string>;
  parsed: boolean;
};

type LogSource = {
  id: string;
  name: string;
  path?: string;
  format: LogFormat;
  confidence: number;
  size: string;
  lastModified?: number;
  fileSize?: number;
  entries: LogEntry[];
  error?: string;
};

type DirectoryHandle = {
  name?: string;
  values: () => AsyncIterableIterator<{ kind: string; name?: string; getFile?: () => Promise<File>; values?: () => AsyncIterableIterator<{ kind: string; name?: string; getFile?: () => Promise<File>; values?: () => AsyncIterableIterator<unknown> }> }>;
};
type DirectoryPickerWindow = Window & { showDirectoryPicker?: (options?: { startIn?: unknown }) => Promise<DirectoryHandle>; showOpenFilePicker?: (options?: { multiple?: boolean; startIn?: unknown }) => Promise<{ getFile(): Promise<File> }[]>; };

const queryClient = new QueryClient();


function levelFrom(value: unknown, fallback = 'INFO'): Level {
  const valueText = String(value ?? '').toUpperCase();
  if (valueText.includes('FATAL') || valueText.includes('ERROR')) return 'ERROR';
  if (valueText.includes('WARN')) return 'WARN';
  if (valueText.includes('DEBUG')) return 'DEBUG';
  if (valueText.includes('TRACE')) return 'TRACE';
  return fallback as Level;
}

function displaySize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseLine(raw: string, index: number): LogEntry {
  const base = {
    id: `entry-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    line: index + 1,
    timestamp: '—',
    level: 'INFO' as Level,
    message: raw,
    raw,
    format: 'Plain text' as LogFormat,
    fields: {} as Record<string, string>,
    parsed: false,
  };

  const trimmed = raw.trim();
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const object = parsed as Record<string, unknown>;
        const timestampKey = Object.keys(object).find((key) => /^(time|timestamp|ts|date|datetime)$/i.test(key));
        const levelKey = Object.keys(object).find((key) => /^(level|severity|loglevel)$/i.test(key));
        const messageKey = Object.keys(object).find((key) => /^(message|msg|log|event)$/i.test(key));
        const fields = Object.fromEntries(
          Object.entries(object)
            .filter(([key]) => key !== timestampKey && key !== levelKey && key !== messageKey)
            .filter(([, value]) => value !== null && typeof value !== 'object')
            .map(([key, value]) => [key, String(value)]),
        );
        return {
          ...base,
          timestamp: timestampKey ? String(object[timestampKey]) : '—',
          level: levelFrom(levelKey ? object[levelKey] : 'INFO'),
          message: messageKey ? String(object[messageKey]) : 'Structured event',
          format: 'JSON / JSONL',
          fields,
          parsed: true,
        };
      }
    } catch {
      // A line that resembles JSON but does not parse is intentionally preserved as raw text.
    }
  }

  const nginx = trimmed.match(/^(\S+)\s+\S+\s+\S+\s+\[([^\]]+)\]\s+"([^"]*)"\s+(\d{3})\s+(\S+)(?:\s+"([^"]*)"\s+"([^"]*)")?/);
  if (nginx) {
    const [, remote, timestamp, request, status, bytes, referrer, agent] = nginx;
    const [method = 'REQUEST', path = '—'] = request.split(' ');
    const statusNumber = Number(status);
    return {
      ...base,
      timestamp: timestamp.replace(/\s[+-]\d{4}$/, ''),
      level: statusNumber >= 500 ? 'ERROR' : statusNumber >= 400 ? 'WARN' : 'INFO',
      message: `${method} ${path} · ${status}`,
      format: 'Nginx',
      fields: { remote, status, bytes, ...(referrer ? { referrer } : {}), ...(agent ? { agent } : {}) },
      parsed: true,
    };
  }

  const pm2 = trimmed.match(/^\[PM2\]\s+App\s+\[([^\]]+)\]\s+(.+)$/i);
  if (pm2) {
    const [, processName, event] = pm2;
    return {
      ...base,
      message: `App ${processName} ${event}`,
      level: event.toLowerCase().includes('error') ? 'ERROR' : 'INFO',
      format: 'PM2',
      fields: { process: processName, event },
      parsed: true,
    };
  }

  const timestamped = trimmed.match(/^\[?((?:\d{4}-\d{2}-\d{2}[T ][\d:.+-]+)|(?:\d{4}\/\d{2}\/\d{2}[\s-][\d:]+))\]?\s+(?:(DEBUG|INFO|NOTICE|WARN(?:ING)?|ERROR|FATAL|TRACE)\b)?\s*[-|:]?\s*(.*)$/i);
  if (timestamped) {
    const [, timestamp, rawLevel, message] = timestamped;
    return {
      ...base,
      timestamp,
      level: levelFrom(rawLevel ?? 'INFO'),
      message: message || raw,
      format: 'Timestamped',
      parsed: true,
    };
  }

  return base;
}

function buildLogSource(name: string, size: number, sourceId: string, entries: LogEntry[]): LogSource {
  const formats = entries.reduce<Record<string, number>>((counts, entry) => {
    counts[entry.format] = (counts[entry.format] ?? 0) + 1;
    return counts;
  }, {});
  const format = (Object.entries(formats).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'Plain text') as LogFormat;
  const parsedCount = entries.filter((entry) => entry.parsed).length;
  const confidence = entries.length ? Math.min(99, Math.max(42, Math.round(54 + (parsedCount / entries.length) * 45))) : 42;
  return { id: sourceId, name, format, confidence, size: displaySize(size), entries };
}


const BATCH_YIELD = 500;

async function parseTextBatched(
  text: string,
  name: string,
  sourceId: string,
  byteSize: number,
  onProgress?: (loaded: number, total: number) => void,
): Promise<LogSource> {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const entries: LogEntry[] = [];
  let parsedIndex = 0;
  const total = lines.length || 1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length > 0 || i < lines.length - 1) {
      entries.push({ ...parseLine(line, parsedIndex), id: `${sourceId}-${parsedIndex}` });
      parsedIndex++;
    }
    if (i > 0 && i % BATCH_YIELD === 0) {
      onProgress?.(i, total);
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }
  }
  onProgress?.(total, total);
  return buildLogSource(name, byteSize, sourceId, entries);
}

async function parseStream(
  file: { stream(): ReadableStream<Uint8Array>; size: number },
  name: string,
  sourceId: string,
  onProgress?: (loaded: number, total: number) => void,
): Promise<LogSource> {
  const reader = file.stream().getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  const entries: LogEntry[] = [];
  let parsedIndex = 0;
  let loaded = 0;
  const size = file.size;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      loaded += value?.length ?? 0;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n');
      buffer = parts.pop() ?? '';
      onProgress?.(loaded, size);
      for (const raw of parts) {
        const line = raw.replace(/\r$/, '');
        entries.push({ ...parseLine(line, parsedIndex), id: `${sourceId}-${parsedIndex}` });
        parsedIndex++;
        if (parsedIndex > 0 && parsedIndex % BATCH_YIELD === 0) {
          await new Promise((resolve) => window.setTimeout(resolve, 0));
        }
      }
    }
    const tail = decoder.decode();
    const last = (buffer + tail).replace(/\r$/, '');
    if (last.length > 0) {
      entries.push({ ...parseLine(last, parsedIndex), id: `${sourceId}-${parsedIndex}` });
      parsedIndex++;
    }
    onProgress?.(size, size);
  } finally {
    reader.releaseLock();
  }
  return buildLogSource(name, size, sourceId, entries);
}

async function parseFileBatched(
  file: File,
  name: string,
  sourceId: string,
  onProgress?: (loaded: number, total: number) => void,
): Promise<LogSource> {
  const blob = file as Blob & { stream?(): ReadableStream<Uint8Array>; text?(): Promise<string> };
  if (typeof blob.stream === 'function') {
    return parseStream(file, name, sourceId, onProgress);
  }
  if (typeof blob.text !== 'function') {
    throw new Error('This browser does not support reading files.');
  }
  const text = await file.text();
  return parseTextBatched(text, name, sourceId, file.size, onProgress);
}

function diagnosisFor(entry: LogEntry) {
  if (entry.level === 'ERROR') {
    if (entry.format === 'Nginx' || entry.fields.status?.startsWith('5')) {
      return {
        title: translate('Server-side request failure'),
        summary: translate('A 5xx response usually points to an upstream application, dependency, or proxy timeout rather than a client-side request issue.'),
        actions: [translate('Check the upstream service and its error log around this timestamp.'), translate('Compare the request path with recent deploys and dependency health.'), translate('Inspect latency, retry count, and correlation identifiers before changing configuration.')],
      };
    }
    if (/timeout|refused|unreachable|connection/i.test(entry.message)) {
      return {
        title: translate('Dependency or network signal'),
        summary: translate('The message suggests the process could not complete a network operation in the expected window.'),
        actions: [translate('Verify the target host, port, DNS, and service health.'), translate('Look for a matching trace or request id in the dependency logs.'), translate('Check whether retries are amplifying the failure.')],
      };
    }
    return {
      title: translate('Application error'),
      summary: translate('This entry is classified as an error. Use the raw line and inferred fields to trace it back to the responsible process or request.'),
      actions: [translate('Search nearby lines for a stack trace or preceding trigger.'), translate('Use the timestamp and service/process field to correlate across logs.'), translate('Confirm whether the error is isolated or repeating.')],
    };
  }
  if (entry.level === 'WARN') {
    return {
      title: translate('Degraded or unusual signal'),
      summary: translate('Warnings are not necessarily failures, but repeated occurrences often reveal pressure before an outage.'),
      actions: [translate('Check the frequency of this signal across the current source.'), translate('Compare duration, status, or resource fields with normal entries.'), translate('Decide whether this should become an alert or threshold.')],
    };
  }
  return {
    title: entry.parsed ? translate('Normal operational signal') : translate('Unclassified output'),
    summary: entry.parsed ? translate('The parser found a useful structure in this line. The original text remains available for verification.') : translate('No known structure matched this line, so it is preserved as raw output for manual inspection.'),
    actions: entry.parsed ? [translate('Use the inferred fields to correlate this event with related services.'), translate('Check surrounding lines when diagnosing a larger incident.')] : [translate('Look for a repeated prefix or delimiter in nearby lines.'), translate('If this format is common, use its fields as a parser rule candidate.')],
  };
}

function errorIsNotCancellation(error: unknown) {
  return !(error && typeof error === 'object' && 'name' in error && error.name === 'AbortError');
}


function sourceIcon(format: LogFormat) {
  if (format === 'JSON / JSONL') return <FileJson size={14} />;
  if (format === 'Nginx') return <Server size={14} />;
  if (format === 'PM2') return <Terminal size={14} />;
  return <FileIcon size={14} />;
}

function Home() {
  const SOURCE_META_KEY = 'log-monitor:source-meta';
  const ACTIVE_SOURCE_KEY = 'log-monitor:active-source';
  const [sources, setSources] = useState<LogSource[]>(() => {
    try {
      const meta = localStorage.getItem(SOURCE_META_KEY);
      if (meta) return JSON.parse(meta) as LogSource[];
    } catch { /* ignore */ }
    return [];
  });
  const [activeSourceId, setActiveSourceId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_SOURCE_KEY);
      if (saved) return saved;
    } catch { /* ignore */ }
    return '';
  });
  const [rehydrated, setRehydrated] = useState(false);
  useEffect(() => {
    let cancelled = false;
    loadFromStore<LogSource[]>('sources').then((restored) => {
      if (cancelled) return;
      if (restored?.length) setSources(restored);
      setRehydrated(true);
    }).catch(() => setRehydrated(true));
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!rehydrated) return;
    const timer = window.setTimeout(() => {
      try {
        const compact = sources.map((source) => ({ ...source, entries: [] }));
        localStorage.setItem(SOURCE_META_KEY, JSON.stringify(compact));
      } catch { /* ignore */ }
      void saveToStore('sources', sources).catch(() => {});
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [sources, rehydrated]);
  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_SOURCE_KEY, activeSourceId);
    } catch { /* ignore */ }
  }, [activeSourceId]);
  useEffect(() => {
    if (!rehydrated || rehydratedOnceRef.current || !sources.length) return;
    rehydratedOnceRef.current = true;
    const parents = new Set<string>();
    for (const source of sources) {
      if (!source.path?.startsWith('/') || source.path === '/') continue;
      const slash = source.path.lastIndexOf('/');
      if (slash <= 0) continue;
      parents.add(source.path.slice(0, slash));
    }
    if (!parents.size) return;
    void (async () => {
      for (const parent of parents) {
        try {
          const res = await fetch(`/api/list?path=${encodeURIComponent(parent)}`);
          if (!res.ok) continue;
          const files = (await res.json()) as Array<{ name: string; path: string; size: number; mtime: number }>;
          if (files.length) await processRemoteFiles(files, parent, false, true, true);
        } catch { /* ignore */ }
      }
    })();
  }, [rehydrated, sources]);
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<'ALL' | Level>('ALL');
  const [view, setView] = useState<'table' | 'list'>('table');
  const [follow, setFollow] = useState(true);
  const [paused, setPaused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [parseError, setParseError] = useState('');
  const [copied, setCopied] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [customPath, setCustomPath] = useState('');
  const [showPathHelp, setShowPathHelp] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [lang, setLang] = useState<Lang>(() => getStoredLang());
  useEffect(() => { storeLang(lang); }, [lang]);
  const t = (text: string, ...args: string[]) => translate(text, lang, ...args);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const pendingFolderLabelRef = useRef<string>('');
  const rehydratedOnceRef = useRef(false);

  const activeSource = sources.find((source) => source.id === activeSourceId) ?? sources[0];
  const activeFolder = activeSource?.path?.includes('/') ? activeSource.path.slice(0, activeSource.path.lastIndexOf('/')) : undefined;
  const activeFolderSources = useMemo(() => activeFolder ? sources.filter((source) => source.path?.startsWith(`${activeFolder}/`)) : [], [activeFolder, sources]);
  const visibleEntries = useMemo(() => {
    if (!activeSource) return [];
    const normalized = query.trim().toLowerCase();
    return activeSource.entries.filter((entry) => {
      const matchesLevel = levelFilter === 'ALL' || entry.level === levelFilter;
      const haystack = `${entry.message} ${entry.raw} ${Object.values(entry.fields).join(' ')}`.toLowerCase();
      return matchesLevel && (!normalized || haystack.includes(normalized));
    });
  }, [activeSource, levelFilter, query]);
  const displayedEntries = useMemo(() => visibleEntries.slice(-1000), [visibleEntries]);
  const selectedEntry = useMemo(
    () => visibleEntries.find((entry) => entry.id === selectedId) ?? activeSource?.entries.find((entry) => entry.id === selectedId) ?? visibleEntries[0],
    [activeSource, selectedId, visibleEntries],
  );
  const selectedDiagnosis = useMemo(() => selectedEntry ? diagnosisFor(selectedEntry) : null, [selectedEntry]);
  const allEntries = useMemo(() => sources.flatMap((source) => source.entries), [sources]);
  const levelCounts = useMemo(() => allEntries.reduce<Record<Level, number>>((counts, entry) => {
    counts[entry.level] += 1;
    return counts;
  }, { INFO: 0, WARN: 0, ERROR: 0, DEBUG: 0, TRACE: 0 }), [allEntries]);
  const parserSupported = typeof window !== 'undefined' && typeof FileReader !== 'undefined';
  const directorySupported = typeof window !== 'undefined' && typeof (window as DirectoryPickerWindow).showDirectoryPicker === 'function';

  useEffect(() => {
    if (follow && !paused && activeSource?.entries.length) {
      setSelectedId(activeSource.entries[activeSource.entries.length - 1].id);
    }
  }, [activeSource?.entries, follow, paused]);


  const processFiles = async (files: File[], pathLabel?: string, replacePath?: string, selectFirst = true, merge = false, silent = false) => {
    if (!files.length) return;
    if (!silent) {
      setLoading(true);
      setParseError('');
      setParseProgress(0);
    }
    const currentByPath = new Map(sources.map((source) => [source.path ?? source.name, source]));
    const toParse: { file: File; displayPath: string; id: string }[] = [];
    const nextSources: LogSource[] = [];
    for (const [index, file] of files.entries()) {
      const relativePath = file.webkitRelativePath || file.name;
      const filePath = pathLabel && relativePath.startsWith(`${pathLabel}/`)
        ? relativePath.slice(pathLabel.length + 1)
        : relativePath;
      const displayPath = pathLabel ? `${pathLabel.replace(/\/$/, '')}/${filePath}` : filePath;
      const existing = currentByPath.get(displayPath);
      const id = merge && existing ? existing.id : `source-${Date.now()}-${index}`;
      if (merge && existing && existing.entries.length > 0 && existing.lastModified === file.lastModified && existing.fileSize === file.size) {
        nextSources.push(existing);
      } else {
        toParse.push({ file, displayPath, id });
      }
    }
    if (merge && !toParse.length) {
      if (!silent) setLoading(false);
      return;
    }
    for (const { file, displayPath, id } of toParse) {
      try {
        const onProgress = (loaded: number, total: number) => {
          const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
          if (!silent) setParseProgress((current) => (current === percent ? current : percent));
        };
        const source = await parseFileBatched(file, displayPath, id, onProgress);
        nextSources.push({ ...source, path: displayPath, lastModified: file.lastModified, fileSize: file.size });
      } catch {
        nextSources.push({ id, name: file.name, format: 'Plain text', confidence: 0, size: displaySize(file.size), lastModified: file.lastModified, fileSize: file.size, entries: [], error: t('The browser could not read this file.') });
        if (!silent) setParseError(t('Could not read {0}. Check the file permissions and try again.', file.name));
      }
    }
    if (nextSources.length) {
      setSources((current) => {
        const retained = current.filter((source) => {
          return !replacePath || !source.path?.startsWith(`${replacePath.replace(/\/$/, '')}/`);
        });
        return [...retained, ...nextSources];
      });
      if (selectFirst) {
        setActiveSourceId(nextSources[0].id);
        setSelectedId(nextSources[0].entries[0]?.id ?? '');
      }
    }
    if (!silent) {
      setLoading(false);
      setParseProgress(0);
    }
  };

  const readDirectory = async (directory: DirectoryHandle) => {
    const files: File[] = [];
    for await (const handle of directory.values()) {
      if (handle.kind === 'file' && handle.getFile) files.push(await handle.getFile());
    }
    return files;
  };

  const processRemoteFiles = async (
    files: Array<{ name: string; path: string; size: number; mtime: number }>,
    replacePath?: string,
    selectFirst = true,
    merge = false,
    silent = false,
  ) => {
    if (!files.length) return;
    if (!silent) {
      setLoading(true);
      setParseError('');
      setParseProgress(0);
    }
    const currentByPath = new Map(sources.map((source) => [source.path ?? source.name, source]));
    const toFetch: Array<{ name: string; path: string; size: number; mtime: number; id: string }> = [];
    const nextSources: LogSource[] = [];
    for (const [index, file] of files.entries()) {
      const displayPath = file.path;
      const existing = currentByPath.get(displayPath);
      const id = merge && existing ? existing.id : `source-${Date.now()}-${index}`;
      if (merge && existing && existing.entries.length > 0 && existing.lastModified === file.mtime && existing.fileSize === file.size) {
        nextSources.push(existing);
      } else {
        toFetch.push({ ...file, id });
      }
    }
    if (merge && !toFetch.length) {
      if (!silent) setLoading(false);
      return;
    }
    for (const { id, ...file } of toFetch) {
      try {
        const res = await fetch(`/api/file?path=${encodeURIComponent(file.path)}`);
        if (!res.ok || !res.body) throw new Error('Failed to fetch file');
        const streamFile = { stream: () => res.body, size: file.size };
        const onProgress = (loaded: number, total: number) => {
          const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
          setParseProgress((current) => (current === percent ? current : percent));
        };
        const source = await parseStream(streamFile, file.name, id, onProgress);
        nextSources.push({ ...source, path: file.path, lastModified: file.mtime, fileSize: file.size });
      } catch {
        nextSources.push({ id, name: file.name, format: 'Plain text', confidence: 0, size: displaySize(file.size), lastModified: file.mtime, fileSize: file.size, entries: [], error: t('The server could not read this file.') });
        if (!silent) setParseError(t('Could not read {0}. Check the server permissions and try again.', file.name));
      }
    }
    if (nextSources.length) {
      setSources((current) => {
        const retained = current.filter((source) => {
          if (!replacePath) return true;
          const normalized = replacePath.replace(/\/$/, '');
          return source.path !== normalized && !source.path?.startsWith(`${normalized}/`);
        });
        return [...retained, ...nextSources];
      });
      if (selectFirst) {
        setActiveSourceId(nextSources[0].id);
        setSelectedId(nextSources[0].entries[0]?.id ?? '');
      }
    }
    if (!silent) {
      setLoading(false);
      setParseProgress(0);
    }
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) void processFiles(Array.from(event.target.files));
    event.target.value = '';
  };

  const handleFolderInput = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    const firstRelativePath = files[0]?.webkitRelativePath || '';
    const folderLabel = pendingFolderLabelRef.current || firstRelativePath.split('/')[0] || 'selected-folder';
    pendingFolderLabelRef.current = '';
    if (files.length) void processFiles(files, folderLabel, folderLabel);
    event.target.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files?.length) void processFiles(Array.from(event.dataTransfer.files));
  };

  const openFolderInput = () => {
    const input = folderInputRef.current;
    if (!input) return;
    input.setAttribute('webkitdirectory', '');
    input.setAttribute('directory', '');
    input.click();
  };

  const chooseFolder = async () => {
    const picker = (window as DirectoryPickerWindow).showDirectoryPicker;
    if (picker) {
      try {
        const directory = await picker();
        const files = await readDirectory(directory);
        const label = directory.name || 'selected-folder';
        await processFiles(files, label, label, true, true);
      } catch (error) {
        if (errorIsNotCancellation(error)) openFolderInput();
      }
      return;
    }
    openFolderInput();
  };

  const connectCustomPath = async () => {
    const requestedPath = customPath.trim();
    if (!requestedPath) {
      setParseError(t('Enter a server path first, for example /var/log/nginx or /var/log.'));
      return;
    }
    try {
      const res = await fetch(`/api/list?path=${encodeURIComponent(requestedPath)}`);
      if (!res.ok) {
        const text = await res.text().catch(() => 'Server error');
        setParseError(t('Could not connect {0}: {1}.', requestedPath, `${res.status} ${text}`));
        return;
      }
      const files = (await res.json()) as Array<{ name: string; path: string; size: number; mtime: number }>;
      if (!files.length) {
        setParseError(t('No files found at {0}.', requestedPath));
        return;
      }
      await processRemoteFiles(files, requestedPath, true, true);
      setShowPathHelp(false);
    } catch {
      setParseError(t('Could not reach the server. Make sure the backend is running.'));
    }
  };


  const clearActive = () => {
    if (!activeSource) return;
    setSources((current) => current.map((source) => source.id === activeSource.id ? { ...source, entries: [] } : source));
    setSelectedId('');
  };

  const removeSource = (id: string) => {
    setSources((current) => {
      const next = current.filter((source) => source.id !== id);
      void saveToStore('sources', next).catch(() => {});
      return next;
    });
    if (activeSourceId === id) {
      setActiveSourceId('');
      setSelectedId('');
      setDetailsOpen(false);
    }
  };

  useEffect(() => {
    if (!detailsOpen) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDetailsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [detailsOpen]);

  const copyRaw = async () => {
    if (!selectedEntry) return;
    try {
      await navigator.clipboard.writeText(selectedEntry.raw);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const openDetails = (entry: LogEntry) => {
    setSelectedId(entry.id);
    setDetailsOpen(true);
  };

  return (
    <div className="cockpit">
      <input ref={fileInputRef} className="hidden" data-testid="input-log-files" type="file" multiple accept=".log,.txt,.json,.jsonl,.out" onChange={handleFileInput} />
      <input ref={folderInputRef} className="hidden" data-testid="input-log-folder" type="file" multiple accept=".log,.txt,.json,.jsonl,.out" onChange={handleFolderInput} />
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Activity size={16} strokeWidth={2.5} /></div>
          <div><div className="brand-name">{t('Log Monitor')}</div><div className="brand-subtitle">{t('local operations cockpit')}</div></div>
        </div>
        <nav aria-label="Primary navigation">
          <div className="nav-label">{t('Workspace')}</div>
          <div className="nav-list">
            <button className="nav-item active" data-testid="button-nav-monitor" onClick={() => setActiveSourceId(activeSourceId)}><Gauge size={16} /> {t('Monitor')}</button>
            <button className="nav-item" data-testid="button-nav-sources" onClick={() => fileInputRef.current?.click()}><Plus size={16} /> {t('Add source')}</button>
          </div>
        </nav>
        <div>
          <div className="nav-label">{t('Session')}</div>
          <div className="nav-list">
            <button className="nav-item" data-testid="button-clear-sidebar" onClick={clearActive} disabled={!activeSource?.entries.length}><Trash2 size={16} /> {t('Clear active')}</button>
          </div>
        </div>
        <div className="sidebar-bottom">
          <div className="browser-status" data-testid="status-browser-support"><span className={`status-dot ${parserSupported ? '' : 'warn'}`} /> {parserSupported ? t('Browser parsing ready') : t('File APIs unavailable')}</div>
          <p className="sidebar-footnote">{t('Files stay in this tab. Nothing is uploaded, indexed, or sent over the wire.')}</p>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="breadcrumb"><span>{t('Workspace')}</span><ChevronRight size={13} /><strong>{t('Monitor')}</strong></div>
          <div className="top-actions">
            <span className="key-hint">{t('LOCAL ONLY')}</span>
            <button className="icon-button" data-testid="button-language" aria-label={t('Toggle language')} onClick={() => setLang((current) => current === 'fr' ? 'en' : 'fr')}>{lang.toUpperCase()}</button>
          </div>
        </header>

        <div className="workspace">
          {!parserSupported && <div className="unsupported-banner" data-testid="state-unsupported"><AlertTriangle size={15} /> {t('This browser does not expose the File API. Upgrade to a current browser to open local logs.')}</div>}
          {parseError && <div className="error-banner" data-testid="state-parse-error"><AlertTriangle size={15} /><span>{parseError}</span><button className="icon-button" data-testid="button-dismiss-error" aria-label={t('Dismiss error')} onClick={() => setParseError('')}><X size={14} /></button></div>}
          <div className="heading-row">
            <div>
              <div className="eyebrow">{t('Operations / local session')}</div>
              <h1 className="page-title">{t('Make machine output legible.')}</h1>
              <p className="page-intro">{t('Drop a log, let the parser explain its shape, then scan the signal without losing the original line.')}</p>
            </div>
          </div>

          <div className={`drop-zone ${dragging ? 'dragging' : ''}`} data-testid="drop-zone" onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={handleDrop}>
            <div className="drop-copy"><div className="drop-icon">{loading ? <RefreshCcw size={18} className="animate-spin" /> : <ArrowDownToLine size={18} />}</div><div><div className='drop-title'>{loading ? `${t('Reading and classifying logs…')}${parseProgress ? ` ${parseProgress}%` : ''}` : t('Drop log files here')}</div><div className="drop-meta">{t('PM2, Nginx, JSONL, plain text · parsing happens locally')}</div></div></div>
            <div className="drop-actions"><button type="button" className="button" data-testid="button-browse-files" aria-label="Browse for log files" onClick={() => fileInputRef.current?.click()}><FolderOpen size={14} /> {t('Browse files')}</button><button type="button" className="button quiet" data-testid="button-browse-folder" aria-label={t('Add a log folder')} onClick={() => void chooseFolder()} disabled={!parserSupported}><HardDrive size={14} /> {t('Folder')}</button></div>
          </div>
          <div className="path-connect">
            <div className="path-connect-copy"><Link2 size={15} /><div><strong>{t('Connect a log path')}</strong><span>{t('Type the path you want to monitor, then grant access to that folder.')}</span></div></div>
            <div className="path-connect-form">
              <input className="path-input" data-testid="input-custom-path" value={customPath} onChange={(event) => setCustomPath(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void connectCustomPath(); }} placeholder="/var/log/nginx" aria-label={t('Custom local log path')} />
              <button type="button" className="button" data-testid="button-connect-path" aria-label={t('Connect this local log path')} onClick={() => void connectCustomPath()}><Link2 size={13} /> {t('Connect path')}</button>
              <button className="path-help" data-testid="button-path-help" onClick={() => setShowPathHelp((value) => !value)} aria-label={t('Explain custom path access')}>?</button>
            </div>
            {showPathHelp && <p className="path-help-text" data-testid="text-path-help">{t('Browsers cannot read an arbitrary filesystem path from text alone. The path becomes the source label, while the folder picker is the secure permission step. Nothing leaves this tab.')}</p>}
          </div>

          <section className="stat-grid" aria-label={t('Session summary')}>
            <div className="stat-card accent"><div className="stat-label"><span>{t('Sources online')}</span><CheckCircle2 size={14} /></div><div className="stat-value" data-testid="text-source-count">{sources.length.toString().padStart(2, '0')}</div><div className="stat-detail good">{t('local files in session')}</div></div>
            <div className="stat-card"><div className="stat-label"><span>{t('Entries indexed')}</span><Archive size={14} /></div><div className="stat-value" data-testid="text-entry-count">{allEntries.length.toLocaleString()}</div><div className="stat-detail">{visibleEntries.length.toLocaleString()} {t('matching current view')}</div></div>
            <div className="stat-card"><div className="stat-label"><span>{t('Errors / warnings')}</span><AlertTriangle size={14} /></div><div className="stat-value" data-testid="text-problem-count">{(levelCounts.ERROR + levelCounts.WARN).toString().padStart(2, '0')}</div><div className="stat-detail">{t('{0} errors · {1} warnings', levelCounts.ERROR.toString(), levelCounts.WARN.toString())}</div></div>
            <div className="stat-card"><div className="stat-label"><span>{t('Parser confidence')}</span><BarChart3 size={14} /></div><div className="stat-value" data-testid="text-confidence">{activeSource ? `${activeSource.confidence}%` : '—'}</div><div className="stat-detail">{activeSource ? t(activeSource.format) : t('No source selected')}</div></div>
          </section>

          <section className="monitor-grid" aria-label="Log monitor">
            <aside className="source-panel">
              <div className="panel-heading"><span>{t('Sources')}</span><button className="icon-button" data-testid="button-add-source" aria-label={t('Add a log source')} onClick={() => fileInputRef.current?.click()}><Plus size={14} /></button><button className="icon-button" data-testid="button-remove-source" aria-label={t('Remove active source')} onClick={() => activeSource && removeSource(activeSource.id)} disabled={!activeSource}><X size={14} /></button></div>
               {loading ? <div className="source-list"><div className="source-item skeleton" style={{ height: 62 }} /><div className="source-item skeleton" style={{ height: 62 }} /></div> : sources.length ? <div className="source-list">{sources.map((source) => <button key={source.id} className={`source-item ${source.id === activeSource?.id ? 'active' : ''}`} data-testid={`button-source-${source.id}`} onClick={() => { setActiveSourceId(source.id); setSelectedId(source.entries[0]?.id ?? ''); }}><div className="source-name"><span className="source-icon">{sourceIcon(source.format)}</span><span>{source.name}</span></div><div className="source-meta"><span className="source-format">{t(source.format)}</span><span className={`tiny-dot ${source.error ? 'error' : ''}`} /></div>{source.path && source.path !== source.name && <div className="source-path">{source.path}</div>}</button>)}</div> : <div className="source-empty" data-testid="state-empty-sources">{t('No sources yet. Open a file or drop a folder to begin.')}</div>}
            </aside>

            <div className="log-panel">
              <div className="log-toolbar">
                <div className="search-wrap"><Search size={15} /><input className="search-input" data-testid="input-search-logs" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('Search message, field, raw line…')} /></div>
                <select className="filter-select" data-testid="select-level-filter" value={levelFilter} onChange={(event) => setLevelFilter(event.target.value as 'ALL' | Level)} aria-label={t('Filter by level')}><option value="ALL">{t('All levels')}</option><option value="ERROR">{t('Errors')}</option><option value="WARN">{t('Warnings')}</option><option value="INFO">{t('Info')}</option><option value="DEBUG">{t('Debug')}</option><option value="TRACE">{t('Trace')}</option></select>
                <div className="view-toggle" aria-label={t('Log view')}><button className={view === 'table' ? 'active' : ''} data-testid="button-view-table" aria-label={t('Table view')} onClick={() => setView('table')}><Table2 size={14} /></button><button className={view === 'list' ? 'active' : ''} data-testid="button-view-list" aria-label={t('Readable list view')} onClick={() => setView('list')}><LayoutList size={14} /></button></div>
              </div>
                 <div className="live-controls"><span className={`live-pill ${paused ? 'paused' : ''}`} data-testid="status-live"><span className="status-dot" /> {paused ? t('Paused') : t('Live view')}</span>{activeSource ? (activeFolderSources.length > 1 ? <select className="filter-select" data-testid="select-folder-files" value={activeSource.id} onChange={(event) => { setActiveSourceId(event.target.value); setSelectedId(''); }} aria-label={t('Sources')}>{activeFolderSources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}</select> : <strong>{activeSource.name}</strong>) : <strong>{t('No source')}</strong>}<span className="mono">{visibleEntries.length} {t('shown')}</span><button className="control-link" data-testid="button-open-live-details" onClick={() => selectedEntry && openDetails(selectedEntry)} disabled={!selectedEntry}><Maximize2 size={13} /> {t('Inspect details')}</button><button className="control-link" data-testid="button-toggle-follow" onClick={() => setFollow((value) => !value)}>{follow ? <CirclePause size={14} /> : <CirclePlay size={14} />} {follow ? t('Following') : t('Follow')}</button><button className="control-link" data-testid="button-toggle-pause" onClick={() => setPaused((value) => !value)}>{paused ? <Play size={13} /> : <Pause size={13} />} {paused ? t('Resume') : t('Pause')}</button><button className="control-link" data-testid="button-clear-logs" onClick={clearActive} disabled={!activeSource?.entries.length}><Trash2 size={13} /> {t('Clear')}</button></div>
              <div className="log-scroll">
                 {loading ? <div className="empty-logs"><div><div className="skeleton" style={{ width: 180, height: 10, margin: '0 auto 14px' }} /><div className="skeleton" style={{ width: 270, height: 10, margin: '0 auto 8px' }} /><div className="skeleton" style={{ width: 220, height: 10, margin: '0 auto' }} /></div></div> : !activeSource || !visibleEntries.length ? <div className="empty-logs" data-testid="state-empty-logs"><List size={24} /><div><h3>{activeSource?.entries.length ? t('No matching entries') : t('Nothing to inspect yet')}</h3><p>{activeSource?.entries.length ? t('Try a different search term or level filter.') : t('Open a local log and the monitor will keep its raw lines alongside every inferred field.')}</p></div></div> : view === 'table' ? <table className="log-table"><thead><tr><th>{t('Line number')}</th><th>{t('Timestamp')}</th><th>{t('Level')}</th><th>{t('Message / inferred fields')}</th></tr></thead><tbody>{displayedEntries.map((entry) => <tr key={entry.id} className={`log-row ${selectedEntry?.id === entry.id ? 'selected' : ''}`} data-testid={`row-log-${entry.id}`} tabIndex={0} role="button" aria-label={t('Inspect line {0}: {1}', String(entry.line), entry.message)} onClick={() => setSelectedId(entry.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedId(entry.id); }}><td className="line-number">{String(entry.line).padStart(4, '0')}</td><td className="time-cell">{entry.timestamp}</td><td><span className={`level-badge ${entry.level.toLowerCase()}`}>{t(entry.level)}</span></td><td className="message-cell"><div>{entry.message}</div>{Object.entries(entry.fields).length > 0 && <div style={{ marginTop: 5 }}>{Object.entries(entry.fields).slice(0, 4).map(([key, value]) => <span className="field-chip" key={key}>{key}={value}</span>)}</div>}<button type="button" className="inspect-hint inspect-button" data-testid={`button-inspect-${entry.id}`} onClick={(event) => { event.stopPropagation(); openDetails(entry); }}>{t('Inspect details')} <ChevronRight size={11} /></button></td></tr>)}</tbody></table> : <div>{displayedEntries.map((entry) => <div key={entry.id} className={`list-entry ${selectedEntry?.id === entry.id ? 'selected' : ''}`} data-testid={`list-log-${entry.id}`} tabIndex={0} role="button" aria-label={t('Inspect line {0}: {1}', String(entry.line), entry.message)} onClick={() => setSelectedId(entry.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedId(entry.id); }}><div className="list-top"><span className={`level-badge ${entry.level.toLowerCase()}`}>{t(entry.level)}</span><span className="mono">{t('Line')} {entry.line}</span><span className="mono">{entry.timestamp}</span><button type="button" className="inspect-hint inspect-button" data-testid={`button-inspect-${entry.id}`} onClick={(event) => { event.stopPropagation(); openDetails(entry); }}>{t('Inspect')} <ChevronRight size={11} /></button></div><div className="list-message">{entry.message}</div><div className="list-raw">{entry.raw}</div></div>)}</div>}
              </div>
            </div>

            <aside className="inspector">
              <div className="inspector-header"><span className="inspector-title">{t('Entry inspector')}</span>{selectedEntry && <span className="mono">#{selectedEntry.line}</span>}</div>
              {!selectedEntry ? <div className="inspector-empty" data-testid="state-empty-inspector"><Info size={20} /><p>{t('Select an entry to see parsed fields and its untouched source line.')}</p></div> : <div className="inspector-body fade-in">
                <div className="detail-section"><div className="detail-label">{t('Message')}</div><div className="detail-value" data-testid="text-selected-message">{selectedEntry.message}</div></div>
                 <div className="detail-section"><div className="detail-label">{t('Classification')}</div><div className="kv-list"><div className="kv"><span>{t('Source format')}</span><span data-testid="text-selected-format">{t(selectedEntry.format)}</span></div><div className="kv"><span>{t('Parser result')}</span><span style={{ color: selectedEntry.parsed ? 'hsl(var(--accent))' : 'hsl(var(--primary))' }}>{selectedEntry.parsed ? t('Inferred') : t('Raw fallback')}</span></div><div className="kv"><span>{t('Timestamp')}</span><span>{selectedEntry.timestamp}</span></div><div className="kv"><span>{t('Severity')}</span><span>{t(selectedEntry.level)}</span></div></div></div>
                 <div className="detail-section diagnosis"><div className="detail-label">{t('What this points to')}</div><div className="diagnosis-title">{diagnosisFor(selectedEntry).title}</div><p className="diagnosis-summary">{diagnosisFor(selectedEntry).summary}</p><ul className="diagnosis-actions">{diagnosisFor(selectedEntry).actions.map((action) => <li key={action}>{action}</li>)}</ul></div>
                <div className="detail-section"><div className="detail-label">{t('Source confidence')}</div><div className="confidence"><div className="confidence-track"><div className="confidence-fill" style={{ width: `${activeSource?.confidence ?? 0}%` }} /></div><span className="mono" data-testid="text-selected-confidence">{activeSource?.confidence ?? 0}%</span></div></div>
                <div className="detail-section"><div className="detail-label">{t('Inferred fields')}</div>{Object.entries(selectedEntry.fields).length ? <div className="kv-list">{Object.entries(selectedEntry.fields).map(([key, value]) => <div className="kv" key={key}><span>{key}</span><span>{value}</span></div>)}</div> : <div className="detail-value mono">{t('No additional fields found.')}</div>}</div>
                <div className="detail-section"><div className="detail-label">{t('Raw line')}</div><div className="raw-box" data-testid="text-selected-raw">{selectedEntry.raw}</div><div className="inspector-actions"><button className="button" data-testid="button-copy-raw" onClick={copyRaw}>{copied ? <CheckCircle2 size={13} /> : <Copy size={13} />} {copied ? t('Copied') : t('Copy raw')}</button><button className="button quiet" data-testid="button-dismiss-selection" onClick={() => setSelectedId('')}><X size={13} /> {t('Close')}</button></div></div>
              </div>}
            </aside>
          </section>
           {detailsOpen && selectedEntry && selectedDiagnosis && <div className="modal-backdrop" data-testid="modal-entry-details" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetailsOpen(false); }}>
             <section className="details-modal" role="dialog" aria-modal="true" aria-labelledby="details-modal-title">
               <div className="modal-header"><div><div className="eyebrow">{t('Live event detail')}</div><h2 id="details-modal-title">{t('Line')} {selectedEntry.line} · {t(selectedEntry.level)}</h2></div><button type="button" className="icon-button" data-testid="button-close-details" aria-label={t('Close event details')} onClick={() => setDetailsOpen(false)}><X size={16} /></button></div>
               <div className="modal-meta"><span>{activeSource?.name}</span><span className="mono">{selectedEntry.timestamp}</span><span className={`level-badge ${selectedEntry.level.toLowerCase()}`}>{t(selectedEntry.level)}</span></div>
               <div className="modal-grid"><div className="modal-main"><div className="detail-label">{t('Parsed message')}</div><div className="modal-message">{selectedEntry.message}</div><div className="detail-label">{t('Original raw line')}</div><div className="raw-box modal-raw">{selectedEntry.raw}</div></div><div className="modal-side"><div className="detail-label">{t('Diagnostic interpretation')}</div><div className="diagnosis-title">{selectedDiagnosis.title}</div><p className="diagnosis-summary">{selectedDiagnosis.summary}</p><ul className="diagnosis-actions">{selectedDiagnosis.actions.map((action) => <li key={action}>{action}</li>)}</ul></div></div>
               <div className="modal-fields"><div className="detail-label">{t('Inferred fields')}</div>{Object.entries(selectedEntry.fields).length ? <div className="modal-field-grid">{Object.entries(selectedEntry.fields).map(([key, value]) => <div className="modal-field" key={key}><span>{key}</span><strong>{value}</strong></div>)}</div> : <span className="detail-value mono">{t('No additional fields found.')}</span>}</div>
               <div className="modal-footer"><span className="mono">{t('Source confidence')} {activeSource?.confidence ?? 0}% · {t(selectedEntry.format)} · {t('raw line preserved')}</span><button type="button" className="button" data-testid="button-modal-copy-raw" onClick={copyRaw}>{copied ? <CheckCircle2 size={13} /> : <Copy size={13} />} {copied ? t('Copied') : t('Copy raw line')}</button></div>
             </section>
           </div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, marginTop: 13, color: 'hsl(var(--muted-foreground))', fontSize: 10 }}>
            <span data-testid="text-privacy-note"><Clipboard size={11} style={{ verticalAlign: 'middle', marginRight: 5 }} />{t('Local session · raw lines remain available for verification')}</span>
            <span><SlidersHorizontal size={11} style={{ verticalAlign: 'middle', marginRight: 5 }} />{directorySupported ? t('Folder access supported') : t('Single-file picker fallback')}</span>
          </div>
        </div>
      </main>
    </div>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;