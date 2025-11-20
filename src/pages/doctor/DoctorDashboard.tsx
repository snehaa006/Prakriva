import React, { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Calendar, 
  Activity,
  Bell,
  Plus,
  MessageCircle,
  Star,
  BookOpen,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Video,
  TrendingUp,
  ChevronRight,
  Play,
  Pause,
  RefreshCw,
  Eye,
  Settings,
  Heart
} from 'lucide-react';

const InteractiveDoctorDashboard = () => {
  const [selectedTab, setSelectedTab] = useState('today');
  const [doctorData, setDoctorData] = useState({
    name: 'Loading...',
    specialization: 'Loading...',
    initials: 'DR',
    loading: true
  });
  const [notifications, setNotifications] = useState([
    { id: 1, message: '3 patients need follow-up this week', type: 'warning', read: false },
    { id: 2, message: '5 new patient messages', type: 'info', read: false },
    { id: 3, message: '2 treatment plans approved', type: 'success', read: true }
  ]);
  const [knowledgeExpanded, setKnowledgeExpanded] = useState(false);
  const [meditationActive, setMeditationActive] = useState(false);
  const [quickActionsHovered, setQuickActionsHovered] = useState(null);

  // Helper function to get initials from name
  const getInitials = (name) => {
    if (!name || name === 'Loading...') return 'DR';
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Function to fetch doctor data from Firebase
  useEffect(() => {
    const fetchDoctorData = async () => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          try {
            console.log('Fetching doctor data for user:', user.uid);
            
            // Get doctor data from Firestore
            const doctorRef = doc(db, "doctors", user.uid);
            const doctorSnap = await getDoc(doctorRef);
            
            if (doctorSnap.exists()) {
              const data = doctorSnap.data();
              console.log('Doctor data retrieved:', data);
              
              setDoctorData({
                name: data.name || 'Dr. Unknown',
                specialization: data.ayurvedicSpecialization?.join(', ') || 'Ayurvedic Practitioner',
                initials: getInitials(data.name || 'Dr Unknown'),
                loading: false
              });
            } else {
              console.log('No doctor document found for user:', user.uid);
              // Fallback to default data
              setDoctorData({
                name: 'Dr. Arjun Sharma',
                specialization: 'Ayurvedic Practitioner',
                initials: 'AS',
                loading: false
              });
            }
          } catch (error) {
            console.error('Error fetching doctor data:', error);
            // Fallback to default data on error
            setDoctorData({
              name: 'Dr. Arjun Sharma',
              specialization: 'Ayurvedic Practitioner',
              initials: 'AS',
              loading: false
            });
          }
        } else {
          console.log('No authenticated user found');
          setDoctorData({
            name: 'Please Login',
            specialization: 'Ayurvedic Practitioner',
            initials: 'PL',
            loading: false
          });
        }
      });

      return () => unsubscribe();
    };

    fetchDoctorData();
  }, []);

  const markNotificationAsRead = (id) => {
    setNotifications(notifications.map(notif => 
      notif.id === id ? { ...notif, read: true } : notif
    ));
  };

  const clearAllNotifications = () => {
    setNotifications(notifications.map(notif => ({ ...notif, read: true })));
  };

  const toggleMeditation = () => {
    setMeditationActive(!meditationActive);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-secondary rounded-full flex items-center justify-center">
            <span className="text-secondary-foreground font-semibold text-lg">
              {doctorData.initials}
            </span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back, {doctorData.name}
            </h1>
            <p className="text-muted-foreground">
              {doctorData.specialization} • Ready to help patients
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Patient
          </Button>
          <Button variant="outline" className="gap-2">
            <Calendar className="w-4 h-4" />
            Schedule
          </Button>
          <Button variant="outline" className="gap-2 relative">
            <Bell className="w-4 h-4" />
            Alerts
            {unreadCount > 0 && (
              <Badge className="absolute -top-2 -right-2 bg-destructive text-white text-xs h-5 w-5 rounded-full p-0 flex items-center justify-center">
                {unreadCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Interactive Features */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Interactive Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Essential tools for your practice</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: Plus, label: 'New Patient', action: 'add-patient', color: 'primary' },
                  { icon: FileText, label: 'Prescription', action: 'prescription', color: 'success' },
                  { icon: Video, label: 'Video Call', action: 'video-call', color: 'purple' },
                  { icon: Bell, label: 'Reminders', action: 'reminders', color: 'warning' }
                ].map((action, index) => (
                  <Button
                    key={index}
                    variant={action.color === 'primary' ? 'default' : 'outline'}
                    className={`h-16 flex flex-col items-center justify-center space-y-1 transition-all duration-200 ${
                      quickActionsHovered === index ? 'scale-105' : ''
                    } ${
                      action.color === 'success' ? 'hover:bg-success/10 hover:border-success' :
                      action.color === 'purple' ? 'hover:bg-purple-50 hover:border-purple-300' :
                      action.color === 'warning' ? 'hover:bg-warning/10 hover:border-warning' : ''
                    }`}
                    onMouseEnter={() => setQuickActionsHovered(index)}
                    onMouseLeave={() => setQuickActionsHovered(null)}
                    onClick={() => console.log(`Action: ${action.action}`)}
                  >
                    <action.icon className="h-5 w-5" />
                    <span className="text-xs">{action.label}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Interactive Schedule Tabs */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Schedule Overview</CardTitle>
                <div className="flex bg-muted p-1 rounded-lg">
                  {['today', 'week', 'month'].map((tab) => (
                    <Button
                      key={tab}
                      variant={selectedTab === tab ? 'default' : 'ghost'}
                      size="sm"
                      className="px-3 py-1 text-xs"
                      onClick={() => setSelectedTab(tab)}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedTab === 'today' && (
                  <>
                    <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className="font-medium">Morning Consultations</span>
                      </div>
                      <Badge>9:00 - 12:00</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-success/5 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Activity className="h-4 w-4 text-success" />
                        <span className="font-medium">Afternoon Sessions</span>
                      </div>
                      <Badge className="bg-success text-white">2:00 - 6:00</Badge>
                    </div>
                  </>
                )}
                {selectedTab === 'week' && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Weekly schedule view</p>
                  </div>
                )}
                {selectedTab === 'month' && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Monthly schedule overview</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Wellness Corner with Interactive Meditation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Heart className="h-5 w-5 text-destructive" />
                <span>Doctor Wellness</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg">
                <p className="text-sm font-medium mb-2">5-minute breathing session</p>
                <p className="text-xs text-muted-foreground mb-3">
                  {meditationActive ? 'Session in progress...' : 'Reduce stress and improve focus'}
                </p>
                <div className="flex items-center justify-center space-x-2">
                  <Button size="sm" onClick={toggleMeditation}>
                    {meditationActive ? (
                      <>
                        <Pause className="h-3 w-3 mr-1" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3 mr-1" />
                        Start Session
                      </>
                    )}
                  </Button>
                  {meditationActive && (
                    <Progress value={33} className="w-20 h-2" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Knowledge Hub & Notifications */}
        <div className="space-y-6">
          
          {/* Expandable Knowledge Hub */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <CardTitle>Knowledge Hub</CardTitle>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setKnowledgeExpanded(!knowledgeExpanded)}
                >
                  <ChevronRight className={`h-4 w-4 transition-transform ${knowledgeExpanded ? 'rotate-90' : ''}`} />
                </Button>
              </div>
              <CardDescription>Latest Ayurvedic research</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors">
                  <h4 className="font-medium text-sm">New Panchakarma Guidelines 2024</h4>
                  <p className="text-xs text-muted-foreground mt-1">AYUSH Ministry • Jan 2024</p>
                </div>
                <div className="p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors">
                  <h4 className="font-medium text-sm">Dosha-Based Nutrition Research</h4>
                  <p className="text-xs text-muted-foreground mt-1">Journal of Ayurveda • 3 days ago</p>
                </div>
                {knowledgeExpanded && (
                  <>
                    <div className="p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors">
                      <h4 className="font-medium text-sm">Herbal Medicine Safety Updates</h4>
                      <p className="text-xs text-muted-foreground mt-1">NIAM • 1 week ago</p>
                    </div>
                    <div className="p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors">
                      <h4 className="font-medium text-sm">Modern Ayurvedic Diagnostics</h4>
                      <p className="text-xs text-muted-foreground mt-1">Research Journal • 2 weeks ago</p>
                    </div>
                  </>
                )}
              </div>
              <Button variant="outline" size="sm" className="w-full">
                <Eye className="h-3 w-3 mr-1" />
                View All Updates
              </Button>
            </CardContent>
          </Card>

          {/* Interactive Notifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bell className="h-5 w-5 text-warning" />
                  <CardTitle>Notifications</CardTitle>
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {unreadCount}
                    </Badge>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearAllNotifications}
                  disabled={unreadCount === 0}
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    notification.read 
                      ? 'bg-muted/30 border-muted' 
                      : notification.type === 'warning' 
                        ? 'bg-warning/10 border-warning/30' 
                        : notification.type === 'success' 
                          ? 'bg-success/10 border-success/30'
                          : 'bg-primary/10 border-primary/30'
                  }`}
                  onClick={() => markNotificationAsRead(notification.id)}
                >
                  <div className="flex items-start space-x-3">
                    {notification.type === 'warning' && <AlertCircle className="h-4 w-4 text-warning mt-0.5" />}
                    {notification.type === 'success' && <CheckCircle className="h-4 w-4 text-success mt-0.5" />}
                    {notification.type === 'info' && <MessageCircle className="h-4 w-4 text-primary mt-0.5" />}
                    <div className="flex-1">
                      <p className={`text-sm ${notification.read ? 'text-muted-foreground' : 'font-medium'}`}>
                        {notification.message}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Interactive Reviews */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-warning" />
                <span>Latest Review</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex space-x-1">
                  {[1,2,3,4,5].map((star) => (
                    <Star key={star} className="h-4 w-4 fill-warning text-warning cursor-pointer hover:scale-110 transition-transform" />
                  ))}
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm italic text-muted-foreground">
                    "Dr. {doctorData.loading ? 'Sharma' : doctorData.name.split(' ').pop()}'s Ayurvedic approach helped me tremendously. Very knowledgeable and caring."
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">- Meera K. • 2 days ago</p>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  <Eye className="h-3 w-3 mr-1" />
                  View All Reviews
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InteractiveDoctorDashboard;