import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Plus, Pill, Utensils, Calendar, Edit, Trash2, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Reminder {
  id: string;
  title: string;
  type: "medicine" | "meal" | "appointment" | "exercise";
  time: string;
  days: string[];
  isActive: boolean;
  description?: string;
}

export default function Reminders() {
  const { toast } = useToast();
  const [reminders, setReminders] = useState<Reminder[]>([
    {
      id: "1",
      title: "Ashwagandha Tablets",
      type: "medicine",
      time: "08:00",
      days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      isActive: true,
      description: "Take 2 tablets with warm water"
    },
    {
      id: "2",
      title: "Morning Breakfast",
      type: "meal",
      time: "09:00",
      days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      isActive: true,
      description: "Poha with vegetables and green tea"
    },
    {
      id: "3",
      title: "Yoga Session",
      type: "exercise",
      time: "06:30",
      days: ["Mon", "Wed", "Fri"],
      isActive: true,
      description: "30 minutes of pranayama and asanas"
    },
    {
      id: "4",
      title: "Dr. Rajesh Consultation",
      type: "appointment",
      time: "15:00",
      days: ["Fri"],
      isActive: true,
      description: "Weekly checkup and progress review"
    },
    {
      id: "5",
      title: "Triphala Churna",
      type: "medicine",
      time: "22:00",
      days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      isActive: false,
      description: "1 teaspoon with warm water before bed"
    }
  ]);

  const [newReminder, setNewReminder] = useState({
    title: "",
    type: "medicine" as "medicine" | "meal" | "appointment" | "exercise",
    time: "",
    days: [] as string[],
    description: ""
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "medicine": return <Pill className="w-4 h-4" />;
      case "meal": return <Utensils className="w-4 h-4" />;
      case "appointment": return <Calendar className="w-4 h-4" />;
      case "exercise": return <Bell className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "medicine": return "bg-blue-100 text-blue-800 border-blue-200";
      case "meal": return "bg-green-100 text-green-800 border-green-200";
      case "appointment": return "bg-purple-100 text-purple-800 border-purple-200";
      case "exercise": return "bg-orange-100 text-orange-800 border-orange-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const toggleReminder = (id: string) => {
    setReminders(prev => prev.map(reminder => 
      reminder.id === id ? { ...reminder, isActive: !reminder.isActive } : reminder
    ));
    toast({
      title: "Reminder Updated",
      description: "Reminder status has been changed successfully.",
    });
  };

  const deleteReminder = (id: string) => {
    setReminders(prev => prev.filter(reminder => reminder.id !== id));
    toast({
      title: "Reminder Deleted",
      description: "Reminder has been removed successfully.",
    });
  };

  const addReminder = () => {
    if (!newReminder.title || !newReminder.time) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const reminder: Reminder = {
      id: Date.now().toString(),
      ...newReminder,
      isActive: true,
    };

    setReminders(prev => [...prev, reminder]);
    setNewReminder({
      title: "",
      type: "medicine",
      time: "",
      days: [],
      description: ""
    });
    setIsDialogOpen(false);

    toast({
      title: "Reminder Added",
      description: "New reminder has been created successfully.",
    });
  };

  const allDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  
  const toggleDay = (day: string) => {
    setNewReminder(prev => ({
      ...prev,
      days: prev.days.includes(day) 
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day]
    }));
  };

  const activeReminders = reminders.filter(r => r.isActive);
  const inactiveReminders = reminders.filter(r => !r.isActive);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reminders</h1>
          <p className="text-muted-foreground">Manage your daily health reminders and schedule</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Reminder
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Reminder</DialogTitle>
              <DialogDescription>
                Set up a new reminder for your health routine
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Reminder Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Take Chyawanprash"
                  value={newReminder.title}
                  onChange={(e) => setNewReminder(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={newReminder.type}
                  onValueChange={(value: "medicine" | "meal" | "appointment" | "exercise") => 
                    setNewReminder(prev => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medicine">Medicine</SelectItem>
                    <SelectItem value="meal">Meal</SelectItem>
                    <SelectItem value="appointment">Appointment</SelectItem>
                    <SelectItem value="exercise">Exercise</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={newReminder.time}
                  onChange={(e) => setNewReminder(prev => ({ ...prev, time: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Repeat Days</Label>
                <div className="flex flex-wrap gap-2">
                  {allDays.map(day => (
                    <Badge
                      key={day}
                      variant={newReminder.days.includes(day) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleDay(day)}
                    >
                      {day}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  placeholder="Additional details..."
                  value={newReminder.description}
                  onChange={(e) => setNewReminder(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <Button onClick={addReminder} className="w-full">
                Create Reminder
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-green-100 rounded-full">
                <Bell className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeReminders.length}</p>
                <p className="text-sm text-muted-foreground">Active Reminders</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-100 rounded-full">
                <Pill className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {reminders.filter(r => r.type === "medicine" && r.isActive).length}
                </p>
                <p className="text-sm text-muted-foreground">Medicine Reminders</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-orange-100 rounded-full">
                <Utensils className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {reminders.filter(r => r.type === "meal" && r.isActive).length}
                </p>
                <p className="text-sm text-muted-foreground">Meal Reminders</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Reminders */}
      <Card>
        <CardHeader>
          <CardTitle>Active Reminders</CardTitle>
          <CardDescription>Your currently enabled reminders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activeReminders.map((reminder) => (
              <div
                key={reminder.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-full ${getTypeColor(reminder.type)}`}>
                    {getTypeIcon(reminder.type)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{reminder.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {reminder.time} • {reminder.days.join(", ")}
                    </p>
                    {reminder.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {reminder.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={reminder.isActive}
                    onCheckedChange={() => toggleReminder(reminder.id)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteReminder(reminder.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            {activeReminders.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No active reminders. Create your first reminder to get started.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Inactive Reminders */}
      {inactiveReminders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Inactive Reminders</CardTitle>
            <CardDescription>Disabled reminders you can re-enable anytime</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {inactiveReminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="flex items-center justify-between p-4 border rounded-lg opacity-60"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full ${getTypeColor(reminder.type)}`}>
                      {getTypeIcon(reminder.type)}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{reminder.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {reminder.time} • {reminder.days.join(", ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={reminder.isActive}
                      onCheckedChange={() => toggleReminder(reminder.id)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteReminder(reminder.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}