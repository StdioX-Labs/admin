'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Company {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive' | 'pending';
  licenseType: 'basic' | 'premium' | 'enterprise';
  eventsCount: number;
  totalRevenue: number;
  joinedDate: string;
  lastActivity: string;
}

interface DashboardStats {
  totalCompanies: number;
  activeCompanies: number;
  totalRevenue: number;
  totalEvents: number;
  pendingApprovals: number;
  monthlyGrowth: number;
}

export default function B2BDashboard() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'pending'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Mock data - replace with actual API calls
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const mockStats: DashboardStats = {
          totalCompanies: 156,
          activeCompanies: 142,
          totalRevenue: 2450000,
          totalEvents: 1234,
          pendingApprovals: 8,
          monthlyGrowth: 12.5
        };

        const mockCompanies: Company[] = [
          {
            id: '1',
            name: 'TechCorp Solutions',
            email: 'admin@techcorp.com',
            phone: '+254712345678',
            status: 'active',
            licenseType: 'enterprise',
            eventsCount: 45,
            totalRevenue: 125000,
            joinedDate: '2024-01-15',
            lastActivity: '2024-12-10'
          },
          {
            id: '2',
            name: 'StartupHub Kenya',
            email: 'info@startuphub.ke',
            phone: '+254787654321',
            status: 'active',
            licenseType: 'premium',
            eventsCount: 23,
            totalRevenue: 78000,
            joinedDate: '2024-02-20',
            lastActivity: '2024-12-09'
          },
          {
            id: '3',
            name: 'EventMasters Ltd',
            email: 'contact@eventmasters.co.ke',
            phone: '+254798765432',
            status: 'pending',
            licenseType: 'basic',
            eventsCount: 0,
            totalRevenue: 0,
            joinedDate: '2024-12-08',
            lastActivity: '2024-12-08'
          },
          {
            id: '4',
            name: 'Digital Innovators',
            email: 'hello@digitalinnovators.com',
            phone: '+254765432109',
            status: 'inactive',
            licenseType: 'premium',
            eventsCount: 12,
            totalRevenue: 45000,
            joinedDate: '2024-03-10',
            lastActivity: '2024-11-15'
          }
        ];

        setStats(mockStats);
        setCompanies(mockCompanies);
      } catch {
        setError('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         company.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || company.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      inactive: 'bg-red-100 text-red-800 border-red-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };

  const getLicenseBadge = (license: string) => {
    const styles = {
      basic: 'bg-gray-100 text-gray-800 border-gray-200',
      premium: 'bg-slate-100 text-slate-800 border-slate-200',
      enterprise: 'bg-purple-100 text-purple-800 border-purple-200'
    };
    return styles[license as keyof typeof styles] || styles.basic;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 mx-auto mb-3"></div>
          <p className="text-slate-600 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-3">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">B2B Dashboard</h1>
            <p className="text-slate-600 text-sm mt-1">Manage your business partnerships</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => router.push('/dashboard/b2b/analytics')}
              variant="outline"
              size="sm"
              className="border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
            >
              Analytics
            </Button>
            <Button
              onClick={() => router.push('/dashboard/b2b/companies')}
              size="sm"
              className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
            >
              Manage Companies
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-700 text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {/* Stats Cards - 2 Rows Layout */}
        {stats && (
          <div className="space-y-3">
            {/* First Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Card className="p-4 bg-white border border-slate-200 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Total Companies</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.totalCompanies}</p>
                  </div>
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-white border border-slate-200 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Active Companies</p>
                    <p className="text-2xl font-bold text-emerald-600">{stats.activeCompanies}</p>
                  </div>
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-white border border-slate-200 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Total Revenue</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(stats.totalRevenue)}</p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
              </Card>
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Card className="p-4 bg-white border border-slate-200 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Total Events</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.totalEvents}</p>
                  </div>
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-white border border-slate-200 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Pending Approvals</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.pendingApprovals}</p>
                  </div>
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-white border border-slate-200 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Monthly Growth</p>
                    <p className="text-2xl font-bold text-slate-600">+{stats.monthlyGrowth}%</p>
                  </div>
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <Card className="p-4 bg-white border border-slate-200">
          <div className="space-y-3">
            <Input
              type="text"
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 border-slate-200 focus:border-slate-500 focus:ring-slate-500 text-sm"
            />
            <div className="flex flex-wrap gap-2">
              {(['all', 'active', 'pending', 'inactive'] as const).map((status) => (
                <Button
                  key={status}
                  variant={filterStatus === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus(status)}
                  className={`capitalize transition-all duration-200 text-xs px-3 py-1 ${
                    filterStatus === status
                      ? 'bg-slate-600 text-white hover:bg-slate-700'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {/* Companies Table - Compact for laptops */}
        <Card className="bg-white border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Companies</h3>
            <p className="text-xs text-slate-600 mt-1">
              {filteredCompanies.length} of {companies.length} companies
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Company</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">License</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Events</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Revenue</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Activity</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredCompanies.map((company) => (
                  <tr key={company.id} className="hover:bg-slate-50 transition-colors duration-150">
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-slate-900 truncate max-w-32">{company.name}</div>
                        <div className="text-xs text-slate-500 truncate max-w-32">{company.email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusBadge(company.status)}`}>
                        {company.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getLicenseBadge(company.licenseType)}`}>
                        {company.licenseType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">{company.eventsCount}</td>
                    <td className="px-4 py-3 text-sm text-slate-900">{formatCurrency(company.totalRevenue)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDate(company.lastActivity)}</td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/dashboard/b2b/companies/${company.id}`)}
                        className="text-xs px-2 py-1 text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredCompanies.length === 0 && (
            <div className="text-center py-8">
              <svg className="mx-auto h-10 w-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-slate-900">No companies found</h3>
              <p className="mt-1 text-xs text-slate-500">Try adjusting your search or filter criteria.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}