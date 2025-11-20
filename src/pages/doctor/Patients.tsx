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
import { Label } from "@/components/ui/label";
import { 
  Search, 
  Eye, 
  User, 
  Phone, 
  Mail, 
  MapPin,
  Calendar,
  AlertCircle,
  Stethoscope,
  Loader2,
  Activity,
  Thermometer,
  Droplet,
  IdCard,
  Copy,
  Check,
  Clock,
  Users,
  Filter
} from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  doc, 
  getDoc
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';

interface Patient {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientPhone?: string;
  requestType: string;
  acceptedAt: string;
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
    patientId?: string;
    registrationDate?: string;
    profileCompleted?: boolean;
    status?: string;
  };
  doctorId: string;
  doctorName: string;
  doctorEmail: string;
}

const Patients: React.FC = () => {
  const { toast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');
  const [ageFilter, setAgeFilter] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientProfile, setShowPatientProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedPatientId, setCopiedPatientId] = useState<string | null>(null);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('No authenticated user');
      setIsLoading(false);
      return;
    }

    console.log('Fetching accepted patients for doctor:', currentUser.uid);

    const fetchAcceptedPatients = async () => {
      try {
        const requestsRef = collection(db, 'consultationRequests');
        const q = query(
          requestsRef, 
          where('doctorId', '==', currentUser.uid),
          where('status', '==', 'accepted')
        );

        const snapshot = await getDocs(q);
        console.log('Received accepted requests, documents:', snapshot.size);
        
        const patientsData: Patient[] = [];
        
        // Process each accepted request and fetch additional patient data
        for (const docSnapshot of snapshot.docs) {
          const data = docSnapshot.data();
          console.log('Accepted request document:', docSnapshot.id, data);
          
          // Fetch additional patient data from patients collection
          let enhancedPatientProfile = data.fullPatientProfile || {
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
          };

          // Try to fetch complete patient data from patients collection
          try {
            if (data.patientId) {
              const patientDocRef = doc(db, 'patients', data.patientId);
              const patientDoc = await getDoc(patientDocRef);
              
              if (patientDoc.exists()) {
                const patientData = patientDoc.data();
                console.log('Enhanced patient data found:', patientData);
                
                // Merge the existing profile with fetched patient data
                enhancedPatientProfile = {
                  ...enhancedPatientProfile,
                  patientId: patientData.patientId || data.patientId,
                  name: patientData.name || enhancedPatientProfile.name,
                  assessmentData: patientData.assessmentData || enhancedPatientProfile.assessmentData,
                  registrationDate: patientData.registrationDate || patientData.createdAt,
                  profileCompleted: patientData.profileCompleted,
                  status: patientData.status || 'active',
                  ...(patientData.assessmentData && {
                    gender: patientData.assessmentData.gender || enhancedPatientProfile.gender,
                    phoneNumber: enhancedPatientProfile.phoneNumber || patientData.assessmentData.phoneNumber,
                    address: patientData.assessmentData.location || enhancedPatientProfile.address,
                  })
                };
              }
            }
          } catch (patientFetchError) {
            console.warn('Could not fetch enhanced patient data:', patientFetchError);
          }
          
          patientsData.push({
            id: docSnapshot.id,
            patientId: data.patientId || '',
            patientName: data.patientName || 'Unknown Patient',
            patientEmail: data.patientEmail || '',
            patientPhone: data.patientPhone,
            requestType: data.requestType || 'consultation',
            acceptedAt: data.respondedAt || data.requestedAt || new Date().toISOString(),
            doctorId: data.doctorId || '',
            doctorName: data.doctorName || '',
            doctorEmail: data.doctorEmail || '',
            fullPatientProfile: enhancedPatientProfile
          });
        }

        // Remove duplicates based on patientId
        const uniquePatients = patientsData.filter((patient, index, self) => 
          index === self.findIndex((p) => p.patientId === patient.patientId)
        );

        console.log('Processed unique accepted patients:', uniquePatients.length);
        setPatients(uniquePatients);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching accepted patients:', error);
        toast({
          title: 'Error',
          description: 'Failed to load patients. Please try again.',
          variant: 'destructive',
        });
        setIsLoading(false);
      }
    };

    fetchAcceptedPatients();

    // Set up periodic refresh every 60 seconds
    const interval = setInterval(fetchAcceptedPatients, 60000);
    
    return () => clearInterval(interval);
  }, [toast]);

  useEffect(() => {
    applyFilters();
  }, [patients, searchTerm, genderFilter, ageFilter]);

  const applyFilters = () => {
    let filtered = [...patients];

    if (searchTerm.trim()) {
      filtered = filtered.filter(patient =>
        patient.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.patientEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.fullPatientProfile?.patientId?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (genderFilter !== 'all') {
      filtered = filtered.filter(patient => {
        const gender = patient.fullPatientProfile?.gender || patient.fullPatientProfile?.assessmentData?.gender;
        return gender?.toLowerCase() === genderFilter.toLowerCase();
      });
    }

    if (ageFilter !== 'all') {
      filtered = filtered.filter(patient => {
        const dob = patient.fullPatientProfile?.assessmentData?.dob;
        if (!dob) return false;
        
        const age = calculateAge(dob);
        if (!age) return false;

        switch (ageFilter) {
          case 'young': return age < 30;
          case 'middle': return age >= 30 && age < 60;
          case 'senior': return age >= 60;
          default: return true;
        }
      });
    }

    // Sort by name
    filtered.sort((a, b) => a.patientName.localeCompare(b.patientName));

    setFilteredPatients(filtered);
  };

  const handleCopyPatientId = async (patientId: string) => {
    try {
      await navigator.clipboard.writeText(patientId);
      setCopiedPatientId(patientId);
      toast({
        title: "Patient ID Copied",
        description: "Patient ID has been copied to clipboard.",
      });
      setTimeout(() => setCopiedPatientId(null), 2000);
    } catch (error) {
      console.error("Failed to copy patient ID:", error);
      toast({
        title: "Copy Failed",
        description: "Failed to copy Patient ID. Please try again.",
        variant: "destructive",
      });
    }
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not available";
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return "Invalid date";
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

  if (isLoading) {
    return (
      <div className="flex-1 p-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Loading Patients</h2>
            <p className="text-muted-foreground">Please wait while we fetch your accepted patients...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Patients</h1>
          <p className="text-muted-foreground">Manage your accepted patients and their profiles</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Patients</p>
                <p className="text-2xl font-bold">{patients.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100 text-green-600">
                <User className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Profiles</p>
                <p className="text-2xl font-bold">
                  {patients.filter(p => p.fullPatientProfile?.status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-100 text-purple-600">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Complete Profiles</p>
                <p className="text-2xl font-bold">
                  {patients.filter(p => p.fullPatientProfile?.profileCompleted).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-orange-100 text-orange-600">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">With Allergies</p>
                <p className="text-2xl font-bold">
                  {patients.filter(p => p.fullPatientProfile?.allergies && p.fullPatientProfile.allergies.length > 0).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filter Patients
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search patients, Patient ID..."
                className="pl-10"
              />
            </div>
            
            <Select value={genderFilter} onValueChange={setGenderFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genders</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            <Select value={ageFilter} onValueChange={setAgeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by age group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ages</SelectItem>
                <SelectItem value="young">Under 30</SelectItem>
                <SelectItem value="middle">30-60 years</SelectItem>
                <SelectItem value="senior">60+ years</SelectItem>
              </SelectContent>
            </Select>

            <div className="text-sm text-muted-foreground flex items-center">
              {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''} found
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Patients List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredPatients.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="p-12 text-center">
                <Stethoscope className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-semibold mb-2">No Patients Found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || genderFilter !== 'all' || ageFilter !== 'all'
                    ? 'No patients match your current filters.'
                    : 'No accepted patients yet. Patients will appear here once you accept their consultation requests.'
                  }
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          filteredPatients.map((patient) => (
            <Card key={patient.id} className="hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <Avatar className="w-12 h-12 border border-border">
                    <AvatarFallback className="bg-muted text-foreground text-sm font-medium">
                      {patient.patientName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">{patient.patientName}</h3>
                        
                        {/* Patient ID Display */}
                        {patient.fullPatientProfile?.patientId && (
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="gap-2 px-3 py-1 text-xs font-mono">
                              <IdCard className="w-3 h-3" />
                              {patient.fullPatientProfile.patientId}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0 ml-1 hover:bg-primary/20"
                                onClick={() => handleCopyPatientId(patient.fullPatientProfile.patientId!)}
                              >
                                {copiedPatientId === patient.fullPatientProfile.patientId ? (
                                  <Check className="w-3 h-3 text-green-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </Button>
                            </Badge>
                          </div>
                        )}

                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {patient.patientEmail}
                          </div>
                          {patient.patientPhone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {patient.patientPhone}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Patient Status */}
                      <div className="flex flex-col items-end gap-2">
                        {patient.fullPatientProfile?.status && (
                          <Badge variant="outline" className="text-xs capitalize">
                            {patient.fullPatientProfile.status}
                          </Badge>
                        )}
                        {patient.fullPatientProfile?.profileCompleted !== undefined && (
                          <Badge variant={patient.fullPatientProfile.profileCompleted ? "default" : "secondary"} className="text-xs">
                            {patient.fullPatientProfile.profileCompleted ? 'Complete' : 'Incomplete'}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Patient Basic Info */}
                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                      {(patient.fullPatientProfile?.assessmentData?.dob) && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Age</Label>
                          <p className="font-medium">
                            {calculateAge(patient.fullPatientProfile.assessmentData.dob)} years
                          </p>
                        </div>
                      )}
                      {(patient.fullPatientProfile?.gender || patient.fullPatientProfile?.assessmentData?.gender) && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Gender</Label>
                          <p className="font-medium capitalize">
                            {patient.fullPatientProfile.gender || patient.fullPatientProfile.assessmentData?.gender}
                          </p>
                        </div>
                      )}
                      {patient.fullPatientProfile?.bloodGroup && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Blood Group</Label>
                          <p className="font-medium">{patient.fullPatientProfile.bloodGroup}</p>
                        </div>
                      )}
                      <div>
                        <Label className="text-xs text-muted-foreground">Accepted On</Label>
                        <p className="font-medium text-xs">
                          {formatDate(patient.acceptedAt)}
                        </p>
                      </div>
                    </div>

                    {/* Health Indicators */}
                    {patient.fullPatientProfile?.allergies && patient.fullPatientProfile.allergies.length > 0 && (
                      <div className="mb-3">
                        <Label className="text-xs text-muted-foreground">Allergies</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {patient.fullPatientProfile.allergies.slice(0, 3).map((allergy, index) => (
                            <Badge key={index} variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                              {allergy}
                            </Badge>
                          ))}
                          {patient.fullPatientProfile.allergies.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{patient.fullPatientProfile.allergies.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedPatient(patient);
                          setShowPatientProfile(true);
                        }}
                        className="gap-1 flex-1"
                      >
                        <Eye className="w-3 h-3" />
                        View Full Profile
                      </Button>
                      <Button
                        size="sm"
                        className="gap-1"
                      >
                        <Calendar className="w-3 h-3" />
                        Schedule
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Patient Profile Modal */}
      {selectedPatient && showPatientProfile && (
        <Dialog open={showPatientProfile} onOpenChange={setShowPatientProfile}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Patient Profile</DialogTitle>
              <DialogDescription>Complete medical and assessment information for {selectedPatient.patientName}</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Patient Header with ID */}
              <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                <Avatar className="w-16 h-16 border border-border">
                  <AvatarFallback className="bg-muted text-foreground text-lg font-medium">
                    {selectedPatient.patientName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">{selectedPatient.fullPatientProfile.name}</h3>
                  
                  {/* Patient ID in header */}
                  {selectedPatient.fullPatientProfile?.patientId && (
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="gap-2 px-3 py-1 text-sm font-mono">
                        <IdCard className="w-4 h-4" />
                        Patient ID: {selectedPatient.fullPatientProfile.patientId}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 ml-1 hover:bg-primary/20"
                          onClick={() => handleCopyPatientId(selectedPatient.fullPatientProfile.patientId!)}
                        >
                          {copiedPatientId === selectedPatient.fullPatientProfile.patientId ? (
                            <Check className="w-3 h-3 text-green-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                      </Badge>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {selectedPatient.fullPatientProfile.assessmentData?.dob && (
                      <span>Age: {calculateAge(selectedPatient.fullPatientProfile.assessmentData.dob)} years</span>
                    )}
                    {(selectedPatient.fullPatientProfile.gender || selectedPatient.fullPatientProfile.assessmentData?.gender) && (
                      <span className="capitalize">Gender: {selectedPatient.fullPatientProfile.gender || selectedPatient.fullPatientProfile.assessmentData?.gender}</span>
                    )}
                    {selectedPatient.fullPatientProfile.bloodGroup && (
                      <span>Blood Group: {selectedPatient.fullPatientProfile.bloodGroup}</span>
                    )}
                  </div>

                  {/* Additional patient status info */}
                  <div className="flex items-center gap-2 mt-2">
                    {selectedPatient.fullPatientProfile?.status && (
                      <Badge variant="outline" className="text-xs capitalize">
                        Status: {selectedPatient.fullPatientProfile.status}
                      </Badge>
                    )}
                    {selectedPatient.fullPatientProfile?.profileCompleted !== undefined && (
                      <Badge variant={selectedPatient.fullPatientProfile.profileCompleted ? "default" : "secondary"} className="text-xs">
                        Profile {selectedPatient.fullPatientProfile.profileCompleted ? 'Complete' : 'Incomplete'}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      Accepted: {formatDate(selectedPatient.acceptedAt)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Health Stats */}
              {selectedPatient.fullPatientProfile.assessmentData && 
                renderPatientHealthStats(selectedPatient.fullPatientProfile.assessmentData)}

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span>{selectedPatient.patientEmail}</span>
                    </div>
                    {(selectedPatient.fullPatientProfile.phoneNumber || selectedPatient.patientPhone) && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span>{selectedPatient.fullPatientProfile.phoneNumber || selectedPatient.patientPhone}</span>
                      </div>
                    )}
                    {(selectedPatient.fullPatientProfile.address || selectedPatient.fullPatientProfile.assessmentData?.location) && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{selectedPatient.fullPatientProfile.address || selectedPatient.fullPatientProfile.assessmentData?.location}</span>
                      </div>
                    )}
                    {selectedPatient.fullPatientProfile?.registrationDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Member since {formatDate(selectedPatient.fullPatientProfile.registrationDate)}</span>
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
                      {selectedPatient.fullPatientProfile.emergencyContact || 'Not provided'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Medical History */}
              {(selectedPatient.fullPatientProfile.medicalHistory?.length > 0 || 
                selectedPatient.fullPatientProfile.assessmentData?.currentConditions?.length > 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Medical History & Current Conditions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {(selectedPatient.fullPatientProfile.medicalHistory || 
                        selectedPatient.fullPatientProfile.assessmentData?.currentConditions || [])
                        .map((condition, index) => (
                        <Badge key={index} variant="outline">{condition}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Allergies */}
              {selectedPatient.fullPatientProfile.allergies?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Allergies</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {selectedPatient.fullPatientProfile.allergies.map((allergy, index) => (
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
              {(selectedPatient.fullPatientProfile.currentMedications?.length > 0 || 
                selectedPatient.fullPatientProfile.assessmentData?.medications) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Current Medications</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedPatient.fullPatientProfile.currentMedications?.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedPatient.fullPatientProfile.currentMedications.map((medication, index) => (
                          <Badge key={index} variant="outline">{medication}</Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm">{selectedPatient.fullPatientProfile.assessmentData?.medications || 'None reported'}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Ayurvedic Assessment Data */}
              {selectedPatient.fullPatientProfile.assessmentData && (
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
                          <p className="text-sm">{selectedPatient.fullPatientProfile.assessmentData.dailyRoutine || 'Not specified'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Physical Activity</Label>
                          <p className="text-sm">{selectedPatient.fullPatientProfile.assessmentData.physicalActivity || 'Not specified'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Sleep Duration</Label>
                          <p className="text-sm">{selectedPatient.fullPatientProfile.assessmentData.sleepDuration || 'Not specified'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Water Intake</Label>
                          <p className="text-sm">{selectedPatient.fullPatientProfile.assessmentData.waterIntake}L per day</p>
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
                        <p className="text-sm mb-3">{selectedPatient.fullPatientProfile.assessmentData.dietaryPreferences || 'Not specified'}</p>
                      </div>
                      
                      {selectedPatient.fullPatientProfile.assessmentData.cravings?.length > 0 && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Food Cravings</Label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {selectedPatient.fullPatientProfile.assessmentData.cravings.map((craving, index) => (
                              <Badge key={index} variant="secondary">{craving}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedPatient.fullPatientProfile.assessmentData.digestionIssues?.length > 0 && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Digestion Issues</Label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {selectedPatient.fullPatientProfile.assessmentData.digestionIssues.map((issue, index) => (
                              <Badge key={index} variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">{issue}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <Label className="text-xs text-muted-foreground">Appetite Pattern</Label>
                        <p className="text-sm">{selectedPatient.fullPatientProfile.assessmentData.appetitePattern || 'Not specified'}</p>
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
                          <p className="text-sm capitalize">{selectedPatient.fullPatientProfile.assessmentData.bodyFrame || 'Not specified'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Skin Type</Label>
                          <p className="text-sm capitalize">{selectedPatient.fullPatientProfile.assessmentData.skinType || 'Not specified'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Hair Type</Label>
                          <p className="text-sm capitalize">{selectedPatient.fullPatientProfile.assessmentData.hairType || 'Not specified'}</p>
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Weather Preference</Label>
                        <p className="text-sm capitalize">{selectedPatient.fullPatientProfile.assessmentData.weatherPreference || 'Not specified'}</p>
                      </div>

                      {selectedPatient.fullPatientProfile.assessmentData.personalityTraits?.length > 0 && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Personality Traits</Label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {selectedPatient.fullPatientProfile.assessmentData.personalityTraits.map((trait, index) => (
                              <Badge key={index} variant="secondary">{trait}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Family History */}
                  {selectedPatient.fullPatientProfile.assessmentData.familyHistory?.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Family History</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {selectedPatient.fullPatientProfile.assessmentData.familyHistory.map((condition, index) => (
                            <Badge key={index} variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">{condition}</Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Health Goals */}
                  {selectedPatient.fullPatientProfile.assessmentData.healthGoals?.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Health Goals</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {selectedPatient.fullPatientProfile.assessmentData.healthGoals.map((goal, index) => (
                            <Badge key={index} variant="outline" className="bg-green-50 text-green-700 border-green-200">{goal}</Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Additional Notes */}
                  {selectedPatient.fullPatientProfile.assessmentData.additionalNotes && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Additional Notes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm whitespace-pre-wrap">{selectedPatient.fullPatientProfile.assessmentData.additionalNotes}</p>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Patients;