'use client';

import { useState, useEffect, useCallback } from 'react';
import { companyApi, type Company } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertCircle,
  RotateCcw,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Building2,
  Mail,
  Phone,
  MapPin,
  Tag,
  DollarSign,
  Users,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const PAGE_SIZE = 20;

function fmtDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}

function ProfileTypeBadge({ type }: { type: string }) {
  const label = type?.replace(/_/g, ' ') ?? '—';
  const color =
    type === 'EVENT_ORGANIZER' ? 'text-violet-400 bg-violet-500/10 border-violet-500/20' :
    type === 'TICKETING_COMPANY' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' :
    'text-muted-foreground bg-accent border-border';
  return (
    <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded border ${color}`}>
      {label}
    </span>
  );
}

function CompanyCard({ company }: { company: Company }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-foreground">{company.companyName}</h3>
                <span className="text-[10px] font-mono text-muted-foreground/40">#{company.id}</span>
                <ProfileTypeBadge type={company.profileType} />
                {company.isActive ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                    <CheckCircle2 className="h-2.5 w-2.5" />Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-destructive bg-destructive/10 border border-destructive/20 px-1.5 py-0.5 rounded">
                    <XCircle className="h-2.5 w-2.5" />Inactive
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
                  <Mail className="h-2.5 w-2.5 flex-shrink-0" />
                  <span className="truncate max-w-[180px]">{company.emailAddress}</span>
                </span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
                  <Phone className="h-2.5 w-2.5 flex-shrink-0" />{company.phoneNumber}
                </span>
                {company.currency && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
                    <DollarSign className="h-2.5 w-2.5 flex-shrink-0" />{company.currency}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => setExpanded(v => !v)}
              className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground/50 hover:text-foreground hover:bg-accent/50 transition-colors flex-shrink-0"
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

      {expanded && (
        <div className="border-t border-border bg-background/30 px-4 py-3 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                <MapPin className="h-2.5 w-2.5" />Physical Address
              </p>
              <p className="text-foreground/80">{company.physicalAddress || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                <Tag className="h-2.5 w-2.5" />Postal Address
              </p>
              <p className="text-foreground/80">{company.postalAddress || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-0.5">Joined</p>
              <p className="text-foreground/80">{fmtDate(company.createdAt)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-0.5">Last Updated</p>
              <p className="text-foreground/80">{fmtDate(company.updatedAt)}</p>
            </div>
          </div>
          {company.bio && (
            <div>
              <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-0.5">Bio</p>
              <p className="text-xs text-foreground/70 leading-relaxed">{company.bio}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaging, setIsPaging] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);

  const fetchData = useCallback(async (page = 0, searchTerm?: string, paging = false) => {
    if (paging) setIsPaging(true);
    else setIsLoading(true);
    setError('');
    try {
      const resp = await companyApi.getAll(page, PAGE_SIZE, searchTerm);
      if (resp.status && resp.data) {
        setCompanies(resp.data.companies);
        setCurrentPage(resp.data.page);
        setTotalPages(resp.data.totalPages);
        setTotalElements(resp.data.totalElements);
        setHasNext(resp.data.hasNext);
        setHasPrevious(resp.data.hasPrevious);
      } else {
        setError(resp.message || 'Failed to load companies');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load companies');
    } finally {
      setIsLoading(false);
      setIsPaging(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearch = () => {
    setCurrentPage(0);
    fetchData(0, search || undefined);
  };

  const handlePageChange = (p: number) => {
    fetchData(p, search || undefined, true);
  };

  const activeCount = companies.filter(c => c.isActive).length;

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Companies</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isLoading ? 'Loading...' : `${totalElements} total · ${activeCount} active on this page`}
          </p>
        </div>
        <Button
          onClick={() => fetchData(currentPage, search || undefined)}
          variant="outline"
          size="sm"
          className="border-border bg-transparent text-muted-foreground hover:text-foreground gap-1.5 text-xs h-8 flex-shrink-0"
          disabled={isLoading}
        >
          <RotateCcw className="h-3 w-3" />
          Refresh
        </Button>
      </div>

      {/* Summary pills */}
      {!isLoading && companies.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Building2 className="h-3 w-3 text-violet-400" />
              <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Total</span>
            </div>
            <p className="text-lg font-bold tabular-nums text-foreground">{totalElements}</p>
          </div>
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Active (page)</span>
            </div>
            <p className="text-lg font-bold tabular-nums text-emerald-400">{activeCount}</p>
          </div>
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Users className="h-3 w-3 text-blue-400" />
              <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Showing</span>
            </div>
            <p className="text-lg font-bold tabular-nums text-blue-400">{companies.length}</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <Alert variant="destructive" className="border-destructive/30 bg-destructive/5 py-2.5">
          <AlertDescription className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
              <span className="text-sm text-destructive">{error}</span>
            </div>
            <Button onClick={() => fetchData()} variant="outline" size="sm" className="border-destructive/30 text-destructive hover:bg-destructive/10 bg-transparent h-7 text-xs gap-1 flex-shrink-0">
              <RotateCcw className="h-3 w-3" /> Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
          <Input
            placeholder="Search by name, email, phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="h-8 pl-8 text-xs border-border bg-background"
          />
        </div>
        <Button onClick={handleSearch} variant="outline" size="sm" className="h-8 text-xs border-border bg-transparent text-muted-foreground hover:text-foreground" disabled={isLoading}>
          Search
        </Button>
        {search && (
          <button onClick={() => { setSearch(''); fetchData(0); }} className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md bg-transparent transition-colors">
            Clear
          </button>
        )}
      </div>

      {/* Cards */}
      <div className="relative">
        {isPaging && (
          <div className="absolute inset-0 bg-background/50 z-10 flex items-center justify-center backdrop-blur-[1px] rounded-xl">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 animate-pulse space-y-2">
                <div className="h-3.5 w-48 rounded bg-accent" />
                <div className="h-2.5 w-64 rounded bg-accent" />
              </div>
            ))}
          </div>
        ) : companies.length === 0 ? (
          <div className="rounded-xl border border-border bg-card py-16 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {search ? 'No companies match your search' : 'No companies found'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {companies.map(c => <CompanyCard key={c.id} company={c} />)}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground/60">
            Page {currentPage + 1} of {totalPages} · {totalElements} companies
          </p>
          <div className="flex items-center gap-1">
            <Button onClick={() => handlePageChange(currentPage - 1)} disabled={!hasPrevious || isPaging} variant="outline" size="sm" className="h-7 w-7 p-0 border-border bg-transparent text-muted-foreground hover:text-foreground disabled:opacity-30">
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button onClick={() => handlePageChange(currentPage + 1)} disabled={!hasNext || isPaging} variant="outline" size="sm" className="h-7 w-7 p-0 border-border bg-transparent text-muted-foreground hover:text-foreground disabled:opacity-30">
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
