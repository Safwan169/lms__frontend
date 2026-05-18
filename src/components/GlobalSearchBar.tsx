'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import {
  Search,
  X,
  Clock,
  ChevronRight,
  Loader2,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardList,
  Briefcase,
  UserPlus,
  Plus,
  Hash,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useDebounce } from '@/hooks/useDebounce';
import api from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'students' | 'teachers' | 'courses' | 'admissions' | 'employees';
type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' | 'info' | 'muted';

interface SearchResult {
  id: string | number;
  name: string;
  subtitle: string;
  status?: string;
  statusVariant?: BadgeVariant;
  category: Exclude<FilterTab, 'all'>;
  href: string;
}

interface GroupedResults {
  students: SearchResult[];
  teachers: SearchResult[];
  courses: SearchResult[];
  admissions: SearchResult[];
  employees: SearchResult[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'students', label: 'Students' },
  { key: 'teachers', label: 'Teachers' },
  { key: 'courses', label: 'Courses' },
  { key: 'admissions', label: 'Admissions' },
  { key: 'employees', label: 'Employees' },
];

const CATEGORY_CONFIG: Record<
  Exclude<FilterTab, 'all'>,
  { icon: React.ElementType; label: string; color: string }
> = {
  students: { icon: Users, label: 'Students', color: 'text-blue-500' },
  teachers: { icon: GraduationCap, label: 'Teachers', color: 'text-violet-500' },
  courses: { icon: BookOpen, label: 'Courses', color: 'text-emerald-500' },
  admissions: { icon: ClipboardList, label: 'Admissions', color: 'text-amber-500' },
  employees: { icon: Briefcase, label: 'Employees', color: 'text-rose-500' },
};

const QUICK_ACTIONS: {
  label: string;
  icon: React.ElementType;
  href: string;
  color: string;
}[] = [
  { label: 'New Student', icon: UserPlus, href: '/students/new', color: 'text-blue-500' },
  { label: 'New Admission', icon: ClipboardList, href: '/admissions/new', color: 'text-amber-500' },
  { label: 'New Batch', icon: BookOpen, href: '/courses/new', color: 'text-emerald-500' },
];

const MAX_PER_CATEGORY = 4;
const RECENT_KEY = 'globalSearch_recent';
const MAX_RECENT = 5;

