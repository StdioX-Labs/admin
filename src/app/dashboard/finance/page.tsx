'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Transaction {
  id: string;
  type: 'income' | 'expense' | 'refund' | 'commission';
  amount: number;
  description: string;
  category: 'ticket_sales' | 'commission' | 'refund' | 'operational' | 'marketing' | 'platform_fee';
  status: 'completed' | 'pending' | 'failed' | 'cancelled';
  date: string;
  reference: string;
  eventId?: string;
  eventTitle?: string;
  companyId?: string;
  companyName?: string;
  paymentMethod: 'mpesa' | 'bank_transfer' | 'card' | 'paypal';
}

interface FinanceStats {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  pendingPayments: number;
  completedTransactions: number;
  monthlyGrowth: number;
}

export default function FinanceDashboard() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | Transaction['type']>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | Transaction['status']>('all');
  const [filterCategory, setFilterCategory] = useState<'all' | Transaction['category']>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Mock data - replace with actual API calls
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const mockStats: FinanceStats = {
          totalRevenue: 4750000,
          totalExpenses: 1200000,
          netProfit: 3550000,
          pendingPayments: 8,
          completedTransactions: 342,
          monthlyGrowth: 12.5
        };

        const mockTransactions: Transaction[] = [
          {
            id: '1',
            type: 'income',
            amount: 225000,
            description: 'Ticket sales for Tech Innovation Summit 2024',
            category: 'ticket_sales',
            status: 'completed',
            date: '2024-12-10',
            reference: 'TXN-001-2024',
            eventId: '1',
            eventTitle: 'Tech Innovation Summit 2024',
            companyId: 'comp-1',
            companyName: 'TechCorp Solutions',
            paymentMethod: 'mpesa'
          },
          {
            id: '2',
            type: 'commission',
            amount: 22500,
            description: 'Platform commission (10%) for Tech Summit',
            category: 'commission',
            status: 'completed',
            date: '2024-12-10',
            reference: 'COM-001-2024',
            eventId: '1',
            eventTitle: 'Tech Innovation Summit 2024',
            companyId: 'comp-1',
            companyName: 'TechCorp Solutions',
            paymentMethod: 'bank_transfer'
          },
          {
            id: '3',
            type: 'income',
            amount: 48000,
            description: 'Workshop registration fees',
            category: 'ticket_sales',
            status: 'pending',
            date: '2024-12-12',
            reference: 'TXN-002-2024',
            eventId: '2',
            eventTitle: 'Digital Marketing Workshop',
            companyId: 'comp-2',
            companyName: 'StartupHub Kenya',
            paymentMethod: 'card'
          },
          {
            id: '4',
            type: 'refund',
            amount: 15000,
            description: 'Refund for cancelled event tickets',
            category: 'refund',
            status: 'completed',
            date: '2024-12-08',
            reference: 'REF-001-2024',
            eventId: '6',
            eventTitle: 'Basketball Championship',
            companyId: 'comp-6',
            companyName: 'Sports Kenya',
            paymentMethod: 'mpesa'
          },
          {
            id: '5',
            type: 'expense',
            amount: 75000,
            description: 'Platform maintenance and hosting costs',
            category: 'operational',
            status: 'completed',
            date: '2024-12-05',
            reference: 'EXP-001-2024',
            paymentMethod: 'bank_transfer'
          },
          {
            id: '6',
            type: 'expense',
            amount: 45000,
            description: 'Marketing campaign for Q4 events',
            category: 'marketing',
            status: 'pending',
            date: '2024-12-11',
            reference: 'EXP-002-2024',
            paymentMethod: 'card'
          },
          {
            id: '7',
            type: 'income',
            amount: 60000,
            description: 'Networking event ticket sales',
            category: 'ticket_sales',
            status: 'completed',
            date: '2024-12-18',
            reference: 'TXN-003-2024',
            eventId: '3',
            eventTitle: 'Startup Pitch Night',
            companyId: 'comp-3',
            companyName: 'EventMasters Ltd',
            paymentMethod: 'mpesa'
          },
          {
            id: '8',
            type: 'commission',
            amount: 6000,
            description: 'Platform commission for networking event',
            category: 'commission',
            status: 'completed',
            date: '2024-12-18',
            reference: 'COM-002-2024',
            eventId: '3',
            eventTitle: 'Startup Pitch Night',
            companyId: 'comp-3',
            companyName: 'EventMasters Ltd',
            paymentMethod: 'bank_transfer'
          }
        ];

        setStats(mockStats);
        setTransactions(mockTransactions);
      } catch {
        setError('Failed to load finance data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.eventTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.companyName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || transaction.type === filterType;
    const matchesStatus = filterStatus === 'all' || transaction.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || transaction.category === filterCategory;
    return matchesSearch && matchesType && matchesStatus && matchesCategory;
  });

  const getTypeBadge = (type: string) => {
    const styles = {
      income: 'bg-green-100 text-green-800 border-green-200',
      commission: 'bg-blue-100 text-blue-800 border-blue-200',
      expense: 'bg-red-100 text-red-800 border-red-200',
      refund: 'bg-orange-100 text-orange-800 border-orange-200'
    };
    return styles[type as keyof typeof styles] || styles.income;
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: 'bg-green-100 text-green-800 border-green-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      failed: 'bg-red-100 text-red-800 border-red-200',
      cancelled: 'bg-accent text-foreground border-border'
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };

  const getCategoryBadge = (category: string) => {
    const styles = {
      ticket_sales: 'bg-purple-100 text-purple-800 border-purple-200',
      commission: 'bg-blue-100 text-blue-800 border-blue-200',
      refund: 'bg-orange-100 text-orange-800 border-orange-200',
      operational: 'bg-accent text-foreground border-border',
      marketing: 'bg-pink-100 text-pink-800 border-pink-200',
      platform_fee: 'bg-indigo-100 text-indigo-800 border-indigo-200'
    };
    return styles[category as keyof typeof styles] || styles.operational;
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'mpesa':
        return '📱';
      case 'bank_transfer':
        return '🏦';
      case 'card':
        return '💳';
      case 'paypal':
        return '💰';
      default:
        return '💳';
    }
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-muted-foreground mx-auto mb-3"></div>
          <p className="text-muted-foreground text-sm">Loading finance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Finance Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">Track revenue, expenses, and financial performance</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => router.push('/dashboard/finance/reports')}
              variant="outline"
              size="sm"
              className="border-border text-muted-foreground hover:bg-background hover:border-border transition-all duration-200"
            >
              Reports
            </Button>
            <Button
              onClick={() => router.push('/dashboard/finance/transactions')}
              size="sm"
              className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
            >
              All Transactions
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
              <Card className="p-4 bg-card border border-border hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Total Revenue</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(stats.totalRevenue)}</p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-card border border-border hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Total Expenses</p>
                    <p className="text-xl font-bold text-red-600">{formatCurrency(stats.totalExpenses)}</p>
                  </div>
                  <div className="p-2 bg-red-100 rounded-lg">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                    </svg>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-card border border-border hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Net Profit</p>
                    <p className="text-xl font-bold text-blue-600">{formatCurrency(stats.netProfit)}</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
              </Card>
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Card className="p-4 bg-card border border-border hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Pending Payments</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.pendingPayments}</p>
                  </div>
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-card border border-border hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Completed Transactions</p>
                    <p className="text-2xl font-bold text-muted-foreground">{stats.completedTransactions}</p>
                  </div>
                  <div className="p-2 bg-accent rounded-lg">
                    <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-card border border-border hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Monthly Growth</p>
                    <p className="text-2xl font-bold text-purple-600">+{stats.monthlyGrowth}%</p>
                  </div>
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                    </svg>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <Card className="p-4 bg-card border border-border">
          <div className="space-y-3">
            <Input
              type="text"
              placeholder="Search transactions, references, events, or companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 border-border focus:border-ring text-sm"
            />

            {/* Filter Dropdowns */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              {/* Type Filter */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">Type:</span>
                <Select value={filterType} onValueChange={(value) => setFilterType(value as typeof filterType)}>
                  <SelectTrigger className="h-9 border-border focus:border-ring text-sm">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="commission">Commission</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="refund">Refund</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">Status:</span>
                <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as typeof filterStatus)}>
                  <SelectTrigger className="h-9 border-border focus:border-ring text-sm">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">Category:</span>
                <Select value={filterCategory} onValueChange={(value) => setFilterCategory(value as typeof filterCategory)}>
                  <SelectTrigger className="h-9 border-border focus:border-ring text-sm">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="ticket_sales">Ticket Sales</SelectItem>
                    <SelectItem value="commission">Commission</SelectItem>
                    <SelectItem value="refund">Refund</SelectItem>
                    <SelectItem value="operational">Operational</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="platform_fee">Platform Fee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </Card>

        {/* Transactions Table */}
        <Card className="bg-card border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">Recent Transactions</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredTransactions.length} of {transactions.length} transactions
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-background">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Transaction</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Category</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Payment</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-slate-200">
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-background transition-colors duration-150">
                    <td className="px-4 py-3">
                      <div className="max-w-48">
                        <p className="font-medium text-foreground truncate" title={transaction.description}>
                          {transaction.description}
                        </p>
                        <p className="text-xs text-muted-foreground truncate" title={transaction.reference}>
                          {transaction.reference}
                        </p>
                        {transaction.eventTitle && (
                          <p className="text-xs text-muted-foreground truncate" title={transaction.eventTitle}>
                            {transaction.eventTitle}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getTypeBadge(transaction.type)}`}>
                        {transaction.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className={`font-medium ${transaction.type === 'income' || transaction.type === 'commission' ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.type === 'income' || transaction.type === 'commission' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getStatusBadge(transaction.status)}`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getCategoryBadge(transaction.category)}`}>
                        {transaction.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="text-sm">{getPaymentMethodIcon(transaction.paymentMethod)}</span>
                        <span className="text-xs text-muted-foreground capitalize">
                          {transaction.paymentMethod.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDate(transaction.date)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button
                          onClick={() => router.push(`/dashboard/finance/${transaction.id}`)}
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs border-border text-muted-foreground hover:bg-background"
                        >
                          View
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredTransactions.length === 0 && (
            <div className="text-center py-8">
              <svg className="mx-auto h-10 w-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-foreground">No transactions found</h3>
              <p className="mt-1 text-xs text-muted-foreground">Try adjusting your search or filter criteria.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}