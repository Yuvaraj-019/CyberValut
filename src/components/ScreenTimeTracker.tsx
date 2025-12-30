import React, { useState, useEffect, useRef } from 'react';
import { Clock, TrendingUp, TrendingDown, Smartphone, Monitor, Tablet, BarChart, Calendar, Target, Battery, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { screenTimeService, createRealtimeListener } from '../services/databaseService';
import { activityService } from '../services/databaseService';

const ScreenTimeTracker: React.FC = () => {
  const { user } = useAuth();
  const [screenTimeData, setScreenTimeData] = useState<any[]>([]);
  const [todayHours, setTodayHours] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(4); // 4 hours default
  const [appUsage, setAppUsage] = useState<{ name: string; time: number }[]>([
    { name: 'Browser', time: 2.5 },
    { name: 'Social Media', time: 1.8 },
    { name: 'Productivity', time: 3.2 },
    { name: 'Entertainment', time: 1.5 },
    { name: 'Communication', time: 1.0 }
  ]);
  const [isTracking, setIsTracking] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [totalHours, setTotalHours] = useState(0);
  const trackerRef = useRef<NodeJS.Timeout | null>(null);
  const [loading, setLoading] = useState(true);

  // Load screen time data in real-time
  useEffect(() => {
    if (!user) {
      setScreenTimeData([]);
      setLoading(false);
      return;
    }

    const unsubscribe = createRealtimeListener.screenTime(user.uid, (data) => {
      setScreenTimeData(data);
      setLoading(false);
      
      // Calculate today's hours
      const today = new Date().toISOString().split('T')[0];
      const todayData = data.find(d => d.date === today);
      setTodayHours(todayData?.hours || 0);
    });

    activityService.logActivity(user.uid, 'VIEWED_SCREEN_TIME');

    return () => unsubscribe();
  }, [user]);

  // Start/stop tracking
  useEffect(() => {
    if (isTracking && startTime) {
      trackerRef.current = setInterval(() => {
        const currentTime = Date.now();
        const elapsedHours = (currentTime - startTime) / (1000 * 60 * 60);
        setTotalHours(elapsedHours);
      }, 60000); // Update every minute
    } else if (trackerRef.current) {
      clearInterval(trackerRef.current);
    }

    return () => {
      if (trackerRef.current) {
        clearInterval(trackerRef.current);
      }
    };
  }, [isTracking, startTime]);

  const startTracking = () => {
    setIsTracking(true);
    setStartTime(Date.now());
    setTotalHours(0);
    
    if (user) {
      activityService.logActivity(user.uid, 'STARTED_SCREEN_TIME_TRACKING');
    }
  };

  const stopTracking = async () => {
    setIsTracking(false);
    
    if (user && totalHours > 0) {
      try {
        await screenTimeService.addScreenTime(user.uid, {
          date: new Date().toISOString().split('T')[0],
          hours: parseFloat(totalHours.toFixed(2)),
          apps: appUsage
        });
        
        activityService.logActivity(user.uid, 'STOPPED_SCREEN_TIME_TRACKING', {
          hours: totalHours,
          date: new Date().toISOString().split('T')[0]
        });
      } catch (error) {
        console.error('Error saving screen time:', error);
      }
    }
  };

  const getWeeklyData = () => {
    const last7Days = screenTimeData.slice(0, 7);
    return last7Days.map(day => ({
      date: day.date.split('-').slice(1).join('/'),
      hours: day.hours
    }));
  };

  const getDailyAverage = () => {
    if (screenTimeData.length === 0) return 0;
    const total = screenTimeData.reduce((sum, day) => sum + day.hours, 0);
    return total / screenTimeData.length;
  };

  const getMostUsedApp = () => {
    if (appUsage.length === 0) return 'None';
    return appUsage.reduce((max, app) => app.time > max.time ? app : max).name;
  };

  const getLimitStatus = () => {
    const percentage = (todayHours / dailyLimit) * 100;
    if (percentage >= 100) return { status: 'Exceeded', color: 'text-red-600' };
    if (percentage >= 80) return { status: 'Warning', color: 'text-yellow-600' };
    return { status: 'Good', color: 'text-green-600' };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Screen Time Tracker</h1>
            <p className="text-gray-600 text-sm sm:text-base">Loading your screen time data...</p>
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
          <h1 className="text-xl sm:text-2xl font-bold">Screen Time Tracker</h1>
          <p className="text-gray-600 text-sm sm:text-base">Monitor and manage your digital usage</p>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <Target className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
            <span className="text-xs sm:text-sm text-gray-600">Limit: {dailyLimit}h</span>
          </div>
          <button
            onClick={isTracking ? stopTracking : startTracking}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors flex items-center space-x-1 sm:space-x-2 min-h-[44px] text-xs sm:text-base ${
              isTracking 
                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>{isTracking ? 'Stop' : 'Start'}</span>
          </button>
        </div>
      </div>

      {/* Stats - UPDATED RESPONSIVE GRID */}
      <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-600">Today's Usage</p>
          <div className="flex items-center justify-between">
            <p className="text-xl sm:text-2xl font-bold">{todayHours.toFixed(1)}h</p>
            {isTracking && (
              <span className="text-xs sm:text-sm text-green-600 animate-pulse">Live</span>
            )}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-600">Daily Limit</p>
          <div className="flex items-center justify-between">
            <p className="text-xl sm:text-2xl font-bold">{dailyLimit}h</p>
            <span className={`text-xs sm:text-sm ${getLimitStatus().color}`}>
              {getLimitStatus().status}
            </span>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-600">Daily Average</p>
          <p className="text-xl sm:text-2xl font-bold">{getDailyAverage().toFixed(1)}h</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-600">Most Used</p>
          <p className="text-xl sm:text-2xl font-bold truncate">{getMostUsedApp()}</p>
        </div>
      </div>

      {/* Progress and Controls - UPDATED RESPONSIVE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Progress */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="font-semibold text-sm sm:text-base">Today's Progress</h3>
            <span className={`text-xs sm:text-sm ${getLimitStatus().color}`}>
              {((todayHours / dailyLimit) * 100).toFixed(0)}% of limit
            </span>
          </div>
          
          <div className="mb-4 sm:mb-6">
            <div className="w-full bg-gray-200 rounded-full h-3 sm:h-4">
              <div 
                className={`h-3 sm:h-4 rounded-full ${
                  todayHours >= dailyLimit ? 'bg-red-500' : 
                  todayHours >= dailyLimit * 0.8 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ 
                  width: `${Math.min((todayHours / dailyLimit) * 100, 100)}%` 
                }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-600 mt-1 sm:mt-2">
              <span>0h</span>
              <span>{dailyLimit}h</span>
            </div>
          </div>

          {isTracking && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-800 text-sm sm:text-base">Currently Tracking</p>
                    <p className="text-xs sm:text-sm text-blue-600">
                      Session: {totalHours.toFixed(2)} hours
                    </p>
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-blue-700">
                  {totalHours.toFixed(2)}h
                </div>
              </div>
            </div>
          )}

          {/* Weekly Chart */}
          <div>
            <h4 className="font-medium text-sm sm:text-base mb-3 sm:mb-4">Last 7 Days</h4>
            <div className="flex items-end h-32 sm:h-40 space-x-1 sm:space-x-2">
              {getWeeklyData().map((day, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-blue-500 rounded-t-lg transition-all hover:bg-blue-600"
                    style={{ 
                      height: `${Math.min((day.hours / 10) * 100, 100)}%`,
                      backgroundColor: day.hours > dailyLimit ? '#ef4444' : '#3b82f6'
                    }}
                    title={`${day.date}: ${day.hours}h`}
                  ></div>
                  <span className="text-xs text-gray-600 mt-2">{day.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Controls and Insights */}
        <div className="space-y-4 sm:space-y-6">
          {/* Limit Control */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
            <h3 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">Daily Limit</h3>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <span className="text-xs sm:text-sm text-gray-600">Hours per day</span>
                  <span className="font-medium text-sm sm:text-base">{dailyLimit}h</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="12"
                  step="0.5"
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1h</span>
                  <span>6h</span>
                  <span>12h</span>
                </div>
              </div>
              
              <button
                onClick={() => setDailyLimit(4)}
                className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors text-xs sm:text-sm min-h-[44px]"
              >
                Reset to Default (4h)
              </button>
            </div>
          </div>

          {/* App Usage */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
            <h3 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">App Usage</h3>
            <div className="space-y-2 sm:space-y-3">
              {appUsage.map((app, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      {index === 0 ? <Monitor className="w-3 h-3 sm:w-4 sm:h-4" /> :
                       index === 1 ? <Smartphone className="w-3 h-3 sm:w-4 sm:h-4" /> :
                       <Tablet className="w-3 h-3 sm:w-4 sm:h-4" />}
                    </div>
                    <span className="text-xs sm:text-sm truncate">{app.name}</span>
                  </div>
                  <span className="font-medium text-xs sm:text-sm">{app.time}h</span>
                </div>
              ))}
            </div>
          </div>

          {/* Insights */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
            <h3 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">Weekly Insights</h3>
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-gray-600">Total This Week</span>
                <span className="font-medium text-xs sm:text-sm">
                  {screenTimeData.slice(0, 7).reduce((sum, day) => sum + day.hours, 0).toFixed(1)}h
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-gray-600">Average Daily</span>
                <span className="font-medium text-xs sm:text-sm">{getDailyAverage().toFixed(1)}h</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-gray-600">Limit Days</span>
                <span className="font-medium text-xs sm:text-sm">
                  {screenTimeData.filter(day => day.hours <= dailyLimit).length} of {screenTimeData.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!user && (
        <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-lg">
          <Clock className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold mb-2">Login to Track Screen Time</h3>
          <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">
            Sign in to track your screen time, set limits, and view analytics.
          </p>
          <p className="text-xs sm:text-sm text-gray-500">
            Your data is stored securely and privately in your account.
          </p>
        </div>
      )}
    </div>
  );
};

export default ScreenTimeTracker;