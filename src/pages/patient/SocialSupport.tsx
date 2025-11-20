import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users,
  MessageCircle,
  Send,
  Heart,
  Share2,
  ThumbsUp,
  MessageSquare,
  UserCheck,
  Stethoscope,
  Clock,
  CheckCircle2
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// Mock data for community posts
const communityPosts = [
  {
    id: 1,
    author: "Sarah M.",
    avatar: "SM",
    time: "2 hours ago",
    content: "Just completed my 30-day Ayurvedic meal plan! Feeling so much more energetic and my digestion has improved significantly. The khichdi recipe has become my favorite comfort food. 🌱",
    likes: 12,
    comments: 3,
    ayurvedicTip: true
  },
  {
    id: 2,
    author: "Rajesh K.",
    avatar: "RK",
    time: "4 hours ago",
    content: "Morning yoga session followed by warm water with ginger and lemon - perfect way to balance Vata dosha! Who else is starting their day with Ayurvedic practices?",
    likes: 8,
    comments: 5,
    ayurvedicTip: true
  },
  {
    id: 3,
    author: "Priya S.",
    avatar: "PS",
    time: "1 day ago",
    content: "Struggled with acidity for weeks, but after following my doctor's pitta-pacifying diet recommendations, I'm feeling so much better! Sweet fruits and cooling foods really work.",
    likes: 15,
    comments: 7,
    ayurvedicTip: false
  }
];

// Mock data for doctor conversations
const doctorMessages = [
  {
    id: 1,
    from: "You",
    message: "Hi Doctor, I've been following the meal plan but experiencing mild bloating after lunch. Should I adjust portion sizes?",
    time: "10:30 AM",
    isPatient: true
  },
  {
    id: 2,
    from: "Dr. Sharma",
    message: "Thank you for the update. Mild bloating can occur during the initial transition. Try reducing the portion size by 20% and add a pinch of hing (asafoetida) to your dal. Also, ensure you're eating slowly and mindfully.",
    time: "2:15 PM",
    isPatient: false
  },
  {
    id: 3,
    from: "You",
    message: "Thank you for the advice. Should I continue with the current meal timings?",
    time: "3:45 PM",
    isPatient: true
  }
];

