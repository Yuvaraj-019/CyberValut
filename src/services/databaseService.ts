import { db } from '../firebase/config';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocs,
  addDoc,
  serverTimestamp,
  orderBy,
  Timestamp,
  onSnapshot
} from 'firebase/firestore';
import { User } from 'firebase/auth';

// ============ TYPES ============
export interface ScreenTimeData {
  id?: string;
  date: string;
  hours: number;
  apps: { name: string; time: number }[];
  createdAt?: Timestamp;
}

export interface TodoItem {
  id?: string;
  title: string;
  completed: boolean;
  createdAt?: Timestamp;
  priority: 'low' | 'medium' | 'high';
}

export interface DigitalProperty {
  id?: string;
  name: string;
  type: 'website' | 'app' | 'service' | 'crypto' | 'other';
  value: string;
  notes: string;
  createdAt?: Timestamp;
}

export interface PasswordCheck {
  id?: string;
  website: string;
  username: string;
  strength: 'weak' | 'medium' | 'strong';
  isBreached: boolean;
  breachCount: number;
  lastChecked: Timestamp;
}

export interface PhishingScanResult {
  id?: string;
  url: string;
  safe: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  threatTypes: string[];
  googleSafe: boolean;
  domainReputation: 'high' | 'medium' | 'low';
  riskScore: number;
  timestamp: Timestamp;
}

export interface Subscription {
  id?: string;
  name: string;
  price: number;
  currency: string;
  renewDate: string;
  active: boolean;
  category: string;
}

export interface UserProfile {
  displayName: string;
  email: string;
  photoURL?: string;
  createdAt: Timestamp;
  lastLogin: Timestamp;
}

// ============ FIREBASE OPERATIONS ============
export const initUserProfile = async (user: User) => {
  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        profile: {
          displayName: user.displayName || user.email?.split('@')[0],
          email: user.email,
          photoURL: user.photoURL || '',
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp()
        }
      });
      
      await Promise.all([
        setDoc(doc(userRef, 'screenTime', 'initial'), {}).catch(() => {}),
        setDoc(doc(userRef, 'todos', 'initial'), {}).catch(() => {}),
        setDoc(doc(userRef, 'digitalProperties', 'initial'), {}).catch(() => {}),
        setDoc(doc(userRef, 'subscriptions', 'initial'), {}).catch(() => {})
      ]);
      
    } else {
      await updateDoc(userRef, {
        'profile.lastLogin': serverTimestamp()
      });
    }
    return true;
  } catch (error) {
    console.error('Error initializing user profile:', error);
    return false;
  }
};

// ============ REAL-TIME LISTENERS ============
export const createRealtimeListener = {
  todos: (userId: string, callback: (todos: TodoItem[]) => void) => {
    const todosRef = collection(db, 'users', userId, 'todos');
    const q = query(todosRef, orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const todos = snapshot.docs
        .filter(doc => doc.id !== 'initial')
        .map(doc => ({ id: doc.id, ...doc.data() })) as TodoItem[];
      callback(todos);
    });
  },

  digitalProperties: (userId: string, callback: (properties: DigitalProperty[]) => void) => {
    const propertiesRef = collection(db, 'users', userId, 'digitalProperties');
    return onSnapshot(propertiesRef, (snapshot) => {
      const properties = snapshot.docs
        .filter(doc => doc.id !== 'initial')
        .map(doc => ({ id: doc.id, ...doc.data() })) as DigitalProperty[];
      callback(properties);
    });
  },

  subscriptions: (userId: string, callback: (subscriptions: Subscription[]) => void) => {
    const subsRef = collection(db, 'users', userId, 'subscriptions');
    return onSnapshot(subsRef, (snapshot) => {
      const subscriptions = snapshot.docs
        .filter(doc => doc.id !== 'initial')
        .map(doc => ({ id: doc.id, ...doc.data() })) as Subscription[];
      callback(subscriptions);
    });
  },

  passwordChecks: (userId: string, callback: (checks: PasswordCheck[]) => void) => {
    const checksRef = collection(db, 'users', userId, 'passwordChecks');
    const q = query(checksRef, orderBy('lastChecked', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const checks = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as PasswordCheck[];
      callback(checks);
    });
  },

  phishingScans: (userId: string, callback: (scans: PhishingScanResult[]) => void) => {
    const scansRef = collection(db, 'users', userId, 'phishingScans');
    const q = query(scansRef, orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const scans = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as PhishingScanResult[];
      callback(scans);
    });
  },

  screenTime: (userId: string, callback: (screenTime: ScreenTimeData[]) => void) => {
    const screenTimeRef = collection(db, 'users', userId, 'screenTime');
    const q = query(screenTimeRef, orderBy('date', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const screenTime = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as ScreenTimeData[];
      callback(screenTime);
    });
  }
};

