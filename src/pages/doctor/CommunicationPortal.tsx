import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/context/AppContext";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Send, 
  MessageCircle, 
  Users, 
  Search,
  Phone,
  Video,
  MoreVertical,
  Paperclip,
  Smile,
  Clock
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderType: 'doctor' | 'patient';
  content: string;
  timestamp: Date;
  chatId: string;
  read: boolean;
}

interface Chat {
  id: string;
  type: 'individual' | 'group';
  name: string;
  participants: string[];
  lastMessage?: Message;
  unreadCount: number;
}

const CommunicationPortal = () => {
  const { patients, user } = useApp();
  const navigate = useNavigate();
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data for chats and messages
  const [chats] = useState<Chat[]>([
    {
      id: '1',
      type: 'individual',
      name: 'Priya Sharma',
      participants: ['1', 'doctor'],
      unreadCount: 2,
      lastMessage: {
        id: 'm1',
        senderId: '1',
        senderName: 'Priya Sharma',
        senderType: 'patient',
        content: 'I have been following the diet plan but experiencing some bloating after meals.',
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        chatId: '1',
        read: false
      }
    },
    {
      id: '2',
      type: 'individual',
      name: 'Rajesh Kumar',
      participants: ['2', 'doctor'],
      unreadCount: 0,
      lastMessage: {
        id: 'm2',
        senderId: 'doctor',
        senderName: 'Dr. ' + (user?.name || 'Doctor'),
        senderType: 'doctor',
        content: 'Great progress on your weight management! Keep following the Kapha-balancing diet.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
        chatId: '2',
        read: true
      }
    },
    {
      id: '3',
      type: 'individual',
      name: 'Anita Patel',
      participants: ['3', 'doctor'],
      unreadCount: 1,
      lastMessage: {
        id: 'm3',
        senderId: '3',
        senderName: 'Anita Patel',
        senderType: 'patient',
        content: 'The cooling foods are helping with my acidity. Thank you!',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
        chatId: '3',
        read: false
      }
    },
    {
      id: 'group1',
      type: 'group',
      name: 'Diabetes Support Group',
      participants: ['2', '4', 'doctor'],
      unreadCount: 5,
      lastMessage: {
        id: 'mg1',
        senderId: '4',
        senderName: 'Vikram Singh',
        senderType: 'patient',
        content: 'Has anyone tried the bitter gourd juice recipe? How does it taste?',
        timestamp: new Date(Date.now() - 1000 * 60 * 60),
        chatId: 'group1',
        read: false
      }
    }
  ]);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm1-1',
      senderId: '1',
      senderName: 'Priya Sharma',
      senderType: 'patient',
      content: 'Hello Doctor, I started the new diet plan you prescribed.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
      chatId: '1',
      read: true
    },
    {
      id: 'm1-2',
      senderId: 'doctor',
      senderName: 'Dr. ' + (user?.name || 'Doctor'),
      senderType: 'doctor',
      content: 'That\'s great to hear! How are you feeling so far? Any changes in your energy levels or digestion?',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 23),
      chatId: '1',
      read: true
    },
    {
      id: 'm1-3',
      senderId: '1',
      senderName: 'Priya Sharma',
      senderType: 'patient',
      content: 'My energy has improved, but I have been experiencing some bloating after meals, especially after lunch.',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      chatId: '1',
      read: false
    }
  ]);

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedChatMessages = messages
    .filter(msg => msg.chatId === selectedChat?.id)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const sendMessage = () => {
    if (!messageText.trim() || !selectedChat) return;

    const newMessage: Message = {
      id: uuidv4(),
      senderId: 'doctor',
      senderName: 'Dr. ' + (user?.name || 'Doctor'),
      senderType: 'doctor',
      content: messageText,
      timestamp: new Date(),
      chatId: selectedChat.id,
      read: true
    };

    setMessages(prev => [...prev, newMessage]);
    setMessageText('');

    toast({
      title: "Message sent",
      description: `Message sent to ${selectedChat.name}`,
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatLastSeen = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-2rem)] p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Communication Portal</h1>
          <p className="text-muted-foreground">Chat and messaging system for doctor-patient communication</p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* Chat List */}
        <Card className="flex flex-col">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Messages
                </CardTitle>
                <CardDescription>All conversations</CardDescription>
              </div>
              <Button size="sm">
                <Users className="w-4 h-4 mr-1" />
                New Group
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-auto">
            <div className="space-y-1">
              {filteredChats.map(chat => (
                <div
                  key={chat.id}
                  className={`p-4 cursor-pointer border-b hover:bg-muted/50 transition-colors ${
                    selectedChat?.id === chat.id ? 'bg-muted' : ''
                  }`}
                  onClick={() => setSelectedChat(chat)}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                          {chat.type === 'group' ? <Users className="w-4 h-4" /> : chat.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      {chat.type === 'individual' && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success rounded-full border-2 border-background" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium truncate">{chat.name}</h3>
                        <div className="flex items-center gap-1">
                          {chat.lastMessage && (
                            <span className="text-xs text-muted-foreground">
                              {formatLastSeen(chat.lastMessage.timestamp)}
                            </span>
                          )}
                          {chat.unreadCount > 0 && (
                            <Badge className="bg-primary text-primary-foreground text-xs min-w-[1.25rem] h-5">
                              {chat.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {chat.lastMessage && (
                        <p className="text-sm text-muted-foreground truncate">
                          {chat.lastMessage.senderType === 'doctor' ? 'You: ' : ''}
                          {chat.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <div className="lg:col-span-2 flex flex-col">
          {selectedChat ? (
            <Card className="flex-1 flex flex-col">
              {/* Chat Header */}
              <CardHeader className="pb-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                        {selectedChat.type === 'group' ? <Users className="w-4 h-4" /> : selectedChat.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{selectedChat.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedChat.type === 'group' 
                          ? `${selectedChat.participants.length} participants`
                          : 'Online'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost">
                      <Phone className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Video className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <CardContent className="flex-1 p-0 overflow-auto">
                <div className="p-4 space-y-4 min-h-full">
                  {selectedChatMessages.map(message => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderType === 'doctor' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] p-3 rounded-lg ${
                          message.senderType === 'doctor'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <div className={`flex items-center gap-1 mt-1 ${
                          message.senderType === 'doctor' 
                            ? 'text-primary-foreground/70' 
                            : 'text-muted-foreground'
                        }`}>
                          <Clock className="w-3 h-3" />
                          <span className="text-xs">{formatTime(message.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>

              {/* Message Input */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost">
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <div className="flex-1 relative">
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
                      className="resize-none pr-10"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute right-2 top-1"
                    >
                      <Smile className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button onClick={sendMessage} disabled={!messageText.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="flex-1 flex items-center justify-center">
              <CardContent className="text-center">
                <MessageCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Select a conversation</h3>
                <p className="text-muted-foreground">
                  Choose a patient from the list to start messaging
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommunicationPortal;