import React, { useState, useEffect } from 'react';
import { Link, Shield, AlertTriangle, CheckCircle, ExternalLink, Copy, Clock, BarChart, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { phishingScanner, phishingService, createRealtimeListener } from '../services/databaseService';
import { activityService } from '../services/databaseService';

const PhishingScanner: React.FC = () => {
  const { user } = useAuth();
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [scanStats, setScanStats] = useState({
    total: 0,
    safe: 0,
    unsafe: 0
  });

  // Load scan history in real-time
  useEffect(() => {
    if (!user) {
      setHistory([]);
      return;
    }

    const unsubscribe = createRealtimeListener.phishingScans(user.uid, (scans) => {
      setHistory(scans);
      setScanStats({
        total: scans.length,
        safe: scans.filter(s => s.safe).length,
        unsafe: scans.filter(s => !s.safe).length
      });
    });

    activityService.logActivity(user.uid, 'VIEWED_PHISHING_SCANNER');

    return () => unsubscribe();
  }, [user]);

  const deleteScan = async (scanId: string) => {
  if (!user || !confirm('Are you sure you want to delete this scan?')) return;
  
  console.log('Attempting to delete scan:', scanId);
  console.log('User ID:', user.uid);
  
  try {
    // First remove from local state for immediate UI update
    const deletedScan = history.find(scan => scan.id === scanId);
    setHistory(prev => prev.filter(scan => scan.id !== scanId));
    
    // Update stats
    if (deletedScan) {
      setScanStats(prev => ({
        total: prev.total - 1,
        safe: prev.safe - (deletedScan.safe ? 1 : 0),
        unsafe: prev.unsafe - (deletedScan.safe ? 0 : 1)
      }));
    }
    
    
    await phishingService.deletePhishingScan(user.uid, scanId);
    
    activityService.logActivity(user.uid, 'DELETED_PHISHING_SCAN', { scanId });
    
    console.log('Successfully deleted scan');
    
  } catch (error: any) {
    console.error('Error deleting scan:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    // Revert local state if delete failed
    setHistory(prev => [...prev]);
    
    if (error.code === 'permission-denied') {
      alert('Permission denied. Please check your Firebase rules.');
    } else if (error.code === 'not-found') {
      alert('Scan not found. It may have already been deleted.');
    } else {
      alert(`Failed to delete scan: ${error.message || 'Unknown error'}. Please refresh and try again.`);
    }
  }
};

  const scanUrl = async () => {
    if (!url.trim()) return;
    
    setLoading(true);
    try {
      const scanResult = await phishingScanner.scanUrl(url);
      setResult(scanResult);
      
      // Save to Firebase if user is logged in
      if (user) {
        await phishingService.addPhishingScan(user.uid, {
          url: url,
          safe: scanResult.safe,
          riskLevel: scanResult.riskLevel,
          threatTypes: scanResult.threatTypes,
          googleSafe: scanResult.googleSafe,
          domainReputation: scanResult.domainReputation,
          riskScore: scanResult.riskScore
        });
        
        activityService.logActivity(user.uid, 'SCANNED_URL', {
          url: url,
          safe: scanResult.safe,
          riskLevel: scanResult.riskLevel
        });
      }
      
    } catch (error) {
      console.error('Scan error:', error);
      setResult({
        safe: false,
        riskLevel: 'high',
        details: 'Scan failed. Please try again.',
        threatTypes: ['Scan error']
      });
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'high': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getReputationColor = (reputation: string) => {
    switch (reputation) {
      case 'high': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const extractDomain = (url: string) => {
    try {
      return new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
    } catch {
      return url;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Phishing & URL Scanner</h1>
          <p className="text-gray-600 text-sm sm:text-base">Check URLs for phishing, malware, and threats</p>
        </div>
      </div>

      {/* Stats - UPDATED RESPONSIVE GRID */}
      <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-600">Total Scans</p>
          <p className="text-xl sm:text-2xl font-bold">{scanStats.total}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-600">Safe URLs</p>
          <p className="text-xl sm:text-2xl font-bold text-green-600">{scanStats.safe}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-600">Unsafe URLs</p>
          <p className="text-xl sm:text-2xl font-bold text-red-600">{scanStats.unsafe}</p>
        </div>
      </div>

      {/* Scanner */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
        <div className="mb-4 sm:mb-6">
          <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">
            Enter URL to Scan
          </label>
          <div className="flex flex-col xs:flex-row gap-2 sm:gap-4">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-sm sm:text-base"
              placeholder="https://example.com or example.com"
            />
            <button
              onClick={scanUrl}
              disabled={loading || !url}
              className="bg-black text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 min-h-[44px]"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span className="text-sm sm:text-base">Scanning...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span className="text-sm sm:text-base">Scan URL</span>
                </>
              )}
            </button>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-2">
            Uses Google Safe Browsing, IPQualityScore, and local analysis
          </p>
        </div>

        {/* Quick Tips - UPDATED RESPONSIVE */}
        <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
            <h4 className="font-medium text-blue-800 text-sm sm:text-base mb-1 sm:mb-2">Safe URL Examples</h4>
            <ul className="text-xs sm:text-sm text-blue-700 space-y-1">
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">https://google.com</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">https://github.com</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">https://wikipedia.org</span>
              </li>
            </ul>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
            <h4 className="font-medium text-red-800 text-sm sm:text-base mb-1 sm:mb-2">Suspicious Patterns</h4>
            <ul className="text-xs sm:text-sm text-red-700 space-y-1">
              <li className="flex items-center space-x-2">
                <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">paypal-secure-login.com</span>
              </li>
              <li className="flex items-center space-x-2">
                <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">bit.ly/suspicious-link</span>
              </li>
              <li className="flex items-center space-x-2">
                <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">192.168.1.1/login</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-2 sm:gap-0">
            <h3 className="text-base sm:text-lg font-semibold">Scan Results</h3>
            <div className="flex flex-wrap gap-2">
              <span className={`px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm ${getRiskColor(result.riskLevel)}`}>
                {result.riskLevel.toUpperCase()} RISK
              </span>
              <span className={`px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm ${result.safe ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {result.safe ? 'SAFE' : 'UNSAFE'}
              </span>
            </div>
          </div>

          {/* Results Grid - UPDATED RESPONSIVE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* URL Info */}
            <div>
              <h4 className="font-medium text-sm sm:text-base mb-2 sm:mb-3">URL Information</h4>
              <div className="space-y-2 sm:space-y-3">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Full URL</p>
                  <div className="flex items-center justify-between bg-gray-50 p-2 sm:p-3 rounded-lg">
                    <code className="text-xs sm:text-sm truncate">{url}</code>
                    <a
                      href={url.startsWith('http') ? url : `https://${url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-gray-400 hover:text-black flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
                    </a>
                  </div>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Domain</p>
                  <p className="font-medium text-sm sm:text-base truncate">{extractDomain(url)}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Scan Time</p>
                  <p className="flex items-center space-x-2 text-xs sm:text-sm">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                    <span>{result.timestamp.toLocaleString()}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Threat Analysis */}
            <div>
              <h4 className="font-medium text-sm sm:text-base mb-2 sm:mb-3">Threat Analysis</h4>
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1 sm:mb-2">
                    <span className="text-xs sm:text-sm">Google Safe Browsing</span>
                    <span className={`text-xs sm:text-sm ${result.googleSafe ? 'text-green-600' : 'text-red-600'}`}>
                      {result.googleSafe ? 'Safe' : 'Threat'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                    <div 
                      className={`h-1.5 sm:h-2 rounded-full ${result.googleSafe ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: result.googleSafe ? '100%' : '30%' }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1 sm:mb-2">
                    <span className="text-xs sm:text-sm">Domain Reputation</span>
                    <span className={`text-xs sm:text-sm ${getReputationColor(result.domainReputation)}`}>
                      {result.domainReputation.toUpperCase()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                    <div 
                      className={`h-1.5 sm:h-2 rounded-full ${
                        result.domainReputation === 'high' ? 'bg-green-500' :
                        result.domainReputation === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ 
                        width: result.domainReputation === 'high' ? '100%' : 
                               result.domainReputation === 'medium' ? '60%' : '20%' 
                      }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1 sm:mb-2">
                    <span className="text-xs sm:text-sm">Risk Score</span>
                    <span className={`text-xs sm:text-sm ${result.riskScore < 25 ? 'text-green-600' : result.riskScore < 75 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {result.riskScore}/100
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                    <div 
                      className={`h-1.5 sm:h-2 rounded-full ${
                        result.riskScore < 25 ? 'bg-green-500' :
                        result.riskScore < 75 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${result.riskScore}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Threat Details */}
          {result.threatTypes.length > 0 && (
            <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t">
              <h4 className="font-medium text-sm sm:text-base mb-2 sm:mb-3">Detected Threats</h4>
              <div className="space-y-1 sm:space-y-2">
                {result.threatTypes.map((threat: string, index: number) => (
                  <div key={index} className="flex items-center space-x-2 text-red-700 text-xs sm:text-sm">
                    <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span>{threat}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations - UPDATED RESPONSIVE */}
          <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t">
            <h4 className="font-medium text-sm sm:text-base mb-2 sm:mb-3">Recommendations</h4>
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
              {result.safe ? (
                <>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
                    <h5 className="font-medium text-green-800 text-sm sm:text-base mb-1 sm:mb-2">✅ Safe to Proceed</h5>
                    <p className="text-xs sm:text-sm text-green-700">
                      This URL appears safe based on our analysis. You can proceed with caution.
                    </p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                    <h5 className="font-medium text-blue-800 text-sm sm:text-base mb-1 sm:mb-2">General Safety Tips</h5>
                    <ul className="text-xs sm:text-sm text-blue-700 space-y-1">
                      <li>• Always check for HTTPS</li>
                      <li>• Look for legitimate company logos</li>
                      <li>• Be cautious of urgent login requests</li>
                    </ul>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
                    <h5 className="font-medium text-red-800 text-sm sm:text-base mb-1 sm:mb-2">🚫 Do Not Proceed</h5>
                    <p className="text-xs sm:text-sm text-red-700">
                      This URL may be malicious. Do not enter any personal information.
                    </p>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
                    <h5 className="font-medium text-yellow-800 text-sm sm:text-base mb-1 sm:mb-2">⚠️ Safety Actions</h5>
                    <ul className="text-xs sm:text-sm text-yellow-700 space-y-1">
                      <li>• Do not click on this link</li>
                      <li>• Report it if it came via email</li>
                      <li>• Use official websites instead</li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* History with DELETE BUTTON */}
      {user && history.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-semibold">Scan History</h3>
            <span className="text-xs sm:text-sm text-gray-600">{history.length} scans</span>
          </div>
          
          <div className="space-y-2 sm:space-y-4">
            {history.slice(0, 5).map((scan) => (
              <div key={scan.id} className="flex items-center justify-between p-3 sm:p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                  <div className={`p-1.5 sm:p-2 rounded-lg ${scan.safe ? 'bg-green-100' : 'bg-red-100'} flex-shrink-0`}>
                    {scan.safe ? (
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base truncate">{scan.url}</p>
                    <div className="flex items-center flex-wrap gap-1 sm:gap-2 mt-1">
                      <span className={`text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full ${getRiskColor(scan.riskLevel)}`}>
                        {scan.riskLevel}
                      </span>
                      <span className="text-xs text-gray-500">
                        {scan.timestamp && 'seconds' in scan.timestamp 
                          ? new Date(scan.timestamp.seconds * 1000).toLocaleDateString()
                          : 'Recently'
                        }
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <a
                    href={scan.url.startsWith('http') ? scan.url : `https://${scan.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-gray-400 hover:text-black min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label="Open URL"
                  >
                    <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
                  </a>
                  <button
                    onClick={() => deleteScan(scan.id)}
                    className="p-1 text-gray-400 hover:text-red-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label="Delete scan"
                  >
                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {history.length > 5 && (
            <div className="text-center mt-3 sm:mt-4">
              <p className="text-xs sm:text-sm text-gray-600">
                Showing 5 of {history.length} scans
              </p>
            </div>
          )}
        </div>
      )}

      {!user && (
        <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-lg">
          <Shield className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold mb-2">Login to Save Scans</h3>
          <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">
            Sign in to save your scan history and track malicious URLs.
          </p>
          <p className="text-xs sm:text-sm text-gray-500">
            All scans use real-time threat intelligence from multiple security providers.
          </p>
        </div>
      )}
    </div>
  );
};

export default PhishingScanner;