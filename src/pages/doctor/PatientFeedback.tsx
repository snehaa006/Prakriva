import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useApp } from "@/context/AppContext";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Star, 
  TrendingUp, 
  MessageSquare, 
  ThumbsUp,
  ThumbsDown,
  User,
  Calendar,
  BarChart3,
  Filter
} from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Feedback {
  id: string;
  patientId: string;
  patientName: string;
  rating: number;
  category: 'diet_effectiveness' | 'meal_taste' | 'ease_of_preparation' | 'overall_satisfaction';
  comment: string;
  date: string;
  helpful: boolean;
  dietPlanId?: string;
}

const PatientFeedback = () => {
  const { patients } = useApp();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');

  // Mock feedback data
  const [feedbacks] = useState<Feedback[]>([
    {
      id: '1',
      patientId: '1',
      patientName: 'Priya Sharma',
      rating: 4,
      category: 'diet_effectiveness',
      comment: 'The Vata-balancing diet has really helped with my anxiety and sleep issues. I feel much more grounded.',
      date: '2024-01-15',
      helpful: true
    },
    {
      id: '2',
      patientId: '2',
      patientName: 'Rajesh Kumar',
      rating: 3,
      category: 'meal_taste',
      comment: 'The diabetic-friendly recipes are good but could use more variety in flavors. Some dishes taste bland.',
      date: '2024-01-14',
      helpful: false
    },
    {
      id: '3',
      patientId: '3',
      patientName: 'Anita Patel',
      rating: 5,
      category: 'overall_satisfaction',
      comment: 'Excellent personalized diet plan! My acidity issues have completely resolved. Thank you so much!',
      date: '2024-01-13',
      helpful: true
    },
    {
      id: '4',
      patientId: '1',
      patientName: 'Priya Sharma',
      rating: 4,
      category: 'ease_of_preparation',
      comment: 'Most recipes are easy to prepare, though some require ingredients that are hard to find locally.',
      date: '2024-01-12',
      helpful: true
    },
    {
      id: '5',
      patientId: '4',
      patientName: 'Vikram Singh',
      rating: 2,
      category: 'diet_effectiveness',
      comment: 'Not seeing much improvement in joint pain. Maybe need to adjust the Kapha-reducing foods.',
      date: '2024-01-11',
      helpful: false
    }
  ]);

  // Calculate satisfaction metrics
  const satisfactionData = [
    { name: 'Very Satisfied', value: feedbacks.filter(f => f.rating === 5).length, color: '#22c55e' },
    { name: 'Satisfied', value: feedbacks.filter(f => f.rating === 4).length, color: '#84cc16' },
    { name: 'Neutral', value: feedbacks.filter(f => f.rating === 3).length, color: '#eab308' },
    { name: 'Dissatisfied', value: feedbacks.filter(f => f.rating === 2).length, color: '#f97316' },
    { name: 'Very Dissatisfied', value: feedbacks.filter(f => f.rating === 1).length, color: '#ef4444' }
  ];

  const categoryRatings = [
    {
      category: 'Diet Effectiveness',
      rating: feedbacks
        .filter(f => f.category === 'diet_effectiveness')
        .reduce((acc, f) => acc + f.rating, 0) / 
        feedbacks.filter(f => f.category === 'diet_effectiveness').length || 0
    },
    {
      category: 'Meal Taste',
      rating: feedbacks
        .filter(f => f.category === 'meal_taste')
        .reduce((acc, f) => acc + f.rating, 0) / 
        feedbacks.filter(f => f.category === 'meal_taste').length || 0
    },
    {
      category: 'Ease of Preparation',
      rating: feedbacks
        .filter(f => f.category === 'ease_of_preparation')
        .reduce((acc, f) => acc + f.rating, 0) / 
        feedbacks.filter(f => f.category === 'ease_of_preparation').length || 0
    },
    {
      category: 'Overall Satisfaction',
      rating: feedbacks
        .filter(f => f.category === 'overall_satisfaction')
        .reduce((acc, f) => acc + f.rating, 0) / 
        feedbacks.filter(f => f.category === 'overall_satisfaction').length || 0
    }
  ];

  const filteredFeedbacks = feedbacks.filter(feedback => {
    const matchesSearch = feedback.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         feedback.comment.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || feedback.category === categoryFilter;
    const matchesRating = ratingFilter === 'all' || feedback.rating.toString() === ratingFilter;
    return matchesSearch && matchesCategory && matchesRating;
  });

  const averageRating = feedbacks.reduce((acc, f) => acc + f.rating, 0) / feedbacks.length;
  const totalFeedbacks = feedbacks.length;
  const helpfulFeedbacks = feedbacks.filter(f => f.helpful).length;

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'diet_effectiveness': return 'Diet Effectiveness';
      case 'meal_taste': return 'Meal Taste';
      case 'ease_of_preparation': return 'Ease of Preparation';
      case 'overall_satisfaction': return 'Overall Satisfaction';
      default: return category;
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  const FeedbackCard = ({ feedback }: { feedback: Feedback }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground font-semibold text-sm">
                {feedback.patientName.charAt(0)}
              </span>
            </div>
            <div>
              <h3 className="font-semibold">{feedback.patientName}</h3>
              <div className="flex items-center gap-2">
                <div className="flex">{renderStars(feedback.rating)}</div>
                <Badge variant="outline" className="text-xs">
                  {getCategoryLabel(feedback.category)}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {new Date(feedback.date).toLocaleDateString()}
            </span>
            {feedback.helpful ? (
              <ThumbsUp className="w-4 h-4 text-success" />
            ) : (
              <ThumbsDown className="w-4 h-4 text-destructive" />
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-3">{feedback.comment}</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline">
            Reply
          </Button>
          <Button 
            size="sm" 
            onClick={() => navigate(`/doctor/patients/${feedback.patientId}`)}
          >
            View Patient
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Patient Feedback</h1>
          <p className="text-muted-foreground">Diet feedback and patient satisfaction metrics</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-gradient-primary text-primary-foreground">
                <Star className="w-4 h-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">{averageRating.toFixed(1)}</p>
                <p className="text-sm text-muted-foreground">Avg Rating</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-info text-white">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalFeedbacks}</p>
                <p className="text-sm text-muted-foreground">Total Reviews</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-success text-white">
                <ThumbsUp className="w-4 h-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">{helpfulFeedbacks}</p>
                <p className="text-sm text-muted-foreground">Helpful Reviews</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-warning text-white">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">{Math.round((helpfulFeedbacks / totalFeedbacks) * 100)}%</p>
                <p className="text-sm text-muted-foreground">Satisfaction Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Analytics */}
        <div className="lg:col-span-1 space-y-6">
          {/* Satisfaction Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Satisfaction Matrix
              </CardTitle>
              <CardDescription>Overall patient satisfaction distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={satisfactionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {satisfactionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="space-y-2">
                  {satisfactionData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <span className="text-sm font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category Ratings */}
          <Card>
            <CardHeader>
              <CardTitle>Category Ratings</CardTitle>
              <CardDescription>Average ratings by feedback category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categoryRatings.map((item) => (
                  <div key={item.category}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{item.category}</span>
                      <span className="text-sm text-muted-foreground">
                        {item.rating.toFixed(1)}/5
                      </span>
                    </div>
                    <Progress value={(item.rating / 5) * 100} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feedback List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Feedback</CardTitle>
              <CardDescription>Latest patient reviews and comments</CardDescription>
              
              {/* Filters */}
              <div className="flex gap-4 pt-4">
                <Input
                  placeholder="Search feedback..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="max-w-xs">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="diet_effectiveness">Diet Effectiveness</SelectItem>
                    <SelectItem value="meal_taste">Meal Taste</SelectItem>
                    <SelectItem value="ease_of_preparation">Ease of Preparation</SelectItem>
                    <SelectItem value="overall_satisfaction">Overall Satisfaction</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={ratingFilter} onValueChange={setRatingFilter}>
                  <SelectTrigger className="max-w-xs">
                    <SelectValue placeholder="Rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ratings</SelectItem>
                    <SelectItem value="5">5 Stars</SelectItem>
                    <SelectItem value="4">4 Stars</SelectItem>
                    <SelectItem value="3">3 Stars</SelectItem>
                    <SelectItem value="2">2 Stars</SelectItem>
                    <SelectItem value="1">1 Star</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[600px] overflow-auto">
              {filteredFeedbacks.length > 0 ? (
                filteredFeedbacks.map(feedback => (
                  <FeedbackCard key={feedback.id} feedback={feedback} />
                ))
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No feedback found</h3>
                  <p className="text-muted-foreground">
                    No feedback matches your current filters
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PatientFeedback;