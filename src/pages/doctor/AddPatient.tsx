import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Search, 
  Eye, 
  Check, 
  X, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle,
  Stethoscope,
  Loader2,
  Heart,
  Activity,
  Thermometer,
  Droplet
} from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  doc, 
  updateDoc,
  writeBatch,
  addDoc
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';

interface ConsultationRequest {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientPhone?: string;
  requestType: string;
  urgency: string;
  preferredConsultationMode?: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  requestedAt: string;
  fullPatientProfile: {
    name: string;
    age?: number;
    gender?: string;
    phoneNumber?: string;
    address?: string;
    medicalHistory?: string[];
    allergies?: string[];
    currentMedications?: string[];
    bloodGroup?: string;
    emergencyContact?: string;
    // Enhanced assessment data
    assessmentData?: {
      name: string;
      dob: string;
      gender: string;
      location: string;
      dailyRoutine: string;
      physicalActivity: string;
      sleepDuration: string;
      waterIntake: number;
      dietaryPreferences: string;
      cravings: string[];
      digestionIssues: string[];
      currentConditions: string[];
      familyHistory: string[];
      medications: string;
      energyLevels: number;
      stressLevels: number;
      bodyFrame: string;
      skinType: string;
      hairType: string;
      appetitePattern: string;
      personalityTraits: string[];
      weatherPreference: string;
      healthGoals: string[];
      additionalNotes: string;
    };
  };
  doctorId: string;
  doctorName: string;
  doctorEmail: string;
}

