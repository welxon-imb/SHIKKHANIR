import React, { useEffect, useMemo, useState } from 'react';
import {
  Flag,
  Image as ImageIcon,
  MessageSquarePlus,
  Paperclip,
  Reply,
  Search,
  Send,
  Users,
  CheckCheck,
  X,
} from 'lucide-react';
import { apiFetch } from '../services/api';
import type { AuthUser, ChatMessage, Conversation } from '../types';

interface MessagingCenterProps {
  currentUser: AuthUser;
}

export const MessagingCenter: React.FC<MessagingCenterProps> = ({ currentUser }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [contacts, setContacts] = useState<AuthUser[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [text, setText] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentType, setAttachmentType] = useState<'image' | 'pdf'>('pdf');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMessaging = async () => {
    try {
      const data = await apiFetch<{
        conversations: Conversation[];
        messages: ChatMessage[];
        contacts: AuthUser[];
      }>('/api/messaging/conversations');
      setConversations(data.conversations);
      setMessages(data.messages);
      setContacts(data.contacts);
      if (!selectedConvId && data.conversations.length > 0) {
        setSelectedConvId(data.conversations[0].id);
      }
    } catch {
      // handled gracefully
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMessaging();
    const timer = window.setInterval(() => {
      void loadMessaging();
    }, 6000);
    return () => window.clearInterval(timer);
  }, []);

  const selectedConv = useMemo(
    () => conversations.find((c) => c.id === selectedConvId) ?? null,
    [conversations, selectedConvId]
  );

  const activeMessages = useMemo(() => {
    const list = messages.filter((m) => m.conversationId === selectedConvId);
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (m) => m.text.toLowerCase().includes(q) || m.senderName.toLowerCase().includes(q)
    );
  }, [messages, selectedConvId, searchQuery]);

  const unreadByConv = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of messages) {
      if (!m.readBy.includes(currentUser.id) && m.senderId !== currentUser.id) {
        map[m.conversationId] = (map[m.conversationId] ?? 0) + 1;
      }
    }
    return map;
  }, [messages, currentUser.id]);

  const handleSelectConv = async (convId: string) => {
    setSelectedConvId(convId);
    const unreadMsgs = messages.filter(
      (m) => m.conversationId === convId && !m.readBy.includes(currentUser.id)
    );
    for (const msg of unreadMsgs) {
      await apiFetch(`/api/messaging/messages/${msg.id}/read`, { method: 'POST' }).catch(() => {});
    }
    if (unreadMsgs.length > 0) {
      setMessages((prev) =>
        prev.map((m) =>
          m.conversationId === convId && !m.readBy.includes(currentUser.id)
            ? { ...m, readBy: [...m.readBy, currentUser.id] }
            : m
        )
      );
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConvId || (!text.trim() && !attachmentName.trim())) return;
    try {
      const res = await apiFetch<{ message: ChatMessage }>('/api/messaging/messages', {
        method: 'POST',
        body: JSON.stringify({
          conversationId: selectedConvId,
          text: text.trim(),
          attachmentName: attachmentName.trim() || undefined,
          attachmentType: attachmentName.trim() ? attachmentType : undefined,
          replyToId: replyTo?.id,
        }),
      });
      setMessages((prev) => [...prev, res.message]);
      setText('');
      setAttachmentName('');
      setReplyTo(null);
    } catch (err) {
      setFeedback((err as Error).message);
    }
  };

  const handleStartPrivateChat = async (targetUserId: string) => {
    try {
      const res = await apiFetch<{ conversation: Conversation }>('/api/messaging/private', {
        method: 'POST',
        body: JSON.stringify({ targetUserId }),
      });
      setConversations((prev) =>
        prev.some((c) => c.id === res.conversation.id) ? prev : [...prev, res.conversation]
      );
      setSelectedConvId(res.conversation.id);
      setShowNewChatModal(false);
    } catch (err) {
      setFeedback((err as Error).message);
    }
  };

  const handleReport = async (msgId: string) => {
    await apiFetch(`/api/messaging/messages/${msgId}/report`, { method: 'POST' });
    setFeedback('বার্তাটি পর্যালোচনার জন্য অ্যাডমিনের কাছে রিপোর্ট করা হয়েছে।');
    window.setTimeout(() => setFeedback(null), 3500);
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
        বার্তা কেন্দ্র লোড হচ্ছে...
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[560px]">
      {/* Conversation List */}
      <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col bg-slate-50/50">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-2 bg-white">
          <h3 className="text-sm font-bold text-[#0F2942] flex items-center gap-2">
            <Users className="w-4 h-4 text-[#1D4ED8]" />
            গ্রুপ ও ব্যক্তিগত বার্তা
          </h3>
          <button
            type="button"
            onClick={() => setShowNewChatModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F2942] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#173a5e] transition-colors whitespace-nowrap"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            নতুন চ্যাট
          </button>
        </div>

        <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
          {conversations.map((conv) => {
            const unread = unreadByConv[conv.id] ?? 0;
            const active = conv.id === selectedConvId;
            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => void handleSelectConv(conv.id)}
                className={`w-full text-left px-4 py-3.5 transition-colors flex items-center justify-between gap-2 ${
                  active ? 'bg-blue-50/80 border-r-2 border-[#1D4ED8]' : 'hover:bg-slate-100/70'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{conv.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {conv.type === 'GROUP' ? 'শ্রেণি গ্রুপ' : 'ব্যক্তিগত বার্তা'}
                  </p>
                </div>
                {unread > 0 && (
                  <span className="shrink-0 px-2 py-0.5 text-xs font-bold bg-[#1D4ED8] text-white rounded-md tabular-nums">
                    {unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat Viewport */}
      <div className="lg:col-span-8 flex flex-col bg-white">
        {selectedConv ? (
          <>
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-bold text-[#0F2942]">{selectedConv.title}</h4>
                <p className="text-xs text-slate-500">
                  {selectedConv.type === 'GROUP'
                    ? `সদস্য সংখ্যা: ${selectedConv.participantIds.length} জন`
                    : 'সুরক্ষিত ব্যক্তিগত কথোপকথন'}
                </p>
              </div>
              <div className="relative w-full sm:w-56">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="বার্তা খুঁজুন..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-[#1D4ED8]"
                />
              </div>
            </div>

            {feedback && (
              <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                {feedback}
              </div>
            )}

            <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[380px] bg-slate-50/40">
              {activeMessages.length === 0 ? (
                <p className="text-center text-sm text-slate-500 py-10">
                  এই কথোপকথনে এখনও কোনো বার্তা নেই।
                </p>
              ) : (
                activeMessages.map((m) => {
                  const isMine = m.senderId === currentUser.id;
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[72%] rounded-xl px-4 py-2.5 border ${
                          isMine
                            ? 'bg-[#0F2942] text-white border-[#0F2942]'
                            : 'bg-white text-slate-800 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4 mb-1">
                          <span className={`text-xs font-semibold ${isMine ? 'text-blue-200' : 'text-[#1D4ED8]'}`}>
                            {m.senderName} ({m.senderRole === 'ADMIN' ? 'অ্যাডমিন' : m.senderRole === 'TEACHER' ? 'শিক্ষক' : 'শিক্ষার্থী'})
                          </span>
                          <span className={`text-[11px] tabular-nums ${isMine ? 'text-slate-300' : 'text-slate-400'}`}>
                            {new Date(m.sentAt).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {m.replyToPreview && (
                          <div className={`text-xs px-2.5 py-1 rounded mb-1.5 border ${isMine ? 'bg-white/10 border-white/20 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                            উত্তর: {m.replyToPreview}
                          </div>
                        )}
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
                        {m.attachmentName && (
                          <div className={`mt-2 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border ${isMine ? 'bg-white/10 border-white/20 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                            {m.attachmentType === 'image' ? <ImageIcon className="w-3.5 h-3.5" /> : <Paperclip className="w-3.5 h-3.5" />}
                            <span>{m.attachmentName}</span>
                          </div>
                        )}
                        <div className="mt-1.5 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setReplyTo(m)}
                            className={`text-[11px] inline-flex items-center gap-1 hover:underline ${isMine ? 'text-slate-300' : 'text-slate-500'}`}
                          >
                            <Reply className="w-3 h-3" /> উত্তর
                          </button>
                          {!isMine && (
                            <button
                              type="button"
                              onClick={() => void handleReport(m.id)}
                              className="text-[11px] inline-flex items-center gap-1 text-red-500 hover:underline"
                            >
                              <Flag className="w-3 h-3" /> রিপোর্ট
                            </button>
                          )}
                          {isMine && (
                            <span className="inline-flex items-center gap-0.5 text-[11px] text-blue-200">
                              <CheckCheck className="w-3.5 h-3.5" />
                              {m.readBy.length > 1 ? 'পঠিত' : 'প্রেরিত'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={(e) => void handleSend(e)} className="p-4 border-t border-slate-200 bg-white space-y-2.5">
              {replyTo && (
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-600">
                  <span>উত্তর দিচ্ছেন: <strong>{replyTo.senderName}</strong> — "{replyTo.text.slice(0, 50)}"</span>
                  <button type="button" onClick={() => setReplyTo(null)} aria-label="উত্তর বাতিল">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={attachmentName}
                  onChange={(e) => setAttachmentName(e.target.value)}
                  placeholder="ফাইল সংযুক্তির নাম (ঐচ্ছিক, যেমন: Solution.pdf)"
                  className="flex-1 min-w-[200px] px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-[#1D4ED8]"
                />
                <select
                  value={attachmentType}
                  onChange={(e) => setAttachmentType(e.target.value as 'image' | 'pdf')}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                >
                  <option value="pdf">PDF ফাইল</option>
                  <option value="image">ছবি (Image)</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="আপনার বার্তা লিখুন..."
                  className="flex-1 px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-[#1D4ED8]"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0F2942] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#173a5e] transition-colors whitespace-nowrap"
                >
                  <Send className="w-4 h-4" />
                  পাঠান
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-slate-500 p-8">
            বাম দিক থেকে একটি গ্রুপ বা ব্যক্তিগত চ্যাট নির্বাচন করুন।
          </div>
        )}
      </div>

      {showNewChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-bold text-[#0F2942]">নতুন ব্যক্তিগত চ্যাট শুরু করুন</h4>
              <button
                type="button"
                onClick={() => setShowNewChatModal(false)}
                aria-label="বন্ধ করুন"
                className="p-1 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {contacts.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => void handleStartPrivateChat(c.id)}
                  className="w-full text-left px-3.5 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                    <p className="text-xs text-slate-500">{c.userCode} · {c.phone}</p>
                  </div>
                  <span className="text-xs font-semibold text-[#1D4ED8]">
                    {c.role === 'ADMIN' ? 'অ্যাডমিন' : c.role === 'TEACHER' ? 'শিক্ষক' : 'শিক্ষার্থী'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
