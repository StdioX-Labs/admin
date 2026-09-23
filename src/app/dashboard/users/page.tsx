'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users as UsersIcon,
  Activity,
  BadgeCheck,
  Building2,
  RotateCcw,
  Search,
  ShieldCheck,
  UserPlus,
  Pencil,
  Ban,
  RotateCw,
  XCircle,
} from 'lucide-react';
import {
  Card,
  EmptyState,
  ErrorNote,
  Pill,
  SkeletonCard,
  StatTile,
  SuccessNote,
  num,
  tintFor,
} from '@/components/ui/soa';
import { companyApi, usersApi, type Company, type CompanyUser } from '@/lib/api';
import { formatKenyanPhone } from '@/lib/phone';
import { UserFormModal } from '@/components/users/user-form-modal';
import { useFlashMessage } from '@/components/events/event-actions';

/**
 * Users, per company.
 *
 * The platform exposes users through /company/users?companyId=, with no
 * endpoint that lists everyone at once — so a company is chosen first and the
 * roster is that company's. Only what the endpoint actually returns is shown:
 * there is no join date, last-seen, spend or event count in the payload, and
 * inventing columns for them would misrepresent the data.
 */

const ROLES = ['SUPER_ADMIN', 'COMPANY_OWNER', 'STAFF'] as const;
type Role = (typeof ROLES)[number];

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super admin',
  COMPANY_OWNER: 'Company owner',
  STAFF: 'Staff',
};

const ROLE_TINT: Record<string, { bg: string; fg: string }> = {
  SUPER_ADMIN: { bg: '#f6dfce', fg: '#8c491a' },
  COMPANY_OWNER: { bg: 'var(--tint-olive-bg)', fg: 'var(--tint-olive-fg)' },
  STAFF: { bg: 'var(--tint-stone-bg)', fg: 'var(--tint-stone-fg)' },
};

const roleLabel = (r: string) => ROLE_LABEL[r] ?? r;
const roleTint = (r: string) => ROLE_TINT[r] ?? ROLE_TINT.STAFF;

/** The platform spells KYC a few ways; treat anything affirmative as cleared. */
const isKycVerified = (status: string) => /verified|approved|complete|success/i.test(status || '');

