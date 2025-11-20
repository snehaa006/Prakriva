import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Search, 
  MapPin, 
  User, 
  Stethoscope,
  Star,
  Clock,
  IndianRupee,
  CheckCircle,
  AlertCircle,
  UserPlus,
  GraduationCap,
  Languages,
  Loader2,
  RefreshCw,
  Eye,
  X,
  Filter,
  SlidersHorizontal,
  Bell,
  BellRing
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ConsultationRequestForm from '@/components/ConsultationRequestForm';
import { 
  fetchDoctors, 
  searchDoctors, 
  createConsultationRequest, 
  checkExistingRequest,
  fetchPatientNotifications,
  markNotificationAsRead,
  checkForRequestUpdates
} from '@/services/doctorService';
import type { Doctor, CreateConsultationRequest } from '@/types/doctor';
import { useNavigate } from 'react-router-dom';

const ConsultDoctor: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  // State management
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [requestFormOpen, setRequestFormOpen] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [existingRequests, setExistingRequests] = useState<Set<string>>(new Set());
  const [acceptedChats, setAcceptedChats] = useState<Set<string>>(new Set()); // NEW: doctors who have accepted
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filters, setFilters] = useState({
    experience: '',
    location: '',
    specialization: '',
    verificationStatus: '',
    consultationMode: '',
    minRating: ''
  });

  // Load doctors and notifications on component mount
  useEffect(() => {
    loadDoctors();
    loadNotifications();
    
    // Check for request updates every 30 seconds
    const interval = setInterval(() => {
      checkForRequestUpdates();
      loadNotifications();
    }, 30000);
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch();
    }, 300);

    return () => clearTimeout(timeoutId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, filters]);

  // LOAD NOTIFICATIONS AND POPULATE acceptedChats
  const loadNotifications = async () => {
    try {
      const notificationsData = await fetchPatientNotifications();
      setNotifications(notificationsData);
      
      const unreadNotifications = notificationsData.filter(n => !n.read);
      setUnreadCount(unreadNotifications.length);
      
      // Show new acceptance notifications (toast) and mark them read for UX
      const newAcceptanceNotifications = unreadNotifications.filter(
        n => n.type === 'consultation_accepted'
      );
      
      newAcceptanceNotifications.forEach(notification => {
        toast({
          title: notification.title,
          description: notification.message,
          duration: 8000,
        });
        
        // Mark as read after showing toast (don't await to avoid blocking)
        markNotificationAsRead(notification.id);
      });

      // Build acceptedChats set from notifications of type 'consultation_accepted'
      const acceptedDoctorIds = notificationsData
        .filter(n => n.type === 'consultation_accepted')
        .map(n => n.doctorId)
        .filter(Boolean) as string[];

      setAcceptedChats(new Set(acceptedDoctorIds));

    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  // When user clicks a notification: mark read and navigate to chat if accepted
  const handleNotificationClick = async (notification: any) => {
    try {
      if (!notification.read) {
        await markNotificationAsRead(notification.id);
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      // Update the notification in the local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notification.id 
            ? { ...n, read: true, readAt: new Date().toISOString() }
            : n
        )
      );

      // If it's an acceptance notification, open chat with that doctor
      if (notification.type === 'consultation_accepted' && notification.doctorId) {
        setShowNotifications(false);
        // ensure acceptedChats contains it (keeps local state consistent)
        setAcceptedChats(prev => new Set(prev).add(notification.doctorId));
        navigate(`/communication?chatId=${notification.doctorId}`);
      }
    } catch (err) {
      console.error('Error handling notification click:', err);
    }
  };

  const updateFilter = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      experience: '',
      location: '',
      specialization: '',
      verificationStatus: '',
      consultationMode: '',
      minRating: ''
    });
  };

  const loadDoctors = async () => {
    try {
      setLoading(true);
      const doctorsData = await fetchDoctors();
      setDoctors(doctorsData);
      setFilteredDoctors(doctorsData);
      
      // Check for existing requests for all doctors
      const requestChecks = await Promise.allSettled(
        doctorsData.map(doctor => checkExistingRequest(doctor.id))
      );
      
      const existingSet = new Set<string>();
      requestChecks.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          existingSet.add(doctorsData[index].id);
        }
      });
      
      setExistingRequests(existingSet);
    } catch (error) {
      console.error('Error loading doctors:', error);
      toast({
        title: 'Error',
        description: 'Failed to load doctors. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() && Object.values(filters).every(f => !f)) {
      setFilteredDoctors(doctors);
      return;
    }

    try {
      setSearchLoading(true);
      let results = doctors;

      // Apply search query (merge search results with current list to preserve filters)
      if (searchQuery.trim()) {
        const searchResults = await searchDoctors(searchQuery);
        const searchIds = new Set(searchResults.map((d: Doctor) => d.id));
        // keep order & only those in our fetched doctors
        results = results.filter(d => searchIds.has(d.id));
      }

      // Apply filters
      results = results.filter(doctor => {
        if (filters.experience && doctor.yearsOfExperience < parseInt(filters.experience)) {
          return false;
        }
        if (filters.location && !doctor.clinicAddress?.toLowerCase().includes(filters.location.toLowerCase())) {
          return false;
        }
        if (filters.specialization && !doctor.ayurvedicSpecialization?.some(spec => 
          spec.toLowerCase().includes(filters.specialization.toLowerCase()))) {
          return false;
        }
        if (filters.verificationStatus && doctor.verificationStatus !== filters.verificationStatus) {
          return false;
        }
        if (filters.consultationMode && !doctor.consultationModes?.includes(filters.consultationMode)) {
          return false;
        }
        if (filters.minRating && doctor.rating && doctor.rating < parseFloat(filters.minRating)) {
          return false;
        }
        return true;
      });

      // Sort verified first then by rating
      results.sort((a, b) => {
        if (a.verificationStatus === 'verified' && b.verificationStatus !== 'verified') return -1;
        if (b.verificationStatus === 'verified' && a.verificationStatus !== 'verified') return 1;
        return (b.rating || 0) - (a.rating || 0);
      });

      setFilteredDoctors(results);
    } catch (error) {
      console.error('Error searching doctors:', error);
      toast({
        title: 'Search Error',
        description: 'Failed to search doctors. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSearchLoading(false);
    }
  };

  // Fix doctor name display to avoid "Dr.Dr." issue
  const formatDoctorName = (name: string) => {
    if (!name) return '';
    if (name.toLowerCase().startsWith('dr.')) {
      return name;
    }
    return `Dr. ${name}`;
  };

  const handleRequestConsultation = async (doctor: Doctor) => {
    try {
      // Check if request already exists
      const hasExistingRequest = await checkExistingRequest(doctor.id);
      if (hasExistingRequest) {
        toast({
          title: 'Request Already Sent',
          description: `You already have a pending request with ${formatDoctorName(doctor.name)}.`,
          variant: 'destructive',
        });
        return;
      }

      setSelectedDoctor(doctor);
      setRequestFormOpen(true);
    } catch (err) {
      console.error('Error checking existing request:', err);
      toast({
        title: 'Error',
        description: 'Could not check request status. Try again.',
        variant: 'destructive',
      });
    }
  };

  const handleViewProfile = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setProfileModalOpen(true);
  };

  const submitConsultationRequest = async (requestData: CreateConsultationRequest) => {
    try {
      setSubmittingRequest(true);
      const requestId = await createConsultationRequest(requestData);
      
      // Update local state to reflect the new request
      setExistingRequests(prev => {
        const s = new Set(prev);
        s.add(requestData.doctorId);
        return s;
      });
      
      // Refresh notifications to get the new request notification
      setTimeout(() => {
        loadNotifications();
      }, 1000);
      
      toast({
        title: 'Request Sent Successfully',
        description: `Your consultation request has been sent to ${formatDoctorName(selectedDoctor?.name || '')}. You'll receive a response within 24 hours.`,
      });
      
      setRequestFormOpen(false);
      setSelectedDoctor(null);
    } catch (error) {
      console.error('Error submitting request:', error);
      toast({
        title: 'Request Failed',
        description: 'Failed to send consultation request. Please try again.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setSubmittingRequest(false);
    }
  };

  const getVerificationIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getVerificationBadgeColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const formatNotificationTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Loading Doctors</h2>
            <p className="text-muted-foreground">Please wait while we fetch available doctors...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Consult with Verified Doctors</h1>
          <p className="text-muted-foreground">Connect with experienced Ayurvedic practitioners and get personalized healthcare guidance.</p>
        </div>
        <div className="flex gap-2">
          {/* Notifications Bell */}
          <div className="relative">
            <Button 
              variant="outline" 
              onClick={() => setShowNotifications(!showNotifications)}
              className="gap-2"
            >
              {unreadCount > 0 ? (
                <BellRing className="w-4 h-4" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-1 px-1 min-w-[20px] h-5">
                  {unreadCount}
                </Badge>
              )}
            </Button>
            
            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-background border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                <div className="p-3 border-b border-border">
                  <h3 className="font-medium">Notifications</h3>
                  {unreadCount > 0 && (
                    <p className="text-sm text-muted-foreground">{unreadCount} unread</p>
                  )}
                </div>
                <div className="divide-y divide-border">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 hover:bg-muted/50 cursor-pointer transition-colors ${
                          !notification.read ? 'bg-blue-50/50 border-l-2 border-l-blue-500' : ''
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`w-2 h-2 rounded-full mt-2 ${
                            notification.type === 'consultation_accepted' 
                              ? 'bg-green-500' 
                              : notification.type === 'consultation_rejected'
                              ? 'bg-red-500'
                              : 'bg-blue-500'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm">{notification.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatNotificationTime(notification.createdAt)}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          
          <Button variant="outline" onClick={loadDoctors} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search and Filters Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Find Doctors</CardTitle>
              <CardDescription>Search and filter doctors by your preferences</CardDescription>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <SlidersHorizontal className="w-4 h-4" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by doctor name, clinic, or location..."
                className="pl-10"
              />
              {searchLoading && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/30">
              <div className="space-y-2">
                <label className="text-sm font-medium">Minimum Experience</label>
                <select 
                  value={filters.experience} 
                  onChange={(e) => updateFilter('experience', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value="">Any experience</option>
                  <option value="1">1+ years</option>
                  <option value="3">3+ years</option>
                  <option value="5">5+ years</option>
                  <option value="10">10+ years</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Location</label>
                <Input
                  value={filters.location}
                  onChange={(e) => updateFilter('location', e.target.value)}
                  placeholder="Enter city or area"
                  className="text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Specialization</label>
                <Input
                  value={filters.specialization}
                  onChange={(e) => updateFilter('specialization', e.target.value)}
                  placeholder="e.g., Panchakarma, Skin"
                  className="text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Verification Status</label>
                <select 
                  value={filters.verificationStatus} 
                  onChange={(e) => updateFilter('verificationStatus', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value="">All doctors</option>
                  <option value="verified">Verified only</option>
                  <option value="pending">Pending verification</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Consultation Mode</label>
                <select 
                  value={filters.consultationMode} 
                  onChange={(e) => updateFilter('consultationMode', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value="">All modes</option>
                  <option value="online">Online consultation</option>
                  <option value="in-person">In-person visit</option>
                  <option value="phone">Phone consultation</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Minimum Rating</label>
                <select 
                  value={filters.minRating} 
                  onChange={(e) => updateFilter('minRating', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value="">Any rating</option>
                  <option value="4.0">4.0+ stars</option>
                  <option value="4.5">4.5+ stars</option>
                  <option value="4.8">4.8+ stars</option>
                </select>
              </div>

              <div className="md:col-span-3 flex justify-end gap-2 mt-2">
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            </div>
          )}

          {filteredDoctors.length > 0 && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {filteredDoctors.length} doctor{filteredDoctors.length !== 1 ? 's' : ''} found
                {(searchQuery || Object.values(filters).some(f => f)) && ' matching your criteria'}
              </span>
              <Badge variant="outline" className="gap-1">
                <CheckCircle className="w-3 h-3" />
                Sorted by verification & rating
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Doctors List */}
      {filteredDoctors.length === 0 && !loading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Stethoscope className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No Doctors Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery 
                ? `No doctors match your search for "${searchQuery}". Try different keywords.`
                : 'No doctors are currently available.'
              }
            </p>
            {searchQuery && (
              <Button
                variant="outline"
                onClick={() => setSearchQuery('')}
              >
                Clear Search
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {filteredDoctors.map((doctor) => (
            <Card key={doctor.id} className="hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex gap-6">
                  {/* Doctor Avatar */}
                  <div className="flex-shrink-0">
                    <Avatar className="w-16 h-16 border border-border">
                      <AvatarFallback className="bg-muted text-foreground text-sm font-medium">
                        {doctor.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  {/* Doctor Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-foreground">
                            {formatDoctorName(doctor.name)}
                          </h3>
                          {getVerificationIcon(doctor.verificationStatus)}
                        </div>
                        {doctor.clinicName && (
                          <p className="text-muted-foreground">{doctor.clinicName}</p>
                        )}
                        {doctor.clinicAddress && (
                          <div className="flex items-center gap-1 text-muted-foreground text-sm">
                            <MapPin className="w-3 h-3" />
                            <span>{doctor.clinicAddress}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Rating */}
                      {doctor.rating && (
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          <span className="font-medium">{doctor.rating.toFixed(1)}</span>
                          {doctor.totalReviews && (
                            <span className="text-muted-foreground">({doctor.totalReviews})</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Key Info Row */}
                    <div className="flex flex-wrap gap-4 mb-3 text-sm text-muted-foreground">
                      {doctor.yearsOfExperience && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{doctor.yearsOfExperience} years</span>
                        </div>
                      )}
                      {doctor.consultationFee && (
                        <div className="flex items-center gap-1">
                          <IndianRupee className="w-3 h-3" />
                          <span>₹{doctor.consultationFee}</span>
                        </div>
                      )}
                      {doctor.totalConsultations && (
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{doctor.totalConsultations} consultations</span>
                        </div>
                      )}
                    </div>

                    {/* Specializations */}
                    {doctor.ayurvedicSpecialization && doctor.ayurvedicSpecialization.length > 0 && (
                      <div className="mb-3">
                        <div className="flex flex-wrap gap-1">
                          {doctor.ayurvedicSpecialization.slice(0, 3).map((spec, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {spec}
                            </Badge>
                          ))}
                          {doctor.ayurvedicSpecialization.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{doctor.ayurvedicSpecialization.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {acceptedChats.has(doctor.id) ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => navigate(`/communication?chatId=${doctor.id}`)}
                          className="gap-1"
                        >
                          Chat
                        </Button>
                      ) : existingRequests.has(doctor.id) ? (
                        <Button 
                          disabled 
                          size="sm"
                          className="gap-1"
                        >
                          <CheckCircle className="w-3 h-3" />
                          Request Sent
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleRequestConsultation(doctor)}
                          size="sm"
                          className="gap-1"
                        >
                          <UserPlus className="w-3 h-3" />
                          Request Consultation
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewProfile(doctor)}
                        className="gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        View Profile
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Consultation Request Form Modal */}
      {selectedDoctor && requestFormOpen && (
        <ConsultationRequestForm
          doctor={selectedDoctor}
          isOpen={requestFormOpen}
          onClose={() => {
            setRequestFormOpen(false);
            setSelectedDoctor(null);
          }}
          onSubmit={submitConsultationRequest}
          loading={submittingRequest}
        />
      )}

      {/* Doctor Profile Modal */}
      {selectedDoctor && profileModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => { setProfileModalOpen(false); setSelectedDoctor(null); }}>
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16 border-2 border-border">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                    {selectedDoctor.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-2xl">{formatDoctorName(selectedDoctor.name)}</CardTitle>
                  <CardDescription className="text-base">
                    {selectedDoctor.clinicName}
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setProfileModalOpen(false);
                  setSelectedDoctor(null);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-1">Experience</h4>
                  <p className="text-muted-foreground">{selectedDoctor.yearsOfExperience} years</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Rating</h4>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="text-muted-foreground">{selectedDoctor.rating} ({selectedDoctor.totalReviews} reviews)</span>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Consultation Fee</h4>
                  <p className="text-muted-foreground">₹{selectedDoctor.consultationFee}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Location</h4>
                  <p className="text-muted-foreground">{selectedDoctor.clinicAddress}</p>
                </div>
              </div>
              
              {selectedDoctor.bio && (
                <div>
                  <h4 className="font-semibold mb-2">About</h4>
                  <p className="text-muted-foreground">{selectedDoctor.bio}</p>
                </div>
              )}
              
              {selectedDoctor.ayurvedicSpecialization && selectedDoctor.ayurvedicSpecialization.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Specializations</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedDoctor.ayurvedicSpecialization.map((spec, index) => (
                      <Badge key={index} variant="secondary">{spec}</Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedDoctor.languages && selectedDoctor.languages.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Languages</h4>
                  <p className="text-muted-foreground">{selectedDoctor.languages.join(', ')}</p>
                </div>
              )}
              
              {selectedDoctor.consultationModes && selectedDoctor.consultationModes.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Consultation Modes</h4>
                  <div className="flex gap-2">
                    {selectedDoctor.consultationModes.map((mode, index) => (
                      <Badge key={index} variant="outline" className="capitalize">
                        {mode.replace('-', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="pt-4 border-t">
                {acceptedChats.has(selectedDoctor.id) ? (
                  <Button
                    onClick={() => {
                      setProfileModalOpen(false);
                      navigate(`/communication?chatId=${selectedDoctor.id}`);
                    }}
                    className="w-full gap-2"
                  >
                    Chat
                  </Button>
                ) : (
                  <Button 
                    onClick={() => {
                      setProfileModalOpen(false);
                      handleRequestConsultation(selectedDoctor);
                    }}
                    disabled={existingRequests.has(selectedDoctor.id)}
                    className="w-full gap-2"
                  >
                    {existingRequests.has(selectedDoctor.id) ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Request Already Sent
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Request Consultation
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Click outside to close notifications */}
      {showNotifications && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowNotifications(false)}
        />
      )}
    </div>
  );
};

export default ConsultDoctor;