import React, { useState, useEffect } from 'react';
import { Shield, User, CheckSquare, Clock, AlertTriangle, Lock, CreditCard, Link, LogOut, Menu, X, Smartphone } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import DigitalPropertyTracker from './components/DigitalPropertyTracker';
import TodoManager from './components/TodoManager';
import ScreenTimeTracker from './components/ScreenTimeTracker';
import CybersecurityGuide from './components/CybersecurityGuide';
import PasswordChecker from './components/PasswordChecker';
import SubscriptionTracker from './components/SubscriptionTracker';
import PhishingScanner from './components/PhishingScanner';

type ActiveTab = 'dashboard' | 'digital-property' | 'todos' | 'screen-time' | 'security-guide' | 'password-checker' | 'subscriptions' | 'phishing-scanner';

function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isMobileMenuOpen && !target.closest('.mobile-menu') && !target.closest('.menu-button')) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isMobileMenuOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activeTab]);

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: User, color: 'text-blue-600' },
    { id: 'digital-property', label: 'Digital Assets', icon: Shield, color: 'text-purple-600' },
    { id: 'todos', label: 'Tasks', icon: CheckSquare, color: 'text-green-600' },
    { id: 'screen-time', label: 'Screen Time', icon: Clock, color: 'text-orange-600' },
    { id: 'security-guide', label: 'Security Guide', icon: AlertTriangle, color: 'text-yellow-600' },
    { id: 'password-checker', label: 'Password Checker', icon: Lock, color: 'text-red-600' },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard, color: 'text-indigo-600' },
    { id: 'phishing-scanner', label: 'Link Scanner', icon: Link, color: 'text-pink-600' },
  ];

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} />;
      case 'digital-property':
        return <DigitalPropertyTracker />;
      case 'todos':
        return <TodoManager />;
      case 'screen-time':
        return <ScreenTimeTracker />;
      case 'security-guide':
        return <CybersecurityGuide />;
      case 'password-checker':
        return <PasswordChecker />;
      case 'subscriptions':
        return <SubscriptionTracker />;
      case 'phishing-scanner':
        return <PhishingScanner />;
      default:
        return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header - Fixed for mobile */}
      <header className="border-b border-gray-200 bg-white fixed top-0 left-0 right-0 z-50 safe-top">
        <div className="container-responsive">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 menu-button"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">My Space</h1>
                  <p className="text-xs text-gray-600 hidden sm:block">
                    Welcome, {user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'User'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Mobile indicator */}
              <div className="lg:hidden flex items-center text-sm text-gray-500">
                <Smartphone className="w-4 h-4 mr-1" />
                <span className="hidden xs:inline">Mobile</span>
              </div>
              
              <button
                onClick={logout}
                className="btn-touch flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* Sidebar for Desktop, Drawer for Mobile */}
      <div className="flex pt-14 lg:pt-16"> {/* Added padding for fixed header */}
        {/* Desktop Sidebar */}
        <nav className="hidden lg:block w-64 min-h-[calc(100vh-4rem)] bg-gray-50 border-r border-gray-200 fixed left-0 top-16 bottom-0 overflow-y-auto">
          <div className="p-4">
            <div className="mb-6 px-2">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Navigation</h3>
            </div>
            <ul className="space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => setActiveTab(item.id as ActiveTab)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                        activeTab === item.id
                          ? 'bg-black text-white shadow-md'
                          : 'text-gray-700 hover:bg-gray-100 hover:shadow-sm'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${activeTab === item.id ? 'text-white' : item.color}`} />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        {/* Mobile Sidebar Drawer */}
        <div className={`mobile-menu fixed top-14 left-0 bottom-0 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out z-40 lg:hidden overflow-y-auto safe-bottom ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="p-4">
            <div className="mb-6 px-2">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Menu</h3>
            </div>
            <ul className="space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => setActiveTab(item.id as ActiveTab)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                        activeTab === item.id
                          ? 'bg-black text-white shadow-md'
                          : 'text-gray-700 hover:bg-gray-100 hover:shadow-sm'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${activeTab === item.id ? 'text-white' : item.color}`} />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Main Content */}
        <main className={`flex-1 transition-all duration-300 ${
          isMobileMenuOpen ? 'lg:ml-0' : 'lg:ml-64'
        }`}>
          <div className="container-responsive py-6">
            {renderActiveComponent()}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-bottom">
        <div className="flex justify-around items-center h-16">
          {navigationItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as ActiveTab)}
                className="flex flex-col items-center justify-center flex-1 btn-touch"
                aria-label={item.label}
              >
                <div className={`p-2 rounded-lg ${isActive ? 'bg-black' : ''}`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                </div>
                <span className={`text-xs mt-1 ${isActive ? 'text-black font-medium' : 'text-gray-500'}`}>
                  {item.label.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Add padding for bottom nav on mobile */}
      <div className="lg:hidden h-16"></div>
    </div>
  );
}

export default App;