// ============ PASSWORD CHECKER WITH REAL API ============
export const passwordStrengthChecker = {
  checkStrength(password: string): { 
    score: number; 
    strength: 'weak' | 'medium' | 'strong'; 
    feedback: string[] 
  } {
    let score = 0;
    const feedback: string[] = [];

    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length < 8) feedback.push("❌ Should be at least 8 characters");

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push("⚠️ Add uppercase letters");
    
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push("⚠️ Add lowercase letters");
    
    if (/[0-9]/.test(password)) score += 1;
    else feedback.push("⚠️ Add numbers");
    
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    else feedback.push("⚠️ Add special characters (!@#$%)");

    const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'welcome', 'password123'];
    if (commonPasswords.includes(password.toLowerCase())) {
      score = 0;
      feedback.push("🚫 Very common password - choose something unique");
    }

    let strength: 'weak' | 'medium' | 'strong';
    if (score >= 5) {
      strength = 'strong';
      feedback.push("✅ Strong password!");
    } else if (score >= 3) {
      strength = 'medium';
      feedback.push("⚠️ Medium strength - could be stronger");
    } else {
      strength = 'weak';
      feedback.push("❌ Weak password - consider improving");
    }

    return { score, strength, feedback };
  },

  async checkPasswordBreach(password: string): Promise<{
    isBreached: boolean;
    breachCount: number;
    details: string;
  }> {
    try {
      // SHA-1 hash for Have I Been Pwned API
      const passwordHash = await this.sha1(password);
      const prefix = passwordHash.substring(0, 5);
      const suffix = passwordHash.substring(5).toUpperCase();
      
      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        headers: { 'User-Agent': 'MySpace-Security-App' }
      });
      
      if (!response.ok) throw new Error('API request failed');
      
      const data = await response.text();
      const hashes = data.split('\n');
      const found = hashes.find(hash => hash.startsWith(suffix));
      
      if (found) {
        const breachCount = parseInt(found.split(':')[1]);
        return {
          isBreached: true,
          breachCount,
          details: `⚠️ Found in ${breachCount} data breaches!`
        };
      }
      
      return {
        isBreached: false,
        breachCount: 0,
        details: '✅ No breaches found'
      };
      
    } catch (error) {
      console.error('Breach check error:', error);
      return {
        isBreached: false,
        breachCount: 0,
        details: '⚠️ Unable to check breaches'
      };
    }
  },

  async sha1(str: string): Promise<string> {
    const buffer = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  },

  generateStrongPassword(length = 16): string {
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }
};

// ============ PHISHING SCANNER WITH REAL APIs ============
export const phishingScanner = {
  // Use closure pattern for private variables
  getGoogleApiKey() {
    return import.meta.env.VITE_GOOGLE_SAFE_BROWSING_API_KEY || '';
  },
  
  getIpqsApiKey() {
    return import.meta.env.VITE_IPQUALITYSCORE_API_KEY || '';
  },
  
  getVtApiKey() {
    return import.meta.env.VITE_VIRUSTOTAL_API_KEY || '';
  },

  async scanUrl(url: string): Promise<{
    safe: boolean;
    riskLevel: 'low' | 'medium' | 'high';
    threatTypes: string[];
    googleSafe: boolean;
    domainReputation: 'high' | 'medium' | 'low';
    riskScore: number;
    details: string;
    timestamp: Date;
  }> {
    const results = {
      safe: true,
      riskLevel: 'low' as 'low' | 'medium' | 'high',
      threatTypes: [] as string[],
      googleSafe: true,
      domainReputation: 'high' as 'high' | 'medium' | 'low',
      riskScore: 0,
      details: '',
      timestamp: new Date()
    };

    try {
      // 1. Basic local check (fast)
      const basicCheck = this.basicUrlAnalysis(url);
      if (!basicCheck.safe) {
        Object.assign(results, basicCheck);
      }

      // 2. Google Safe Browsing API
      const googleApiKey = this.getGoogleApiKey();
      if (googleApiKey) {
        try {
          const googleResult = await this.checkWithGoogle(url, googleApiKey);
          if (!googleResult.safe) {
            results.safe = false;
            results.riskLevel = 'high';
            results.googleSafe = false;
            results.threatTypes = googleResult.threatTypes;
            results.details = googleResult.details;
          }
        } catch (error) {
          console.warn('Google Safe Browsing failed:', error);
        }
      }

      // 3. IPQualityScore Domain Check
      const ipqsApiKey = this.getIpqsApiKey();
      if (ipqsApiKey && results.safe) {
        try {
          const domain = this.extractDomain(url);
          const ipqsResult = await this.checkDomainReputation(domain, ipqsApiKey);
          if (ipqsResult.isMalicious || ipqsResult.isPhishing) {
            results.safe = false;
            results.riskLevel = 'high';
          }
          results.domainReputation = ipqsResult.reputation;
          results.riskScore = ipqsResult.riskScore;
        } catch (error) {
          console.warn('IPQualityScore check failed:', error);
        }
      }

      // 4. VirusTotal (optional)
      const vtApiKey = this.getVtApiKey();
      if (vtApiKey && results.riskLevel === 'high') {
        try {
          const vtResult = await this.checkWithVirusTotal(url, vtApiKey);
          if (vtResult.malicious > 0) {
            results.safe = false;
            results.riskLevel = 'high';
          }
        } catch (error) {
          console.warn('VirusTotal check failed:', error);
        }
      }

      // Generate final details
      if (results.safe) {
        results.details = '✅ URL appears safe based on multiple checks';
      } else {
        results.details = `⚠️ ${results.threatTypes.length > 0 ? results.threatTypes.join(', ') : 'Potential security threat detected'}`;
      }

      return results;
    } catch (error) {
      console.error('URL scan error:', error);
      return {
        safe: false,
        riskLevel: 'high',
        threatTypes: ['Scan failed'],
        googleSafe: false,
        domainReputation: 'low',
        riskScore: 100,
        details: 'Unable to complete security scan',
        timestamp: new Date()
      };
    }
  },

  async checkWithGoogle(url: string, apiKey: string): Promise<{
    safe: boolean;
    threatTypes: string[];
    details: string;
  }> {
    const response = await fetch(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: { clientId: 'myspace-security', clientVersion: '1.0' },
          threatInfo: {
            threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE'],
            platformTypes: ['ANY_PLATFORM'],
            threatEntryTypes: ['URL'],
            threatEntries: [{ url: this.normalizeUrl(url) }]
          }
        })
      }
    );

    const data = await response.json();
    
    if (data.matches && data.matches.length > 0) {
      const threats = data.matches.map((match: any) => match.threatType);
      return {
        safe: false,
        threatTypes: threats,
        details: `Google Safe Browsing: ${threats.join(', ')} detected`
      };
    }

    return {
      safe: true,
      threatTypes: [],
      details: 'Google Safe Browsing: No threats found'
    };
  },

  async checkDomainReputation(domain: string, apiKey: string): Promise<{
    reputation: 'high' | 'medium' | 'low';
    riskScore: number;
    isMalicious: boolean;
    isPhishing: boolean;
    isSuspicious: boolean;
    details: string;
  }> {
    const response = await fetch(
      `https://www.ipqualityscore.com/api/json/url/${apiKey}/${encodeURIComponent(domain)}`
    );
    
    const data = await response.json();
    
    return {
      reputation: data.risk_score > 75 ? 'low' : data.risk_score > 25 ? 'medium' : 'high',
      riskScore: data.risk_score || 0,
      isMalicious: data.malicious === true,
      isPhishing: data.phishing === true,
      isSuspicious: data.suspicious === true,
      details: data.message || `Risk score: ${data.risk_score || 0}/100`
    };
  },

  async checkWithVirusTotal(url: string, apiKey: string): Promise<{
    malicious: number;
    suspicious: number;
    undetected: number;
    total: number;
  }> {
    // VirusTotal requires base64 encoding of the URL without padding
    const base64Url = btoa(url).replace(/=/g, '');
    const response = await fetch(
      `https://www.virustotal.com/api/v3/urls/${base64Url}`,
      {
        headers: {
          'x-apikey': apiKey,
          'accept': 'application/json'
        }
      }
    );

    const data = await response.json();
    const stats = data.data?.attributes?.last_analysis_stats || {};
    
    return {
      malicious: stats.malicious || 0,
      suspicious: stats.suspicious || 0,
      undetected: stats.undetected || 0,
      total: Object.values(stats).reduce((a: number, b: number) => a + b, 0)
    };
  },

  basicUrlAnalysis(url: string) {
    const threats: string[] = [];
    
    const suspiciousPatterns = [
      { pattern: /(login|signin|account)\.([a-z0-9]+)\.([a-z0-9]+)/, threat: 'Potential phishing page' },
      { pattern: /(paypal|bank|amazon|google|facebook)\.([a-z0-9]+)\.([a-z0-9]+)/, threat: 'Brand impersonation' },
      { pattern: /(bit\.ly|tinyurl|goo\.gl|t\.co|ow\.ly)/, threat: 'URL shortener' },
      { pattern: /@/, threat: 'Misleading @ symbol' },
      { pattern: /https?:\/\/\d+\.\d+\.\d+\.\d+/, threat: 'IP address instead of domain' },
      { pattern: /-login-|secure-|verify-|account-/i, threat: 'Suspicious keywords' }
    ];

    suspiciousPatterns.forEach(({ pattern, threat }) => {
      if (pattern.test(url.toLowerCase())) threats.push(threat);
    });

    if (!url.startsWith('https://')) threats.push('Not using HTTPS');
    if (url.length > 100) threats.push('Unusually long URL');

    return {
      safe: threats.length === 0,
      riskLevel: threats.length >= 3 ? 'high' : threats.length >= 1 ? 'medium' : 'low',
      threatTypes: threats,
      details: threats.length > 0 ? threats.join('. ') : 'Passes basic checks'
    };
  },

  normalizeUrl(url: string): string {
    return url.startsWith('http') ? url : `http://${url}`;
  },

  extractDomain(url: string): string {
    try {
      const urlObj = new URL(this.normalizeUrl(url));
      return urlObj.hostname;
    } catch {
      return url;
    }
  }
};

