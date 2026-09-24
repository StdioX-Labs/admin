import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_MAX_AGE_MS, upstreamStatus } from '@/lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const API_USERNAME = process.env.NEXT_PUBLIC_API_USERNAME;
const API_PASSWORD = process.env.NEXT_PUBLIC_API_PASSWORD;

interface PlatformUser {
  id: number;
  fullName: string;
  idNumber: string;
  mobileNumber: string;
  emailAddress: string;
  roles: string;
  companyId?: number | null;
  companyName?: string | null;
  kycStatus: string;
  currency?: string | null;
  active: boolean;
}

const authHeader = () =>
  `Basic ${Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64')}`;

const headers = () => ({
  Authorization: authHeader(),
  'Content-Type': 'application/json',
  Accept: 'application/json',
});

/**
 * Everyone on the platform, assembled one company at a time.
 *
 * Used only until /admin/users is deployed. company/fetch/users is the sole
 * listing the platform had, and it answers for a single company, so the whole
 * roster means one request per company. That is why the endpoint exists — this
 * is the stopgap, not the design.
 *
 * Requests run in bounded batches rather than all at once: a few dozen
 * companies would otherwise open a few dozen simultaneous connections to the
 * platform every time somebody opened the page.
 */
async function collectByCompany(): Promise<PlatformUser[] | null> {
  const companiesResp = await fetch(`${API_BASE_URL}/admin/companies?page=0&size=500`, {
    headers: headers(),
  });
  if (!companiesResp.ok) return null;
  const companiesData = await companiesResp.json();
  const companies: Array<{ id: number; companyName: string; currency?: string }> =
    companiesData?.data?.companies ?? [];
  if (!companies.length) return [];

  const collected: PlatformUser[] = [];
  const BATCH = 6;
  for (let i = 0; i < companies.length; i += BATCH) {
    const batch = companies.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(async (company) => {
        try {
          const r = await fetch(
            `${API_BASE_URL}/company/fetch/users?companyId=${company.id}`,
            { headers: headers() }
          );
          if (!r.ok) return [];
          const d = await r.json();
          const users: PlatformUser[] = d?.users ?? [];
          // company/fetch/users names the company but never its id, and a
          // combined list needs the id to filter or route by it.
          return users.map((u) => ({
            ...u,
            companyId: company.id,
            companyName: u.companyName ?? company.companyName,
            currency: u.currency ?? company.currency ?? null,
          }));
        } catch {
          return [];
        }
      })
    );
    for (const list of results) collected.push(...list);
  }

  // The same person can be returned by more than one company; keep one row.
  const byId = new Map<number, PlatformUser>();
  for (const u of collected) if (!byId.has(u.id)) byId.set(u.id, u);
  return [...byId.values()];
}

/**
 * Lists platform users.
 *
 * Prefers /admin/users. Falls back to walking the companies when that returns
 * 404, so the page works on a deployment where the endpoint has not shipped
 * yet rather than showing nothing.
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authTokenCookie = cookieStore.get('auth_token');
    if (!authTokenCookie?.value) {
      return NextResponse.json({ status: false, message: 'Please log in to continue' }, { status: 401 });
    }
    try {
      const authData = JSON.parse(authTokenCookie.value);
      if (Date.now() - (authData.issuedAt || 0) > SESSION_MAX_AGE_MS) {
        cookieStore.delete('auth_token');
        return NextResponse.json(
          { status: false, message: 'Your session has expired. Please log in again.' },
          { status: 401 }
        );
      }
    } catch {
      return NextResponse.json(
        { status: false, message: 'Invalid session. Please log in again.' },
        { status: 401 }
      );
    }

    const sp = request.nextUrl.searchParams;
    const page = Number(sp.get('page') ?? 0) || 0;
    const size = Number(sp.get('size') ?? 200) || 200;
    const search = sp.get('search') ?? '';

    let url = `${API_BASE_URL}/admin/users?page=${page}&size=${size}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    const resp = await fetch(url, { headers: headers() });

    if (resp.ok && resp.headers.get('content-type')?.includes('application/json')) {
      const data = await resp.json();
      if (data?.status && data?.data) {
        return NextResponse.json({
          status: true,
          users: data.data.users ?? [],
          totalElements: data.data.totalElements ?? 0,
          source: 'platform',
        });
      }
    }

    if (resp.status !== 404) {
      const body = await resp.text();
      console.error('[Users API] Upstream refused:', resp.status, body.slice(0, 200));
      return NextResponse.json(
        { status: false, message: 'Could not load users' },
        { status: upstreamStatus(resp.status) }
      );
    }

    // Endpoint not deployed yet — assemble the roster company by company.
    console.warn('[Users API] /admin/users returned 404; falling back to per-company collection');
    const users = await collectByCompany();
    if (!users) {
      return NextResponse.json(
        { status: false, message: 'Could not load users' },
        { status: 502 }
      );
    }
    return NextResponse.json({
      status: true,
      users,
      totalElements: users.length,
      source: 'per-company',
    });
  } catch (error) {
    console.error('[Users API] Exception:', error);
    return NextResponse.json({ status: false, message: 'Failed to load users' }, { status: 500 });
  }
}