const ConsultationRequests: React.FC = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<ConsultationRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<ConsultationRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<ConsultationRequest | null>(null);
  const [showPatientProfile, setShowPatientProfile] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const [responseType, setResponseType] = useState<'accept' | 'decline'>('accept');
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('No authenticated user');
      setIsLoading(false);
      return;
    }

    console.log('Fetching requests for doctor:', currentUser.uid);

    const fetchRequests = async () => {
      try {
        const requestsRef = collection(db, 'consultationRequests');
        const q = query(
          requestsRef, 
          where('doctorId', '==', currentUser.uid)
        );

        const snapshot = await getDocs(q);
        console.log('Received requests, documents:', snapshot.size);
        
        const requestsData: ConsultationRequest[] = [];
        snapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          console.log('Request document:', docSnapshot.id, data);
          
          requestsData.push({
            id: docSnapshot.id,
            patientId: data.patientId || '',
            patientName: data.patientName || 'Unknown Patient',
            patientEmail: data.patientEmail || '',
            patientPhone: data.patientPhone,
            requestType: data.requestType || 'consultation',
            urgency: data.urgency || 'medium',
            preferredConsultationMode: data.preferredConsultationMode,
            message: data.message,
            status: data.status || 'pending',
            requestedAt: data.requestedAt || new Date().toISOString(),
            doctorId: data.doctorId || '',
            doctorName: data.doctorName || '',
            doctorEmail: data.doctorEmail || '',
            fullPatientProfile: data.fullPatientProfile || {
              name: data.patientName || 'Unknown Patient',
              age: undefined,
              gender: undefined,
              phoneNumber: data.patientPhone,
              address: undefined,
              medicalHistory: [],
              allergies: [],
              currentMedications: [],
              bloodGroup: undefined,
              emergencyContact: undefined
            }
          });
        });

        console.log('Processed requests:', requestsData.length);
        setRequests(requestsData);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching consultation requests:', error);
        toast({
          title: 'Error',
          description: 'Failed to load consultation requests. Please try again.',
          variant: 'destructive',
        });
        setIsLoading(false);
      }
    };

    fetchRequests();

    // Set up periodic refresh every 30 seconds to get new requests
    const interval = setInterval(fetchRequests, 30000);
    
    return () => clearInterval(interval);
  }, [toast]);

  useEffect(() => {
    applyFilters();
  }, [requests, searchTerm, statusFilter, urgencyFilter]);

  const applyFilters = () => {
    let filtered = [...requests];

    if (searchTerm.trim()) {
      filtered = filtered.filter(req =>
        req.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.patientEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.requestType?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(req => req.status === statusFilter);
    }

    if (urgencyFilter !== 'all') {
      filtered = filtered.filter(req => req.urgency === urgencyFilter);
    }

    // Sort by urgency and date
    filtered.sort((a, b) => {
      const urgencyOrder: { [key: string]: number } = { 
        'high': 0, 
        'emergency': 0, 
        'medium': 1, 
        'low': 2 
      };
      const urgencyA = urgencyOrder[a.urgency] ?? 1;
      const urgencyB = urgencyOrder[b.urgency] ?? 1;
      const urgencyDiff = urgencyA - urgencyB;
      
      if (urgencyDiff !== 0) return urgencyDiff;
      
      const dateA = new Date(a.requestedAt).getTime();
      const dateB = new Date(b.requestedAt).getTime();
      return dateB - dateA;
    });

    setFilteredRequests(filtered);
  };

  const handleRequestAction = (request: ConsultationRequest, action: 'accept' | 'decline') => {
    setSelectedRequest(request);
    setResponseType(action);
    setShowResponseDialog(true);
  };

  const submitResponse = async () => {
    if (!selectedRequest) return;
    
    if (responseType === 'decline' && !responseMessage.trim()) {
      toast({
        title: 'Response Required',
        description: 'Please provide a reason for declining the request.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      const batch = writeBatch(db);
      const timestamp = new Date().toISOString();
      
      // 1. Update the main consultation request
      const requestRef = doc(db, 'consultationRequests', selectedRequest.id);
      batch.update(requestRef, {
        status: responseType === 'accept' ? 'accepted' : 'declined',
        responseMessage: responseMessage.trim(),
        respondedAt: timestamp,
        statusUpdatedAt: timestamp,
        // Mark as not notified so notification will be sent
        patientNotified: false
      });

      // 2. Create notification for patient
      const notificationRef = doc(collection(db, `patients/${selectedRequest.patientId}/notifications`));
      batch.set(notificationRef, {
        type: responseType === 'accept' ? 'consultation_accepted' : 'consultation_rejected',
        title: responseType === 'accept' ? 'Consultation Request Accepted!' : 'Consultation Request Update',
        message: responseType === 'accept' 
          ? `Dr. ${selectedRequest.doctorName} has accepted your consultation request! ${responseMessage ? `Message: ${responseMessage}` : ''}`
          : `Dr. ${selectedRequest.doctorName} is currently unavailable. ${responseMessage ? `Reason: ${responseMessage}` : ''}`,
        doctorId: selectedRequest.doctorId,
        doctorName: selectedRequest.doctorName,
        requestId: selectedRequest.id,
        read: false,
        createdAt: timestamp
      });

      // 3. Also try to create notification in users collection as fallback
      const userNotificationRef = doc(collection(db, `users/${selectedRequest.patientId}/notifications`));
      batch.set(userNotificationRef, {
        type: responseType === 'accept' ? 'consultation_accepted' : 'consultation_rejected',
        title: responseType === 'accept' ? 'Consultation Request Accepted!' : 'Consultation Request Update',
        message: responseType === 'accept' 
          ? `Dr. ${selectedRequest.doctorName} has accepted your consultation request! ${responseMessage ? `Message: ${responseMessage}` : ''}`
          : `Dr. ${selectedRequest.doctorName} is currently unavailable. ${responseMessage ? `Reason: ${responseMessage}` : ''}`,
        doctorId: selectedRequest.doctorId,
        doctorName: selectedRequest.doctorName,
        requestId: selectedRequest.id,
        read: false,
        createdAt: timestamp
      });

      await batch.commit();

      // Update local state immediately
      setRequests(prev => prev.map(req => 
        req.id === selectedRequest.id 
          ? { 
              ...req, 
              status: responseType === 'accept' ? 'accepted' : 'declined',
              responseMessage: responseMessage.trim(),
              respondedAt: timestamp
            } 
          : req
      ));

      toast({
        title: responseType === 'accept' ? 'Request Accepted' : 'Request Declined',
        description: `Consultation request from ${selectedRequest.patientName} has been ${responseType === 'accept' ? 'accepted' : 'declined'}. Patient will be notified.`,
      });
      
      setShowResponseDialog(false);
      setResponseMessage('');
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error updating request:', error);
      toast({
        title: 'Error',
        description: 'Failed to update request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'high':
      case 'emergency':
        return <Badge className="bg-red-100 text-red-800 border-red-200">High Priority</Badge>;
      case 'medium':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Medium Priority</Badge>;
      case 'low':
        return <Badge variant="secondary">Low Priority</Badge>;
      default:
        return <Badge variant="outline">{urgency}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      case 'accepted':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Accepted</Badge>;
      case 'declined':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Declined</Badge>;
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getConsultationModeDisplay = (mode?: string) => {
    switch (mode) {
      case 'online':
        return 'Video Call Consultation';
      case 'phone':
        return 'Phone Call Consultation';
      case 'in-person':
        return 'In-Person Visit';
      default:
        return 'Not specified';
    }
  };

  const renderPatientHealthStats = (assessmentData: any) => {
    if (!assessmentData) return null;

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center w-8 h-8 mx-auto mb-2 rounded-full bg-blue-100 text-blue-600">
            <Activity className="w-4 h-4" />
          </div>
          <div className="text-lg font-bold">{assessmentData.energyLevels || 'N/A'}/5</div>
          <div className="text-xs text-muted-foreground">Energy</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center w-8 h-8 mx-auto mb-2 rounded-full bg-red-100 text-red-600">
            <Thermometer className="w-4 h-4" />
          </div>
          <div className="text-lg font-bold">{assessmentData.stressLevels || 'N/A'}/5</div>
          <div className="text-xs text-muted-foreground">Stress</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center w-8 h-8 mx-auto mb-2 rounded-full bg-blue-100 text-blue-600">
            <Droplet className="w-4 h-4" />
          </div>
          <div className="text-lg font-bold">{assessmentData.waterIntake || 'N/A'}L</div>
          <div className="text-xs text-muted-foreground">Water/Day</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center w-8 h-8 mx-auto mb-2 rounded-full bg-purple-100 text-purple-600">
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-lg font-bold">{assessmentData.sleepDuration || 'N/A'}</div>
          <div className="text-xs text-muted-foreground">Sleep</div>
        </Card>
      </div>
    );
  };

  const calculateAge = (dob: string) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Loading Requests</h2>
            <p className="text-muted-foreground">Please wait while we fetch consultation requests...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Consultation Requests</h1>
        <p className="text-muted-foreground">Manage incoming patient consultation requests</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search patients..."
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by urgency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Urgency</SelectItem>
                <SelectItem value="high">High Priority</SelectItem>
                <SelectItem value="medium">Medium Priority</SelectItem>
                <SelectItem value="low">Low Priority</SelectItem>
              </SelectContent>
            </Select>

            <div className="text-sm text-muted-foreground flex items-center">
              {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''} found
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Stethoscope className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No Requests Found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' || urgencyFilter !== 'all'
                  ? 'No requests match your current filters.'
                  : 'No consultation requests at this time.'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredRequests.map((request) => (
            <Card key={request.id} className="hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex gap-6">
                  <Avatar className="w-12 h-12 border border-border">
                    <AvatarFallback className="bg-muted text-foreground text-sm font-medium">
                      {request.patientName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold">{request.patientName}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {request.patientEmail}
                          </div>
                          {request.patientPhone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {request.patientPhone}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getUrgencyBadge(request.urgency)}
                        {getStatusBadge(request.status)}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Request Type</Label>
                        <p className="font-medium capitalize">{request.requestType.replace('-', ' ')}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Preferred Mode</Label>
                        <p className="font-medium">
                          {getConsultationModeDisplay(request.preferredConsultationMode)}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Requested</Label>
                        <p className="font-medium">
                          {new Date(request.requestedAt).toLocaleDateString()} at {new Date(request.requestedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                    </div>

                    {request.message && (
                      <div className="mb-4 p-3 bg-muted/30 rounded-md">
                        <Label className="text-xs text-muted-foreground">Patient Message</Label>
                        <p className="text-sm mt-1">{request.message}</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowPatientProfile(true);
                        }}
                        className="gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        View Patient Profile
                      </Button>

                      {request.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleRequestAction(request, 'accept')}
                            className="gap-1 bg-green-600 hover:bg-green-700"
                          >
                            <Check className="w-3 h-3" />
                            Accept
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRequestAction(request, 'decline')}
                            className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <X className="w-3 h-3" />
                            Decline
                          </Button>
                        </>
                      )}

                      {request.status === 'accepted' && (
                        <Button size="sm" variant="outline" className="gap-1">
                          <Calendar className="w-3 h-3" />
                          Schedule Appointment
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Enhanced Patient Profile Modal */}
      {selectedRequest && showPatientProfile && (
        <Dialog open={showPatientProfile} onOpenChange={setShowPatientProfile}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Complete Patient Profile</DialogTitle>
              <DialogDescription>Detailed medical and assessment information for {selectedRequest.patientName}</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Patient Header */}
              <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                <Avatar className="w-16 h-16 border border-border">
                  <AvatarFallback className="bg-muted text-foreground text-lg font-medium">
                    {selectedRequest.patientName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">{selectedRequest.fullPatientProfile.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {selectedRequest.fullPatientProfile.assessmentData?.dob && (
                      <span>Age: {calculateAge(selectedRequest.fullPatientProfile.assessmentData.dob)} years</span>
                    )}
                    {(selectedRequest.fullPatientProfile.gender || selectedRequest.fullPatientProfile.assessmentData?.gender) && (
                      <span className="capitalize">Gender: {selectedRequest.fullPatientProfile.gender || selectedRequest.fullPatientProfile.assessmentData?.gender}</span>
                    )}
                    {selectedRequest.fullPatientProfile.bloodGroup && (
                      <span>Blood Group: {selectedRequest.fullPatientProfile.bloodGroup}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Health Stats */}
              {selectedRequest.fullPatientProfile.assessmentData && 
                renderPatientHealthStats(selectedRequest.fullPatientProfile.assessmentData)}

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span>{selectedRequest.patientEmail}</span>
                    </div>
                    {(selectedRequest.fullPatientProfile.phoneNumber || selectedRequest.patientPhone) && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span>{selectedRequest.fullPatientProfile.phoneNumber || selectedRequest.patientPhone}</span>
                      </div>
                    )}
                    {(selectedRequest.fullPatientProfile.address || selectedRequest.fullPatientProfile.assessmentData?.location) && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{selectedRequest.fullPatientProfile.address || selectedRequest.fullPatientProfile.assessmentData?.location}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Emergency Contact</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">
                      {selectedRequest.fullPatientProfile.emergencyContact || 'Not provided'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Medical History */}
              {(selectedRequest.fullPatientProfile.medicalHistory?.length > 0 || 
                selectedRequest.fullPatientProfile.assessmentData?.currentConditions?.length > 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Medical History & Current Conditions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {(selectedRequest.fullPatientProfile.medicalHistory || 
                        selectedRequest.fullPatientProfile.assessmentData?.currentConditions || [])
                        .map((condition, index) => (
                        <Badge key={index} variant="outline">{condition}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Allergies */}
              {selectedRequest.fullPatientProfile.allergies?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Allergies</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {selectedRequest.fullPatientProfile.allergies.map((allergy, index) => (
<Badge key={index} variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {allergy}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Current Medications */}
              {(selectedRequest.fullPatientProfile.currentMedications?.length > 0 || 
                selectedRequest.fullPatientProfile.assessmentData?.medications) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Current Medications</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedRequest.fullPatientProfile.currentMedications?.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedRequest.fullPatientProfile.currentMedications.map((medication, index) => (
                          <Badge key={index} variant="outline">{medication}</Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm">{selectedRequest.fullPatientProfile.assessmentData?.medications || 'None reported'}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Ayurvedic Assessment Data */}
              {selectedRequest.fullPatientProfile.assessmentData && (
                <>
                  {/* Lifestyle Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Lifestyle & Routine</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Daily Routine</Label>
                          <p className="text-sm">{selectedRequest.fullPatientProfile.assessmentData.dailyRoutine || 'Not specified'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Physical Activity</Label>
                          <p className="text-sm">{selectedRequest.fullPatientProfile.assessmentData.physicalActivity || 'Not specified'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Sleep Duration</Label>
                          <p className="text-sm">{selectedRequest.fullPatientProfile.assessmentData.sleepDuration || 'Not specified'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Water Intake</Label>
                          <p className="text-sm">{selectedRequest.fullPatientProfile.assessmentData.waterIntake}L per day</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Dietary Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Dietary Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Dietary Preferences</Label>
                        <p className="text-sm mb-3">{selectedRequest.fullPatientProfile.assessmentData.dietaryPreferences || 'Not specified'}</p>
                      </div>
                      
                      {selectedRequest.fullPatientProfile.assessmentData.cravings?.length > 0 && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Food Cravings</Label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {selectedRequest.fullPatientProfile.assessmentData.cravings.map((craving, index) => (
                              <Badge key={index} variant="secondary">{craving}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedRequest.fullPatientProfile.assessmentData.digestionIssues?.length > 0 && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Digestion Issues</Label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {selectedRequest.fullPatientProfile.assessmentData.digestionIssues.map((issue, index) => (
                              <Badge key={index} variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">{issue}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <Label className="text-xs text-muted-foreground">Appetite Pattern</Label>
                        <p className="text-sm">{selectedRequest.fullPatientProfile.assessmentData.appetitePattern || 'Not specified'}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Constitutional Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Constitutional Assessment</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Body Frame</Label>
                          <p className="text-sm capitalize">{selectedRequest.fullPatientProfile.assessmentData.bodyFrame || 'Not specified'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Skin Type</Label>
                          <p className="text-sm capitalize">{selectedRequest.fullPatientProfile.assessmentData.skinType || 'Not specified'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Hair Type</Label>
                          <p className="text-sm capitalize">{selectedRequest.fullPatientProfile.assessmentData.hairType || 'Not specified'}</p>
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Weather Preference</Label>
                        <p className="text-sm capitalize">{selectedRequest.fullPatientProfile.assessmentData.weatherPreference || 'Not specified'}</p>
                      </div>

                      {selectedRequest.fullPatientProfile.assessmentData.personalityTraits?.length > 0 && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Personality Traits</Label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {selectedRequest.fullPatientProfile.assessmentData.personalityTraits.map((trait, index) => (
                              <Badge key={index} variant="secondary">{trait}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Family History */}
                  {selectedRequest.fullPatientProfile.assessmentData.familyHistory?.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Family History</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {selectedRequest.fullPatientProfile.assessmentData.familyHistory.map((condition, index) => (
                            <Badge key={index} variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">{condition}</Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Health Goals */}
                  {selectedRequest.fullPatientProfile.assessmentData.healthGoals?.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Health Goals</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {selectedRequest.fullPatientProfile.assessmentData.healthGoals.map((goal, index) => (
                            <Badge key={index} variant="outline" className="bg-green-50 text-green-700 border-green-200">{goal}</Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Additional Notes */}
                  {selectedRequest.fullPatientProfile.assessmentData.additionalNotes && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Additional Notes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm whitespace-pre-wrap">{selectedRequest.fullPatientProfile.assessmentData.additionalNotes}</p>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Response Dialog */}
      <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {responseType === 'accept' ? 'Accept Consultation Request' : 'Decline Consultation Request'}
            </DialogTitle>
            <DialogDescription>
              {responseType === 'accept' 
                ? `You are about to accept the consultation request from ${selectedRequest?.patientName}.`
                : `Please provide a reason for declining the consultation request from ${selectedRequest?.patientName}.`
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="response-message">
                {responseType === 'accept' ? 'Message to Patient (Optional)' : 'Reason for Declining (Required)'}
              </Label>
              <Textarea
                id="response-message"
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                placeholder={
                  responseType === 'accept' 
                    ? "Add any additional information or instructions for the patient..."
                    : "Please explain why you cannot accept this consultation request..."
                }
                rows={4}
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowResponseDialog(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={submitResponse}
              disabled={submitting}
              className={responseType === 'accept' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {responseType === 'accept' ? 'Accepting...' : 'Declining...'}
                </>
              ) : (
                <>
                  {responseType === 'accept' ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Accept Request
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4 mr-2" />
                      Decline Request
                    </>
                  )}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConsultationRequests;