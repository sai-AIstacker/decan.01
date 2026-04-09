"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Hash, User as UserIcon, MoreVertical, MessageSquare } from "lucide-react";
import type { ConversationRow, MessageRow, Profile } from "@/types/database";

export default function ChatInterface({
  userId,
  initialConversations,
  profilesMap
}: {
  userId: string;
  initialConversations: any[]; // Augmented conversations
  profilesMap: Record<string, any>;
}) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeConvId, setActiveConvId] = useState<string | null>(initialConversations[0]?.id || null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  const activeConv = conversations.find(c => c.id === activeConvId);

  useEffect(() => {
    if (!activeConvId) return;

    const loadMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", activeConvId)
        .order("created_at", { ascending: true });
      if (data) setMessages(data);
      scrollToBottom();
    };
    loadMessages();

    const channel = supabase.channel(`chat_${activeConvId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConvId}` },
        (payload) => {
          setMessages(prev => [...prev, payload.new as MessageRow]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConvId]);

  function scrollToBottom() {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConvId) return;

    const tmpText = inputText;
    setInputText("");

    const { error } = await supabase.from("messages").insert({
      conversation_id: activeConvId,
      sender_id: userId,
      content: tmpText.trim()
    });

    if (error) {
      console.error("Failed to send message", error);
      setInputText(tmpText); // restore
    }
  };

  // Helper to format timestamps
  const formatTime = (ts: string) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex h-[calc(100vh-140px)] apple-card overflow-hidden">
      
      {/* Sidebar - Conversations */}
      <div className="w-80 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 flex flex-col bg-zinc-50/50 dark:bg-zinc-900/20">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="font-semibold text-lg">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-zinc-500 text-sm">No conversations found.</div>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {conversations.map(conv => (
                <li key={conv.id}>
                  <button 
                    onClick={() => setActiveConvId(conv.id)}
                    className={`w-full flex items-start gap-3 p-4 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 ${activeConvId === conv.id ? 'bg-zinc-100 dark:bg-zinc-800/50 dark:bg-zinc-900 dark:bg-zinc-100/10' : ''}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center shrink-0 from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 text-zinc-600 dark:text-zinc-300">
                      {conv.type === 'class' ? <Hash className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <h3 className={`text-sm truncate font-medium ${activeConvId === conv.id ? 'text-indigo-700 dark:text-zinc-300' : ''}`}>
                         {conv.display_name}
                      </h3>
                      <p className="text-xs text-zinc-500 truncate mt-0.5">{conv.type === 'class' ? 'Class Group' : 'Direct Message'}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      {activeConv ? (
        <div className="flex-1 flex flex-col min-w-0 bg-zinc-50/30 dark:bg-zinc-950/50">
          <div className="h-16 flex items-center px-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center shrink-0 from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 text-zinc-900 dark:text-zinc-100 dark:text-zinc-300">
                  {activeConv.type === 'class' ? <Hash className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
               </div>
               <div>
                  <h3 className="font-semibold text-lg">{activeConv.display_name}</h3>
                  <p className="text-xs text-zinc-500">{activeConv.type === 'class' ? 'Class Announcement & Chat Group' : 'Direct Conversation'}</p>
               </div>
             </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {messages.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-zinc-400">
                  <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                    <MessageSquare className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
                  </div>
                  <p>No messages yet.</p>
                  <p className="text-sm">Start the conversation below!</p>
               </div>
            ) : (
              messages.map((m, i) => {
                const isMe = m.sender_id === userId;
                const senderProfile = profilesMap[m.sender_id] || { full_name: "Unknown" };
                const showHeader = i === 0 || messages[i-1].sender_id !== m.sender_id;

                return (
                  <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    {showHeader && (
                      <span className="text-xs text-zinc-500 mb-1 px-1">
                        {isMe ? "You" : senderProfile.full_name}
                      </span>
                    )}
                    <div className={`relative max-w-[75%] px-4 py-2.5 rounded-2xl ${
                      isMe 
                        ? 'bg-[#1d1d1f] text-white rounded-tr-sm' 
                        : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-tl-sm text-zinc-900 dark:text-zinc-100'
                    }`}>
                       <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{m.content}</p>
                       <span className={`text-[10px] mt-1 block text-right ${isMe ? 'text-indigo-200' : 'text-zinc-400'}`}>
                         {formatTime(m.created_at)}
                       </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
             <form onSubmit={handleSend} className="flex items-center gap-3">
               <Input 
                 placeholder="Type a message..." 
                 value={inputText}
                 onChange={(e) => setInputText(e.target.value)}
                 className="flex-1 rounded-full bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 px-5"
               />
               <Button type="submit" disabled={!inputText.trim()} size="icon" className="rounded-full bg-[#1d1d1f] hover:bg-[#3a3a3c] shrink-0 shadow-md shadow-indigo-600/20">
                 <Send className="w-4 h-4 text-white" />
               </Button>
             </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 bg-zinc-50/50 dark:bg-zinc-950/50">
          <MessageSquare className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-4" />
          <p className="font-medium text-zinc-500">Select a conversation</p>
          <p className="text-sm">Choose a chat from the sidebar to start messaging.</p>
        </div>
      )}
    </div>
  );
}


