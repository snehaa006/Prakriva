import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { 
  Moon,
  Activity,
  Droplets,
  Dumbbell,
  TreePine,
  Footprints,
  Calendar,
  TrendingUp,
  Plus,
  Minus,
  CheckCircle2,
  Save,
  ArrowLeft
} from "lucide-react";

// Data management functions (easily replaceable with Firebase)
const generateDateRange = (days: number) => {
  const dates = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
};

const initializeData = () => {
  const dates = generateDateRange(7);
  
  const sleepData = dates.map(date => ({
    date,
    quality: Math.floor(Math.random() * 4) + 1,
    hours: parseFloat((6 + Math.random() * 3).toFixed(1)),
    type: ['deep', 'disturbed', 'insufficient', 'deep'][Math.floor(Math.random() * 3)]
  }));

  const activityData = dates.map(date => ({
    date,
    yoga: Math.floor(Math.random() * 60),
    walk: Math.floor(Math.random() * 90),
    gym: Math.floor(Math.random() * 60)
  }));

  const hydrationData = dates.map(date => ({
    date,
    glasses: Math.floor(Math.random() * 5) + 5
  }));

  return { sleepData, activityData, hydrationData };
};

const LifestyleTracker = () => {
  // State management
  const [data, setData] = useState(() => initializeData());
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [sleepHours, setSleepHours] = useState(7);
  const [sleepQuality, setSleepQuality] = useState('deep');
  const [activities, setActivities] = useState({
    yoga: 0,
    walk: 0,
    gym: 0
  });
  const [todayWater, setTodayWater] = useState(5);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize today's data
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    
    // Get today's existing data or create defaults
    const todaySleep = data.sleepData.find(d => d.date === today);
    const todayActivity = data.activityData.find(d => d.date === today);
    const todayHydration = data.hydrationData.find(d => d.date === today);

    if (todaySleep) {
      setSleepHours(todaySleep.hours);
      setSleepQuality(todaySleep.type);
    }

    if (todayActivity) {
      setActivities({
        yoga: todayActivity.yoga,
        walk: todayActivity.walk,
        gym: todayActivity.gym
      });
    }

    if (todayHydration) {
      setTodayWater(todayHydration.glasses);
    }
  }, [data]);

  // Update water intake - FIXED: Added parameter type
  const updateWaterIntake = (change: number) => {
    const newValue = Math.max(0, Math.min(12, todayWater + change));
    setTodayWater(newValue);
    
    // Update data immediately
    const today = new Date().toISOString().split('T')[0];
    setData(prev => {
      const updatedHydrationData = prev.hydrationData.map(d => 
        d.date === today ? { ...d, glasses: newValue } : d
      );
      
      // If today's data doesn't exist, add it
      if (!prev.hydrationData.find(d => d.date === today)) {
        updatedHydrationData.push({ date: today, glasses: newValue });
      }
      
      return {
        ...prev,
        hydrationData: updatedHydrationData
      };
    });
  };

  // Update activity duration - FIXED: Added parameter types
  const updateActivity = (activityType: string, change: number) => {
    const newValue = Math.max(0, activities[activityType as keyof typeof activities] + change);
    const newActivities = { ...activities, [activityType]: newValue };
    setActivities(newActivities);
  };

  // Save sleep data
  const saveSleepData = async () => {
    setIsLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newSleepEntry = {
      date: selectedDate,
      quality: sleepQuality === 'deep' ? 4 : sleepQuality === 'disturbed' ? 2 : 1,
      hours: parseFloat(sleepHours.toFixed(1)),
      type: sleepQuality
    };

    setData(prev => {
      const updatedSleepData = prev.sleepData.map(d => 
        d.date === selectedDate ? newSleepEntry : d
      );
      
      // If the date doesn't exist, add new entry
      if (!prev.sleepData.find(d => d.date === selectedDate)) {
        updatedSleepData.push(newSleepEntry);
        // REMOVED: Incorrect line that was causing the error
        // const newValue = Math.max(0, Math.min(12, Number(todayWater) + Number(change)));
      }
      
      return {
        ...prev,
        sleepData: updatedSleepData
      };
    });

    setIsLoading(false);
    alert('Sleep data saved successfully!');
  };

  // Save activity data
  const saveActivityData = async () => {
    setIsLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const today = new Date().toISOString().split('T')[0];
    const newActivityEntry = {
      date: today,
      ...activities
    };

    setData(prev => {
      const updatedActivityData = prev.activityData.map(d => 
        d.date === today ? newActivityEntry : d
      );
      
      // If today's data doesn't exist, add it
      if (!prev.activityData.find(d => d.date === today)) {
        updatedActivityData.push(newActivityEntry);
        // REMOVED: Incorrect line that was causing the error
        // const newValue = Math.max(0, Number(activities[activityType]) + Number(change));
      }
      
      return {
        ...prev,
        activityData: updatedActivityData
      };
    });

    setIsLoading(false);
    alert('Activity data saved successfully!');
  };

  // Activity types configuration
  const activityTypes = [
    { 
      name: 'Yoga', 
      icon: TreePine, 
      color: 'text-green-600', 
      key: 'yoga',
      duration: activities.yoga 
    },
    { 
      name: 'Walk', 
      icon: Footprints, 
      color: 'text-blue-600', 
      key: 'walk',
      duration: activities.walk 
    },
    { 
      name: 'Gym', 
      icon: Dumbbell, 
      color: 'text-purple-600', 
      key: 'gym',
      duration: activities.gym 
    },
  ];

  // Utility functions
  const getSleepQualityColor = (quality: string) => {
    switch (quality) {
      case 'deep': return 'bg-green-100 text-green-800 border-green-200';
      case 'disturbed': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'insufficient': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSleepQualityIcon = (quality: string) => {
    switch (quality) {
      case 'deep': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'disturbed': return <Activity className="w-4 h-4 text-yellow-600" />;
      case 'insufficient': return <Moon className="w-4 h-4 text-red-600" />;
      default: return <Moon className="w-4 h-4 text-gray-600" />;
    }
  };

  // Calculate averages dynamically
  const calculateWeeklyAverage = () => {
    // Filter data for the last 7 days
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 6);
    
    const recentSleepData = data.sleepData.filter(d => {
      const date = new Date(d.date);
      return date.getTime() >= sevenDaysAgo.getTime() && date.getTime() <= today.getTime();
    });
    
    const recentActivityData = data.activityData.filter(d => {
      const date = new Date(d.date);
      return date.getTime() >= sevenDaysAgo.getTime() && date.getTime() <= today.getTime();
    });
    
    const recentHydrationData = data.hydrationData.filter(d => {
      const date = new Date(d.date);
      return date.getTime() >= sevenDaysAgo.getTime() && date.getTime() <= today.getTime();
    });
    
    // Calculate averages
    const totalSleep = recentSleepData.reduce((acc, day) => acc + day.hours, 0);
    const avgSleep = recentSleepData.length > 0 ? (totalSleep / recentSleepData.length).toFixed(1) : '0.0';
    
    const totalActivity = recentActivityData.reduce((acc, day) => acc + day.yoga + day.walk + day.gym, 0);
    const avgActivity = recentActivityData.length > 0 ? Math.round(totalActivity / recentActivityData.length) : 0;
    
    const totalHydration = recentHydrationData.reduce((acc, day) => acc + day.glasses, 0);
    const avgHydration = recentHydrationData.length > 0 ? (totalHydration / recentHydrationData.length).toFixed(1) : '0.0';

    return { avgSleep, avgActivity, avgHydration };
  };

  const { avgSleep, avgActivity, avgHydration } = calculateWeeklyAverage();

  // Custom tooltip formatters
  const sleepTooltipFormatter = (value: number, name: string) => {
    if (name === 'hours') {
      const numValue = typeof value === 'number' ? value : parseFloat(value);
      return [numValue.toFixed(1) + 'h', 'Hours'];
    }
    return [value, name];
  };

  const activityTooltipFormatter = (value: number, name: string) => {
    return [`${value} min`, name];
  };

  const hydrationTooltipFormatter = (value: number) => {
    return [`${value} glasses`, 'Water'];
  };

  return (
    <div className="flex-1 space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lifestyle Tracker</h1>
          <p className="text-gray-600">
            Monitor your sleep, activities, and hydration patterns
          </p>
        </div>
        <Button variant="outline" className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Sleep</CardTitle>
            <Moon className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgSleep}h</div>
            <p className="text-xs text-gray-600">
              per night (last 7 days)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Activity</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgActivity}min</div>
            <p className="text-xs text-gray-600">
              average per day (last 7 days)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hydration</CardTitle>
            <Droplets className="h-4 w-4 text-cyan-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgHydration}</div>
            <p className="text-xs text-gray-600">
              glasses per day (last 7 days)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tracking */}
      <Tabs defaultValue="sleep" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sleep">Sleep Quality</TabsTrigger>
          <TabsTrigger value="activity">Activity Tracking</TabsTrigger>
          <TabsTrigger value="hydration">Hydration</TabsTrigger>
        </TabsList>

        <TabsContent value="sleep" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Sleep Logging */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Moon className="w-5 h-5" />
                  Sleep Quality Log
                </CardTitle>
                <CardDescription>
                  Record your sleep duration and quality
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-transparent border-none outline-none text-sm flex-1"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium">Sleep Duration: {sleepHours.toFixed(1)}h</label>
                  <input
                    type="range"
                    min="4"
                    max="12"
                    step="0.1"
                    value={sleepHours}
                    onChange={(e) => setSleepHours(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>4h</span>
                    <span>12h</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium">Sleep Quality</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['deep', 'disturbed', 'insufficient'].map((quality) => (
                      <Button
                        key={quality}
                        variant={sleepQuality === quality ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSleepQuality(quality)}
                        className="flex items-center gap-2"
                      >
                        {getSleepQualityIcon(quality)}
                        {quality.charAt(0).toUpperCase() + quality.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>

                <Button 
                  className="w-full flex items-center gap-2" 
                  onClick={saveSleepData}
                  disabled={isLoading}
                >
                  <Save className="w-4 h-4" />
                  {isLoading ? 'Saving...' : 'Log Sleep'}
                </Button>
              </CardContent>
            </Card>

            {/* Sleep Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Sleep Trends</CardTitle>
                <CardDescription>
                  Your sleep patterns over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.sleepData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => new Date(value).getDate().toString()}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                        formatter={sleepTooltipFormatter}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="hours" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        name="hours"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 space-y-2">
                  {data.sleepData.slice(-3).map((day, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">
                        {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge className={getSleepQualityColor(day.type)}>
                          {day.type}
                        </Badge>
                        <span className="text-sm font-medium">{day.hours.toFixed(1)}h</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Activity Logging */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Activity Tracking
                </CardTitle>
                <CardDescription>
                  Log your daily physical activities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {activityTypes.map((activity) => {
                  const IconComponent = activity.icon;
                  return (
                    <div key={activity.name} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <IconComponent className={`w-5 h-5 ${activity.color}`} />
                        <div>
                          <h4 className="font-medium">{activity.name}</h4>
                          <p className="text-sm text-gray-600">{activity.duration} minutes today</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateActivity(activity.key, -15)}
                          disabled={activity.duration === 0}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="font-medium w-16 text-center">{activity.duration}m</span>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateActivity(activity.key, 15)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                <Button 
                  className="w-full flex items-center gap-2" 
                  onClick={saveActivityData}
                  disabled={isLoading}
                >
                  <Save className="w-4 h-4" />
                  {isLoading ? 'Saving...' : 'Save Activities'}
                </Button>
              </CardContent>
            </Card>

            {/* Activity Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Activity Distribution</CardTitle>
                <CardDescription>
                  Activity breakdown by type over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.activityData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => new Date(value).getDate().toString()}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                        formatter={activityTooltipFormatter}
                      />
                      <Bar dataKey="yoga" fill="#16a34a" name="Yoga" />
                      <Bar dataKey="walk" fill="#2563eb" name="Walk" />
                      <Bar dataKey="gym" fill="#9333ea" name="Gym" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="hydration" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Hydration Tracking */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Droplets className="w-5 h-5" />
                  Hydration Tracker
                </CardTitle>
                <CardDescription>
                  Track your daily water intake
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center space-y-4">
                  <div className="text-6xl font-bold text-cyan-600">{todayWater}</div>
                  <p className="text-gray-600">glasses today</p>
                  <Progress value={(todayWater / 8) * 100} className="w-full h-3" />
                  <p className="text-sm text-gray-600">Goal: 8 glasses per day</p>
                </div>

                <div className="flex justify-center gap-4">
                  <Button 
                    variant="outline" 
                    size="lg"
                    onClick={() => updateWaterIntake(-1)}
                    disabled={todayWater === 0}
                    className="flex items-center gap-2"
                  >
                    <Minus className="w-4 h-4" />
                    Remove Glass
                  </Button>
                  <Button 
                    size="lg"
                    onClick={() => updateWaterIntake(1)}
                    disabled={todayWater >= 12}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Glass
                  </Button>
                </div>

                <div className="text-center">
                  <p className="text-sm text-gray-500">
                    {todayWater >= 8 ? 
                      "Great job! You've reached your hydration goal!" : 
                      `${8 - todayWater} more glasses to reach your goal`
                    }
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Hydration Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Hydration Trends</CardTitle>
                <CardDescription>
                  Your water intake over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.hydrationData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => new Date(value).getDate().toString()}
                      />
                      <YAxis domain={[0, 12]} />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                        formatter={hydrationTooltipFormatter}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="glasses" 
                        stroke="#06b6d4" 
                        strokeWidth={3}
                        dot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="mt-4 grid grid-cols-7 gap-1">
                  {data.hydrationData.slice(-7).map((day, index) => (
                    <div key={index} className="text-center">
                      <div className="text-xs text-gray-500 mb-1">
                        {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div className={`text-sm font-medium p-1 rounded ${
                        day.glasses >= 8 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {day.glasses}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LifestyleTracker;