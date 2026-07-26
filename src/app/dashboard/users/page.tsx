'use client';

import { useState, useMemo } from 'react';
import {
  Users as UsersIcon,
  Activity,
  TrendingUp,
  XCircle,
  BadgeCheck,
  DollarSign,
  Search,
} from 'lucide-react';
import {
  Card,
  EmptyState,
  Pill,
  StatTile,
  ago,
  compactMoney,
  dateShort,
  money,
  num,
  tintFor,
} from '@/components/ui/soa';

/**
 * ⚠️ Placeholder dataset.
 *
 * There is no users endpoint on the admin API yet, so this screen renders a
 * fixed sample so the layout, filters and states can be reviewed. Swap
 * `SAMPLE_USERS` / `SAMPLE_STATS` for a real fetch once the endpoint lands —
 * nothing below depends on the data being static.
 */

type Role = 'admin' | 'organizer' | 'moderator' | 'user';
type Status = 'active' | 'inactive' | 'suspended' | 'pending';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  status: Status;
  join: string;
  last: string;
  events: number;
  spent: number;
  tickets: number;
  loc: string;
  verified: boolean;
  company: string;
}

const SAMPLE_USERS: User[] = [
  { id: '1', name: 'John Kamau', email: 'john.kamau@email.com', phone: '+254712345678', role: 'user', status: 'active', join: '2024-01-15', last: '2026-04-20', events: 12, spent: 45000, tickets: 18, loc: 'Nairobi, Kenya', verified: true, company: 'TechCorp Solutions' },
  { id: '2', name: 'Mary Wanjiku', email: 'mary.wanjiku@gmail.com', phone: '+254723456789', role: 'organizer', status: 'active', join: '2023-11-20', last: '2026-04-22', events: 5, spent: 125000, tickets: 8, loc: 'Mombasa, Kenya', verified: true, company: 'Blankets Events' },
  { id: '3', name: 'David Mwangi', email: 'david.mwangi@yahoo.com', phone: '+254734567890', role: 'admin', status: 'active', join: '2023-08-10', last: '2026-04-23', events: 0, spent: 0, tickets: 0, loc: 'Kisumu, Kenya', verified: true, company: '' },
  { id: '4', name: "Grace Nyong'o", email: 'grace.nyongo@outlook.com', phone: '+254745678901', role: 'user', status: 'suspended', join: '2024-03-05', last: '2026-03-28', events: 3, spent: 15000, tickets: 5, loc: 'Nakuru, Kenya', verified: false, company: '' },
  { id: '5', name: 'Peter Ochieng', email: 'peter.ochieng@gmail.com', phone: '+254756789012', role: 'moderator', status: 'active', join: '2024-06-12', last: '2026-04-21', events: 2, spent: 8000, tickets: 3, loc: 'Eldoret, Kenya', verified: true, company: '' },
  { id: '6', name: 'Sarah Mutua', email: 'sarah.mutua@email.com', phone: '+254767890123', role: 'user', status: 'pending', join: '2026-04-08', last: '2026-04-08', events: 0, spent: 0, tickets: 0, loc: 'Thika, Kenya', verified: false, company: '' },
  { id: '7', name: 'James Kipchoge', email: 'james.kipchoge@gmail.com', phone: '+254778901234', role: 'organizer', status: 'inactive', join: '2023-12-15', last: '2025-10-22', events: 15, spent: 180000, tickets: 25, loc: 'Meru, Kenya', verified: true, company: 'Safari Rally Org' },
  { id: '8', name: 'Catherine Wawira', email: 'catherine.wawira@yahoo.com', phone: '+254789012345', role: 'user', status: 'active', join: '2024-09-03', last: '2026-04-19', events: 7, spent: 32000, tickets: 11, loc: 'Machakos, Kenya', verified: true, company: '' },
];

const SAMPLE_STATS = {
  totalUsers: 1247,
  activeUsers: 892,
  newThisMonth: 156,
  suspended: 23,
  verified: 1089,
  revenue: 4750000,
};

const ROLE_TINT: Record<Role, { bg: string; fg: string }> = {
  admin: { bg: '#f6dfce', fg: '#8c491a' },
  organizer: { bg: 'var(--tint-olive-bg)', fg: 'var(--tint-olive-fg)' },
  moderator: { bg: 'var(--tint-sand-bg)', fg: 'var(--tint-sand-fg)' },
  user: { bg: 'var(--tint-stone-bg)', fg: 'var(--tint-stone-fg)' },
};

const STATUS_TINT: Record<Status, { bg: string; fg: string; dot: string }> = {
  active: { bg: 'var(--tint-olive-bg)', fg: 'var(--tint-olive-fg)', dot: 'var(--tint-olive-dot)' },
  inactive: { bg: 'var(--tint-stone-bg)', fg: 'var(--tint-stone-fg)', dot: 'var(--tint-stone-dot)' },
  suspended: { bg: 'var(--tint-danger-bg)', fg: 'var(--tint-danger-fg)', dot: 'var(--tint-danger-strong)' },
  pending: { bg: 'var(--tint-sand-bg)', fg: 'var(--tint-sand-fg)', dot: 'var(--tint-amber-dot)' },
};

