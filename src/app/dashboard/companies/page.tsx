'use client';

import { useState, useEffect, useCallback } from 'react';
import { companyApi, type Company } from '@/lib/api';
import {
  Building2,
  CheckCircle2,
  Users,
  Search,
  X,
  Mail,
  Phone,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import {
  Card,
  EmptyState,
  ErrorNote,
  Pager,
  Pill,
  SkeletonCard,
  StatTile,
  dateShort,
  num,
  phoneLocal,
  tintFor,
} from '@/components/ui/soa';

const PAGE_SIZE = 20;

const TYPE_TINTS: Record<string, { bg: string; fg: string }> = {
  EVENT_ORGANIZER: { bg: 'var(--tint-olive-bg)', fg: 'var(--tint-olive-fg)' },
  TICKETING_COMPANY: { bg: 'var(--tint-clay-bg)', fg: 'var(--tint-clay-fg)' },
};

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: 9.5,
          letterSpacing: '.06em',
          textTransform: 'uppercase',
          color: 'color-mix(in srgb, var(--color-text) 45%, transparent)',
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 12.5 }}>{value}</div>
    </div>
  );
}

function CompanyCard({ company }: { company: Company }) {
  const [expanded, setExpanded] = useState(false);
  const tint = TYPE_TINTS[company.profileType] ?? {
    bg: 'var(--tint-stone-bg)',
    fg: 'var(--tint-stone-fg)',
  };
  const avatar = tintFor(company.id);

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <div
          className="grid place-items-center flex-none"
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: avatar.bg,
            color: avatar.fg,
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            fontSize: 17,
          }}
        >
          {(company.companyName || '?').charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 16 }}>
              {company.companyName}
            </span>
            <span
              style={{
                fontSize: 10,
                color: 'color-mix(in srgb, var(--color-text) 38%, transparent)',
              }}
            >
              #{company.id}
            </span>
            <Pill bg={tint.bg} fg={tint.fg}>
              {(company.profileType || '—').replace(/_/g, ' ').toLowerCase()}
            </Pill>
            {company.isActive ? (
              <span
                className="inline-flex items-center gap-[5px]"
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  padding: '2px 9px',
                  borderRadius: 999,
                  background: 'var(--tint-olive-bg)',
                  color: 'var(--tint-olive-fg)',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--tint-olive-dot)',
                  }}
                />
                Active
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-[5px]"
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  padding: '2px 9px',
                  borderRadius: 999,
                  background: 'var(--tint-danger-bg)',
                  color: 'var(--tint-danger-fg)',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--tint-danger-strong)',
                  }}
                />
                Inactive
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-x-3.5 gap-y-[3px] mt-1.5">
            <span
              className="inline-flex items-center gap-1.5 min-w-0"
              style={{
                fontSize: 11.5,
                color: 'color-mix(in srgb, var(--color-text) 55%, transparent)',
              }}
            >
              <Mail className="ic w-3 h-3 flex-none" />
              <span className="truncate max-w-[200px]">{company.emailAddress}</span>
            </span>
            <a
              href={`tel:${phoneLocal(company.phoneNumber)}`}
              className="inline-flex items-center gap-1.5"
              style={{
                fontSize: 11.5,
                color: 'color-mix(in srgb, var(--color-text) 55%, transparent)',
              }}
            >
              <Phone className="ic w-3 h-3 flex-none" />
              {phoneLocal(company.phoneNumber)}
            </a>
            {company.currency && (
              <span
                className="inline-flex items-center gap-1.5"
                style={{
                  fontSize: 11.5,
                  color: 'color-mix(in srgb, var(--color-text) 55%, transparent)',
                }}
              >
                {company.currency}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse details' : 'Expand details'}
          className="grid place-items-center flex-none"
          style={{
            width: 32,
            height: 32,
            border: 'none',
            background: 'transparent',
            borderRadius: 9,
            color: 'color-mix(in srgb, var(--color-text) 50%, transparent)',
          }}
        >
          {expanded ? (
            <ChevronUp className="ic w-4 h-4" />
          ) : (
            <ChevronDown className="ic w-4 h-4" />
          )}
        </button>
      </div>

      {expanded && (
        <div
          className="animate-soa-fade-fast"
          style={{
            borderTop: '1px solid var(--color-divider)',
            background: 'var(--color-surface)',
            padding: '13px 16px',
          }}
        >
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}
          >
            <Detail label="Physical address" value={company.physicalAddress || '—'} />
            <Detail label="Postal" value={company.postalAddress || '—'} />
            <Detail label="Currency" value={company.currency || '—'} />
            <Detail label="Joined" value={dateShort(company.createdAt)} />
            <Detail label="Updated" value={dateShort(company.updatedAt)} />
          </div>
          {company.bio && (
            <div className="mt-3">
              <div
                style={{
                  fontSize: 9.5,
                  letterSpacing: '.06em',
                  textTransform: 'uppercase',
                  color: 'color-mix(in srgb, var(--color-text) 45%, transparent)',
                  marginBottom: 3,
                }}
              >
                Bio
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  lineHeight: 1.5,
                  color: 'color-mix(in srgb, var(--color-text) 80%, transparent)',
                }}
              >
                {company.bio}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const activeCount = companies.filter((c) => c.isActive).length;

  return (
    <div className="flex flex-col gap-3.5 animate-soa-fade">
      <div
        className="grid gap-2.5"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}
      >
        <StatTile label="Total" value={num(totalElements)} icon={Building2} />
        <StatTile label="Active (page)" value={num(activeCount)} icon={CheckCircle2} />
        <StatTile
          label="Showing"
          value={num(companies.length)}
          icon={Users}
          bg="var(--tint-clay-bg)"
          fg="var(--tint-clay-strong)"
        />
      </div>

      {error && <ErrorNote message={error} onRetry={() => fetchData(currentPage)} />}

      <div className="relative max-w-[360px]">
        <Search
          className="ic absolute w-4 h-4 pointer-events-none"
          style={{
            left: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'color-mix(in srgb, var(--color-text) 42%, transparent)',
          }}
        />
        <input
          className="soa-input"
          style={{ paddingLeft: 40, background: 'var(--color-neutral-100)' }}
          placeholder="Search by name, email, phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setCurrentPage(0);
              fetchData(0, search || undefined);
            }
          }}
        />
        {search && (
          <button
            onClick={() => {
              setSearch('');
              fetchData(0);
            }}
            aria-label="Clear search"
            className="grid place-items-center"
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 26,
              height: 26,
              border: 'none',
              background: 'transparent',
              borderRadius: 999,
              color: 'color-mix(in srgb, var(--color-text) 50%, transparent)',
            }}
          >
            <X className="ic w-[15px] h-[15px]" />
          </button>
        )}
      </div>

      <div className="relative flex flex-col gap-3.5">
        {isPaging && (
          <div className="absolute inset-0 z-10 grid place-items-center rounded-2xl backdrop-blur-[1px] bg-[color-mix(in_srgb,var(--color-bg)_50%,transparent)]">
            <Loader2 className="ic w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} height={82} />)
        ) : companies.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={search ? 'No companies match your search' : 'No companies found'}
          />
        ) : (
          companies.map((c) => <CompanyCard key={c.id} company={c} />)
        )}
      </div>

      <Pager
        page={currentPage}
        totalPages={totalPages}
        totalElements={totalElements}
        noun="companies"
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        busy={isPaging}
        onPrev={() => fetchData(currentPage - 1, search || undefined, true)}
        onNext={() => fetchData(currentPage + 1, search || undefined, true)}
      />
    </div>
  );
}
