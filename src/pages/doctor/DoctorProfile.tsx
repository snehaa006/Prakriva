import React, { useState } from 'react';
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
  Heart,
  Search
} from 'lucide-react';

// Mock hooks to simulate your app context
const useApp = () => ({
  user: {
    name: 'Dr. Arjun Sharma',
    specialization: 'Ayurvedic Practitioner',
    id: 'doctor-123'
  },
  patients: [
    { id: '1', name: 'Priya Sharma', adherenceScore: 85 },
    { id: '2', name: 'Rajesh Kumar', adherenceScore: 72 },
    { id: '3', name: 'Anita Patel', adherenceScore: 92 }
  ]
});

const useNavigate = () => {
  return (path) => {
    console.log(`Navigating to: ${path}`);
    // In your actual app, this would be: navigate(path);
  };
};

const DynamicDoctorDashboard = () => {
  const { user, patients } = useApp();
  const navigate = useNavigate();
  
  const [selectedTab, setSelectedTab] = useState('today');
  const [notifications, setNotifications] = useState([
    { id: 1, message: '3 patients need follow-up this week', type: 'warning', read: false },
    { id: 2, message: '5 new patient messages', type: 'info', read: false },
    { id: 3, message: '2 treatment plans approved', type: 'success', read: true }
  ]);
  const [knowledgeExpanded, setKnowledgeExpanded] = useState(false);
  const [meditationActive, setMeditationActive] = useState(false);
  const [quickActionsHovered, setQuickActionsHovered] = useState(null);

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
  const avgAdherence = patients.length > 0 
    ? Math.round(patients.reduce((sum, p) => sum + p.adherenceScore, 0) / patients.length) 
    : 0;

  // Navigation handlers
  const handleAddPatient = () => navigate('/doctor/add-patient');
  const handleSchedule = () => navigate('/doctor/appointments');
  const handleAlerts = () => navigate('/doctor/alerts');
  const handleFoodExplorer = () => navigate('/doctor/food-explorer');
  const handleRecipeBuilder = () => navigate('/doctor/recipes');
  const handleDietCharts = () => navigate('/doctor/diet-charts');
  const handleCommunication = () => navigate('/doctor/communication');
  const handleFeedback = () => navigate('/doctor/feedback');
  const handleTeamManagement = () => navigate('/doctor/team');
  const handlePatients = () => navigate('/doctor/patients');

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-secondary rounded-full flex items-center justify-center">
            <span className="text-secondary-foreground font-semibold text-lg">
              {user?.name?.charAt(0) || 'D'}
            </span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back, {user?.name || 'Doctor'}
            </h1>
            <p className="text-muted-foreground">
              {user?.specialization || 'Medical Professional'} • Ready to help patients
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAddPatient} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Patient
          </Button>
          <Button onClick={handleSchedule} variant="outline" className="gap-2">
            <Calendar className="w-4 h-4" />
            Schedule
          </Button>
          <Button onClick={handleAlerts} variant="outline" className="gap-2 relative">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column - Interactive Features */}
        <div className="space-y-6">
          
          {/* Interactive Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Essential tools for your practice</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: Plus, label: 'New Patient', action: handleAddPatient, color: 'primary' },
                  { icon: FileText, label: 'Prescription', action: () => console.log('Prescription'), color: 'success' },
                  { icon: Video, label: 'Video Call', action: () => console.log('Video Call'), color: 'purple' },
                  { icon: Bell, label: 'Reminders', action: () => console.log('Reminders'), color: 'warning' }
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
                    onClick={action.action}
                  >
                    <action.icon className="h-5 w-5" />
                    <span className="text-xs">{action.label}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="hover:shadow-md transition-all cursor-pointer hover:scale-102" onClick={handlePatients}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5 text-primary" />
                  Patient Management
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {patients.length} active patients • {avgAdherence}% avg adherence
                </p>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-md transition-all cursor-pointer hover:scale-102" onClick={handleDietCharts}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="w-5 h-5 text-success" />
                  Diet Plans
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Create AI-powered meal plans
                </p>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-md transition-all cursor-pointer hover:scale-102" onClick={handleFoodExplorer}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Search className="w-5 h-5 text-purple-600" />
                  Food Explorer
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Browse Ayurvedic foods
                </p>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-md transition-all cursor-pointer hover:scale-102" onClick={handleCommunication}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MessageCircle className="w-5 h-5 text-blue-600" />
                  Communication
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Patient messages & chat
                </p>
              </CardHeader>
            </Card>
          </div>

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
                    <Button variant="outline" size="sm" className="mt-2" onClick={handleSchedule}>
                      View Full Schedule
                    </Button>
                  </div>
                )}
                {selectedTab === 'month' && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Monthly schedule overview</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={handleSchedule}>
                      View Calendar
                    </Button>
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

          {/* Additional Quick Actions */}
          <div className="grid grid-cols-1 gap-3">
            <Card className="hover:shadow-sm transition-all cursor-pointer hover:scale-102" onClick={handleRecipeBuilder}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Plus className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Recipe Builder</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-sm transition-all cursor-pointer hover:scale-102" onClick={handleTeamManagement}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Users className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">Team Management</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-sm transition-all cursor-pointer hover:scale-102" onClick={handleFeedback}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Star className="h-5 w-5 text-yellow-600" />
                    <span className="font-medium">Patient Feedback</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DynamicDoctorDashboard;