const SocialSupport = () => {
  const navigate = useNavigate();
  const [newPost, setNewPost] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const handlePostSubmit = () => {
    if (newPost.trim()) {
      // Add new post logic here
      setNewPost("");
    }
  };

  const handleMessageSend = () => {
    if (newMessage.trim()) {
      // Send message logic here
      setNewMessage("");
    }
  };

  const handleFeedbackSubmit = () => {
    if (feedbackMessage.trim()) {
      // Submit feedback logic here
      setFeedbackMessage("");
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Social Support</h1>
          <p className="text-muted-foreground">
            Connect with your community and healthcare team
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/patient/dashboard')}>
          Back to Dashboard
        </Button>
      </div>

      <Tabs defaultValue="community" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="community">Community</TabsTrigger>
          <TabsTrigger value="doctor">Doctor Chat</TabsTrigger>
        </TabsList>

        <TabsContent value="community" className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Community Feed */}
            <div className="lg:col-span-2 space-y-6">
              {/* Create Post */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Share2 className="w-5 h-5" />
                    Share Your Progress
                  </CardTitle>
                  <CardDescription>
                    Share your Ayurvedic journey or tips with the community
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Share your progress, ask questions, or share Ayurvedic tips..."
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    rows={4}
                  />
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      <Badge variant="outline" className="cursor-pointer">
                        💡 Ayurvedic Tip
                      </Badge>
                      <Badge variant="outline" className="cursor-pointer">
                        📈 Progress Update
                      </Badge>
                    </div>
                    <Button onClick={handlePostSubmit} disabled={!newPost.trim()}>
                      <Send className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Community Posts */}
              <div className="space-y-4">
                {communityPosts.map((post) => (
                  <Card key={post.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                            {post.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-foreground">{post.author}</h4>
                              <p className="text-sm text-muted-foreground">{post.time}</p>
                            </div>
                            {post.ayurvedicTip && (
                              <Badge className="bg-success/10 text-success border-success/20">
                                💡 Ayurvedic Tip
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-foreground leading-relaxed">{post.content}</p>
                          
                          <div className="flex items-center gap-6 pt-2 border-t">
                            <Button variant="ghost" size="sm" className="gap-2">
                              <ThumbsUp className="w-4 h-4" />
                              {post.likes}
                            </Button>
                            <Button variant="ghost" size="sm" className="gap-2">
                              <MessageSquare className="w-4 h-4" />
                              {post.comments}
                            </Button>
                            <Button variant="ghost" size="sm" className="gap-2">
                              <Share2 className="w-4 h-4" />
                              Share
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Community Info Sidebar */}
            <div className="space-y-6">
              {/* Community Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Community Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Active Members</span>
                    <span className="font-semibold">1,247</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Posts Today</span>
                    <span className="font-semibold">23</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Success Stories</span>
                    <span className="font-semibold">156</span>
                  </div>
                </CardContent>
              </Card>

              {/* Popular Topics */}
              <Card>
                <CardHeader>
                  <CardTitle>Popular Topics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Badge variant="secondary" className="mr-2 mb-2">#VataBalance</Badge>
                  <Badge variant="secondary" className="mr-2 mb-2">#PittaDiet</Badge>
                  <Badge variant="secondary" className="mr-2 mb-2">#KaphaDetox</Badge>
                  <Badge variant="secondary" className="mr-2 mb-2">#MorningRoutine</Badge>
                  <Badge variant="secondary" className="mr-2 mb-2">#Digestion</Badge>
                  <Badge variant="secondary" className="mr-2 mb-2">#HerbalTea</Badge>
                </CardContent>
              </Card>

              {/* Quick Tips */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="w-5 h-5" />
                    Daily Ayurvedic Tip
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Start your day with warm water and a slice of fresh ginger to kindle your digestive fire (Agni) and prepare your body for the day ahead.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="doctor" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Doctor Chat */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Chat with Dr. Sharma
                </CardTitle>
                <CardDescription>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-success rounded-full"></div>
                    <span>Available now</span>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 h-96 overflow-y-auto mb-4">
                  {doctorMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.isPatient ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-lg ${
                          msg.isPatient
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{msg.message}</p>
                        <p className={`text-xs mt-1 ${
                          msg.isPatient ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}>
                          {msg.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <Input
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleMessageSend()}
                  />
                  <Button onClick={handleMessageSend} disabled={!newMessage.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions & Feedback */}
            <div className="space-y-6">
              {/* Quick Questions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Stethoscope className="w-5 h-5" />
                    Quick Questions
                  </CardTitle>
                  <CardDescription>
                    Common questions and quick consultations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start gap-2 h-auto p-3">
                    <Clock className="w-4 h-4 text-primary" />
                    <div className="text-left">
                      <div className="font-medium">Adjust meal timing</div>
                      <div className="text-xs text-muted-foreground">Request schedule changes</div>
                    </div>
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start gap-2 h-auto p-3">
                    <Heart className="w-4 h-4 text-primary" />
                    <div className="text-left">
                      <div className="font-medium">Report side effects</div>
                      <div className="text-xs text-muted-foreground">Share any concerns</div>
                    </div>
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start gap-2 h-auto p-3">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <div className="text-left">
                      <div className="font-medium">Request modifications</div>
                      <div className="text-xs text-muted-foreground">Adjust diet plan</div>
                    </div>
                  </Button>
                </CardContent>
              </Card>

              {/* Feedback Box */}
              <Card>
                <CardHeader>
                  <CardTitle>Feedback & Suggestions</CardTitle>
                  <CardDescription>
                    Share your experience or request adjustments
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Share your feedback, concerns, or suggestions for improving your treatment plan..."
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    rows={4}
                  />
                  
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      <Badge variant="outline" className="cursor-pointer">
                        🔄 Request Change
                      </Badge>
                      <Badge variant="outline" className="cursor-pointer">
                        💬 General Feedback
                      </Badge>
                    </div>
                    <Button onClick={handleFeedbackSubmit} disabled={!feedbackMessage.trim()}>
                      Submit
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Doctor Availability */}
              <Card>
                <CardHeader>
                  <CardTitle>Doctor Availability</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Today</span>
                    <Badge className="bg-success/10 text-success border-success/20">
                      Available
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Response Time</span>
                    <span className="text-sm font-medium">~2 hours</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Next Appointment</span>
                    <span className="text-sm font-medium">Dec 20, 2024</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SocialSupport;