import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Edit, Save, X, User, Heart, Star, MessageSquare, Phone, Mail, Calendar, Activity, Droplet, Target, MapPin, Sun, Apple, HeartPulse, Thermometer, Moon, IdCard, Copy, Check } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/hooks/use-toast";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface AssessmentData {
  // Personal Information
  name: string;
  dob: string;
  gender: string;
  location: string;

  // Lifestyle & Habits
  dailyRoutine: string;
  physicalActivity: string;
  sleepDuration: string;
  waterIntake: number;

  // Dietary Habits
  dietaryPreferences: string;
  cravings: string[];
  cravingsOther: string;
  digestionIssues: string[];

  // Health & Wellness
  currentConditions: string[];
  currentConditionsOther: string;
  familyHistory: string[];
  familyHistoryOther: string;
  medications: string;
  labReports: string;
  energyLevels: number;
  stressLevels: number;

  // Ayurvedic Constitutional Assessment
  bodyFrame: string;
  skinType: string;
  hairType: string;
  appetitePattern: string;
  personalityTraits: string[];
  weatherPreference: string;

  // Goals & Preferences
  healthGoals: string[];
  healthGoalsOther: string;
  mealPrepTime: string;
  budgetPreference: string;
  additionalNotes: string;
}

interface PatientData {
  patientId?: string;
  name: string;
  email: string;
  uid: string;
  role: string;
  questionnaireCompleted?: boolean;
  createdAt: string;
  profileCompleted?: boolean;
  registrationDate?: string;
  status?: string;
  assessmentData?: AssessmentData;
  updatedAt?: string;
}

