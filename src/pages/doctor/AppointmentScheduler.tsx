/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useApp } from "@/context/AppContext";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Calendar as CalendarIcon, 
  Clock, 
  User,
  Plus,
  Video,
  MapPin,
  Bell,
  Send
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";

interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  date: Date;
  time: string;
  type: 'consultation' | 'follow-up' | 'emergency';
  mode: 'in-person' | 'video-call' | 'phone';
  duration: number;
  notes: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  reminderSent: boolean;
}

const AppointmentScheduler = () => {
  const { patients } = useApp();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [showNewAppointment, setShowNewAppointment] = useState(false);

  const [newAppointment, setNewAppointment] = useState({
    patientId: '',
    date: undefined as Date | undefined,
    time: '',
    type: 'consultation' as const,
    mode: 'in-person' as const,
    duration: 30,
    notes: ''
  });

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
  ];

  const handleScheduleAppointment = () => {
    if (!newAppointment.patientId || !newAppointment.date || !newAppointment.time) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const patient = patients.find(p => p.id === newAppointment.patientId);
    if (!patient) return;

    const appointment: Appointment = {
      id: uuidv4(),
      patientId: newAppointment.patientId,
      patientName: patient.name,
      date: newAppointment.date,
      time: newAppointment.time,
      type: newAppointment.type,
      mode: newAppointment.mode,
      duration: newAppointment.duration,
      notes: newAppointment.notes,
      status: 'scheduled',
      reminderSent: false
    };

    setAppointments(prev => [...prev, appointment]);
    
    // Send automated reminder (simulated)
    setTimeout(() => {
      setAppointments(prev => prev.map(apt => 
        apt.id === appointment.id 
          ? { ...apt, reminderSent: true }
          : apt
      ));
      
      toast({
        title: "Appointment Scheduled",
        description: `Appointment with ${patient.name} scheduled for ${format(appointment.date, 'PPP')} at ${appointment.time}. Reminder sent to both patient and doctor.`,
      });
    }, 1000);

    setNewAppointment({
      patientId: '',
      date: undefined,
      time: '',
      type: 'consultation',
      mode: 'in-person',
      duration: 30,
      notes: ''
    });
    setShowNewAppointment(false);
  };

  const sendReminder = (appointmentId: string) => {
    setAppointments(prev => prev.map(apt => 
      apt.id === appointmentId 
        ? { ...apt, reminderSent: true }
        : apt
    ));
    
    toast({
      title: "Reminder Sent",
      description: "Appointment reminder sent to both patient and doctor.",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-info text-white';
      case 'completed': return 'bg-success text-white';
      case 'cancelled': return 'bg-destructive text-white';
      case 'no-show': return 'bg-warning text-white';
      default: return 'bg-muted text-foreground';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'consultation': return User;
      case 'follow-up': return Clock;
      case 'emergency': return Bell;
      default: return User;
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'video-call': return Video;
      case 'phone': return Bell;
      case 'in-person': return MapPin;
      default: return MapPin;
    }
  };

  const todayAppointments = appointments.filter(apt => 
    apt.date.toDateString() === new Date().toDateString()
  );

  const upcomingAppointments = appointments.filter(apt => 
    apt.date > new Date() && apt.status === 'scheduled'
  ).sort((a, b) => a.date.getTime() - b.date.getTime());

  const AppointmentCard = ({ appointment }: { appointment: Appointment }) => {
    const TypeIcon = getTypeIcon(appointment.type);
    const ModeIcon = getModeIcon(appointment.mode);

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-gradient-primary text-primary-foreground">
                <TypeIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold">{appointment.patientName}</h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3" />
                    {format(appointment.date, 'PPP')}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {appointment.time} ({appointment.duration} min)
                  </div>
                  <div className="flex items-center gap-1">
                    <ModeIcon className="w-3 h-3" />
                    {appointment.mode.replace('-', ' ')}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(appointment.status)}>
                {appointment.status}
              </Badge>
              {appointment.reminderSent && (
                <Badge variant="outline">
                  <Bell className="w-3 h-3 mr-1" />
                  Reminded
                </Badge>
              )}
            </div>
          </div>
          
          {appointment.notes && (
            <p className="text-sm text-muted-foreground mt-3">{appointment.notes}</p>
          )}

          <div className="flex gap-2 mt-3">
            {!appointment.reminderSent && appointment.status === 'scheduled' && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => sendReminder(appointment.id)}
              >
                <Send className="w-3 h-3 mr-1" />
                Send Reminder
              </Button>
            )}
            <Button size="sm" variant="outline">
              Reschedule
            </Button>
            <Button 
              size="sm"
              onClick={() => navigate(`/doctor/patients/${appointment.patientId}`)}
            >
              View Patient
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Appointment Scheduler</h1>
            <p className="text-muted-foreground">Manage consultations and send automated reminders</p>
          </div>
        </div>
        <Button onClick={() => setShowNewAppointment(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Schedule Appointment
        </Button>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-gradient-primary text-primary-foreground">
                <CalendarIcon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">{todayAppointments.length}</p>
                <p className="text-sm text-muted-foreground">Today's Appointments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-info text-white">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">{upcomingAppointments.length}</p>
                <p className="text-sm text-muted-foreground">Upcoming</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-success text-white">
                <Video className="w-4 h-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {appointments.filter(apt => apt.mode === 'video-call').length}
                </p>
                <p className="text-sm text-muted-foreground">Video Calls</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-warning text-white">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {appointments.filter(apt => apt.reminderSent).length}
                </p>
                <p className="text-sm text-muted-foreground">Reminders Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
            <CardDescription>Select a date to view appointments</CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        {/* Appointments List */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="today" className="space-y-4">
            <TabsList>
              <TabsTrigger value="today">Today ({todayAppointments.length})</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming ({upcomingAppointments.length})</TabsTrigger>
              <TabsTrigger value="all">All Appointments</TabsTrigger>
            </TabsList>

            <TabsContent value="today" className="space-y-4">
              {todayAppointments.length > 0 ? (
                <div className="space-y-4">
                  {todayAppointments.map(appointment => (
                    <AppointmentCard key={appointment.id} appointment={appointment} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <CalendarIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No appointments today</h3>
                    <p className="text-muted-foreground">Schedule a new appointment to get started</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="upcoming" className="space-y-4">
              {upcomingAppointments.length > 0 ? (
                <div className="space-y-4">
                  {upcomingAppointments.map(appointment => (
                    <AppointmentCard key={appointment.id} appointment={appointment} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No upcoming appointments</h3>
                    <p className="text-muted-foreground">Your schedule is clear</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="all" className="space-y-4">
              {appointments.length > 0 ? (
                <div className="space-y-4">
                  {appointments.sort((a, b) => b.date.getTime() - a.date.getTime()).map(appointment => (
                    <AppointmentCard key={appointment.id} appointment={appointment} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <CalendarIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No appointments</h3>
                    <p className="text-muted-foreground">Start scheduling appointments with your patients</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* New Appointment Dialog */}
      {showNewAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Schedule New Appointment</CardTitle>
              <CardDescription>Schedule a consultation with a patient</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Patient</Label>
                <Select 
                  value={newAppointment.patientId} 
                  onValueChange={(value) => setNewAppointment(prev => ({ ...prev, patientId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map(patient => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !newAppointment.date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newAppointment.date ? format(newAppointment.date, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newAppointment.date}
                      onSelect={(date) => setNewAppointment(prev => ({ ...prev, date }))}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Time</Label>
                  <Select 
                    value={newAppointment.time} 
                    onValueChange={(value) => setNewAppointment(prev => ({ ...prev, time: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map(time => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Duration (min)</Label>
                  <Select 
                    value={newAppointment.duration.toString()} 
                    onValueChange={(value) => setNewAppointment(prev => ({ ...prev, duration: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="45">45 min</SelectItem>
                      <SelectItem value="60">60 min</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <Select 
                    value={newAppointment.type} 
                    onValueChange={(value) => setNewAppointment(prev => ({ ...prev, type: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consultation">Consultation</SelectItem>
                      <SelectItem value="follow-up">Follow-up</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Mode</Label>
                  <Select 
                    value={newAppointment.mode} 
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onValueChange={(value) => setNewAppointment(prev => ({ ...prev, mode: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in-person">In Person</SelectItem>
                      <SelectItem value="video-call">Video Call</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  placeholder="Additional notes for the appointment"
                  value={newAppointment.notes}
                  onChange={(e) => setNewAppointment(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowNewAppointment(false)}>
                  Cancel
                </Button>
                <Button onClick={handleScheduleAppointment}>
                  Schedule Appointment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AppointmentScheduler;