'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BarChart,
  Building2,
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  Plus,
  FileText,
  Settings
} from "lucide-react";

interface DashboardStats {
  totalCompanies: number;
  activeEvents: number;
  totalRevenue: number;
  totalUsers: number;
  monthlyGrowth: {
    companies: number;
    events: number;
    revenue: number;
    users: number;
  };
  pendingApprovals: number;
  activeSubscriptions: number;
  recentActivity: ActivityItem[];
}

interface ActivityItem {
  id: string;
  type: 'event_created' | 'company_registered' | 'user_joined' | 'payment_received' | 'license_expired';
  title: string;
  description: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error' | 'info';
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Mock data - replace with actual API calls
  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const mockStats: DashboardStats = {
          totalCompanies: 125,
          activeEvents: 48,
          totalRevenue: 4750000,
          totalUsers: 2847,
          monthlyGrowth: {
            companies: 12,
            events: 8,
            revenue: 15,
            users: 5
          },
          pendingApprovals: 7,
          activeSubscriptions: 118,
          recentActivity: [
            {
              id: '1',
              type: 'event_created',
              title: 'New Event Created',
              description: 'Tech Innovation Summit 2024 by TechCorp Solutions',
              timestamp: '2024-12-13T10:30:00Z',
              status: 'success'
            },
            {
              id: '2',
              type: 'company_registered',
              title: 'Company Registration',
              description: 'StartupHub Kenya completed registration',
              timestamp: '2024-12-13T09:15:00Z',
              status: 'info'
            },
            {
              id: '3',
              type: 'license_expired',
              title: 'License Expiring Soon',
              description: 'EventMasters Ltd license expires in 3 days',
              timestamp: '2024-12-13T08:45:00Z',
              status: 'warning'
            },
            {
              id: '4',
              type: 'payment_received',
              title: 'Payment Received',
              description: 'KES 125,000 from ticket sales',
              timestamp: '2024-12-12T16:20:00Z',
              status: 'success'
            },
            {
              id: '5',
              type: 'user_joined',
              title: 'New User Registered',
              description: 'Sarah Mutua joined the platform',
              timestamp: '2024-12-12T14:10:00Z',
              status: 'info'
            }
          ]
        };

        setStats(mockStats);
      } catch (err) {
        setError('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-KE', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'event_created':
        return <Calendar className="h-4 w-4 text-blue-600" />;
      case 'company_registered':
        return <Building2 className="h-4 w-4 text-green-600" />;
      case 'user_joined':
        return <Users className="h-4 w-4 text-purple-600" />;
      case 'payment_received':
        return <DollarSign className="h-4 w-4 text-green-600" />;
      case 'license_expired':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      default:
        return <Activity className="h-4 w-4 text-slate-600" />;
    }
  };

  const getActivityBadge = (status: string) => {
    const styles = {
      success: 'bg-green-100 text-green-800',
      warning: 'bg-orange-100 text-orange-800',
      error: 'bg-red-100 text-red-800',
      info: 'bg-blue-100 text-blue-800'
    };
    return styles[status as keyof typeof styles] || styles.info;
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
          <p className="text-slate-600">Welcome back! Here's an overview of your business.</p>
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
          <AlertDescription className="text-red-700 text-sm">{error}</AlertDescription>
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
              <p className="text-xs text-green-600 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                +{stats.monthlyGrowth.companies}% from last month
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
              <p className="text-xs text-green-600 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                +{stats.monthlyGrowth.events}% from last month
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow duration-200 cursor-pointer" onClick={() => router.push('/dashboard/finance')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalRevenue)}</div>
              <p className="text-xs text-green-600 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                +{stats.monthlyGrowth.revenue}% from last month
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
              <p className="text-xs text-green-600 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                +{stats.monthlyGrowth.users}% from last month
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
                Active Subscriptions
              </CardTitle>
              <CardDescription>Companies with valid licenses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.activeSubscriptions}</div>
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

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">Quick Actions</CardTitle>
            <CardDescription>Frequently used administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => router.push('/dashboard/b2b/companies')}
              variant="outline"
              className="w-full justify-start border-slate-200 hover:bg-slate-50"
            >
              <Building2 className="h-4 w-4 mr-3" />
              Manage Companies
            </Button>
            <Button
              onClick={() => router.push('/dashboard/events/create')}
              variant="outline"
              className="w-full justify-start border-slate-200 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4 mr-3" />
              Create Event
            </Button>
            <Button
              onClick={() => router.push('/dashboard/finance/transactions')}
              variant="outline"
              className="w-full justify-start border-slate-200 hover:bg-slate-50"
            >
              <DollarSign className="h-4 w-4 mr-3" />
              View Transactions
            </Button>
            <Button
              onClick={() => router.push('/dashboard/users')}
              variant="outline"
              className="w-full justify-start border-slate-200 hover:bg-slate-50"
            >
              <Users className="h-4 w-4 mr-3" />
              User Management
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">Recent Activity</CardTitle>
            <CardDescription>Latest platform activities and events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex-shrink-0 mt-1">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-900">{activity.title}</p>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getActivityBadge(activity.status)}`}>
                        {activity.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{activity.description}</p>
                    <p className="text-xs text-slate-400 mt-1">{formatTimestamp(activity.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button
              onClick={() => router.push('/dashboard/activity')}
              variant="outline"
              size="sm"
              className="w-full mt-4 border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              View All Activity
              <ArrowUpRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}