// ============ DATABASE SERVICES ============
export const todoService = {
  async getTodos(userId: string) {
    try {
      const todosRef = collection(db, 'users', userId, 'todos');
      const q = query(todosRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs
        .filter(doc => doc.id !== 'initial')
        .map(doc => ({ id: doc.id, ...doc.data() })) as TodoItem[];
    } catch (error) {
      console.error('Error getting todos:', error);
      return [];
    }
  },

  async addTodo(userId: string, todo: Omit<TodoItem, 'id' | 'createdAt'>) {
    const todosRef = collection(db, 'users', userId, 'todos');
    const docRef = await addDoc(todosRef, {
      ...todo,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  },

  async updateTodo(userId: string, todoId: string, updates: Partial<TodoItem>) {
    const todoRef = doc(db, 'users', userId, 'todos', todoId);
    await updateDoc(todoRef, updates);
  },

  async deleteTodo(userId: string, todoId: string) {
    const todoRef = doc(db, 'users', userId, 'todos', todoId);
    await deleteDoc(todoRef);
  }
};

export const digitalPropertyService = {
  async getProperties(userId: string) {
    try {
      const propertiesRef = collection(db, 'users', userId, 'digitalProperties');
      const snapshot = await getDocs(propertiesRef);
      return snapshot.docs
        .filter(doc => doc.id !== 'initial')
        .map(doc => ({ id: doc.id, ...doc.data() })) as DigitalProperty[];
    } catch (error) {
      console.error('Error getting properties:', error);
      return [];
    }
  },

  async addProperty(userId: string, property: Omit<DigitalProperty, 'id' | 'createdAt'>) {
    const propertiesRef = collection(db, 'users', userId, 'digitalProperties');
    const docRef = await addDoc(propertiesRef, {
      ...property,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  },

  async deleteProperty(userId: string, propertyId: string) {
    const propertyRef = doc(db, 'users', userId, 'digitalProperties', propertyId);
    await deleteDoc(propertyRef);
  }
};

export const passwordService = {
  async addPasswordCheck(userId: string, check: Omit<PasswordCheck, 'id' | 'lastChecked'>) {
    const checksRef = collection(db, 'users', userId, 'passwordChecks');
    const docRef = await addDoc(checksRef, {
      ...check,
      lastChecked: serverTimestamp()
    });
    return docRef.id;
  },

  async getPasswordHistory(userId: string) {
    try {
      const checksRef = collection(db, 'users', userId, 'passwordChecks');
      const q = query(checksRef, orderBy('lastChecked', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as PasswordCheck[];
    } catch (error) {
      console.error('Error getting password history:', error);
      return [];
    }
  },

  // ADD THIS DELETE METHOD:
  async deletePasswordCheck(userId: string, checkId: string): Promise<void> {
    try {
      const checkRef = doc(db, 'users', userId, 'passwordChecks', checkId);
      await deleteDoc(checkRef);
      console.log(`Password check ${checkId} deleted successfully`);
    } catch (error) {
      console.error('Error deleting password check:', error);
      throw new Error(`Failed to delete password check: ${error.message}`);
    }
  },
};

export const phishingService = {
  async addPhishingScan(userId: string, scan: Omit<PhishingScanResult, 'id' | 'timestamp'>) {
    const scansRef = collection(db, 'users', userId, 'phishingScans');
    const docRef = await addDoc(scansRef, {
      ...scan,
      timestamp: serverTimestamp()
    });
    return docRef.id;
  },

  async getPhishingHistory(userId: string) {
    try {
      const scansRef = collection(db, 'users', userId, 'phishingScans');
      const q = query(scansRef, orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as PhishingScanResult[];
    } catch (error) {
      console.error('Error getting phishing history:', error);
      return [];
    }
  },

  // ADD THIS DELETE METHOD:
  async deletePhishingScan(userId: string, scanId: string): Promise<void> {
    try {
      const scanRef = doc(db, 'users', userId, 'phishingScans', scanId);
      await deleteDoc(scanRef);
      console.log(`Phishing scan ${scanId} deleted successfully`);
    } catch (error) {
      console.error('Error deleting phishing scan:', error);
      throw new Error(`Failed to delete phishing scan: ${error.message}`);
    }
  },
};

export const subscriptionService = {
  async getSubscriptions(userId: string) {
    try {
      const subsRef = collection(db, 'users', userId, 'subscriptions');
      const snapshot = await getDocs(subsRef);
      return snapshot.docs
        .filter(doc => doc.id !== 'initial')
        .map(doc => ({ id: doc.id, ...doc.data() })) as Subscription[];
    } catch (error) {
      console.error('Error getting subscriptions:', error);
      return [];
    }
  },

  async addSubscription(userId: string, subscription: Omit<Subscription, 'id'>) {
    const subsRef = collection(db, 'users', userId, 'subscriptions');
    const docRef = await addDoc(subsRef, subscription);
    return docRef.id;
  },

  async updateSubscription(userId: string, subId: string, updates: Partial<Subscription>) {
    const subRef = doc(db, 'users', userId, 'subscriptions', subId);
    await updateDoc(subRef, updates);
  },

  async deleteSubscription(userId: string, subId: string) {
    const subRef = doc(db, 'users', userId, 'subscriptions', subId);
    await deleteDoc(subRef);
  }
};

export const screenTimeService = {
  async addScreenTime(userId: string, data: Omit<ScreenTimeData, 'id' | 'createdAt'>) {
    const screenTimeRef = collection(db, 'users', userId, 'screenTime');
    const docRef = await addDoc(screenTimeRef, {
      ...data,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  },

  async getScreenTimeHistory(userId: string, limit = 30) {
    const screenTimeRef = collection(db, 'users', userId, 'screenTime');
    const q = query(screenTimeRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    })) as ScreenTimeData[];
  },

  // ADD THIS DELETE METHOD (optional):
  async deleteScreenTime(userId: string, entryId: string): Promise<void> {
    try {
      const entryRef = doc(db, 'users', userId, 'screenTime', entryId);
      await deleteDoc(entryRef);
      console.log(`Screen time entry ${entryId} deleted successfully`);
    } catch (error) {
      console.error('Error deleting screen time entry:', error);
      throw new Error(`Failed to delete screen time entry: ${error.message}`);
    }
  },
};

export const activityService = {
  async logActivity(userId: string, action: string, details?: any) {
    try {
      const activitiesRef = collection(db, 'users', userId, 'activities');
      
      // Prepare the activity data
      const activityData: any = {
        action,
        timestamp: serverTimestamp(),
        userAgent: navigator.userAgent
      };
      
      // Only add details if they exist and are valid
      if (details !== undefined && details !== null) {
        // Convert details to Firestore-safe format
        if (typeof details === 'object') {
          // Remove any undefined values from the object
          const cleanDetails: any = {};
          Object.keys(details).forEach(key => {
            if (details[key] !== undefined && details[key] !== null) {
              cleanDetails[key] = details[key];
            }
          });
          
          // Only add if we have valid details
          if (Object.keys(cleanDetails).length > 0) {
            activityData.details = cleanDetails;
          }
        } else if (typeof details === 'string' || typeof details === 'number' || typeof details === 'boolean') {
          // Primitive types are fine
          activityData.details = details;
        }
      }
      
      await addDoc(activitiesRef, activityData);
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  },

  // ADD THIS DELETE METHOD (optional):
  async deleteActivity(userId: string, activityId: string): Promise<void> {
    try {
      const activityRef = doc(db, 'users', userId, 'activities', activityId);
      await deleteDoc(activityRef);
      console.log(`Activity ${activityId} deleted successfully`);
    } catch (error) {
      console.error('Error deleting activity:', error);
      throw new Error(`Failed to delete activity: ${error.message}`);
    }
  },
};