'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { dashboardApi } from "@/lib/api";
import {
  Building2,
  Calendar,
  DollarSign,
  Users,
  ArrowUpRight,
  CheckCircle,
  Clock,
  Plus,
  FileText
} from "lucide-react";

interface DashboardStats {
  totalCompanies: number;
  activeEvents: number;
  totalRevenue: number;
  totalUsers: number;
  pendingApprovals: number;
  activeB2BSubscriptions: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch dashboard data from API
  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(''); // Clear previous errors
    try {
      console.log('[Dashboard] Fetching stats...');
      const response = await dashboardApi.getStats();

      console.log('[Dashboard] API response:', response);

      if (response.status && response.data) {
        setStats(response.data);
        setError('');
      } else {
        const errorMsg = response.message || 'Failed to load dashboard data';
        console.error('[Dashboard] API returned error:', errorMsg);
        setError(errorMsg);
      }
    } catch (err) {
      console.error('[Dashboard] Fetch error:', err);

      // Check if it's an auth error
      if (err.status === 401) {
        setError('You are not authorized. Please log in again.');
      } else {
        setError(err.message || 'Failed to load dashboard data. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600">Welcome back! Here&apos;s an overview of your business.</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => router.push('/dashboard/finance/reports')}
            variant="outline"
            size="sm"
            className="border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <FileText className="h-4 w-4 mr-2" />
            Reports
          </Button>
          <Button
            onClick={() => router.push('/dashboard/events/create')}
            size="sm"
            className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white"
          >
            <Plus className="h-4 w-4" />
            <span className="pr-3">Quick Action</span>
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <AlertDescription className="flex items-center justify-between">
            <span className="text-red-700 text-sm">{error}</span>
            <Button
              onClick={fetchDashboardData}
              variant="outline"
              size="sm"
              className="ml-4 border-red-300 text-red-700 hover:bg-red-100"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:shadow-md transition-shadow duration-200 cursor-pointer" onClick={() => router.push('/dashboard/b2b')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Companies</CardTitle>
              <Building2 className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{stats.totalCompanies}</div>
              <p className="text-xs text-slate-500 mt-1">
                B2B registered companies
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow duration-200 cursor-pointer" onClick={() => router.push('/dashboard/events')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Active Events</CardTitle>
              <Calendar className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{stats.activeEvents}</div>
              <p className="text-xs text-slate-500 mt-1">
                Currently running events
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow duration-200 cursor-pointer" onClick={() => router.push('/dashboard/finance')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalRevenue)}</div>
              <p className="text-xs text-slate-500 mt-1">
                All-time revenue
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow duration-200 cursor-pointer" onClick={() => router.push('/dashboard/users')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Users</CardTitle>
              <Users className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{stats.totalUsers}</div>
              <p className="text-xs text-slate-500 mt-1">
                Registered platform users
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Secondary Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900 flex items-center">
                <Clock className="h-5 w-5 mr-2 text-orange-600" />
                Pending Approvals
              </CardTitle>
              <CardDescription>Items requiring your attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{stats.pendingApprovals}</div>
              <Button
                onClick={() => router.push('/dashboard/b2b')}
                variant="outline"
                size="sm"
                className="mt-3 border-orange-200 text-orange-700 hover:bg-orange-50"
              >
                Review Now
                <ArrowUpRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                Active B2B Subscriptions
              </CardTitle>
              <CardDescription>Companies with valid licenses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.activeB2BSubscriptions}</div>
              <Button
                onClick={() => router.push('/dashboard/b2b/licenses')}
                variant="outline"
                size="sm"
                className="mt-3 border-green-200 text-green-700 hover:bg-green-50"
              >
                Manage Licenses
                <ArrowUpRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">Quick Actions</CardTitle>
          <CardDescription>Frequently used administrative tasks</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Button
            onClick={() => router.push('/dashboard/b2b/companies')}
            variant="outline"
            className="justify-start border-slate-200 hover:bg-slate-50"
          >
            <Building2 className="h-4 w-4 mr-3" />
            Manage Companies
          </Button>
          <Button
            onClick={() => router.push('/dashboard/events/create')}
            variant="outline"
            className="justify-start border-slate-200 hover:bg-slate-50"
          >
            <Plus className="h-4 w-4 mr-3" />
            Create Event
          </Button>
          <Button
            onClick={() => router.push('/dashboard/finance/transactions')}
            variant="outline"
            className="justify-start border-slate-200 hover:bg-slate-50"
          >
            <DollarSign className="h-4 w-4 mr-3" />
            View Transactions
          </Button>
          <Button
            onClick={() => router.push('/dashboard/users')}
            variant="outline"
            className="justify-start border-slate-200 hover:bg-slate-50"
          >
            <Users className="h-4 w-4 mr-3" />
            User Management
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}