// ─── Mock / API Search ────────────────────────────────────────────────────────
//
// Replace the body of this function with a real API call once the backend
// search endpoint is available:
//
//   const { data } = await api.get('/search', { params: { q: query } });
//   return data as GroupedResults;
//
async function performSearch(query: string): Promise<GroupedResults> {
  // Simulated network delay — remove when wiring up real API
  await new Promise((r) => setTimeout(r, 400));

  const q = query.toLowerCase();

  const allStudents: SearchResult[] = [
    { id: 1, name: 'Ali Hassan', subtitle: 'Batch A · CS101', status: 'Active', statusVariant: 'info', category: 'students', href: '/students/1' },
    { id: 2, name: 'Sara Ahmed', subtitle: 'Batch B · Math201', status: 'Active', statusVariant: 'info', category: 'students', href: '/students/2' },
    { id: 3, name: 'Omar Sheikh', subtitle: 'Batch A · Physics101', status: 'Inactive', statusVariant: 'muted', category: 'students', href: '/students/3' },
    { id: 4, name: 'Fatima Malik', subtitle: 'Batch C · English101', status: 'Active', statusVariant: 'info', category: 'students', href: '/students/4' },
    { id: 5, name: 'Yousuf Ali', subtitle: 'Batch B · CS201', status: 'Suspended', statusVariant: 'destructive', category: 'students', href: '/students/5' },
  ];

  const allTeachers: SearchResult[] = [
    { id: 1, name: 'Dr. Amina Siddiqui', subtitle: 'Computer Science', status: 'Active', statusVariant: 'info', category: 'teachers', href: '/teachers/1' },
    { id: 2, name: 'Prof. Bilal Khan', subtitle: 'Mathematics', status: 'Active', statusVariant: 'info', category: 'teachers', href: '/teachers/2' },
    { id: 3, name: 'Ms. Nadia Rehman', subtitle: 'English Literature', status: 'Part-time', statusVariant: 'warning', category: 'teachers', href: '/teachers/3' },
  ];

  const allCourses: SearchResult[] = [
    { id: 1, name: 'CS101 — Intro to Programming', subtitle: 'Batch A · 35 students', status: 'Active', statusVariant: 'info', category: 'courses', href: '/courses/1' },
    { id: 2, name: 'Math201 — Calculus II', subtitle: 'Batch B · 28 students', status: 'Active', statusVariant: 'info', category: 'courses', href: '/courses/2' },
    { id: 3, name: 'Physics101 — Mechanics', subtitle: 'Batch A · 30 students', status: 'Upcoming', statusVariant: 'warning', category: 'courses', href: '/courses/3' },
    { id: 4, name: 'English101 — Academic Writing', subtitle: 'Batch C · 25 students', status: 'Completed', statusVariant: 'muted', category: 'courses', href: '/courses/4' },
  ];

  const allAdmissions: SearchResult[] = [
    { id: 1, name: 'Ahmed Farooq', subtitle: 'Fall 2025 · CS101', status: 'Pending', statusVariant: 'warning', category: 'admissions', href: '/admissions/1' },
    { id: 2, name: 'Zara Iqbal', subtitle: 'Fall 2025 · Math201', status: 'Approved', statusVariant: 'info', category: 'admissions', href: '/admissions/2' },
    { id: 3, name: 'Hamza Tariq', subtitle: 'Spring 2026 · CS101', status: 'Rejected', statusVariant: 'destructive', category: 'admissions', href: '/admissions/3' },
  ];

  const allEmployees: SearchResult[] = [
    { id: 1, name: 'Imran Hussain', subtitle: 'Accounts Department', status: 'Active', statusVariant: 'info', category: 'employees', href: '/employees/1' },
    { id: 2, name: 'Samina Qureshi', subtitle: 'Administration', status: 'Active', statusVariant: 'info', category: 'employees', href: '/employees/2' },
    { id: 3, name: 'Tariq Mehmood', subtitle: 'IT Department', status: 'Active', statusVariant: 'info', category: 'employees', href: '/employees/3' },
  ];

  const match = (item: SearchResult) =>
    item.name.toLowerCase().includes(q) ||
    item.subtitle.toLowerCase().includes(q) ||
    (item.status?.toLowerCase().includes(q) ?? false);

  return {
    students: allStudents.filter(match),
    teachers: allTeachers.filter(match),
    courses: allCourses.filter(match),
    admissions: allAdmissions.filter(match),
    employees: allEmployees.filter(match),
  };
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function ResultSkeleton() {
  return (
    <div className="space-y-1 p-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2 animate-pulse">
          <div className="h-8 w-8 shrink-0 rounded-full bg-muted dark:bg-muted/40" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-2/5 rounded bg-muted dark:bg-muted/40" />
            <div className="h-2.5 w-3/5 rounded bg-muted/70 dark:bg-muted/25" />
          </div>
          <div className="h-4 w-14 rounded-full bg-muted dark:bg-muted/40" />
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GlobalSearchBar() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [results, setResults] = useState<GroupedResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Mount guard for portal ──────────────────────────────────────────────────
  useEffect(() => { setMounted(true); }, []);

  // ── Ctrl+K / ⌘K global shortcut ──────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // ── Open / close side effects ─────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      // Load recent searches
      try {
        const raw = localStorage.getItem(RECENT_KEY);
        if (raw) { setRecentSearches(JSON.parse(raw)); }
      } catch {
        /* ignore */
      }
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      setTimeout(() => inputRef.current?.focus(), 60);
    } else {
      document.body.style.overflow = '';
      setQuery('');
      setResults(null);
      setActiveTab('all');
      setSelectedIndex(-1);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // ── Debounced search ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.trim().length < 2) {
      setResults(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setSelectedIndex(-1);

    performSearch(debouncedQuery.trim())
      .then((data) => {
        if (!cancelled) {
          setResults(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResults({ students: [], teachers: [], courses: [], admissions: [], employees: [] });
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  // ── Flat list for keyboard navigation ──────────────────────────────────────
  const flatResults: SearchResult[] = useMemo(() => {
    if (!results) return [];
    const cats: Exclude<FilterTab, 'all'>[] = [
      'students', 'teachers', 'courses', 'admissions', 'employees',
    ];
    return cats
      .filter((cat) => activeTab === 'all' || activeTab === cat)
      .flatMap((cat) => results[cat].slice(0, MAX_PER_CATEGORY));
  }, [results, activeTab]);

  // ── Save recent + navigate ──────────────────────────────────────────────────
  const navigateTo = useCallback(
    (href: string, term?: string) => {
      if (term?.trim()) {
        try {
          const raw = localStorage.getItem(RECENT_KEY);
          const existing: string[] = raw ? JSON.parse(raw) : [];
          const updated = [term.trim(), ...existing.filter((s) => s !== term.trim())].slice(
            0,
            MAX_RECENT
          );
          localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
          setRecentSearches(updated);
        } catch {
          /* ignore */
        }
      }
      setIsOpen(false);
      router.push(href);
    },
    [router]
  );

  const removeRecent = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentSearches.filter((s) => s !== term);
    setRecentSearches(updated);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  };

  // ── Keyboard navigation inside modal ──────────────────────────────────────
  const handleModalKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          setIsOpen(false);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, flatResults.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, -1));
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && flatResults[selectedIndex]) {
            navigateTo(flatResults[selectedIndex].href, query);
          } else if (query.trim()) {
            // Save search term even without selecting a result
            try {
              const raw = localStorage.getItem(RECENT_KEY);
              const existing: string[] = raw ? JSON.parse(raw) : [];
              const updated = [
                query.trim(),
                ...existing.filter((s) => s !== query.trim()),
              ].slice(0, MAX_RECENT);
              localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
              setRecentSearches(updated);
            } catch {
              /* ignore */
            }
          }
          break;
      }
    },
    [flatResults, selectedIndex, navigateTo, query]
  );

  // ── Result rendering ───────────────────────────────────────────────────────
  const hasResults =
    results !== null && Object.values(results).some((arr) => arr.length > 0);

  const renderResults = () => {
    if (isLoading) return <ResultSkeleton />;

    if (!hasResults && debouncedQuery.length >= 2) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
          <div className="rounded-full bg-muted/60 p-4 dark:bg-muted/20">
            <Search className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">No results found</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Nothing matched &ldquo;
              <span className="font-medium text-foreground">{debouncedQuery}</span>
              &rdquo;
            </p>
          </div>
        </div>
      );
    }

    if (!results) return null;

    const categories: Exclude<FilterTab, 'all'>[] = [
      'students', 'teachers', 'courses', 'admissions', 'employees',
    ];
    const toShow =
      activeTab === 'all'
        ? categories
        : ([activeTab] as Exclude<FilterTab, 'all'>[]);

    return (
      <div className="divide-y divide-border/40">
        {toShow.map((cat) => {
          const items = results[cat].slice(0, MAX_PER_CATEGORY);
          if (items.length === 0) return null;
          const { icon: Icon, label, color } = CATEGORY_CONFIG[cat];

          return (
            <div key={cat} className="p-2">
              {/* Category header */}
              <div className="mb-0.5 flex items-center gap-1.5 px-2 py-1">
                <Icon className={cn('h-3.5 w-3.5 shrink-0', color)} />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {label}
                </span>
                <span className="ml-auto text-[10px] text-muted-foreground/70">
                  {results[cat].length}
                </span>
              </div>

              {/* Result rows */}
              {items.map((item) => {
                const globalIdx = flatResults.indexOf(item);
                const isSelected = globalIdx === selectedIndex;

                return (
                  <button
                    key={item.id}
                    onClick={() => navigateTo(item.href, query)}
                    className={cn(
                      'group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                      isSelected
                        ? 'bg-primary/10 dark:bg-primary/20'
                        : 'hover:bg-muted/60 dark:hover:bg-muted/30'
                    )}
                  >
                    {/* Category icon */}
                    <div
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                        isSelected
                          ? 'bg-primary/15 dark:bg-primary/25'
                          : 'bg-muted/80 dark:bg-muted/40'
                      )}
                    >
                      <Icon className={cn('h-4 w-4', color)} />
                    </div>

                    {/* Name + subtitle */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {item.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.subtitle}
                      </p>
                    </div>

                    {/* Status badge */}
                    {item.status && (
                      <Badge
                        variant={item.statusVariant}
                        className="shrink-0 text-[10px]"
                      >
                        {item.status}
                      </Badge>
                    )}

                    {/* Chevron */}
                    <ChevronRight
                      className={cn(
                        'ml-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-opacity',
                        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      )}
                    />
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  // ── Modal markup ──────────────────────────────────────────────────────────
  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[8vh]"
      onClick={() => setIsOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm dark:bg-black/60" />

      {/* Panel */}
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleModalKeyDown}
        className={cn(
          'relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl',
          'border border-border/70 bg-background shadow-2xl',
          'dark:bg-zinc-900 dark:border-zinc-700/60',
          'animate-in fade-in slide-in-from-top-4 duration-200'
        )}
      >
        {/* ── Search Input ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 border-b border-border/60 dark:border-zinc-700/60 px-4 py-3">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search students, teachers, courses…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(-1);
            }}
            className="flex-1 bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground outline-none"
          />
          <div className="flex items-center gap-2">
            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  setResults(null);
                  inputRef.current?.focus();
                }}
                className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border border-border/70 bg-muted/70 px-1.5 text-[10px] font-medium text-muted-foreground dark:border-zinc-600 dark:bg-zinc-800">
              ESC
            </kbd>
          </div>
        </div>

        {/* ── Filter Tabs ──────────────────────────────────────────────── */}
        <div className="flex gap-1 overflow-x-auto border-b border-border/60 dark:border-zinc-700/60 px-3 py-2 [scrollbar-width:none]">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setSelectedIndex(-1);
              }}
              className={cn(
                'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-zinc-800'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Main Content ─────────────────────────────────────────────── */}
        <div className="max-h-[55vh] overflow-y-auto [scrollbar-width:thin]">
          {!query ? (
            /* Empty state: recent searches + quick actions */
            <div className="space-y-1 p-3">
              {/* Recent searches */}
              {recentSearches.length > 0 && (
                <section>
                  <div className="mb-1 flex items-center gap-2 px-2 py-1">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Recent
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {recentSearches.map((term) => (
                      <button
                        key={term}
                        onClick={() => setQuery(term)}
                        className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted/60 dark:hover:bg-zinc-800"
                      >
                        <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                        <span className="flex-1 text-left text-sm text-foreground/80">
                          {term}
                        </span>
                        <button
                          onClick={(e) => removeRecent(term, e)}
                          className="rounded p-0.5 opacity-0 transition-all group-hover:opacity-100 text-muted-foreground hover:text-foreground"
                          aria-label={`Remove "${term}" from recent searches`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Quick actions */}
              <section>
                <div className="mb-1 flex items-center gap-2 px-2 py-1">
                  <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Quick Actions
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {QUICK_ACTIONS.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.href}
                        onClick={() => navigateTo(action.href)}
                        className="flex items-center gap-2.5 rounded-xl border border-border/50 px-3 py-2.5 text-left transition-all hover:border-border hover:bg-muted/50 dark:border-zinc-700/50 dark:hover:bg-zinc-800"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted/80 dark:bg-zinc-800">
                          <Icon className={cn('h-3.5 w-3.5', action.color)} />
                        </div>
                        <span className="text-xs font-medium text-foreground">
                          {action.label}
                        </span>
                        <Plus className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          ) : (
            renderResults()
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-t border-border/60 dark:border-zinc-700/60 px-4 py-2">
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            {[
              { keys: '↑↓', label: 'navigate' },
              { keys: '↵', label: 'open' },
              { keys: 'esc', label: 'close' },
            ].map(({ keys, label }) => (
              <span key={label} className="flex items-center gap-1">
                <kbd className="rounded border border-border/70 bg-muted/60 px-1 py-0.5 font-mono text-[10px] dark:border-zinc-600 dark:bg-zinc-800">
                  {keys}
                </kbd>
                {label}
              </span>
            ))}
          </div>
          {flatResults.length > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {flatResults.length} result{flatResults.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  // ── Trigger + Portal ──────────────────────────────────────────────────────
  return (
    <>
      {/* Search trigger button in the topbar */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-1.5',
          'text-sm text-muted-foreground transition-colors',
          'hover:bg-muted hover:text-foreground',
          'dark:bg-muted/20 dark:hover:bg-muted/40 dark:border-input',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        )}
        aria-label="Open search (Ctrl+K)"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline text-sm">Search…</span>
        <kbd className="hidden sm:inline-flex ml-1 h-4 select-none items-center gap-0.5 rounded border border-border/70 bg-background/60 px-1 text-[10px] text-muted-foreground/70 dark:bg-zinc-800 dark:border-zinc-600">
          <span>⌘</span>K
        </kbd>
      </button>

      {/* Modal rendered into document.body via portal */}
      {isOpen && mounted && createPortal(modalContent, document.body)}
    </>
  );
}