export default function Profile() {
  const { user, setUser } = useApp();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [assessmentData, setAssessmentData] = useState<AssessmentData | null>(null);
  const [originalData, setOriginalData] = useState<AssessmentData | null>(null);
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [patientIdCopied, setPatientIdCopied] = useState(false);

  const [feedbackData, setFeedbackData] = useState({
    rating: 5,
    message: "",
    category: "general" as "general" | "features" | "bug" | "suggestion"
  });

  // Fetch patient data including patient ID and assessment data from Firebase
  useEffect(() => {
    const fetchPatientData = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        console.log("Fetching patient data for user:", user.id);
        
        const patientDocRef = doc(db, "patients", user.id);
        const patientDoc = await getDoc(patientDocRef);

        if (patientDoc.exists()) {
          const data = patientDoc.data() as PatientData;
          console.log("Patient data fetched:", data);
          
          // Set the complete patient data
          setPatientData(data);
          
          // Extract assessment data if it exists
          const assessment = data.assessmentData as AssessmentData;
          if (assessment) {
            setAssessmentData(assessment);
            setOriginalData(assessment);
          } else {
            console.log("No assessment data found for patient");
          }
        } else {
          console.log("Patient document not found");
          toast({
            title: "Profile Not Found",
            description: "Your profile could not be found. Please contact support.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error fetching patient data:", error);
        toast({
          title: "Error",
          description: "Failed to load profile data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPatientData();
  }, [user, toast]);

  const handleSave = async () => {
    if (!user?.id || !assessmentData || !patientData) return;

    try {
      const patientDocRef = doc(db, "patients", user.id);
      
      // Update both assessment data and patient info
      const updateData = {
        ...patientData,
        assessmentData: assessmentData,
        updatedAt: new Date().toISOString(),
        profileCompleted: true, // Mark profile as completed when saved
      };

      await updateDoc(patientDocRef, updateData);

      // Update user context if name changed
      if (user.name !== assessmentData.name) {
        setUser({
          ...user,
          name: assessmentData.name,
        });
      }
      
      // Update local state
      setPatientData(prev => prev ? { ...prev, ...updateData } : null);
      setOriginalData(assessmentData);
      setIsEditing(false);
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    if (originalData) {
      setAssessmentData(originalData);
    }
    setIsEditing(false);
  };

  const handleInputChange = (field: keyof AssessmentData, value: unknown) => {
    if (!assessmentData) return;
    setAssessmentData({
      ...assessmentData,
      [field]: value
    });
  };

  const handleCopyPatientId = async () => {
    if (patientData?.patientId) {
      try {
        await navigator.clipboard.writeText(patientData.patientId);
        setPatientIdCopied(true);
        toast({
          title: "Patient ID Copied",
          description: "Your Patient ID has been copied to clipboard.",
        });
        setTimeout(() => setPatientIdCopied(false), 2000);
      } catch (error) {
        console.error("Failed to copy patient ID:", error);
        toast({
          title: "Copy Failed",
          description: "Failed to copy Patient ID. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleFeedbackSubmit = () => {
    toast({
      title: "Feedback Submitted",
      description: "Thank you for your valuable feedback. We appreciate your input!",
    });
    setFeedbackData({
      rating: 5,
      message: "",
      category: "general"
    });
  };

  const calculateAge = (dob: string) => {
    if (!dob) return "Not specified";
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age} years`;
  };

  const formatArrayToString = (arr: string[], other?: string) => {
    if (!arr || arr.length === 0) return other || "Not specified";
    const items = arr.filter(item => item !== "none");
    if (arr.includes("none")) return "None";
    const result = items.join(", ");
    return other ? `${result}${result ? ", " : ""}${other}` : result;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!patientData) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <HeartPulse className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Profile Not Found</h2>
          <p className="text-muted-foreground mb-4">
            Your patient profile could not be loaded. Please contact support.
          </p>
          <Button onClick={() => window.location.href = '/patient/questionnaire'}>
            Complete Assessment
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="w-24 h-24 border-4 border-primary/20 shadow-xl">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-2xl font-bold">
                    {patientData.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-background flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-foreground mb-2">{patientData.name}</h1>
                <p className="text-lg text-muted-foreground mb-1">{patientData.email}</p>
                <div className="flex items-center gap-4 flex-wrap">
                  {/* Patient ID Badge */}
                  {patientData.patientId && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="gap-2 px-3 py-1 text-sm font-mono">
                        <IdCard className="w-4 h-4" />
                        ID: {patientData.patientId}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 ml-1 hover:bg-primary/20"
                          onClick={handleCopyPatientId}
                        >
                          {patientIdCopied ? (
                            <Check className="w-3 h-3 text-green-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                      </Badge>
                    </div>
                  )}
                  {assessmentData?.location && (
                    <Badge variant="outline" className="gap-1">
                      <MapPin className="w-3 h-3" />
                      {assessmentData.location}
                    </Badge>
                  )}
                  {assessmentData?.dob && (
                    <Badge variant="outline" className="gap-1">
                      <Calendar className="w-3 h-3" />
                      {calculateAge(assessmentData.dob)}
                    </Badge>
                  )}
                </div>
                {/* Registration Date */}
                {patientData.registrationDate && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Member since {formatDate(patientData.registrationDate)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              {isEditing ? (
                <>
                  <Button onClick={handleSave} size="lg" className="gap-2">
                    <Save className="w-5 h-5" />
                    Save Changes
                  </Button>
                  <Button onClick={handleCancel} variant="outline" size="lg" className="gap-2">
                    <X className="w-5 h-5" />
                    Cancel
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)} size="lg" className="gap-2">
                  <Edit className="w-5 h-5" />
                  Edit Profile
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Patient ID Information Card */}
      {patientData.patientId && (
        <Card className="border-primary/20 shadow-lg">
          <CardHeader className="pb-6">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 rounded-full bg-blue-100">
                <IdCard className="w-6 h-6 text-blue-600" />
              </div>
              Patient Information
            </CardTitle>
            <CardDescription>Your unique patient identification and account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="font-medium">Patient ID</p>
                  <p className="text-2xl font-mono font-bold text-primary">{patientData.patientId}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyPatientId}
                  className="gap-2"
                >
                  {patientIdCopied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy ID
                    </>
                  )}
                </Button>
              </div>
              
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="font-medium">Account Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <Badge variant="outline" className="capitalize">
                    {patientData.status || 'Active'}
                  </Badge>
                </div>
              </div>

              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="font-medium">Profile Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${patientData.profileCompleted ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                  <Badge variant="outline" className="capitalize">
                    {patientData.profileCompleted ? 'Complete' : 'Incomplete'}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> Please keep your Patient ID safe. You'll need it for appointments, 
                medical records, and when contacting support.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Show message if no assessment data */}
      {!assessmentData ? (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <HeartPulse className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Complete Your Health Assessment</h3>
              <p className="text-muted-foreground mb-4">
                To get personalized recommendations, please complete your health assessment questionnaire.
              </p>
              <Button onClick={() => window.location.href = '/patient/questionnaire'}>
                Start Assessment
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-6 text-center border-primary/20 hover:border-primary/40 transition-colors">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-full bg-blue-100 text-blue-600">
                <Activity className="w-6 h-6" />
              </div>
              <div className="text-2xl font-bold text-foreground">{assessmentData.energyLevels || 0}/5</div>
              <div className="text-sm text-muted-foreground">Energy Levels</div>
            </Card>
            <Card className="p-6 text-center border-primary/20 hover:border-primary/40 transition-colors">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 text-red-600">
                <Thermometer className="w-6 h-6" />
              </div>
              <div className="text-2xl font-bold text-foreground">{assessmentData.stressLevels || 0}/5</div>
              <div className="text-sm text-muted-foreground">Stress Levels</div>
            </Card>
            <Card className="p-6 text-center border-primary/20 hover:border-primary/40 transition-colors">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-full bg-blue-100 text-blue-600">
                <Droplet className="w-6 h-6" />
              </div>
              <div className="text-2xl font-bold text-foreground">{assessmentData.waterIntake || 0}L</div>
              <div className="text-sm text-muted-foreground">Daily Water</div>
            </Card>
            <Card className="p-6 text-center border-primary/20 hover:border-primary/40 transition-colors">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-full bg-purple-100 text-purple-600">
                <Moon className="w-6 h-6" />
              </div>
              <div className="text-2xl font-bold text-foreground">{assessmentData.sleepDuration || "N/A"}</div>
              <div className="text-sm text-muted-foreground">Sleep Duration</div>
            </Card>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Personal Information */}
            <Card className="border-primary/20 shadow-lg">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 rounded-full bg-primary/10">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  Personal Information
                </CardTitle>
                <CardDescription>Your basic profile details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="name" className="text-base font-medium">Full Name</Label>
                    {isEditing ? (
                      <Input
                        id="name"
                        value={assessmentData.name || patientData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="text-base h-12"
                      />
                    ) : (
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-base">{assessmentData.name || patientData.name}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="dob" className="text-base font-medium">Date of Birth</Label>
                    {isEditing ? (
                      <Input
                        id="dob"
                        type="date"
                        value={assessmentData.dob}
                        onChange={(e) => handleInputChange('dob', e.target.value)}
                        className="text-base h-12"
                      />
                    ) : (
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-base">{assessmentData.dob || "Not specified"} ({calculateAge(assessmentData.dob)})</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="gender" className="text-base font-medium">Gender</Label>
                    {isEditing ? (
                      <Select
                        value={assessmentData.gender}
                        onValueChange={(value) => handleInputChange('gender', value)}
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="non-binary">Non-binary</SelectItem>
                          <SelectItem value="prefer-not-say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-base capitalize">{assessmentData.gender?.replace('-', ' ') || "Not specified"}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="location" className="text-base font-medium">Location</Label>
                    {isEditing ? (
                      <Input
                        id="location"
                        value={assessmentData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        className="text-base h-12"
                        placeholder="City, State"
                      />
                    ) : (
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="text-base">{assessmentData.location || "Not specified"}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lifestyle & Habits */}
            <Card className="border-primary/20 shadow-lg">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 rounded-full bg-orange-100">
                    <Sun className="w-6 h-6 text-orange-600" />
                  </div>
                  Lifestyle & Habits
                </CardTitle>
                <CardDescription>Your daily routine and lifestyle patterns</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Physical Activity Level</Label>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <Badge variant="outline" className="capitalize">
                        {assessmentData.physicalActivity || "Not specified"}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-medium">Sleep Duration</Label>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <span className="text-base">{assessmentData.sleepDuration || "Not specified"}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-medium">Daily Water Intake</Label>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <span className="text-base">{assessmentData.waterIntake || 0}L per day</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-medium">Daily Routine</Label>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-base">{assessmentData.dailyRoutine || "Not specified"}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Dietary Information */}
          <Card className="border-primary/20 shadow-lg">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-full bg-green-100">
                  <Apple className="w-6 h-6 text-green-600" />
                </div>
                Dietary Habits & Preferences
              </CardTitle>
              <CardDescription>Your dietary choices and eating patterns</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <Label className="text-base font-medium">Dietary Preference</Label>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <Badge variant="outline" className="capitalize">
                      {assessmentData.dietaryPreferences || "Not specified"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-medium">Food Cravings</Label>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="flex flex-wrap gap-2">
                      {assessmentData.cravings && assessmentData.cravings.length > 0 ? (
                        assessmentData.cravings.map((craving, index) => (
                          <Badge key={index} variant="secondary" className="capitalize">
                            {craving}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">Not specified</span>
                      )}
                    </div>
                    {assessmentData.cravingsOther && (
                      <p className="text-sm mt-2 text-muted-foreground">Other: {assessmentData.cravingsOther}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3 md:col-span-2">
                  <Label className="text-base font-medium">Digestive Issues</Label>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-base">{formatArrayToString(assessmentData.digestionIssues)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Health Information */}
          <Card className="border-primary/20 shadow-lg">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-full bg-red-100">
                  <HeartPulse className="w-6 h-6 text-red-600" />
                </div>
                Health & Wellness
              </CardTitle>
              <CardDescription>Your health status and medical information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <Label className="text-base font-medium">Current Health Conditions</Label>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-base">{formatArrayToString(assessmentData.currentConditions, assessmentData.currentConditionsOther)}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-medium">Family History</Label>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-base">{formatArrayToString(assessmentData.familyHistory, assessmentData.familyHistoryOther)}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-medium">Energy Levels (1-5)</Label>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${((assessmentData.energyLevels || 0) / 5) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{assessmentData.energyLevels || 0}/5</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-medium">Stress Levels (1-5)</Label>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-red-500 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${((assessmentData.stressLevels || 0) / 5) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{assessmentData.stressLevels || 0}/5</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 md:col-span-2">
                  <Label className="text-base font-medium">Current Medications & Supplements</Label>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-base">{assessmentData.medications || "Not specified"}</p>
                  </div>
                </div>

                <div className="space-y-3 md:col-span-2">
                  <Label className="text-base font-medium">Recent Lab Reports</Label>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-base">{assessmentData.labReports || "Not specified"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ayurvedic Constitution */}
          <Card className="border-primary/20 shadow-lg">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-full bg-purple-100">
                  <Heart className="w-6 h-6 text-purple-600" />
                </div>
                Ayurvedic Constitution Assessment
              </CardTitle>
              <CardDescription>Your body constitution and characteristics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-3">
                  <Label className="text-base font-medium">Body Frame</Label>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <Badge variant="outline" className="capitalize">
                      {assessmentData.bodyFrame || "Not specified"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-medium">Skin Type</Label>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <Badge variant="outline" className="capitalize">
                      {assessmentData.skinType || "Not specified"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-medium">Hair Type</Label>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <Badge variant="outline" className="capitalize">
                      {assessmentData.hairType || "Not specified"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-medium">Appetite Pattern</Label>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <Badge variant="outline" className="capitalize">
                      {assessmentData.appetitePattern || "Not specified"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-medium">Weather Preference</Label>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <Badge variant="outline" className="capitalize">
                      {assessmentData.weatherPreference || "Not specified"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-medium">Personality Traits</Label>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex flex-wrap gap-1">
                      {assessmentData.personalityTraits && assessmentData.personalityTraits.length > 0 ? (
                        assessmentData.personalityTraits.map((trait, index) => (
                          <Badge key={index} variant="secondary" className="capitalize text-xs">
                            {trait.replace('-', ' ')}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">Not specified</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Health Goals & Preferences */}
          <Card className="border-primary/20 shadow-lg">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-full bg-blue-100">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
                Health Goals & Lifestyle Preferences
              </CardTitle>
              <CardDescription>Your wellness objectives and lifestyle choices</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <Label className="text-base font-medium">Health Goals</Label>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="flex flex-wrap gap-2 mb-2">
                      {assessmentData.healthGoals && assessmentData.healthGoals.length > 0 ? (
                        assessmentData.healthGoals.map((goal, index) => (
                          <Badge key={index} variant="secondary" className="capitalize">
                            {goal.replace('-', ' ')}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">Not specified</span>
                      )}
                    </div>
                    {assessmentData.healthGoalsOther && (
                      <p className="text-sm text-muted-foreground">Other: {assessmentData.healthGoalsOther}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-medium">Meal Prep Time</Label>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <Badge variant="outline" className="capitalize">
                      {assessmentData.mealPrepTime || "Not specified"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-medium">Budget Preference</Label>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <Badge variant="outline" className="capitalize">
                      {assessmentData.budgetPreference || "Not specified"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3 md:col-span-2">
                  <Label className="text-base font-medium">Additional Notes</Label>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-base">{assessmentData.additionalNotes || "Not specified"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Feedback Section */}
      <Card className="border-primary/20 shadow-lg">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 rounded-full bg-green-100">
              <MessageSquare className="w-6 h-6 text-green-600" />
            </div>
            Share Your Feedback
          </CardTitle>
          <CardDescription>Help us improve your experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-3">
              <Label className="text-base font-medium">Overall Rating</Label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setFeedbackData({ ...feedbackData, rating: star })}
                    className="hover:scale-110 transition-transform"
                  >
                    <Star 
                      className={`w-8 h-8 ${
                        star <= feedbackData.rating 
                          ? 'fill-yellow-400 text-yellow-400' 
                          : 'text-gray-300 hover:text-yellow-200'
                      }`} 
                    />
                  </button>
                ))}
                <span className="ml-3 text-lg font-medium">{feedbackData.rating}/5</span>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-medium">Feedback Category</Label>
              <Select
                value={feedbackData.category}
                onValueChange={(value: "general" | "features" | "bug" | "suggestion") => 
                  setFeedbackData({ ...feedbackData, category: value })
                }
              >
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Feedback</SelectItem>
                  <SelectItem value="features">Feature Request</SelectItem>
                  <SelectItem value="bug">Bug Report</SelectItem>
                  <SelectItem value="suggestion">Suggestion</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-medium">Your Message</Label>
              <Textarea
                value={feedbackData.message}
                onChange={(e) => setFeedbackData({ ...feedbackData, message: e.target.value })}
                placeholder="Share your thoughts, suggestions, or report any issues..."
                className="min-h-[120px] resize-none"
              />
            </div>

            <Button onClick={handleFeedbackSubmit} className="w-full h-12 gap-2">
              <MessageSquare className="w-5 h-5" />
              Submit Feedback
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card className="border-primary/20 shadow-lg">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 rounded-full bg-blue-100">
              <Phone className="w-6 h-6 text-blue-600" />
            </div>
            Contact & Support
          </CardTitle>
          <CardDescription>Get in touch with our team</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Email Support</p>
                <p className="text-sm text-muted-foreground">support@ayurvedaapp.com</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
              <Phone className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Phone Support</p>
                <p className="text-sm text-muted-foreground">+1 (555) 123-4567</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}