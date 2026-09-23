'use client';

import { useEffect, useState } from 'react';
import { Loader2, Save, UserPlus } from 'lucide-react';
import { companyApi, usersApi, type Company, type CompanyUser } from '@/lib/api';
import { formatKenyanPhone, isValidEmail, normalizeKenyanPhone } from '@/lib/phone';

const ROLES = [
  { value: 'STAFF', label: 'Staff', hint: 'Scans tickets and works events' },
  { value: 'COMPANY_OWNER', label: 'Company owner', hint: 'Full control of the company' },
  { value: 'SUPER_ADMIN', label: 'Super admin', hint: 'Platform-wide access — grant sparingly' },
] as const;

type Role = (typeof ROLES)[number]['value'];

/**
 * Adds a person to a company, or edits one.
 *
 * The console administers every company, so unlike the organiser dashboard —
 * where the company is implicitly the signed-in user's — the company is chosen
 * here, and changing it moves the user. The current roster is shown alongside
 * the picker so it is obvious who is already there.
 */
export function UserFormModal({
  user,
  onClose,
  onSaved,
}: {
  /** Omit to create; pass a user to edit them. */
  user?: CompanyUser;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const editing = Boolean(user);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [companyId, setCompanyId] = useState('');

  const [roster, setRoster] = useState<CompanyUser[] | null>(null);
  const [rosterLoading, setRosterLoading] = useState(false);

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [email, setEmail] = useState(user?.emailAddress ?? '');
  const [phone, setPhone] = useState(user?.mobileNumber ?? '');
  const [idNumber, setIdNumber] = useState(
    user?.idNumber && user.idNumber !== '00000000' ? user.idNumber : ''
  );
  const [role, setRole] = useState<Role>(
    (ROLES.find((r) => r.value === user?.roles)?.value ?? 'STAFF') as Role
  );

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await companyApi.getAll(0, 200);
        if (cancelled) return;
        const list = resp.data?.companies ?? [];
        setCompanies(list);
        if (user) {
          // Editing opens on the user's current company. The roster payload
          // names the company but never carries its id, so match by name.
          const own = list.find((c) => c.companyName === user.companyName);
          if (own) setCompanyId(String(own.id));
        }
      } catch {
        if (!cancelled) setError('Could not load companies');
      } finally {
        if (!cancelled) setCompaniesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Who is already at the selected company.
  useEffect(() => {
    if (!companyId) {
      setRoster(null);
      return;
    }
    let cancelled = false;
    setRosterLoading(true);
    (async () => {
      try {
        const resp = await usersApi.listByCompany(Number(companyId));
        if (!cancelled) setRoster(resp.users ?? []);
      } catch {
        if (!cancelled) setRoster(null);
      } finally {
        if (!cancelled) setRosterLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const submit = async () => {
    if (!companyId) return setError('Select a company');
    if (fullName.trim().length < 2) return setError("Enter the user's full name");
    if (!isValidEmail(email)) return setError('Enter a valid email address');
    if (!normalizeKenyanPhone(phone))
      return setError('Enter a valid Kenyan phone number, e.g. 0715066651');

    setBusy(true);
    setError('');
    try {
      const company = companies.find((c) => String(c.id) === companyId);
      const companyName = company?.companyName ?? 'the company';
      const roleLabel = ROLES.find((r) => r.value === role)?.label ?? role;

      if (editing && user) {
        const movedFrom = user.companyName !== companyName ? user.companyName : null;
        const resp = await usersApi.update({
          userId: user.id,
          fullName: fullName.trim(),
          emailAddress: email,
          mobileNumber: phone,
          idNumber: idNumber.trim() || undefined,
          roles: role,
          companyId: Number(companyId),
        });
        if (resp.status === false) throw new Error(resp.message || 'Failed to update the user');
        onSaved(
          movedFrom
            ? `${fullName.trim()} moved from ${movedFrom} to ${companyName} as ${roleLabel}.`
            : `${fullName.trim()} updated as ${roleLabel}.`
        );
        onClose();
        return;
      }

      const resp = await usersApi.create({
        fullName: fullName.trim(),
        emailAddress: email,
        mobileNumber: phone,
        idNumber: idNumber.trim() || undefined,
        companyId: Number(companyId),
        roles: role,
      });
      if (resp.status === false) throw new Error(resp.message || 'Failed to create the user');
      onSaved(
        `${fullName.trim()} added to ${companyName} as ${roleLabel}. ` +
          'They sign in with a one-time code sent to their email.'
      );
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : editing
            ? 'Failed to update the user'
            : 'Failed to create the user'
      );
    } finally {
      setBusy(false);
    }
  };

  const company = companies.find((c) => String(c.id) === companyId);
  const rosterLine = rosterLoading
    ? 'Checking who is already there…'
    : roster === null
      ? 'Existing users unavailable'
      : roster.length === 0
        ? 'No users yet — this will be the first.'
        : `${roster.length} already there: ${roster
            .slice(0, 3)
            .map((u) => u.fullName)
            .join(', ')}${roster.length > 3 ? `, +${roster.length - 3} more` : ''}`;

  const hintStyle: React.CSSProperties = {
    fontSize: 11.5,
    marginTop: 5,
    color: 'color-mix(in srgb, var(--color-text) 52%, transparent)',
  };

  return (
    <div
      onClick={() => !busy && onClose()}
      className="fixed inset-0 grid place-items-center p-4 animate-soa-fade"
      style={{
        zIndex: 70,
        background: 'color-mix(in srgb, var(--color-neutral-900) 50%, transparent)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={editing ? 'Edit user' : 'Add user to a company'}
        className="flex flex-col gap-3.5 animate-soa-pop overflow-y-auto"
        style={{
          width: 'min(480px, 100%)',
          maxHeight: 'calc(100dvh - 48px)',
          background: 'var(--color-neutral-100)',
          borderRadius: 'var(--radius-dialog)',
          boxShadow: 'var(--shadow-lg)',
          padding: 18,
        }}
      >
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 20 }}>
          {editing ? 'Edit user' : 'Add user to a company'}
        </div>

        <div className="field">
          <label htmlFor="user-company">Company</label>
          <select
            id="user-company"
            className="soa-input"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            disabled={companiesLoading}
          >
            <option value="">{companiesLoading ? 'Loading companies…' : 'Select a company'}</option>
            {companies.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.companyName}
              </option>
            ))}
          </select>
          {companyId && <div style={hintStyle}>{rosterLine}</div>}
          {editing && user && company?.companyName && company.companyName !== user.companyName && (
            <div style={{ ...hintStyle, color: 'var(--color-accent-700)', fontWeight: 600 }}>
              Saving will move {user.fullName} out of {user.companyName}.
            </div>
          )}
        </div>

        <div className="field">
          <label htmlFor="user-name">Full name</label>
          <input
            id="user-name"
            className="soa-input"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Mwangi"
            autoFocus
          />
        </div>

        <div className="field">
          <label htmlFor="user-email">Email address</label>
          <input
            id="user-email"
            className="soa-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@example.com"
          />
        </div>

        <div className="field">
          <label htmlFor="user-phone">Phone number</label>
          <input
            id="user-phone"
            className="soa-input"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0715066651"
          />
          {phone && normalizeKenyanPhone(phone) && (
            <div style={hintStyle}>Saved as {formatKenyanPhone(phone)}</div>
          )}
        </div>

        <div className="field">
          <label htmlFor="user-id">
            ID number <span style={{ opacity: 0.6 }}>(optional)</span>
          </label>
          <input
            id="user-id"
            className="soa-input"
            inputMode="numeric"
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="Leave blank if unknown"
          />
        </div>

        <div className="field">
          <label htmlFor="user-role">Role</label>
          <select
            id="user-role"
            className="soa-input"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <div style={hintStyle}>{ROLES.find((r) => r.value === role)?.hint}</div>
        </div>

        {error && <div style={{ fontSize: 12.5, color: 'var(--tint-danger-strong)' }}>{error}</div>}

        <div className="flex gap-2.5 justify-end mt-1">
          <button
            onClick={onClose}
            disabled={busy}
            style={{
              padding: '9px 16px',
              borderRadius: 'var(--radius-control)',
              border: '1px solid var(--color-divider)',
              background: 'transparent',
              color: 'var(--color-text)',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'var(--font-body)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="flex items-center gap-1.5 disabled:opacity-50"
            style={{
              padding: '9px 16px',
              borderRadius: 'var(--radius-control)',
              border: 'none',
              background: 'var(--color-accent)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              fontFamily: 'var(--font-body)',
            }}
          >
            {busy ? (
              <>
                <Loader2 className="ic w-3.5 h-3.5 animate-spin" />
                {editing ? 'Saving…' : 'Adding…'}
              </>
            ) : editing ? (
              <>
                <Save className="ic w-3.5 h-3.5" />
                Save changes
              </>
            ) : (
              <>
                <UserPlus className="ic w-3.5 h-3.5" />
                Add user
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
