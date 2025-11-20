import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Users, 
  UserPlus, 
  MessageCircle, 
  Calendar,
  Send,
  MoreVertical,
  Phone,
  Video,
  FileText,
  Clock,
  CheckCircle
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  specialization: string;
  email: string;
  status: 'online' | 'offline' | 'busy';
  avatar?: string;
  joinedDate: string;
}

interface TeamChat {
  id: string;
  name: string;
  type: 'general' | 'case_discussion' | 'announcements';
  participants: string[];
  unreadCount: number;
  lastMessage?: {
    senderId: string;
    senderName: string;
    content: string;
    timestamp: Date;
  };
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  chatId: string;
}

const TeamManagement = () => {
  const navigate = useNavigate();
  const [selectedChat, setSelectedChat] = useState<TeamChat | null>(null);
  const [messageText, setMessageText] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  // Mock team members
  const [teamMembers] = useState<TeamMember[]>([
    {
      id: 'tm1',
      name: 'Dr. Sarah Wilson',
      role: 'Nutritionist',
      specialization: 'Clinical Nutrition',
      email: 'sarah.wilson@clinic.com',
      status: 'online',
      joinedDate: '2023-08-15'
    },
    {
      id: 'tm2', 
      name: 'Dr. Michael Chen',
      role: 'Ayurvedic Specialist',
      specialization: 'Panchakarma Therapy',
      email: 'michael.chen@clinic.com',
      status: 'busy',
      joinedDate: '2023-06-20'
    },
    {
      id: 'tm3',
      name: 'Dr. Priya Gupta',
      role: 'Dietitian',
      specialization: 'Diabetes Management',
      email: 'priya.gupta@clinic.com',
      status: 'online',
      joinedDate: '2023-09-10'
    },
    {
      id: 'tm4',
      name: 'Dr. James Rodriguez',
      role: 'Wellness Coach',
      specialization: 'Lifestyle Medicine',
      email: 'james.rodriguez@clinic.com',
      status: 'offline',
      joinedDate: '2023-07-05'
    }
  ]);

  // Mock team chats
  const [teamChats] = useState<TeamChat[]>([
    {
      id: 'chat1',
      name: 'General Discussion',
      type: 'general',
      participants: ['current', 'tm1', 'tm2', 'tm3', 'tm4'],
      unreadCount: 3,
      lastMessage: {
        senderId: 'tm1',
        senderName: 'Dr. Sarah Wilson',
        content: 'Has anyone tried the new anti-inflammatory protocol for arthritis patients?',
        timestamp: new Date(Date.now() - 1000 * 60 * 30)
      }
    },
    {
      id: 'chat2',
      name: 'Case Reviews',
      type: 'case_discussion',
      participants: ['current', 'tm2', 'tm3'],
      unreadCount: 1,
      lastMessage: {
        senderId: 'tm2',
        senderName: 'Dr. Michael Chen',
        content: 'The patient with chronic fatigue is responding well to the Vata-balancing diet.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2)
      }
    },
    {
      id: 'chat3',
      name: 'Announcements',
      type: 'announcements',
      participants: ['current', 'tm1', 'tm2', 'tm3', 'tm4'],
      unreadCount: 0,
      lastMessage: {
        senderId: 'current',
        senderName: 'You',
        content: 'Monthly team meeting scheduled for next Friday at 3 PM.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24)
      }
    }
  ]);

  // Mock messages
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg1',
      senderId: 'tm1',
      senderName: 'Dr. Sarah Wilson',
      content: 'Good morning team! I wanted to share some interesting findings from the recent nutrition conference.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      chatId: 'chat1'
    },
    {
      id: 'msg2',
      senderId: 'current',
      senderName: 'You',
      content: 'That sounds interesting! Please share the key takeaways.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1.5),
      chatId: 'chat1'
    },
    {
      id: 'msg3',
      senderId: 'tm1',
      senderName: 'Dr. Sarah Wilson',
      content: 'Has anyone tried the new anti-inflammatory protocol for arthritis patients?',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      chatId: 'chat1'
    }
  ]);

  const selectedChatMessages = messages
    .filter(msg => msg.chatId === selectedChat?.id)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const sendMessage = () => {
    if (!messageText.trim() || !selectedChat) return;

    const newMessage: Message = {
      id: uuidv4(),
      senderId: 'current',
      senderName: 'You',
      content: messageText,
      timestamp: new Date(),
      chatId: selectedChat.id
    };

    setMessages(prev => [...prev, newMessage]);
    setMessageText('');

    toast({
      title: "Message sent",
      description: `Message sent to ${selectedChat.name}`,
    });
  };

  const inviteTeamMember = () => {
    if (!inviteEmail.trim()) return;

    toast({
      title: "Invitation sent",
      description: `Team invitation sent to ${inviteEmail}`,
    });
    
    setInviteEmail('');
    setShowInviteForm(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-success';
      case 'busy': return 'bg-warning';
      case 'offline': return 'bg-muted-foreground';
      default: return 'bg-muted-foreground';
    }
  };

  const getChatTypeIcon = (type: string) => {
    switch (type) {
      case 'general': return Users;
      case 'case_discussion': return FileText;
      case 'announcements': return MessageCircle;
      default: return MessageCircle;
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
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
            <h1 className="text-3xl font-bold text-foreground">Team Management</h1>
            <p className="text-muted-foreground">Collaborate with healthcare professionals</p>
          </div>
        </div>
        <Button onClick={() => setShowInviteForm(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Invite Member
        </Button>
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-gradient-primary text-primary-foreground">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">{teamMembers.length}</p>
                <p className="text-sm text-muted-foreground">Team Members</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-success text-white">
                <CheckCircle className="w-4 h-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {teamMembers.filter(m => m.status === 'online').length}
                </p>
                <p className="text-sm text-muted-foreground">Online Now</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-info text-white">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">{teamChats.length}</p>
                <p className="text-sm text-muted-foreground">Active Chats</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-warning text-white">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">5</p>
                <p className="text-sm text-muted-foreground">Meetings This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Team Members */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Team Members
            </CardTitle>
            <CardDescription>Healthcare professionals in your team</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {teamMembers.map(member => (
              <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                <div className="relative">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                      {member.name.split(' ').map(n => n.charAt(0)).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${getStatusColor(member.status)} rounded-full border-2 border-background`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{member.name}</h4>
                  <p className="text-sm text-muted-foreground truncate">{member.role}</p>
                  <Badge variant="outline" className="text-xs mt-1">
                    {member.specialization}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost">
                    <MessageCircle className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Phone className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Team Chat */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="chat" className="space-y-4">
            <TabsList>
              <TabsTrigger value="chat">Team Chat</TabsTrigger>
              <TabsTrigger value="meetings">Meetings</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="space-y-0">
              <div className="grid grid-cols-3 gap-4 h-[600px]">
                {/* Chat List */}
                <Card className="col-span-1">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base">Channels</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 space-y-1">
                    {teamChats.map(chat => {
                      const ChatIcon = getChatTypeIcon(chat.type);
                      return (
                        <div
                          key={chat.id}
                          className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors border-b ${
                            selectedChat?.id === chat.id ? 'bg-muted' : ''
                          }`}
                          onClick={() => setSelectedChat(chat)}
                        >
                          <div className="flex items-center gap-3">
                            <ChatIcon className="w-4 h-4 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-sm truncate">{chat.name}</h4>
                                {chat.unreadCount > 0 && (
                                  <Badge className="bg-primary text-primary-foreground text-xs min-w-[1.25rem] h-5">
                                    {chat.unreadCount}
                                  </Badge>
                                )}
                              </div>
                              {chat.lastMessage && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {chat.lastMessage.senderName}: {chat.lastMessage.content}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Chat Messages */}
                <Card className="col-span-2 flex flex-col">
                  {selectedChat ? (
                    <>
                      {/* Chat Header */}
                      <CardHeader className="pb-4 border-b">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base">{selectedChat.name}</CardTitle>
                            <CardDescription>
                              {selectedChat.participants.length} participants
                            </CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost">
                              <Video className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <Phone className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      {/* Messages */}
                      <CardContent className="flex-1 p-4 overflow-auto">
                        <div className="space-y-4">
                          {selectedChatMessages.map(message => (
                            <div
                              key={message.id}
                              className={`flex ${message.senderId === 'current' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`max-w-[80%] ${message.senderId === 'current' ? '' : 'flex gap-3'}`}>
                                {message.senderId !== 'current' && (
                                  <Avatar className="w-8 h-8">
                                    <AvatarFallback className="text-xs">
                                      {message.senderName.split(' ').map(n => n.charAt(0)).join('')}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                                <div
                                  className={`p-3 rounded-lg ${
                                    message.senderId === 'current'
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-muted'
                                  }`}
                                >
                                  {message.senderId !== 'current' && (
                                    <p className="text-xs font-medium mb-1">{message.senderName}</p>
                                  )}
                                  <p className="text-sm">{message.content}</p>
                                  <div className={`flex items-center gap-1 mt-1 ${
                                    message.senderId === 'current' 
                                      ? 'text-primary-foreground/70' 
                                      : 'text-muted-foreground'
                                  }`}>
                                    <Clock className="w-3 h-3" />
                                    <span className="text-xs">{formatTime(message.timestamp)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>

                      {/* Message Input */}
                      <div className="p-4 border-t">
                        <div className="flex gap-2">
                          <Textarea
                            placeholder="Type your message..."
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage();
                              }
                            }}
                            rows={1}
                            className="resize-none"
                          />
                          <Button onClick={sendMessage} disabled={!messageText.trim()}>
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <CardContent className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <MessageCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold mb-2">Select a channel</h3>
                        <p className="text-muted-foreground">
                          Choose a channel from the list to start collaborating
                        </p>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="meetings">
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Team Meetings</h3>
                  <p className="text-muted-foreground">
                    Schedule and manage team meetings (Coming soon)
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents">
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Shared Documents</h3>
                  <p className="text-muted-foreground">
                    Share and collaborate on documents (Coming soon)
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Invite Member Dialog */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Invite Team Member</CardTitle>
              <CardDescription>Send an invitation to join your healthcare team</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="invite-email">Email Address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@clinic.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowInviteForm(false)}>
                  Cancel
                </Button>
                <Button onClick={inviteTeamMember}>
                  Send Invitation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;