function StatusChip({ active }: { active: boolean }) {
  const t = active
    ? { bg: 'var(--tint-olive-bg)', fg: 'var(--tint-olive-fg)', dot: 'var(--tint-olive-dot)' }
    : { bg: 'var(--tint-danger-bg)', fg: 'var(--tint-danger-fg)', dot: 'var(--tint-danger-strong)' };
  return (
    <span
      className="inline-flex items-center gap-[5px]"
      style={{
        fontSize: 10.5,
        fontWeight: 600,
        padding: '2px 9px',
        borderRadius: 999,
        background: t.bg,
        color: t.fg,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', flex: 'none', background: t.dot }} />
      {active ? 'Active' : 'Suspended'}
    </span>
  );
}

function Avatar({ name, seed }: { name: string; seed: number }) {
  const t = tintFor(seed);
  return (
    <div
      className="grid place-items-center flex-none"
      style={{
        width: 38,
        height: 38,
        borderRadius: '50%',
        background: t.bg,
        color: t.fg,
        fontFamily: 'var(--font-body)',
        fontWeight: 700,
        fontSize: 15,
      }}
    >
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
}

const selectStyle = { width: 'auto', minWidth: 140, flex: 'none' } as const;

export default function UsersPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [companyId, setCompanyId] = useState('');

  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [role, setRole] = useState<'all' | Role>('all');
  const [status, setStatus] = useState<'all' | 'active' | 'suspended'>('all');
  const [kyc, setKyc] = useState<'all' | 'verified' | 'unverified'>('all');

  const [addingUser, setAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<CompanyUser | null>(null);
  const [statusBusyId, setStatusBusyId] = useState<number | null>(null);
  const { message: success, show: showSuccess } = useFlashMessage(9000);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await companyApi.getAll(0, 200);
        if (cancelled) return;
        const list = resp.data?.companies ?? [];
        setCompanies(list);
        // Land on a roster rather than an empty screen.
        if (list.length) setCompanyId(String(list[0].id));
      } catch {
        if (!cancelled) setError('Could not load companies');
      } finally {
        if (!cancelled) setCompaniesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchUsers = useCallback(
    async (id: string, { silent = false } = {}) => {
      if (!id) return;
      // A refresh keeps the roster on screen behind an overlay; only the first
      // read of a company swaps in skeletons.
      if (silent) setIsRefreshing(true);
      else setIsLoading(true);
      setError('');
      try {
        const resp = await usersApi.listByCompany(Number(id));
        if (resp.status === false) throw new Error(resp.message || 'Failed to load users');
        setUsers(resp.users ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load users');
        setUsers([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchUsers(companyId);
  }, [companyId, fetchUsers]);

  const toggleActive = async (u: CompanyUser) => {
    setStatusBusyId(u.id);
    setError('');
    try {
      const resp = await usersApi.setActive(u.id, !u.active);
      if (resp.status === false) throw new Error(resp.message || 'Failed to update the user');
      showSuccess(`${u.fullName} ${u.active ? 'suspended' : 'reactivated'}.`);
      await fetchUsers(companyId, { silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update the user');
    } finally {
      setStatusBusyId(null);
    }
  };

  const rowActions = (u: CompanyUser) => (
    <div className="flex items-center gap-1 justify-end">
      <button
        onClick={() => setEditingUser(u)}
        title="Edit user"
        className="grid place-items-center"
        style={{
          width: 30,
          height: 30,
          border: 'none',
          background: 'transparent',
          borderRadius: 9,
          color: 'color-mix(in srgb, var(--color-text) 45%, transparent)',
        }}
      >
        <Pencil className="ic w-[15px] h-[15px]" />
      </button>
      <button
        onClick={() => toggleActive(u)}
        disabled={statusBusyId === u.id}
        title={u.active ? 'Suspend user' : 'Reactivate user'}
        className="grid place-items-center disabled:opacity-50"
        style={{
          width: 30,
          height: 30,
          border: 'none',
          background: 'transparent',
          borderRadius: 9,
          color: u.active
            ? 'var(--tint-danger-strong)'
            : 'var(--tint-olive-strong)',
        }}
      >
        {u.active ? (
          <Ban className="ic w-[15px] h-[15px]" />
        ) : (
          <RotateCw className="ic w-[15px] h-[15px]" />
        )}
      </button>
    </div>
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return users.filter((u) => {
      const matchesSearch =
        !q ||
        `${u.fullName} ${u.emailAddress} ${u.mobileNumber} ${u.idNumber} ${u.role ?? ''}`
          .toLowerCase()
          .includes(q);
      const matchesRole = role === 'all' || u.roles === role;
      const matchesStatus =
        status === 'all' || (status === 'active' ? u.active : !u.active);
      const matchesKyc =
        kyc === 'all' ||
        (kyc === 'verified' ? isKycVerified(u.kycStatus) : !isKycVerified(u.kycStatus));
      return matchesSearch && matchesRole && matchesStatus && matchesKyc;
    });
  }, [users, search, role, status, kyc]);

  const stats = useMemo(
    () => ({
      total: users.length,
      active: users.filter((u) => u.active).length,
      suspended: users.filter((u) => !u.active).length,
      owners: users.filter((u) => u.roles === 'COMPANY_OWNER').length,
      staff: users.filter((u) => u.roles === 'STAFF').length,
      verified: users.filter((u) => isKycVerified(u.kycStatus)).length,
    }),
    [users]
  );

  const company = companies.find((c) => String(c.id) === companyId);

  return (
    <div className="flex flex-col gap-3.5 animate-soa-fade">
      {/* Company + actions */}
      <Card
        padded={false}
        className="flex-row flex-wrap items-center gap-2.5"
        style={{ padding: '13px 15px' }}
      >
        <Building2
          className="ic w-4 h-4 flex-none"
          style={{ color: 'color-mix(in srgb, var(--color-text) 45%, transparent)' }}
        />
        <select
          className="soa-input"
          style={{ width: 'auto', minWidth: 220, flex: 'none' }}
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          disabled={companiesLoading}
          aria-label="Company"
        >
          <option value="">
            {companiesLoading ? 'Loading companies…' : 'Select a company'}
          </option>
          {companies.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.companyName}
            </option>
          ))}
        </select>

        <div className="flex-1" />

        <button
          onClick={() => fetchUsers(companyId, { silent: true })}
          disabled={!companyId || isRefreshing}
          className="flex items-center gap-1.5 flex-none disabled:opacity-50"
          style={{
            height: 34,
            padding: '0 14px',
            borderRadius: 'var(--radius-control)',
            border: '1px solid var(--color-divider)',
            background: 'transparent',
            fontSize: 12.5,
            fontWeight: 600,
            fontFamily: 'var(--font-body)',
            color: 'var(--color-text)',
          }}
        >
          <RotateCcw className="ic w-3.5 h-3.5" />
          Refresh
        </button>
        <button
          onClick={() => setAddingUser(true)}
          className="flex items-center gap-1.5 flex-none"
          style={{
            height: 34,
            padding: '0 16px',
            borderRadius: 'var(--radius-control)',
            border: 'none',
            background: 'var(--color-accent)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 700,
            fontFamily: 'var(--font-body)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <UserPlus className="ic w-4 h-4" />
          Add user
        </button>
      </Card>

      {success && <SuccessNote message={success} />}
      {error && <ErrorNote message={error} onRetry={() => fetchUsers(companyId)} />}

      {!companyId ? (
        <EmptyState
          icon={Building2}
          title="Choose a company"
          hint="Users are listed per company — pick one above to see its people."
        />
      ) : (
        <>
          <div
            className="grid gap-2.5"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))' }}
          >
            <StatTile
              label="Total users"
              value={num(stats.total)}
              icon={UsersIcon}
              bg="var(--tint-stone-bg)"
              fg="var(--tint-stone-fg)"
            />
            <StatTile label="Active" value={num(stats.active)} icon={Activity} />
            <StatTile
              label="Suspended"
              value={num(stats.suspended)}
              icon={XCircle}
              bg="var(--tint-danger-bg)"
              fg="var(--tint-danger-fg)"
            />
            <StatTile
              label="Owners"
              value={num(stats.owners)}
              icon={ShieldCheck}
              bg="var(--tint-clay-bg)"
              fg="var(--tint-clay-strong)"
            />
            <StatTile label="Staff" value={num(stats.staff)} icon={UsersIcon} />
            <StatTile
              label="KYC verified"
              value={num(stats.verified)}
              icon={BadgeCheck}
              bg="var(--tint-sand-bg)"
              fg="var(--tint-sand-fg)"
            />
          </div>

          {/* Filter bar */}
          <Card
            padded={false}
            className="flex-row flex-wrap items-center gap-2.5"
            style={{ padding: '13px 15px' }}
          >
            <div className="relative flex-1 min-w-[200px]">
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
                style={{ paddingLeft: 40 }}
                placeholder="Search name, email, phone or ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="soa-input"
              style={selectStyle}
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
              aria-label="Filter by role"
            >
              <option value="all">All roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
            <select
              className="soa-input"
              style={selectStyle}
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
            <select
              className="soa-input"
              style={selectStyle}
              value={kyc}
              onChange={(e) => setKyc(e.target.value as typeof kyc)}
              aria-label="Filter by KYC"
            >
              <option value="all">Any KYC</option>
              <option value="verified">KYC verified</option>
              <option value="unverified">KYC pending</option>
            </select>
          </Card>

          <div className="relative flex flex-col gap-2.5">
            {isRefreshing && (
              <div className="absolute inset-0 z-10 grid place-items-center rounded-2xl backdrop-blur-[1px] bg-[color-mix(in_srgb,var(--color-bg)_50%,transparent)]">
                <RotateCcw className="ic w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} height={120} />)
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={UsersIcon}
                title={users.length === 0 ? 'No users yet' : 'No users match'}
                hint={
                  users.length === 0
                    ? `${company?.companyName ?? 'This company'} has nobody on it yet.`
                    : 'Adjust your search or filters'
                }
              />
            ) : (
              <>
                {/* Desktop table */}
                <Card padded={false} className="overflow-hidden hidden md:flex">
                  <div className="overflow-x-auto">
                    <table className="soa-table" style={{ minWidth: 720 }}>
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Contact</th>
                          <th>Role</th>
                          <th>KYC</th>
                          <th>Status</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((u, i) => (
                          <tr key={u.id}>
                            <td>
                              <div className="flex items-center gap-2.5">
                                <Avatar name={u.fullName} seed={i} />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span style={{ fontWeight: 600, fontSize: 13 }}>
                                      {u.fullName}
                                    </span>
                                    {isKycVerified(u.kycStatus) && (
                                      <BadgeCheck
                                        className="ic w-[13px] h-[13px]"
                                        style={{ color: 'var(--color-accent-2)' }}
                                      />
                                    )}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 11,
                                      color: 'color-mix(in srgb, var(--color-text) 52%, transparent)',
                                    }}
                                  >
                                    {u.emailAddress}
                                  </div>
                                  {u.role && (
                                    <div style={{ fontSize: 11, color: 'var(--color-accent-700)' }}>
                                      {u.role}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="tnum" style={{ fontSize: 12.5 }}>
                                {formatKenyanPhone(u.mobileNumber)}
                              </div>
                              {u.idNumber && u.idNumber !== '00000000' && (
                                <div
                                  className="tnum"
                                  style={{
                                    fontSize: 11,
                                    color: 'color-mix(in srgb, var(--color-text) 48%, transparent)',
                                  }}
                                >
                                  ID {u.idNumber}
                                </div>
                              )}
                            </td>
                            <td>
                              <Pill bg={roleTint(u.roles).bg} fg={roleTint(u.roles).fg}>
                                {roleLabel(u.roles)}
                              </Pill>
                            </td>
                            <td>
                              <span
                                style={{
                                  fontSize: 11.5,
                                  color: isKycVerified(u.kycStatus)
                                    ? 'var(--tint-olive-strong)'
                                    : 'color-mix(in srgb, var(--color-text) 50%, transparent)',
                                }}
                              >
                                {u.kycStatus || '—'}
                              </span>
                            </td>
                            <td>
                              <StatusChip active={u.active} />
                            </td>
                            <td>{rowActions(u)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* Mobile cards */}
                <div className="flex flex-col gap-2.5 md:hidden">
                  {filtered.map((u, i) => (
                    <Card key={u.id} padded={false} style={{ padding: '13px 15px', gap: 10 }}>
                      <div className="flex items-center gap-3">
                        <Avatar name={u.fullName} seed={i} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span style={{ fontWeight: 600, fontSize: 14 }}>{u.fullName}</span>
                            {isKycVerified(u.kycStatus) && (
                              <BadgeCheck
                                className="ic w-[13px] h-[13px]"
                                style={{ color: 'var(--color-accent-2)' }}
                              />
                            )}
                          </div>
                          <div
                            className="truncate"
                            style={{
                              fontSize: 11.5,
                              color: 'color-mix(in srgb, var(--color-text) 52%, transparent)',
                            }}
                          >
                            {u.emailAddress}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Pill bg={roleTint(u.roles).bg} fg={roleTint(u.roles).fg}>
                          {roleLabel(u.roles)}
                        </Pill>
                        <StatusChip active={u.active} />
                        <div className="ml-auto">{rowActions(u)}</div>
                      </div>
                      <div
                        className="flex justify-between pt-2.5"
                        style={{ fontSize: 12, borderTop: '1px solid var(--color-divider)' }}
                      >
                        <span className="tnum">{formatKenyanPhone(u.mobileNumber)}</span>
                        <span
                          style={{
                            color: 'color-mix(in srgb, var(--color-text) 55%, transparent)',
                          }}
                        >
                          {u.kycStatus || '—'}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>

          {!isLoading && users.length > 0 && (
            <p
              className="m-0"
              style={{
                fontSize: 11.5,
                color: 'color-mix(in srgb, var(--color-text) 45%, transparent)',
              }}
            >
              Showing {filtered.length} of {users.length} at {company?.companyName ?? 'this company'}
            </p>
          )}
        </>
      )}

      {addingUser && (
        <UserFormModal
          onClose={() => setAddingUser(false)}
          onSaved={(m) => {
            showSuccess(m);
            fetchUsers(companyId, { silent: true });
          }}
        />
      )}

      {editingUser && (
        <UserFormModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={(m) => {
            showSuccess(m);
            fetchUsers(companyId, { silent: true });
          }}
        />
      )}
    </div>
  );
}
