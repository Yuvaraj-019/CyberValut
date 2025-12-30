import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Trash2, Calendar, DollarSign, Tag, Bell, TrendingUp, Filter, Search, Edit } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { subscriptionService, createRealtimeListener } from '../services/databaseService';
import { activityService } from '../services/databaseService';

interface SubscriptionForm {
  name: string;
  price: number;
  currency: string;
  renewDate: string;
  category: string;
  active: boolean;
}

const SubscriptionTracker: React.FC = () => {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState<SubscriptionForm>({
    name: '',
    price: 0,
    currency: 'USD',
    renewDate: '',
    category: '',
    active: true
  });

  // Load subscriptions in real-time
  useEffect(() => {
    if (!user) {
      setSubscriptions([]);
      setLoading(false);
      return;
    }

    const unsubscribe = createRealtimeListener.subscriptions(user.uid, (subs) => {
      setSubscriptions(subs);
      setLoading(false);
    });

    activityService.logActivity(user.uid, 'VIEWED_SUBSCRIPTIONS');

    return () => unsubscribe();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    try {
      if (editingId) {
        await subscriptionService.updateSubscription(user.uid, editingId, formData);
        setEditingId(null);
      } else {
        await subscriptionService.addSubscription(user.uid, formData);
      }

      // Reset form
      setFormData({
        name: '',
        price: 0,
        currency: 'USD',
        renewDate: '',
        category: '',
        active: true
      });
      setIsAdding(false);

      activityService.logActivity(user.uid, 
        editingId ? 'UPDATED_SUBSCRIPTION' : 'ADDED_SUBSCRIPTION',
        { name: formData.name, price: formData.price }
      );

    } catch (error) {
      console.error('Error saving subscription:', error);
      alert('Failed to save subscription');
    }
  };

  const deleteSubscription = async (id: string) => {
    if (!user || !confirm('Delete this subscription?')) return;

    try {
      await subscriptionService.deleteSubscription(user.uid, id);
      activityService.logActivity(user.uid, 'DELETED_SUBSCRIPTION', { subscriptionId: id });
    } catch (error) {
      console.error('Error deleting subscription:', error);
      alert('Failed to delete subscription');
    }
  };

  const startEdit = (sub: any) => {
    setEditingId(sub.id);
    setFormData({
      name: sub.name,
      price: sub.price,
      currency: sub.currency || 'USD',
      renewDate: sub.renewDate,
      category: sub.category || '',
      active: sub.active
    });
    setIsAdding(true);
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sub.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filter === 'all' || 
                         (filter === 'active' && sub.active) ||
                         (filter === 'inactive' && !sub.active);
    
    return matchesSearch && matchesFilter;
  });

  const totalMonthly = subscriptions
    .filter(sub => sub.active)
    .reduce((sum, sub) => sum + (sub.price || 0), 0);

  const totalYearly = totalMonthly * 12;

  const upcomingRenewals = subscriptions
    .filter(sub => sub.active && sub.renewDate)
    .sort((a, b) => new Date(a.renewDate).getTime() - new Date(b.renewDate).getTime())
    .slice(0, 3);

  const isOverdue = (date: string) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const daysUntilRenewal = (date: string) => {
    if (!date) return null;
    const today = new Date();
    const renewDate = new Date(date);
    const diffTime = renewDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Subscription Tracker</h1>
            <p className="text-gray-600 text-sm sm:text-base">Loading your subscriptions...</p>
          </div>
        </div>
        <div className="flex justify-center items-center h-48 sm:h-64">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-black"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-3 xs:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Subscription Tracker</h1>
          <p className="text-gray-600 text-sm sm:text-base">Manage and track your subscriptions</p>
        </div>
        {user && (
          <button
            onClick={() => setIsAdding(true)}
            className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2 min-h-[44px] min-w-[44px]"
            aria-label="Add Subscription"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline">Add Subscription</span>
          </button>
        )}
      </div>

      {/* Stats - UPDATED RESPONSIVE GRID */}
      <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-600">Total Subscriptions</p>
          <p className="text-xl sm:text-2xl font-bold">{subscriptions.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-600">Active</p>
          <p className="text-xl sm:text-2xl font-bold text-green-600">
            {subscriptions.filter(s => s.active).length}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-600">Monthly Cost</p>
          <p className="text-xl sm:text-2xl font-bold">${totalMonthly.toFixed(2)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-600">Yearly Cost</p>
          <p className="text-xl sm:text-2xl font-bold">${totalYearly.toFixed(2)}</p>
        </div>
      </div>

      {/* Search and Filter - UPDATED FOR MOBILE */}
      <div className="flex flex-col xs:flex-row gap-3 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4" />
          <input
            type="text"
            placeholder="Search subscriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-sm sm:text-base"
          />
        </div>
        <div className="flex space-x-1 sm:space-x-2">
          {['all', 'active', 'inactive'].map(filterType => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType as any)}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg transition-colors capitalize text-xs sm:text-sm min-h-[44px] ${
                filter === filterType
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="hidden xs:inline">{filterType}</span>
              <span className="xs:hidden uppercase">{filterType.charAt(0)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Add/Edit Form - UPDATED RESPONSIVE GRID */}
      {isAdding && user && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">
            {editingId ? 'Edit Subscription' : 'Add New Subscription'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-sm sm:text-base"
                  required
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-sm sm:text-base"
                  placeholder="e.g., Streaming, Software"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">Price *</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                    className="w-full pl-9 sm:pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-sm sm:text-base"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">Currency</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({...formData, currency: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-sm sm:text-base"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="INR">INR (₹)</option>
                </select>
              </div>
              <div className="xs:col-span-2 md:col-span-1">
                <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">Renewal Date *</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4" />
                  <input
                    type="date"
                    value={formData.renewDate}
                    onChange={(e) => setFormData({...formData, renewDate: e.target.value})}
                    className="w-full pl-9 sm:pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-sm sm:text-base"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="active"
                checked={formData.active}
                onChange={(e) => setFormData({...formData, active: e.target.checked})}
                className="rounded border-gray-300 w-4 h-4"
              />
              <label htmlFor="active" className="text-xs sm:text-sm">
                Active Subscription
              </label>
            </div>

            <div className="flex flex-col xs:flex-row gap-2 sm:gap-4 pt-2">
              <button
                type="submit"
                className="bg-black text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors flex-1 xs:flex-none min-h-[44px]"
              >
                {editingId ? 'Update' : 'Add'} Subscription
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setEditingId(null);
                  setFormData({
                    name: '',
                    price: 0,
                    currency: 'USD',
                    renewDate: '',
                    category: '',
                    active: true
                  });
                }}
                className="bg-gray-100 text-gray-700 px-4 sm:px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors flex-1 xs:flex-none min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Upcoming Renewals - UPDATED RESPONSIVE */}
      {upcomingRenewals.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center">
            <Bell className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Upcoming Renewals
          </h3>
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
            {upcomingRenewals.map((sub, index) => {
              const days = daysUntilRenewal(sub.renewDate);
              const overdue = isOverdue(sub.renewDate);
              
              return (
                <div key={index} className={`p-3 sm:p-4 rounded-lg border ${
                  overdue ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'
                }`}>
                  <div className="flex items-center justify-between mb-1 sm:mb-2">
                    <span className="font-medium text-sm sm:text-base truncate">{sub.name}</span>
                    <span className={`px-2 py-0.5 sm:py-1 rounded text-xs ${
                      overdue ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {overdue ? 'OVERDUE' : `In ${days} days`}
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600">
                    <div className="flex items-center justify-between">
                      <span>Amount:</span>
                      <span className="font-medium">${sub.price}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Date:</span>
                      <span>{new Date(sub.renewDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Subscriptions List - UPDATED FOR MOBILE */}
      {!user ? (
        <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-lg">
          <CreditCard className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold mb-2">Login to Track Subscriptions</h3>
          <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">
            Sign in to manage your subscriptions and track expenses.
          </p>
          <p className="text-xs sm:text-sm text-gray-500">
            Track all your subscriptions in one secure place.
          </p>
        </div>
      ) : filteredSubscriptions.length === 0 ? (
        <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-lg">
          <CreditCard className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
          <p className="text-gray-500 text-sm sm:text-base">
            {searchTerm || filter !== 'all' 
              ? 'No subscriptions match your search.'
              : 'No subscriptions found. Add your first subscription to get started.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full min-w-full">
              <thead>
                <tr className="bg-gray-50 text-left text-xs sm:text-sm text-gray-600">
                  <th className="py-3 px-4 sm:px-6">Name</th>
                  <th className="py-3 px-4 sm:px-6 hidden xs:table-cell">Category</th>
                  <th className="py-3 px-4 sm:px-6">Price</th>
                  <th className="py-3 px-4 sm:px-6 hidden sm:table-cell">Renewal Date</th>
                  <th className="py-3 px-4 sm:px-6">Status</th>
                  <th className="py-3 px-4 sm:px-6">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscriptions.map((sub) => {
                  const overdue = isOverdue(sub.renewDate);
                  const days = daysUntilRenewal(sub.renewDate);
                  
                  return (
                    <tr key={sub.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 sm:px-6">
                        <div>
                          <p className="font-medium text-sm sm:text-base truncate max-w-[120px] sm:max-w-none">{sub.name}</p>
                          {sub.category && (
                            <p className="text-xs text-gray-500 xs:hidden">{sub.category}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 sm:px-6 hidden xs:table-cell">
                        {sub.category || '-'}
                      </td>
                      <td className="py-3 px-4 sm:px-6">
                        <div className="flex items-center">
                          <span className="text-xs sm:text-sm text-gray-500 mr-1">
                            {sub.currency === 'USD' ? '$' : 
                             sub.currency === 'EUR' ? '€' : 
                             sub.currency === 'GBP' ? '£' : '₹'}
                          </span>
                          <span className="font-medium text-sm sm:text-base">{sub.price}</span>
                          <span className="text-xs text-gray-500 ml-1 hidden xs:inline">/month</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 sm:px-6 hidden sm:table-cell">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-400 hidden md:block" />
                          <div>
                            <p className={overdue ? 'text-red-600 font-medium text-sm' : 'text-sm'}>
                              {new Date(sub.renewDate).toLocaleDateString()}
                            </p>
                            {days !== null && (
                              <p className={`text-xs ${overdue ? 'text-red-500' : 'text-gray-500'}`}>
                                {overdue ? `${Math.abs(days)} days overdue` : `In ${days} days`}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 sm:px-6">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          sub.active 
                            ? (overdue ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700')
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {sub.active ? (overdue ? 'Overdue' : 'Active') : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 sm:px-6">
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => startEdit(sub)}
                            className="p-1 text-gray-600 hover:text-black min-h-[44px] min-w-[44px] flex items-center justify-center"
                            aria-label="Edit subscription"
                          >
                            <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                          <button
                            onClick={() => deleteSubscription(sub.id)}
                            className="p-1 text-gray-600 hover:text-red-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
                            aria-label="Delete subscription"
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionTracker;