import React, { useState, useEffect } from 'react';
import { Shield, CheckSquare, Clock, AlertTriangle, TrendingUp, Users, Calendar, Activity, ExternalLink, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { createRealtimeListener } from '../services/databaseService';

interface DashboardProps {
  setActiveTab: (tab: string) => void;
}

interface QuickStats {
  totalTasks: number;
  completedTasks: number;
  totalAccounts: number;
  totalSubscriptions: number;
  weeklyScreenTime: number;
  securityScore: number;
  passwordChecks: number;
  phishingScans: number;
  activeSubscriptions: number;
  totalBreaches: number;
}

interface RecentActivity {
  type: 'task' | 'password' | 'subscription' | 'screen_time' | 'phishing_scan' | 'digital_property';
  title: string;
  description: string;
  timestamp: Date;
  icon: React.ComponentType<any>;
  color: string;
}

const Dashboard: React.FC<DashboardProps> = ({ setActiveTab }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<QuickStats>({
    totalTasks: 0,
    completedTasks: 0,
    totalAccounts: 0,
    totalSubscriptions: 0,
    weeklyScreenTime: 0,
    securityScore: 85,
    passwordChecks: 0,
    phishingScans: 0,
    activeSubscriptions: 0,
    totalBreaches: 0
  });

  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  // Load all data in real-time
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let unsubscribeFunctions: (() => void)[] = [];

    const setupRealtimeListeners = () => {
      // Listen to todos
      const unsubscribeTodos = createRealtimeListener.todos(user.uid, (todos) => {
        const completedTasks = todos.filter(task => task.completed).length;
        setStats(prev => ({
          ...prev,
          totalTasks: todos.length,
          completedTasks
        }));
      });
      unsubscribeFunctions.push(unsubscribeTodos);

      // Listen to digital properties
      const unsubscribeProperties = createRealtimeListener.digitalProperties(user.uid, (properties) => {
        setStats(prev => ({
          ...prev,
          totalAccounts: properties.length
        }));
      });
      unsubscribeFunctions.push(unsubscribeProperties);

      // Listen to subscriptions
      const unsubscribeSubscriptions = createRealtimeListener.subscriptions(user.uid, (subscriptions) => {
        const activeSubs = subscriptions.filter(sub => sub.active);
        setStats(prev => ({
          ...prev,
          totalSubscriptions: subscriptions.length,
          activeSubscriptions: activeSubs.length
        }));
      });
      unsubscribeFunctions.push(unsubscribeSubscriptions);

      // Listen to screen time
      const unsubscribeScreenTime = createRealtimeListener.screenTime(user.uid, (screenTimeData) => {
        const last7Days = screenTimeData.slice(0, 7);
        const weeklyHours = last7Days.reduce((sum, day) => sum + (day.hours || 0), 0);
        setStats(prev => ({
          ...prev,
          weeklyScreenTime: parseFloat(weeklyHours.toFixed(1))
        }));
      });
      unsubscribeFunctions.push(unsubscribeScreenTime);

      // Listen to password checks
      const unsubscribePasswordChecks = createRealtimeListener.passwordChecks(user.uid, (checks) => {
        const breaches = checks.filter(check => check.isBreached).length;
        setStats(prev => ({
          ...prev,
          passwordChecks: checks.length,
          totalBreaches: breaches,
          securityScore: Math.max(100 - (breaches * 10) - ((checks.length - breaches) * 2), 50)
        }));
      });
      unsubscribeFunctions.push(unsubscribePasswordChecks);

      // Listen to phishing scans
      const unsubscribePhishingScans = createRealtimeListener.phishingScans(user.uid, (scans) => {
        setStats(prev => ({
          ...prev,
          phishingScans: scans.length
        }));
      });
      unsubscribeFunctions.push(unsubscribePhishingScans);
    };

    setupRealtimeListeners();
    setLoading(false);

    // Cleanup function
    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }, [user]);

  // Generate recent activities
  useEffect(() => {
    if (!user) return;

    // This would ideally come from a dedicated activities collection
    // For now, we'll simulate based on stats
    const activities: RecentActivity[] = [];

    if (stats.passwordChecks > 0) {
      activities.push({
        type: 'password',
        title: 'Password Security Checked',
        description: `${stats.totalBreaches} breaches found in ${stats.passwordChecks} checks`,
        timestamp: new Date(Date.now() - 300000), // 5 minutes ago
        icon: Shield,
        color: 'text-green-500'
      });
    }

    if (stats.totalTasks > 0) {
      activities.push({
        type: 'task',
        title: 'Tasks Updated',
        description: `${stats.completedTasks} completed out of ${stats.totalTasks} total tasks`,
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
        icon: CheckSquare,
        color: 'text-blue-500'
      });
    }

    if (stats.weeklyScreenTime > 0) {
      activities.push({
        type: 'screen_time',
        title: 'Screen Time Tracked',
        description: `${stats.weeklyScreenTime}h used this week`,
        timestamp: new Date(Date.now() - 7200000), // 2 hours ago
        icon: Clock,
        color: 'text-orange-500'
      });
    }

    if (stats.phishingScans > 0) {
      activities.push({
        type: 'phishing_scan',
        title: 'URL Security Scanned',
        description: `${stats.phishingScans} URLs checked for threats`,
        timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
        icon: AlertTriangle,
        color: 'text-red-500'
      });
    }

    if (stats.activeSubscriptions > 0) {
      activities.push({
        type: 'subscription',
        title: 'Subscriptions Active',
        description: `${stats.activeSubscriptions} active subscriptions`,
        timestamp: new Date(Date.now() - 86400000), // 1 day ago
        icon: Calendar,
        color: 'text-purple-500'
      });
    }

    // Sort by timestamp (most recent first)
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    setRecentActivities(activities.slice(0, 5));
  }, [stats, user]);

  const quickActions = [
    {
      title: 'Add Task',
      description: 'Create a new task or reminder',
      icon: CheckSquare,
      onClick: () => setActiveTab('todos'),
      color: 'bg-blue-50 hover:bg-blue-100 border-blue-200'
    },
    {
      title: 'Check Password',
      description: 'Verify password strength & breaches',
      icon: Shield,
      onClick: () => setActiveTab('password-checker'),
      color: 'bg-green-50 hover:bg-green-100 border-green-200'
    },
    {
      title: 'Scan URL',
      description: 'Check for phishing & malware',
      icon: AlertTriangle,
      onClick: () => setActiveTab('phishing-scanner'),
      color: 'bg-red-50 hover:bg-red-100 border-red-200'
    },
    {
      title: 'Track Screen Time',
      description: 'Monitor your digital usage',
      icon: Clock,
      onClick: () => setActiveTab('screen-time'),
      color: 'bg-orange-50 hover:bg-orange-100 border-orange-200'
    },
    {
      title: 'Add Asset',
      description: 'Register a digital account',
      icon: Users,
      onClick: () => setActiveTab('digital-property'),
      color: 'bg-purple-50 hover:bg-purple-100 border-purple-200'
    },
    {
      title: 'Manage Subscriptions',
      description: 'Track recurring payments',
      icon: Calendar,
      onClick: () => setActiveTab('subscriptions'),
      color: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200'
    },
    {
      title: 'Security Guide',
      description: 'Learn best practices',
      icon: ExternalLink,
      onClick: () => setActiveTab('security-guide'),
      color: 'bg-gray-50 hover:bg-gray-100 border-gray-200'
    },
    {
      title: 'View All Data',
      description: 'Complete dashboard',
      icon: Activity,
      onClick: () => window.location.reload(), // Refresh to load latest
      color: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200'
    }
  ];

  const getSecurityStatus = () => {
    if (stats.securityScore >= 90) return { text: 'Excellent', color: 'text-green-600', bg: 'bg-green-100' };
    if (stats.securityScore >= 75) return { text: 'Good', color: 'text-green-500', bg: 'bg-green-50' };
    if (stats.securityScore >= 60) return { text: 'Fair', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { text: 'Needs Attention', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const securityStatus = getSecurityStatus();

  if (!user) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Welcome to My Space!</h1>
          <p className="text-gray-600">Please login to access your personalized dashboard</p>
        </div>
        
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="bg-white p-4 rounded-lg shadow flex-shrink-0">
              <Shield className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-2">Secure Digital Life Manager</h3>
              <p className="text-gray-600 mb-4 text-sm sm:text-base">
                Track your passwords, subscriptions, screen time, and digital assets in one secure place.
              </p>
              <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <div className="text-center bg-white p-2 sm:p-3 rounded-lg border">
                  <CheckSquare className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 mx-auto mb-1 sm:mb-2" />
                  <p className="text-xs sm:text-sm font-medium">Task Manager</p>
                </div>
                <div className="text-center bg-white p-2 sm:p-3 rounded-lg border">
                  <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 mx-auto mb-1 sm:mb-2" />
                  <p className="text-xs sm:text-sm font-medium">Password Checker</p>
                </div>
                <div className="text-center bg-white p-2 sm:p-3 rounded-lg border">
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 mx-auto mb-1 sm:mb-2" />
                  <p className="text-xs sm:text-sm font-medium">Phishing Scanner</p>
                </div>
                <div className="text-center bg-white p-2 sm:p-3 rounded-lg border">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500 mx-auto mb-1 sm:mb-2" />
                  <p className="text-xs sm:text-sm font-medium">Screen Tracker</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-gray-600 text-sm sm:text-base">Loading your data...</p>
        </div>
        <div className="flex justify-center items-center h-48 sm:h-64">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-black"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-3 xs:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Welcome back{user.displayName ? `, ${user.displayName}` : ''}!</h1>
          <p className="text-gray-600 text-sm sm:text-base">Here's an overview of your digital life</p>
        </div>
        <div className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full ${securityStatus.bg} ${securityStatus.color} font-medium flex items-center space-x-2 text-sm sm:text-base`}>
          <div className={`w-2 h-2 rounded-full ${securityStatus.color.replace('text-', 'bg-')}`}></div>
          <span>{securityStatus.text} Security</span>
        </div>
      </div>

      {/* Stats Grid - UPDATED RESPONSIVE GRID */}
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <div 
          className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow cursor-pointer min-h-[120px] sm:min-h-0"
          onClick={() => setActiveTab('todos')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Tasks</p>
              <p className="text-2xl sm:text-3xl font-bold">{stats.completedTasks}/{stats.totalTasks}</p>
            </div>
            <CheckSquare className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400" />
          </div>
          <div className="mt-3 sm:mt-4 flex items-center">
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-1" />
            <span className="text-xs sm:text-sm text-gray-600">
              {stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}% completed
            </span>
          </div>
        </div>

        <div 
          className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow cursor-pointer min-h-[120px] sm:min-h-0"
          onClick={() => setActiveTab('digital-property')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Digital Assets</p>
              <p className="text-2xl sm:text-3xl font-bold">{stats.totalAccounts}</p>
            </div>
            <Users className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400" />
          </div>
          <div className="mt-3 sm:mt-4 flex items-center">
            <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500 mr-1" />
            <span className="text-xs sm:text-sm text-gray-600">Tracked accounts</span>
          </div>
        </div>

        <div 
          className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow cursor-pointer min-h-[120px] sm:min-h-0"
          onClick={() => setActiveTab('screen-time')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Weekly Screen Time</p>
              <p className="text-2xl sm:text-3xl font-bold">{stats.weeklyScreenTime}h</p>
            </div>
            <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-orange-400" />
          </div>
          <div className="mt-3 sm:mt-4 flex items-center">
            <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500 mr-1" />
            <span className="text-xs sm:text-sm text-gray-600">This week</span>
          </div>
        </div>

        <div 
          className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow cursor-pointer min-h-[120px] sm:min-h-0"
          onClick={() => setActiveTab('password-checker')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Security Score</p>
              <div className="flex items-center space-x-2">
                <p className="text-2xl sm:text-3xl font-bold">{stats.securityScore}%</p>
                <div className="flex items-center">
                  {stats.totalBreaches > 0 && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 sm:py-1 rounded-full">
                      {stats.totalBreaches} breach{stats.totalBreaches !== 1 ? 'es' : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-green-400" />
          </div>
          <div className="mt-3 sm:mt-4 flex items-center justify-between">
            <div className="flex items-center">
              <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full mr-1 ${securityStatus.color.replace('text-', 'bg-')}`} />
              <span className="text-xs sm:text-sm text-gray-600">{securityStatus.text}</span>
            </div>
            <span className="text-xs text-gray-500">{stats.passwordChecks} checks</span>
          </div>
        </div>
      </div>

      {/* Quick Actions - UPDATED RESPONSIVE GRID */}
      <div>
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-lg sm:text-xl font-bold">Quick Actions</h2>
          <button 
            onClick={() => window.location.reload()}
            className="flex items-center space-x-1 text-xs sm:text-sm text-gray-600 hover:text-black min-h-[44px] min-w-[44px]"
            aria-label="Refresh Data"
          >
            <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Refresh Data</span>
          </button>
        </div>
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={action.onClick}
                className={`p-4 sm:p-5 rounded-lg border text-left transition-all hover:scale-[1.02] min-h-[120px] sm:min-h-0 ${action.color}`}
                aria-label={action.title}
              >
                <Icon className="w-5 h-5 sm:w-6 sm:h-6 mb-2 sm:mb-3" />
                <h3 className="font-semibold mb-1 text-sm sm:text-base">{action.title}</h3>
                <p className="text-xs sm:text-sm text-gray-600">{action.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detailed Stats - UPDATED RESPONSIVE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Security Stats */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 flex items-center">
            <Shield className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-green-500" />
            Security Overview
          </h3>
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm text-gray-600">Password Checks</span>
              <span className="font-medium text-sm sm:text-base">{stats.passwordChecks}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm text-gray-600">Data Breaches Found</span>
              <span className={`font-medium text-sm sm:text-base ${stats.totalBreaches > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {stats.totalBreaches}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm text-gray-600">URL Scans</span>
              <span className="font-medium text-sm sm:text-base">{stats.phishingScans}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm text-gray-600">Active Subscriptions</span>
              <span className="font-medium text-sm sm:text-base">{stats.activeSubscriptions}/{stats.totalSubscriptions}</span>
            </div>
          </div>
          <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-gray-600">Security Progress</span>
              <span className="font-medium">{stats.securityScore}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2 mt-1 sm:mt-2">
              <div 
                className={`h-1.5 sm:h-2 rounded-full ${stats.securityScore >= 80 ? 'bg-green-500' : stats.securityScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${stats.securityScore}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4">Recent Activity</h3>
          <div className="space-y-3 sm:space-y-4">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity, index) => {
                const Icon = activity.icon;
                return (
                  <div key={index} className="flex items-start space-x-3 sm:space-x-4">
                    <div className={`p-1.5 sm:p-2 rounded-lg ${activity.color.replace('text-', 'bg-').replace('500', '100')} flex-shrink-0`}>
                      <Icon className={`w-3 h-3 sm:w-4 sm:h-4 ${activity.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium truncate">{activity.title}</p>
                      <p className="text-xs text-gray-500 truncate">{activity.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {activity.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-3 sm:py-4">
                <p className="text-gray-500 text-sm sm:text-base">No recent activity yet</p>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">Start using the app to see activity here</p>
              </div>
            )}
          </div>
          {recentActivities.length > 0 && (
            <button
              onClick={() => {
                // You could add a dedicated activities page
                alert('This would show complete activity history');
              }}
              className="w-full mt-3 sm:mt-4 text-center text-xs sm:text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View All Activity →
            </button>
          )}
        </div>
      </div>

      {/* Tips & Recommendations */}
      {stats.totalBreaches > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 sm:p-6">
          <div className="flex flex-col xs:flex-row items-start xs:items-center space-y-3 xs:space-y-0 xs:space-x-4">
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-bold text-red-800 mb-1 sm:mb-2 text-sm sm:text-base">Security Alert</h4>
              <p className="text-red-700 mb-2 text-xs sm:text-sm">
                {stats.totalBreaches === 1 
                  ? '1 password was found in data breaches. Consider changing it immediately.' 
                  : `${stats.totalBreaches} passwords were found in data breaches. Consider changing them immediately.`
                }
              </p>
              <button
                onClick={() => setActiveTab('password-checker')}
                className="text-xs sm:text-sm bg-red-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg hover:bg-red-700 transition-colors min-h-[44px] min-w-[44px]"
              >
                Check Passwords Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;