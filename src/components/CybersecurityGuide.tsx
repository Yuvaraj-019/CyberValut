import React, { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, Eye, Lock, Wifi, CreditCard, Smartphone, Globe } from 'lucide-react';

interface SecurityTip {
  id: string;
  title: string;
  description: string;
  steps: string[];
  priority: 'high' | 'medium' | 'low';
  category: 'password' | 'network' | 'privacy' | 'device' | 'financial' | 'general';
  icon: any;
}

const CybersecurityGuide: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [completedTips, setCompletedTips] = useState<Set<string>>(
    new Set(JSON.parse(localStorage.getItem('myspace-completed-tips') || '[]'))
  );

  const securityTips: SecurityTip[] = [
    {
      id: '1',
      title: 'Enable Two-Factor Authentication',
      description: 'Add an extra layer of security to your accounts',
      steps: [
        'Go to your account security settings',
        'Find "Two-Factor Authentication" or "2FA" option',
        'Choose SMS, app-based, or hardware key method',
        'Follow the setup instructions',
        'Save backup codes in a secure location',
        'Test the login process to ensure it works'
      ],
      priority: 'high',
      category: 'password',
      icon: Lock
    },
    {
      id: '2',
      title: 'Create Strong Passwords',
      description: 'Use unique, complex passwords for every account',
      steps: [
        'Use at least 12 characters',
        'Include uppercase, lowercase, numbers, and symbols',
        'Avoid dictionary words and personal information',
        'Never reuse passwords across accounts',
        'Consider using a password manager',
        'Update passwords regularly (every 3-6 months)'
      ],
      priority: 'high',
      category: 'password',
      icon: Lock
    },
    {
      id: '3',
      title: 'Secure Your Wi-Fi Network',
      description: 'Protect your home network from unauthorized access',
      steps: [
        'Change default router login credentials',
        'Use WPA3 encryption (or WPA2 if WPA3 unavailable)',
        'Create a strong network password',
        'Hide your network name (SSID) if possible',
        'Enable firewall on your router',
        'Regularly update router firmware',
        'Disable WPS if not needed'
      ],
      priority: 'high',
      category: 'network',
      icon: Wifi
    },
    {
      id: '4',
      title: 'Recognize Phishing Attempts',
      description: 'Identify and avoid fraudulent emails and websites',
      steps: [
        'Check sender email addresses carefully',
        'Look for spelling and grammar errors',
        'Hover over links to see actual destination',
        'Be suspicious of urgent or threatening language',
        'Verify requests through official channels',
        'Never provide sensitive info via email',
        'Report suspicious emails to your IT team'
      ],
      priority: 'high',
      category: 'general',
      icon: AlertTriangle
    },
    {
      id: '5',
      title: 'Keep Software Updated',
      description: 'Install security patches promptly',
      steps: [
        'Enable automatic updates when possible',
        'Regularly check for OS updates',
        'Update all applications and browsers',
        'Install security patches immediately',
        'Remove unused software',
        'Use official app stores for downloads'
      ],
      priority: 'medium',
      category: 'device',
      icon: Smartphone
    },
    {
      id: '6',
      title: 'Review Privacy Settings',
      description: 'Control what information you share online',
      steps: [
        'Review social media privacy settings',
        'Limit personal information visibility',
        'Control who can see your posts and photos',
        'Disable location sharing when not needed',
        'Review app permissions regularly',
        'Be selective about friend/connection requests',
        'Consider what you post publicly'
      ],
      priority: 'medium',
      category: 'privacy',
      icon: Eye
    },
    {
      id: '7',
      title: 'Secure Online Shopping',
      description: 'Protect your financial information while shopping',
      steps: [
        'Only shop on secure websites (https://)',
        'Use credit cards instead of debit cards',
        'Avoid public Wi-Fi for financial transactions',
        'Check bank statements regularly',
        'Use secure payment services (PayPal, Apple Pay)',
        'Be cautious of deals that seem too good to be true',
        'Read seller reviews and ratings'
      ],
      priority: 'medium',
      category: 'financial',
      icon: CreditCard
    },
    {
      id: '8',
      title: 'Safe Browsing Habits',
      description: 'Navigate the internet securely',
      steps: [
        'Use reputable browsers with security features',
        'Install ad blockers and anti-tracking extensions',
        'Be cautious with downloads from unknown sites',
        'Clear browser data regularly',
        'Use private/incognito mode for sensitive browsing',
        'Avoid clicking suspicious links',
        'Verify website authenticity before entering data'
      ],
      priority: 'low',
      category: 'general',
      icon: Globe
    }
  ];

  const categories = [
    { id: 'all', label: 'All Tips', icon: Shield },
    { id: 'password', label: 'Passwords', icon: Lock },
    { id: 'network', label: 'Network', icon: Wifi },
    { id: 'privacy', label: 'Privacy', icon: Eye },
    { id: 'device', label: 'Device', icon: Smartphone },
    { id: 'financial', label: 'Financial', icon: CreditCard },
    { id: 'general', label: 'General', icon: Globe }
  ];

  const toggleCompletion = (tipId: string) => {
    const newCompleted = new Set(completedTips);
    if (newCompleted.has(tipId)) {
      newCompleted.delete(tipId);
    } else {
      newCompleted.add(tipId);
    }
    setCompletedTips(newCompleted);
    localStorage.setItem('myspace-completed-tips', JSON.stringify([...newCompleted]));
  };

  const filteredTips = selectedCategory === 'all' 
    ? securityTips 
    : securityTips.filter(tip => tip.category === selectedCategory);

  const getPriorityColor = (priority: string) => {
    const colors = {
      high: 'bg-red-100 text-red-800 border-red-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-green-100 text-green-800 border-green-200'
    };
    return colors[priority as keyof typeof colors] || colors.low;
  };

  const completionRate = Math.round((completedTips.size / securityTips.length) * 100);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Cybersecurity Guide</h1>
          <p className="text-gray-600">Essential security practices to protect your digital life</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{completionRate}%</div>
          <div className="text-sm text-gray-600">Completed</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Security Progress</h3>
          <span className="text-sm text-gray-600">{completedTips.size} of {securityTips.length} completed</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-black rounded-full h-3 transition-all duration-300"
            style={{ width: `${completionRate}%` }}
          ></div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">High Priority</p>
          <p className="text-2xl font-bold text-red-600">
            {securityTips.filter(tip => tip.priority === 'high').length}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Medium Priority</p>
          <p className="text-2xl font-bold text-yellow-600">
            {securityTips.filter(tip => tip.priority === 'medium').length}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Low Priority</p>
          <p className="text-2xl font-bold text-green-600">
            {securityTips.filter(tip => tip.priority === 'low').length}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Completed</p>
          <p className="text-2xl font-bold">{completedTips.size}</p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex space-x-2 overflow-x-auto">
        {categories.map(category => {
          const Icon = category.icon;
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === category.id
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{category.label}</span>
            </button>
          );
        })}
      </div>

      {/* Security Tips */}
      <div className="space-y-6">
        {filteredTips
          .sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
          })
          .map(tip => {
            const Icon = tip.icon;
            const isCompleted = completedTips.has(tip.id);
            
            return (
              <div key={tip.id} className={`bg-white border border-gray-200 rounded-lg p-6 ${isCompleted ? 'opacity-75' : ''}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3">
                    <Icon className="w-6 h-6 text-gray-700" />
                    <div>
                      <h3 className={`text-lg font-semibold ${isCompleted ? 'line-through text-gray-500' : ''}`}>
                        {tip.title}
                      </h3>
                      <p className="text-gray-600">{tip.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-sm border ${getPriorityColor(tip.priority)}`}>
                      {tip.priority} priority
                    </span>
                    <button
                      onClick={() => toggleCompletion(tip.id)}
                      className={`transition-colors ${
                        isCompleted ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      <CheckCircle className="w-6 h-6" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-800">Steps to implement:</h4>
                  <ol className="space-y-2">
                    {tip.steps.map((step, index) => (
                      <li key={index} className="flex items-start space-x-3">
                        <span className="bg-gray-800 text-white text-sm w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <span className={`text-gray-700 ${isCompleted ? 'line-through text-gray-500' : ''}`}>
                          {step}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default CybersecurityGuide;