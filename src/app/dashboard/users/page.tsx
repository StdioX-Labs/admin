'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'user' | 'organizer' | 'moderator';
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  joinDate: string;
  lastActive: string;
  totalEvents: number;
  totalSpent: number;
  totalTickets: number;
  location: string;
  isVerified: boolean;
  companyId?: string;
  companyName?: string;
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  suspendedUsers: number;
  verifiedUsers: number;
  totalRevenue: number;
}

export default function UsersDashboard() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | User['role']>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | User['status']>('all');
  const [filterVerified, setFilterVerified] = useState<'all' | 'verified' | 'unverified'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Mock data - replace with actual API calls
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const mockStats: UserStats = {
          totalUsers: 1247,
          activeUsers: 892,
          newUsersThisMonth: 156,
          suspendedUsers: 23,
          verifiedUsers: 1089,
          totalRevenue: 4750000
        };

        const mockUsers: User[] = [
          {
            id: '1',
            name: 'John Kamau',
            email: 'john.kamau@email.com',
            phone: '+254712345678',
            role: 'user',
            status: 'active',
            joinDate: '2024-01-15',
            lastActive: '2024-12-10',
            totalEvents: 12,
            totalSpent: 45000,
            totalTickets: 18,
            location: 'Nairobi, Kenya',
            isVerified: true,
            companyId: 'comp-1',
            companyName: 'TechCorp Solutions'
          },
          {
            id: '2',
            name: 'Mary Wanjiku',
            email: 'mary.wanjiku@gmail.com',
            phone: '+254723456789',
            role: 'organizer',
            status: 'active',
            joinDate: '2023-11-20',
            lastActive: '2024-12-12',
            totalEvents: 5,
            totalSpent: 125000,
            totalTickets: 8,
            location: 'Mombasa, Kenya',
            isVerified: true,
            companyId: 'comp-2',
            companyName: 'StartupHub Kenya'
          },
          {
            id: '3',
            name: 'David Mwangi',
            email: 'david.mwangi@yahoo.com',
            phone: '+254734567890',
            role: 'admin',
            status: 'active',
            joinDate: '2023-08-10',
            lastActive: '2024-12-13',
            totalEvents: 0,
            totalSpent: 0,
            totalTickets: 0,
            location: 'Kisumu, Kenya',
            isVerified: true
          },
          {
            id: '4',
            name: 'Grace Nyong\'o',
            email: 'grace.nyongo@outlook.com',
            phone: '+254745678901',
            role: 'user',
            status: 'suspended',
            joinDate: '2024-03-05',
            lastActive: '2024-11-28',
            totalEvents: 3,
            totalSpent: 15000,
            totalTickets: 5,
            location: 'Nakuru, Kenya',
            isVerified: false
          },
          {
            id: '5',
            name: 'Peter Ochieng',
            email: 'peter.ochieng@gmail.com',
            phone: '+254756789012',
            role: 'moderator',
            status: 'active',
            joinDate: '2024-06-12',
            lastActive: '2024-12-11',
            totalEvents: 2,
            totalSpent: 8000,
            totalTickets: 3,
            location: 'Eldoret, Kenya',
            isVerified: true
          },
          {
            id: '6',
            name: 'Sarah Mutua',
            email: 'sarah.mutua@email.com',
            phone: '+254767890123',
            role: 'user',
            status: 'pending',
            joinDate: '2024-12-08',
            lastActive: '2024-12-08',
            totalEvents: 0,
            totalSpent: 0,
            totalTickets: 0,
            location: 'Thika, Kenya',
            isVerified: false
          },
          {
            id: '7',
            name: 'James Kipchoge',
            email: 'james.kipchoge@gmail.com',
            phone: '+254778901234',
            role: 'organizer',
            status: 'inactive',
            joinDate: '2023-12-15',
            lastActive: '2024-10-22',
            totalEvents: 15,
            totalSpent: 180000,
            totalTickets: 25,
            location: 'Meru, Kenya',
            isVerified: true,
            companyId: 'comp-3',
            companyName: 'EventMasters Ltd'
          },
          {
            id: '8',
            name: 'Catherine Wawira',
            email: 'catherine.wawira@yahoo.com',
            phone: '+254789012345',
            role: 'user',
            status: 'active',
            joinDate: '2024-09-03',
            lastActive: '2024-12-09',
            totalEvents: 7,
            totalSpent: 32000,
            totalTickets: 11,
            location: 'Machakos, Kenya',
            isVerified: true
          }
        ];

        setStats(mockStats);
        setUsers(mockUsers);
      } catch (err) {
        setError('Failed to load users data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.phone.includes(searchTerm) ||
                         user.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.companyName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    const matchesVerified = filterVerified === 'all' ||
                           (filterVerified === 'verified' && user.isVerified) ||
                           (filterVerified === 'unverified' && !user.isVerified);
    return matchesSearch && matchesRole && matchesStatus && matchesVerified;
  });

  const getRoleBadge = (role: string) => {
    const styles = {
      admin: 'bg-red-100 text-red-800 border-red-200',
      organizer: 'bg-blue-100 text-blue-800 border-blue-200',
      moderator: 'bg-purple-100 text-purple-800 border-purple-200',
      user: 'bg-green-100 text-green-800 border-green-200'
    };
    return styles[role as keyof typeof styles] || styles.user;
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800 border-green-200',
      inactive: 'bg-gray-100 text-gray-800 border-gray-200',
      suspended: 'bg-red-100 text-red-800 border-red-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };
    return styles[status as keyof typeof styles] || styles.pending;
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
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getActivityStatus = (lastActive: string) => {
    const lastActiveDate = new Date(lastActive);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return { status: 'Today', color: 'text-green-600' };
    if (diffDays <= 7) return { status: `${diffDays}d ago`, color: 'text-blue-600' };
    if (diffDays <= 30) return { status: `${diffDays}d ago`, color: 'text-yellow-600' };
    return { status: `${diffDays}d ago`, color: 'text-red-600' };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 mx-auto mb-3"></div>
          <p className="text-slate-600 text-sm">Loading users...</p>
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
            <h1 className="text-2xl font-bold text-slate-900">Users Dashboard</h1>
            <p className="text-slate-600 text-sm mt-1">Manage and monitor platform users</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => router.push('/dashboard/users/analytics')}
              variant="outline"
              size="sm"
              className="border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
            >
              Analytics
            </Button>
            <Button
              onClick={() => router.push('/dashboard/users/export')}
              variant="outline"
              size="sm"
              className="border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
            >
              Export
            </Button>
            <Button
              onClick={() => router.push('/dashboard/users/invite')}
              size="sm"
              className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
            >
              Invite User
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
                    <p className="text-sm font-medium text-slate-600 mb-1">Total Users</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.totalUsers}</p>
                  </div>
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-white border border-slate-200 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Active Users</p>
                    <p className="text-2xl font-bold text-green-600">{stats.activeUsers}</p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-white border border-slate-200 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">New This Month</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.newUsersThisMonth}</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
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
                    <p className="text-sm font-medium text-slate-600 mb-1">Suspended Users</p>
                    <p className="text-2xl font-bold text-red-600">{stats.suspendedUsers}</p>
                  </div>
                  <div className="p-2 bg-red-100 rounded-lg">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                    </svg>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-white border border-slate-200 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Verified Users</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.verifiedUsers}</p>
                  </div>
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
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
          </div>
        )}

        {/* Filters and Search */}
        <Card className="p-4 bg-white border border-slate-200">
          <div className="space-y-3">
            <Input
              type="text"
              placeholder="Search users, emails, phone numbers, or companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 border-slate-200 focus:border-slate-500 focus:ring-slate-500 text-sm"
            />

            {/* Filter Dropdowns */}
            <div className="flex flex-col sm:flex-row gap-3 ">
              {/* Role Filter */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-slate-600">Role:</span>
                <Select value={filterRole} onValueChange={(value) => setFilterRole(value as typeof filterRole)}>
                  <SelectTrigger className="h-9 border-slate-200 focus:border-slate-500 focus:ring-slate-500 text-sm">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="organizer">Organizer</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-slate-600">Status:</span>
                <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as typeof filterStatus)}>
                  <SelectTrigger className="h-9 border-slate-200 focus:border-slate-500 focus:ring-slate-500 text-sm">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Verification Filter */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-slate-600">Verification:</span>
                <Select value={filterVerified} onValueChange={(value) => setFilterVerified(value as typeof filterVerified)}>
                  <SelectTrigger className="h-9 border-slate-200 focus:border-slate-500 focus:ring-slate-500 text-sm">
                    <SelectValue placeholder="Select verification" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="unverified">Unverified</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </Card>

        {/* Users Table */}
        <Card className="bg-white border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Users</h3>
            <p className="text-xs text-slate-600 mt-1">
              {filteredUsers.length} of {users.length} users
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">User</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Role</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Activity</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Events</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Spent</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredUsers.map((user) => {
                  const activity = getActivityStatus(user.lastActive);
                  return (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors duration-150">
                      <td className="px-4 py-3">
                        <div className="max-w-48">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-900 truncate" title={user.name}>
                              {user.name}
                            </p>
                            {user.isVerified && (
                              <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.243.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate" title={user.email}>
                            {user.email}
                          </p>
                          <p className="text-xs text-slate-400 truncate" title={user.location}>
                            {user.location}
                          </p>
                          {user.companyName && (
                            <p className="text-xs text-blue-600 truncate" title={user.companyName}>
                              {user.companyName}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getRoleBadge(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getStatusBadge(user.status)}`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <p className={`font-medium ${activity.color}`}>
                            {activity.status}
                          </p>
                          <p className="text-xs text-slate-500">
                            Joined {formatDate(user.joinDate)}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <p className="font-medium text-slate-900">{user.totalEvents}</p>
                          <p className="text-xs text-slate-500">{user.totalTickets} tickets</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {formatCurrency(user.totalSpent)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button
                            onClick={() => router.push(`/dashboard/users/${user.id}`)}
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs border-slate-200 text-slate-600 hover:bg-slate-50"
                          >
                            View
                          </Button>
                          <Button
                            onClick={() => router.push(`/dashboard/users/${user.id}/edit`)}
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs border-slate-200 text-slate-600 hover:bg-slate-50"
                          >
                            Edit
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <svg className="mx-auto h-10 w-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-slate-900">No users found</h3>
              <p className="mt-1 text-xs text-slate-500">Try adjusting your search or filter criteria.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}