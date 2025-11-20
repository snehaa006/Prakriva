import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Calendar, 
  Upload,
  MessageCircle,
  Pill,
  Weight,
  Activity,
  Droplets,
  AlertTriangle,
  Shield,
  Phone,
  Video,
  FileText,
  BookOpen,
  Gift,
  Star,
  Award,
  Plus,
  Edit3,
  Eye,
  Download,
  Clock,
  CheckCircle,
  Heart,
  MapPin,
  BarChart3,
  PlayCircle,
  Users,
  Stethoscope,
  ExternalLink,
  Send,
  X,
  Loader2
} from "lucide-react";

// Mock data
const mockUser = {
  name: "Sneha Sharma",
  role: "patient"
};

const mockHealthMetrics = {
  weight: { value: "65", unit: "kg", trend: "+1.2", status: "Normal" },
  bp: { systolic: "120", diastolic: "80", status: "Normal" },
  sugar: { value: "95", unit: "mg/dL", status: "Good" },
  allergies: ["Peanuts", "Dust", "Shellfish"]
};

const upcomingAppointments = [
  {
    id: 1,
    doctor: "Dr. Rajesh Kumar",
    specialty: "Cardiologist",
    date: "Dec 25",
    time: "10:30 AM",
    type: "video"
  },
  {
    id: 2,
    doctor: "Dr. Priya Singh",
    specialty: "Dermatologist", 
    date: "Dec 28",
    time: "3:00 PM",
    type: "clinic"
  }
];

const healthJournalEntries = [
  { 
    id: 1, 
    date: "Today", 
    note: "Feeling much better after medication. Energy improving.", 
    mood: "good"
  },
  { 
    id: 2, 
    date: "Yesterday", 
    note: "Mild headache, possibly work stress.", 
    mood: "okay"
  }
];

const reportsData = [
  { id: 1, type: "lab", name: "Blood Count", date: "Dec 15", doctor: "Dr. Kumar" },
  { id: 2, type: "prescription", name: "Medication", date: "Dec 10", doctor: "Dr. Singh" },
  { id: 3, type: "scan", name: "Chest X-Ray", date: "Nov 28", doctor: "Dr. Mehta" }
];

const wellnessContent = [
  { 
    id: 1, 
    title: "Managing Stress - Deep Breathing Techniques", 
    type: "video", 
    duration: "12 min",
    youtubeId: "tybOi4hjZFQ",
    thumbnail: "https://img.youtube.com/vi/tybOi4hjZFQ/mqdefault.jpg"
  },
  { 
    id: 2, 
    title: "Home Exercise - 10 Minute Morning Routine", 
    type: "video", 
    duration: "10 min",
    youtubeId: "UBMk30rjy0o",
    thumbnail: "https://img.youtube.com/vi/UBMk30rjy0o/mqdefault.jpg"
  },
  { 
    id: 3, 
    title: "Heart-Healthy Diet Tips", 
    type: "article", 
    duration: "5 min",
    url: "https://www.heart.org/en/healthy-living/healthy-eating"
  },
  { 
    id: 4, 
    title: "Yoga for Beginners - Stress Relief", 
    type: "video", 
    duration: "15 min",
    youtubeId: "v7AYKMP6rOE",
    thumbnail: "https://img.youtube.com/vi/v7AYKMP6rOE/mqdefault.jpg"
  },
  { 
    id: 5, 
    title: "Meditation Guide for Better Sleep", 
    type: "video", 
    duration: "20 min",
    youtubeId: "ZToicYcHIOU",
    thumbnail: "https://img.youtube.com/vi/ZToicYcHIOU/mqdefault.jpg"
  },
  { 
    id: 6, 
    title: "Quick Home Workout - No Equipment", 
    type: "video", 
    duration: "8 min",
    youtubeId: "ml6cT4AZdqI",
    thumbnail: "https://img.youtube.com/vi/ml6cT4AZdqI/mqdefault.jpg"
  }
];

// Mock doctors data for chat
const mockDoctors = [
  {
    id: "dr1",
    name: "Dr. Rajesh Kumar",
    specialty: "Cardiologist",
    status: "online",
    lastSeen: "now"
  },
  {
    id: "dr2", 
    name: "Dr. Priya Singh",
    specialty: "Dermatologist",
    status: "offline",
    lastSeen: "2 hours ago"
  },
  {
    id: "dr3",
    name: "Dr. Amit Mehta", 
    specialty: "General Physician",
    status: "online",
    lastSeen: "now"
  }
];

const PatientDashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [journalEntry, setJournalEntry] = useState("");
  const [selectedSection, setSelectedSection] = useState("overview");
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon"; 
    return "Good evening";
  };

  const handleNavigation = (path) => {
    // Simulate navigation based on the path
    if (path === '/patient/consult-doctor') {
      alert('Redirecting to Consult Doctor page...');
      // In real app: navigate('/patient/consult-doctor');
    } else if (path === '/patient/profile') {
      alert('Redirecting to Profile page...');
      // In real app: navigate('/patient/profile');
    } else if (path === '/patient/social-support') {
      setChatModalOpen(true);
    } else if (path === '/patient/medications') {
      // Redirect to Amazon Pharmacy
      window.open('https://pharmacy.amazon.in/', '_blank');
    } else {
      alert(`Navigation to: ${path}`);
    }
  };

  const openYouTubeVideo = (videoId) => {
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
  };

  const openExternalLink = (url) => {
    window.open(url, '_blank');
  };

  const handleChatWithDoctor = (doctor) => {
    setSelectedDoctor(doctor);
    // Mock existing messages
    setChatMessages([
      {
        id: 1,
        sender: "doctor",
        message: `Hello! I'm ${doctor.name}. How can I help you today?`,
        timestamp: new Date(Date.now() - 300000).toISOString()
      },
      {
        id: 2,
        sender: "patient",
        message: "Hi doctor, I have been experiencing some mild headaches lately.",
        timestamp: new Date(Date.now() - 240000).toISOString()
      },
      {
        id: 3,
        sender: "doctor", 
        message: "I understand your concern. Can you tell me more about when these headaches occur and their intensity?",
        timestamp: new Date(Date.now() - 180000).toISOString()
      }
    ]);
  };

  const sendMessage = async () => {
    if (!chatMessage.trim() || !selectedDoctor) return;

    setSendingMessage(true);
    const newMessage = {
      id: Date.now(),
      sender: "patient",
      message: chatMessage,
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, newMessage]);
    setChatMessage("");

    // Simulate doctor response after 2 seconds
    setTimeout(() => {
      const doctorResponse = {
        id: Date.now() + 1,
        sender: "doctor",
        message: "Thank you for sharing that information. I'll review your symptoms and get back to you with recommendations shortly.",
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, doctorResponse]);
      setSendingMessage(false);
    }, 2000);
  };

  const formatMessageTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="h-screen bg-slate-50 p-4 overflow-hidden">
      {/* Header */}
      <div className="bg-white rounded-lg p-4 mb-4 shadow-sm border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="w-12 h-12 border">
              <AvatarFallback className="bg-slate-100 text-slate-700 font-medium">
                {mockUser.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">
                {getGreeting()}, {mockUser.name.split(' ')[0]}
              </h1>
              <p className="text-sm text-slate-600">Welcome to your health dashboard</p>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-center">
              <div className="text-lg font-semibold text-slate-900">4.8/5</div>
              <p className="text-xs text-slate-600">Health Score</p>
            </div>
            <Button 
              className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"
              onClick={() => alert("Emergency Support Activated - Calling 102")}
            >
              <Shield className="w-4 h-4 mr-2" />
              Emergency
            </Button>
          </div>
        </div>
      </div>

      <div className="flex gap-4 h-[calc(100vh-120px)]">
        {/* Left Sidebar - Quick Actions */}
        <div className="w-64 space-y-3">
          <Card className="bg-white shadow-sm border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-800">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="ghost"
                className="w-full justify-start gap-3 bg-slate-50 hover:bg-slate-100 text-slate-800"
                onClick={() => handleNavigation('/patient/consult-doctor')}
              >
                <Calendar className="w-4 h-4 text-slate-600" />
                Book Consultation
              </Button>
              <Button 
                variant="ghost"
                className="w-full justify-start gap-3 bg-slate-50 hover:bg-slate-100 text-slate-800"
                onClick={() => handleNavigation('/patient/profile')}
              >
                <Upload className="w-4 h-4 text-slate-600" />
                Upload Report
              </Button>
              <Button 
                variant="ghost"
                className="w-full justify-start gap-3 bg-slate-50 hover:bg-slate-100 text-slate-800"
                onClick={() => handleNavigation('/patient/social-support')}
              >
                <MessageCircle className="w-4 h-4 text-slate-600" />
                Chat with Doctor
              </Button>
              <Button 
                variant="ghost"
                className="w-full justify-start gap-3 bg-slate-50 hover:bg-slate-100 text-slate-800"
                onClick={() => handleNavigation('/patient/medications')}
              >
                <Pill className="w-4 h-4 text-slate-600" />
                Order Medicines
              </Button>
            </CardContent>
          </Card>

          {/* Health Metrics - Compact */}
          <Card className="bg-white shadow-sm border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-800">Health Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Weight className="w-4 h-4 text-slate-600" />
                  <span className="text-sm font-medium text-slate-700">Weight</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-900">{mockHealthMetrics.weight.value} {mockHealthMetrics.weight.unit}</div>
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">{mockHealthMetrics.weight.status}</Badge>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-slate-600" />
                  <span className="text-sm font-medium text-slate-700">BP</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-900">{mockHealthMetrics.bp.systolic}/{mockHealthMetrics.bp.diastolic}</div>
                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">{mockHealthMetrics.bp.status}</Badge>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-slate-600" />
                  <span className="text-sm font-medium text-slate-700">Sugar</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-900">{mockHealthMetrics.sugar.value} {mockHealthMetrics.sugar.unit}</div>
                  <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800">{mockHealthMetrics.sugar.status}</Badge>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-slate-600" />
                  <span className="text-sm font-medium text-slate-700">Allergies</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-900">{mockHealthMetrics.allergies.length}</div>
                  <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">Known</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Navigation Tabs */}
          <div className="bg-white rounded-lg p-1 shadow-sm border">
            <div className="flex gap-1">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'appointments', label: 'Appointments', icon: Calendar },
                { id: 'journal', label: 'Health Journal', icon: Edit3 },
                { id: 'reports', label: 'Reports', icon: FileText },
                { id: 'wellness', label: 'Wellness', icon: BookOpen }
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <Button
                    key={tab.id}
                    variant={selectedSection === tab.id ? "default" : "ghost"}
                    className={`flex-1 gap-2 ${selectedSection === tab.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}
                    onClick={() => setSelectedSection(tab.id)}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Content Based on Selected Tab */}
          <div className="flex-1 bg-white rounded-lg p-6 shadow-sm border overflow-hidden">
            {selectedSection === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-slate-900">Today's Overview</h2>
                  <div className="space-y-3">
                    <div className="p-4 bg-slate-50 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">Daily Progress</span>
                        <span className="text-sm text-slate-600">85%</span>
                      </div>
                      <Progress value={85} className="h-2" />
                    </div>
                    
                    <div className="p-4 bg-slate-50 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">Water Intake</span>
                        <span className="text-sm text-slate-600">6/8 glasses</span>
                      </div>
                      <Progress value={75} className="h-2" />
                    </div>

                    <div className="p-4 bg-slate-50 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">Exercise Goal</span>
                        <span className="text-sm text-slate-600">30/45 min</span>
                      </div>
                      <Progress value={67} className="h-2" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
                  <div className="space-y-3">
                    {healthJournalEntries.slice(0, 4).map((entry) => (
                      <div key={entry.id} className="p-3 bg-slate-50 rounded-lg border">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-700">{entry.date}</span>
                          <Badge variant="secondary" className={`text-xs ${entry.mood === 'good' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {entry.mood}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600">{entry.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {selectedSection === 'appointments' && (
              <div className="h-full">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-slate-900">Upcoming Appointments</h2>
                  <Button onClick={() => handleNavigation('/patient/consult-doctor')} className="bg-slate-900 hover:bg-slate-800 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Book New
                  </Button>
                </div>
                
                {upcomingAppointments.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingAppointments.map((appointment) => (
                      <div key={appointment.id} className="p-4 border rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <Avatar className="w-10 h-10 border">
                              <AvatarFallback className="bg-slate-200 text-slate-700 text-sm font-medium">
                                {appointment.doctor.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-medium text-slate-900">{appointment.doctor}</h3>
                              <p className="text-sm text-slate-600">{appointment.specialty}</p>
                              <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                                <Clock className="w-3 h-3" />
                                <span>{appointment.date} • {appointment.time}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="gap-1">
                              {appointment.type === 'video' ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                              {appointment.type === 'video' ? 'Video' : 'Clinic'}
                            </Badge>
                            <Button size="sm" className="bg-green-50 hover:bg-green-100 text-green-700 border border-green-200">
                              Join
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-600">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                    <p className="text-lg font-medium mb-2">No appointments scheduled</p>
                    <Button onClick={() => handleNavigation('/patient/consult-doctor')} className="bg-slate-900 hover:bg-slate-800 text-white">
                      Book your first consultation
                    </Button>
                  </div>
                )}
              </div>
            )}

            {selectedSection === 'journal' && (
              <div className="h-full">
                <h2 className="text-lg font-semibold text-slate-900 mb-6">Personal Health Journal</h2>
                
                <div className="space-y-4 mb-6">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="How are you feeling today?"
                      className="flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                      value={journalEntry}
                      onChange={(e) => setJournalEntry(e.target.value)}
                    />
                    <Button 
                      className="bg-slate-900 hover:bg-slate-800 text-white"
                      onClick={() => {
                        if (journalEntry.trim()) {
                          alert(`Journal entry added: "${journalEntry}"`);
                          setJournalEntry("");
                        }
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {healthJournalEntries.map((entry) => (
                    <div key={entry.id} className="p-4 bg-slate-50 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">{entry.date}</span>
                        <Badge variant="secondary" className={`text-xs ${entry.mood === 'good' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {entry.mood}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-700">{entry.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedSection === 'reports' && (
              <div className="h-full">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-slate-900">Digital Health Records</h2>
                  <Button onClick={() => handleNavigation('/patient/profile')} className="bg-slate-900 hover:bg-slate-800 text-white">
                    View All Reports
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {reportsData.map((report) => (
                    <div key={report.id} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-lg border transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center border">
                          {report.type === 'lab' && <BarChart3 className="w-4 h-4 text-slate-600" />}
                          {report.type === 'prescription' && <Pill className="w-4 h-4 text-slate-600" />}
                          {report.type === 'scan' && <Activity className="w-4 h-4 text-slate-600" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{report.name}</p>
                          <p className="text-xs text-slate-600">{report.date} • {report.doctor}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => alert(`View: ${report.name}`)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => alert(`Download: ${report.name}`)}>
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedSection === 'wellness' && (
              <div className="h-full">
                <h2 className="text-lg font-semibold text-slate-900 mb-6">Wellness & Education</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {wellnessContent.map((content) => (
                    <div 
                      key={content.id} 
                      className="p-4 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => {
                        if (content.youtubeId) {
                          openYouTubeVideo(content.youtubeId);
                        } else if (content.url) {
                          openExternalLink(content.url);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center border">
                          {content.type === 'video' && <PlayCircle className="w-4 h-4 text-slate-600" />}
                          {content.type === 'article' && <FileText className="w-4 h-4 text-slate-600" />}
                          {content.type === 'guide' && <BookOpen className="w-4 h-4 text-slate-600" />}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{content.duration}</Badge>
                          {content.youtubeId && <ExternalLink className="w-3 h-3 text-slate-500" />}
                        </div>
                      </div>
                      
                      {content.thumbnail && (
                        <div className="mb-3">
                          <img 
                            src={content.thumbnail} 
                            alt={content.title}
                            className="w-full h-24 object-cover rounded border"
                          />
                        </div>
                      )}
                      
                      <h3 className="text-sm font-medium text-slate-900 mb-2">{content.title}</h3>
                      <p className="text-xs text-slate-600 capitalize">{content.type}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          </div>

{/* Right Sidebar - Achievements */}
<div className="w-64">
  <Card className="bg-white shadow-sm border h-full">
    <CardHeader className="pb-3">
      <CardTitle className="text-sm font-medium text-slate-800 flex items-center gap-2">
        <Gift className="w-4 h-4 text-slate-600" />
        Achievements
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="text-center p-4 bg-slate-50 rounded-lg border">
        <Star className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-sm font-medium text-slate-900">Profile Complete</p>
        <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-700 mt-1">+50 points</Badge>
      </div>
      
      <div className="text-center p-4 bg-slate-50 rounded-lg border">
        <Award className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-sm font-medium text-slate-900">First Consultation</p>
        <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-700 mt-1">+100 points</Badge>
      </div>
      
      <div className="text-center p-4 bg-slate-50 rounded-lg border">
        <Heart className="w-8 h-8 text-slate-500 mx-auto mb-2" />
        <p className="text-sm font-medium text-slate-700">7-Day Streak</p>
        <div className="mt-2">
          <Progress value={57} className="h-2" />
          <p className="text-xs text-slate-600 mt-1">4/7 days</p>
        </div>
      </div>

      <div className="text-center p-3 bg-slate-100 rounded-lg border">
        <div className="text-lg font-bold text-slate-800">150</div>
        <p className="text-xs text-slate-600">Total Points</p>
      </div>
    </CardContent>
  </Card>
</div>
</div>

{/* Chat with Doctor Modal */}
{chatModalOpen && (
<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
  <Card className="max-w-4xl w-full max-h-[90vh] flex flex-col">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
      <div>
        <CardTitle className="text-lg text-slate-900">Chat with Doctor</CardTitle>
        <CardDescription className="text-slate-600">Connect with available doctors for quick consultation</CardDescription>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setChatModalOpen(false);
          setSelectedDoctor(null);
          setChatMessages([]);
        }}
      >
        <X className="w-4 h-4" />
      </Button>
    </CardHeader>
    
    <div className="flex-1 flex overflow-hidden">
      {/* Doctors List */}
      {!selectedDoctor ? (
        <CardContent className="flex-1 p-6">
          <h3 className="text-sm font-medium text-slate-800 mb-4">Available Doctors</h3>
          <div className="space-y-3">
            {mockDoctors.map((doctor) => (
              <div 
                key={doctor.id}
                className="p-4 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => handleChatWithDoctor(doctor)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 border">
                      <AvatarFallback className="bg-slate-100 text-slate-700 text-sm font-medium">
                        {doctor.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-medium text-slate-900">{doctor.name}</h4>
                      <p className="text-sm text-slate-600">{doctor.specialty}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${doctor.status === 'online' ? 'bg-green-500' : 'bg-slate-400'}`}></div>
                      <span className="text-xs text-slate-600">
                        {doctor.status === 'online' ? 'Online' : doctor.lastSeen}
                      </span>
                    </div>
                    <Button size="sm" className="mt-2 bg-slate-900 hover:bg-slate-800 text-white">
                      <MessageCircle className="w-3 h-3 mr-1" />
                      Chat
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b bg-slate-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedDoctor(null);
                    setChatMessages([]);
                  }}
                >
                  ← Back
                </Button>
                <Avatar className="w-8 h-8 border">
                  <AvatarFallback className="bg-slate-100 text-slate-700 text-xs font-medium">
                    {selectedDoctor.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-medium text-slate-900">{selectedDoctor.name}</h4>
                  <p className="text-xs text-slate-600">{selectedDoctor.specialty}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${selectedDoctor.status === 'online' ? 'bg-green-500' : 'bg-slate-400'}`}></div>
                <span className="text-xs text-slate-600">
                  {selectedDoctor.status === 'online' ? 'Online' : selectedDoctor.lastSeen}
                </span>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50">
            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'patient' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[70%] p-3 rounded-lg ${
                  message.sender === 'patient' 
                    ? 'bg-slate-900 text-white' 
                    : 'bg-white border'
                }`}>
                  <p className="text-sm">{message.message}</p>
                  <p className={`text-xs mt-1 ${
                    message.sender === 'patient' ? 'text-slate-300' : 'text-slate-500'
                  }`}>
                    {formatMessageTime(message.timestamp)}
                  </p>
                </div>
              </div>
            ))}
            {sendingMessage && (
              <div className="flex justify-start">
                <div className="bg-white border p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span className="text-xs">Doctor is typing...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    sendMessage();
                  }
                }}
              />
              <Button 
                onClick={sendMessage}
                disabled={!chatMessage.trim() || sendingMessage}
                className="bg-slate-900 hover:bg-slate-800 text-white"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  </Card>
</div>
)}

{/* Click outside to close chat modal */}
{chatModalOpen && (
<div 
  className="fixed inset-0 z-40" 
  onClick={() => {
    setChatModalOpen(false);
    setSelectedDoctor(null);
    setChatMessages([]);
  }}
/>
)}
</div>
);
};

export default PatientDashboard;