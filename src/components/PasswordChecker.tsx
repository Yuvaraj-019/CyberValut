import React, { useState, useEffect } from 'react';
import { Lock, Shield, AlertCircle, CheckCircle, Copy, Eye, EyeOff, RefreshCw, Database, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { passwordStrengthChecker, passwordService, createRealtimeListener } from '../services/databaseService';
import { activityService } from '../services/databaseService';

const PasswordChecker: React.FC = () => {
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [website, setWebsite] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    strength: 'weak' | 'medium' | 'strong';
    feedback: string[];
    isBreached: boolean;
    breachCount: number;
    breachDetails: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

  // Load password history in real-time
  useEffect(() => {
    if (!user) {
      setHistory([]);
      return;
    }

    const unsubscribe = createRealtimeListener.passwordChecks(user.uid, (checks) => {
      setHistory(checks);
    });

    activityService.logActivity(user.uid, 'VIEWED_PASSWORD_CHECKER');

    return () => unsubscribe();
  }, [user]);

  const checkPassword = async () => {
    if (!password.trim()) return;
    
    setLoading(true);
    try {
      // Local strength check
      const strengthResult = passwordStrengthChecker.checkStrength(password);
      
      // API breach check (Have I Been Pwned)
      const breachResult = await passwordStrengthChecker.checkPasswordBreach(password);
      
      const finalResult = {
        ...strengthResult,
        isBreached: breachResult.isBreached,
        breachCount: breachResult.breachCount,
        breachDetails: breachResult.details
      };
      
      setResult(finalResult);
      
      // Save to Firebase if user is logged in
      if (user) {
        await passwordService.addPasswordCheck(user.uid, {
          website: website || 'Manual Check',
          username: username || 'N/A',
          strength: finalResult.strength,
          isBreached: finalResult.isBreached,
          breachCount: finalResult.breachCount
        });
        
        activityService.logActivity(user.uid, 'CHECKED_PASSWORD', {
          strength: finalResult.strength,
          isBreached: finalResult.isBreached,
          breachCount: finalResult.breachCount
        });
      }
      
    } catch (error) {
      console.error('Password check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const deletePasswordCheck = async (checkId: string) => {
  if (!user || !confirm('Are you sure you want to delete this password check?')) return;
  
  console.log('Attempting to delete password check:', checkId);
  console.log('User ID:', user.uid);
  
  try {
    // Use the service method
    await passwordService.deletePasswordCheck(user.uid, checkId);
    
    // Remove from local state immediately for better UX
    setHistory(prev => prev.filter(check => check.id !== checkId));
    
    // Update stats
    const deletedCheck = history.find(check => check.id === checkId);
    if (deletedCheck) {
      // You can update your stats here if needed
    }
    
    activityService.logActivity(user.uid, 'DELETED_PASSWORD_CHECK', { checkId });
    
    console.log('Successfully deleted password check');
    
  } catch (error: any) {
    console.error('Error deleting password check:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    if (error.code === 'permission-denied') {
      alert('Permission denied. Please check your Firebase rules.');
    } else if (error.code === 'not-found') {
      alert('Check not found. It may have already been deleted.');
      // Still remove from local state
      setHistory(prev => prev.filter(check => check.id !== checkId));
    } else {
      alert(`Failed to delete password check: ${error.message || 'Unknown error'}`);
    }
  }
};

  const generatePassword = () => {
    const newPassword = passwordStrengthChecker.generateStrongPassword();
    setPassword(newPassword);
    setCopied(false);
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'strong': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'weak': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getBreachColor = (isBreached: boolean) => {
    return isBreached ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Password Security Checker</h1>
          <p className="text-gray-600 text-sm sm:text-base">Check password strength and data breaches</p>
        </div>
      </div>

      {/* Stats - UPDATED RESPONSIVE GRID */}
      <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-600">Total Checks</p>
          <p className="text-xl sm:text-2xl font-bold">{history.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-600">Strong Passwords</p>
          <p className="text-xl sm:text-2xl font-bold text-green-600">
            {history.filter(h => h.strength === 'strong').length}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-600">Breached</p>
          <p className="text-xl sm:text-2xl font-bold text-red-600">
            {history.filter(h => h.isBreached).length}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-600">Weak Passwords</p>
          <p className="text-xl sm:text-2xl font-bold text-yellow-600">
            {history.filter(h => h.strength === 'weak').length}
          </p>
        </div>
      </div>

      {/* Main Checker */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
        {/* Form Grid - UPDATED RESPONSIVE */}
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">Website/Service</label>
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-sm sm:text-base"
              placeholder="example.com"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">Username/Email</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-sm sm:text-base"
              placeholder="user@example.com"
            />
          </div>
          <div className="xs:col-span-2 md:col-span-1">
            <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-sm sm:text-base pr-20 sm:pr-24"
                placeholder="Enter password to check"
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-gray-600 hover:text-black min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={copyToClipboard}
                  className="p-1 text-gray-600 hover:text-black min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Copy password"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col xs:flex-row gap-3 sm:gap-4">
          <button
            onClick={checkPassword}
            disabled={loading || !password}
            className="bg-black text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 min-h-[44px] flex-1 xs:flex-none"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span className="text-sm sm:text-base">Checking...</span>
              </>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                <span className="text-sm sm:text-base">Check Security</span>
              </>
            )}
          </button>
          <button
            onClick={generatePassword}
            className="bg-gray-100 text-gray-700 px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2 min-h-[44px] flex-1 xs:flex-none"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="text-sm sm:text-base">Generate Strong Password</span>
          </button>
          {copied && (
            <div className="flex items-center justify-center text-green-600 text-sm sm:text-base">
              <CheckCircle className="w-4 h-4 mr-1" />
              <span>Copied!</span>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
          <h3 className="text-lg font-semibold mb-4">Security Analysis</h3>
          
          {/* Results Grid - UPDATED RESPONSIVE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Strength Results */}
            <div>
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h4 className="font-medium text-sm sm:text-base">Password Strength</h4>
                <span className={`px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm ${getStrengthColor(result.strength)}`}>
                  {result.strength.toUpperCase()}
                </span>
              </div>
              
              <div className="mb-3 sm:mb-4">
                <div className="flex items-center justify-between text-xs sm:text-sm mb-1 sm:mb-2">
                  <span>Strength Score</span>
                  <span>{result.score}/6</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                  <div 
                    className={`h-1.5 sm:h-2 rounded-full ${
                      result.score >= 5 ? 'bg-green-500' : 
                      result.score >= 3 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${(result.score / 6) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="space-y-1.5 sm:space-y-2">
                {result.feedback.map((feedback, index) => (
                  <div key={index} className="flex items-start space-x-2 text-xs sm:text-sm">
                    {feedback.startsWith('✅') ? (
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    ) : feedback.startsWith('⚠️') ? (
                      <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    ) : feedback.startsWith('❌') ? (
                      <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    ) : feedback.startsWith('🚫') ? (
                      <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    )}
                    <span className={feedback.startsWith('❌') || feedback.startsWith('🚫') ? 'text-red-700' : ''}>
                      {feedback}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Breach Results */}
            <div>
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h4 className="font-medium text-sm sm:text-base">Data Breach Check</h4>
                <span className={`px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm ${getBreachColor(result.isBreached)}`}>
                  {result.isBreached ? 'BREACHED' : 'SAFE'}
                </span>
              </div>
              
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <Database className={`w-6 h-6 sm:w-8 sm:h-8 ${result.isBreached ? 'text-red-600' : 'text-green-600'}`} />
                  <div>
                    <p className="font-medium text-sm sm:text-base">
                      {result.isBreached 
                        ? `Password found in ${result.breachCount} data breaches`
                        : 'No data breaches found'
                      }
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">{result.breachDetails}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2 sm:space-y-3">
                <h5 className="font-medium text-xs sm:text-sm text-gray-700">Security Tips:</h5>
                <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-600">
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Use at least 12 characters with mixed types</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Never reuse passwords across sites</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Consider using a password manager</span>
                  </li>
                  {result.isBreached && (
                    <li className="flex items-start space-x-2">
                      <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <span className="text-red-700">Change this password immediately!</span>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History with DELETE BUTTON */}
      {user && history.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent Checks</h3>
            <span className="text-sm text-gray-600">{history.length} total checks</span>
          </div>
          
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full min-w-full">
              <thead>
                <tr className="text-left text-xs sm:text-sm text-gray-600 border-b">
                  <th className="pb-3 px-4 sm:px-0">Website</th>
                  <th className="pb-3 px-4 sm:px-0">Username</th>
                  <th className="pb-3 px-4 sm:px-0">Strength</th>
                  <th className="pb-3 px-4 sm:px-0">Breached</th>
                  <th className="pb-3 px-4 sm:px-0">Date</th>
                  <th className="pb-3 px-4 sm:px-0">Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 10).map((check) => (
                  <tr key={check.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 sm:px-0 text-sm">{check.website}</td>
                    <td className="py-3 px-4 sm:px-0 text-sm text-gray-600">
                      {check.username === 'N/A' ? '-' : check.username}
                    </td>
                    <td className="py-3 px-4 sm:px-0">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStrengthColor(check.strength)}`}>
                        {check.strength}
                      </span>
                    </td>
                    <td className="py-3 px-4 sm:px-0">
                      {check.isBreached ? (
                        <span className="px-2 py-1 bg-red-50 text-red-700 rounded-full text-xs">
                          {check.breachCount} breaches
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs">
                          Safe
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 sm:px-0 text-sm text-gray-600">
                      {check.lastChecked && 'seconds' in check.lastChecked 
                        ? new Date(check.lastChecked.seconds * 1000).toLocaleDateString()
                        : 'Recently'
                      }
                    </td>
                    <td className="py-3 px-4 sm:px-0">
                      <button
                        onClick={() => deletePasswordCheck(check.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label="Delete check"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {history.length > 10 && (
            <div className="text-center mt-4">
              <p className="text-sm text-gray-600">
                Showing 10 of {history.length} checks
              </p>
            </div>
          )}
        </div>
      )}

      {!user && (
        <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-lg">
          <Lock className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold mb-2">Login to Save History</h3>
          <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">
            Sign in to track your password checks and access breach history.
          </p>
          <p className="text-xs sm:text-sm text-gray-500">
            All password checks are performed locally - your passwords are never sent to our servers.
          </p>
        </div>
      )}
    </div>
  );
};

export default PasswordChecker;