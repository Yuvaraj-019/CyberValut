import React, { useState, useEffect } from 'react';
import { Plus, Globe, Smartphone, Shield, Bitcoin, Trash2, ExternalLink, Key, Database, Search, Filter } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { digitalPropertyService, DigitalProperty, createRealtimeListener } from '../services/databaseService';
import { activityService } from '../services/databaseService';

const DigitalPropertyTracker: React.FC = () => {
  const { user } = useAuth();
  const [properties, setProperties] = useState<DigitalProperty[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    type: 'website' as DigitalProperty['type'],
    value: '',
    notes: ''
  });

  // Real-time listener for properties
  useEffect(() => {
    if (!user) {
      setProperties([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Set up real-time listener
    const unsubscribe = createRealtimeListener.digitalProperties(user.uid, (realTimeProperties) => {
      setProperties(realTimeProperties);
      setLoading(false);
    });

    // Log activity
    activityService.logActivity(user.uid, 'VIEWED_DIGITAL_PROPERTIES');

    return () => unsubscribe();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    try {
      const propertyId = await digitalPropertyService.addProperty(user.uid, formData);
      
      // Log activity
      await activityService.logActivity(user.uid, 'ADDED_DIGITAL_PROPERTY', {
        propertyId,
        name: formData.name,
        type: formData.type
      });

      // Reset form
      setFormData({
        name: '',
        type: 'website',
        value: '',
        notes: ''
      });
      setIsAdding(false);

    } catch (error) {
      console.error('Error adding property:', error);
      alert('Failed to add property');
    }
  };

  const deleteProperty = async (propertyId: string) => {
    if (!user || !confirm('Are you sure you want to delete this property?')) return;

    try {
      await digitalPropertyService.deleteProperty(user.uid, propertyId);
      
      // Log activity
      await activityService.logActivity(user.uid, 'DELETED_DIGITAL_PROPERTY', {
        propertyId
      });

    } catch (error) {
      console.error('Error deleting property:', error);
      alert('Failed to delete property');
    }
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      website: Globe,
      app: Smartphone,
      service: Shield,
      crypto: Bitcoin,
      other: Database
    };
    return icons[type as keyof typeof icons] || Globe;
  };

  const filteredProperties = properties.filter(property => {
    const matchesSearch = property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property.notes.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || property.type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Digital Assets</h1>
            <p className="text-gray-600 text-sm sm:text-base">Loading your assets...</p>
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
          <h1 className="text-xl sm:text-2xl font-bold">Digital Assets</h1>
          <p className="text-gray-600 text-sm sm:text-base">Track your websites, apps, crypto, and services</p>
        </div>
        {user && (
          <button
            onClick={() => setIsAdding(true)}
            className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2 min-h-[44px] min-w-[44px]"
            aria-label="Add Asset"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline">Add Asset</span>
          </button>
        )}
      </div>

      {/* Stats - UPDATED RESPONSIVE GRID */}
      <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-600">Total Assets</p>
          <p className="text-xl sm:text-2xl font-bold">{properties.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-600">Websites</p>
          <p className="text-xl sm:text-2xl font-bold text-blue-600">
            {properties.filter(p => p.type === 'website').length}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-600">Apps</p>
          <p className="text-xl sm:text-2xl font-bold text-green-600">
            {properties.filter(p => p.type === 'app').length}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-600">Crypto</p>
          <p className="text-xl sm:text-2xl font-bold text-yellow-600">
            {properties.filter(p => p.type === 'crypto').length}
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col xs:flex-row gap-3 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4" />
          <input
            type="text"
            placeholder="Search assets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-sm sm:text-base"
          />
        </div>
        <div className="flex flex-wrap gap-1 sm:gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg transition-colors flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm min-h-[44px] ${
              filterType === 'all'
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">All</span>
            <span className="xs:hidden">All</span>
          </button>
          {['website', 'app', 'service', 'crypto', 'other'].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg transition-colors capitalize text-xs sm:text-sm min-h-[44px] ${
                filterType === type
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type === 'website' ? 'Web' : 
               type === 'service' ? 'Svc' : 
               type.length > 4 ? type.slice(0, 4) : type}
            </button>
          ))}
        </div>
      </div>

      {/* Add Form - UPDATED RESPONSIVE GRID */}
      {isAdding && user && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Add New Digital Asset</h3>
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
                <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value as DigitalProperty['type']})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-sm sm:text-base"
                >
                  <option value="website">Website</option>
                  <option value="app">Mobile App</option>
                  <option value="service">Service</option>
                  <option value="crypto">Cryptocurrency</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                {formData.type === 'website' ? 'URL' : 
                 formData.type === 'crypto' ? 'Wallet Address' : 
                 'Value/Identifier'} *
              </label>
              <input
                type="text"
                value={formData.value}
                onChange={(e) => setFormData({...formData, value: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-sm sm:text-base"
                placeholder={
                  formData.type === 'website' ? 'https://example.com' :
                  formData.type === 'crypto' ? '0x... or bc1...' :
                  'Username, email, or identifier'
                }
                required
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-sm sm:text-base"
                rows={2}
                placeholder="Additional details, security notes, recovery info..."
              />
            </div>
            <div className="flex flex-col xs:flex-row gap-2 sm:gap-4 pt-2">
              <button
                type="submit"
                className="bg-black text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors flex-1 xs:flex-none min-h-[44px]"
              >
                Add Asset
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="bg-gray-100 text-gray-700 px-4 sm:px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors flex-1 xs:flex-none min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Assets List - UPDATED RESPONSIVE GRID */}
      {!user ? (
        <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-lg">
          <Shield className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold mb-2">Login Required</h3>
          <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">Please login to track your digital assets.</p>
          <p className="text-xs sm:text-sm text-gray-500">Your assets will be securely encrypted and stored.</p>
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-lg">
          <Database className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
          <p className="text-gray-500 text-sm sm:text-base">No assets found. Add your first digital asset to track it.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredProperties.map(property => {
            const Icon = getTypeIcon(property.type);
            return (
              <div key={property.id} className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base truncate">{property.name}</h3>
                      <span className="text-xs sm:text-sm text-gray-500 capitalize">{property.type}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteProperty(property.id!)}
                    className="p-1 sm:p-2 text-gray-400 hover:text-red-600 transition-colors flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label="Delete asset"
                  >
                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                </div>
                
                <div className="space-y-2 sm:space-y-3">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600 mb-1">
                      {property.type === 'website' ? 'URL' : 
                       property.type === 'crypto' ? 'Address' : 'Value'}
                    </p>
                    <div className="flex items-center justify-between">
                      <code className="text-xs sm:text-sm bg-gray-50 px-2 py-1 rounded truncate flex-1">
                        {property.value}
                      </code>
                      {(property.type === 'website' || property.type === 'crypto') && (
                        <a
                          href={
                            property.type === 'website' 
                              ? (property.value.startsWith('http') ? property.value : `https://${property.value}`)
                              : property.type === 'crypto'
                                ? `https://etherscan.io/address/${property.value}`
                                : '#'
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 p-1 text-gray-400 hover:text-black flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        >
                          <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                  
                  {property.notes && (
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600 mb-1">Notes</p>
                      <p className="text-xs sm:text-sm text-gray-700 line-clamp-2">{property.notes}</p>
                    </div>
                  )}
                  
                  <div className="pt-2 sm:pt-3 border-t border-gray-100">
                    <div className="flex items-center text-xs text-gray-500">
                      <Key className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span className="truncate">Added: {property.createdAt ? 
                        new Date(
                          property.createdAt instanceof Object && 'seconds' in property.createdAt 
                            ? property.createdAt.seconds * 1000 
                            : property.createdAt
                        ).toLocaleDateString() 
                        : 'Recently'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DigitalPropertyTracker;