function StatusChip({ status }: { status: Status }) {
  const t = STATUS_TINT[status];
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
        textTransform: 'capitalize',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', flex: 'none', background: t.dot }} />
      {status}
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

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<'all' | Role>('all');
  const [status, setStatus] = useState<'all' | Status>('all');
  const [verified, setVerified] = useState<'all' | 'verified' | 'unverified'>('all');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return SAMPLE_USERS.filter((u) => {
      const matchesSearch =
        !q || `${u.name} ${u.email} ${u.phone} ${u.loc} ${u.company}`.toLowerCase().includes(q);
      const matchesRole = role === 'all' || u.role === role;
      const matchesStatus = status === 'all' || u.status === status;
      const matchesVerified =
        verified === 'all' ||
        (verified === 'verified' && u.verified) ||
        (verified === 'unverified' && !u.verified);
      return matchesSearch && matchesRole && matchesStatus && matchesVerified;
    });
  }, [search, role, status, verified]);

  const selectStyle = {
    width: 'auto',
    minWidth: 130,
    background: 'var(--color-surface)',
  } as const;

  return (
    <div className="flex flex-col gap-3.5 animate-soa-fade">
      <div
        className="grid gap-2.5"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))' }}
      >
        <StatTile
          label="Total users"
          value={num(SAMPLE_STATS.totalUsers)}
          icon={UsersIcon}
          bg="var(--tint-stone-bg)"
          fg="var(--tint-stone-fg)"
        />
        <StatTile label="Active" value={num(SAMPLE_STATS.activeUsers)} icon={Activity} />
        <StatTile
          label="New this month"
          value={num(SAMPLE_STATS.newThisMonth)}
          icon={TrendingUp}
          bg="var(--tint-clay-bg)"
          fg="var(--tint-clay-strong)"
        />
        <StatTile
          label="Suspended"
          value={num(SAMPLE_STATS.suspended)}
          icon={XCircle}
          bg="var(--tint-danger-bg)"
          fg="var(--tint-danger-fg)"
        />
        <StatTile
          label="Verified"
          value={num(SAMPLE_STATS.verified)}
          icon={BadgeCheck}
          bg="var(--tint-sand-bg)"
          fg="var(--tint-sand-fg)"
        />
        <StatTile label="User revenue" value={compactMoney(SAMPLE_STATS.revenue)} icon={DollarSign} />
      </div>

      {/* Filter bar */}
      <Card padded={false} className="flex-row flex-wrap items-center gap-2.5" style={{ padding: '13px 15px' }}>
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
            placeholder="Search users, emails, companies…"
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
          <option value="admin">Admin</option>
          <option value="organizer">Organizer</option>
          <option value="moderator">Moderator</option>
          <option value="user">User</option>
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
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
          <option value="pending">Pending</option>
        </select>
        <select
          className="soa-input"
          style={selectStyle}
          value={verified}
          onChange={(e) => setVerified(e.target.value as typeof verified)}
          aria-label="Filter by verification"
        >
          <option value="all">All users</option>
          <option value="verified">Verified</option>
          <option value="unverified">Unverified</option>
        </select>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState icon={UsersIcon} title="No users found" hint="Adjust your search or filters" />
      ) : (
        <>
          {/* Desktop table */}
          <Card padded={false} className="overflow-hidden hidden md:flex">
            <div className="overflow-x-auto">
              <table className="soa-table" style={{ minWidth: 760 }}>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Activity</th>
                    <th className="num">Events</th>
                    <th className="num">Spent</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u, i) => (
                    <tr key={u.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={u.name} seed={i} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</span>
                              {u.verified && (
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
                              {u.email}
                            </div>
                            {u.company && (
                              <div style={{ fontSize: 11, color: 'var(--color-accent-700)' }}>
                                {u.company}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <Pill bg={ROLE_TINT[u.role].bg} fg={ROLE_TINT[u.role].fg}>
                          {u.role}
                        </Pill>
                      </td>
                      <td>
                        <StatusChip status={u.status} />
                      </td>
                      <td>
                        <div style={{ fontSize: 12.5, fontWeight: 600 }}>{ago(u.last)}</div>
                        <div
                          style={{
                            fontSize: 11,
                            color: 'color-mix(in srgb, var(--color-text) 48%, transparent)',
                          }}
                        >
                          Joined {dateShort(u.join)}
                        </div>
                      </td>
                      <td className="num">
                        <div className="tnum" style={{ fontWeight: 600 }}>
                          {num(u.events)}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: 'color-mix(in srgb, var(--color-text) 48%, transparent)',
                          }}
                        >
                          {num(u.tickets)} tickets
                        </div>
                      </td>
                      <td className="num" style={{ fontWeight: 600 }}>
                        {money(u.spent)}
                      </td>
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
                  <Avatar name={u.name} seed={i} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{u.name}</span>
                      {u.verified && (
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
                      {u.email}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Pill bg={ROLE_TINT[u.role].bg} fg={ROLE_TINT[u.role].fg}>
                    {u.role}
                  </Pill>
                  <StatusChip status={u.status} />
                </div>
                <div
                  className="flex justify-between pt-2.5"
                  style={{ fontSize: 12, borderTop: '1px solid var(--color-divider)' }}
                >
                  <span style={{ color: 'color-mix(in srgb, var(--color-text) 55%, transparent)' }}>
                    {ago(u.last)} · {num(u.events)} events
                  </span>
                  <span className="tnum" style={{ fontWeight: 600 }}>
                    {money(u.spent)}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <p
        className="m-0"
        style={{
          fontSize: 11.5,
          color: 'color-mix(in srgb, var(--color-text) 45%, transparent)',
        }}
      >
        Showing {filtered.length} of {SAMPLE_USERS.length} sample records — this screen is not yet
        wired to a live users endpoint.
      </p>
    </div>
  );
}
