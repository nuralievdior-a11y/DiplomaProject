import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Loader2, MessageSquareText, Paperclip, X, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';

const INITIAL_MESSAGE =
  "Ask your question and we’ll respond as soon as possible.\n\nIf you already have an order, please include your order number or phone number.";

const cn = (...xs) => xs.filter(Boolean).join(' ');

const formatTime = (d) => {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(d);
  } catch {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
};

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState(() => ([
    { id: 'm0', role: 'assistant', content: INITIAL_MESSAGE, createdAt: new Date() }
  ]));
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);

  const scrollToBottom = () => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(scrollToBottom, 0);
    const f = setTimeout(() => inputRef.current?.focus?.(), 0);
    return () => {
      clearTimeout(t);
      clearTimeout(f);
    };
  }, [open, messages.length]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const nextMessages = [
      ...messages,
      { id: `m_${Date.now()}_u`, role: 'user', content: text, createdAt: new Date() }
    ];
    setMessages(nextMessages);
    setInput('');
    setSending(true);

    try {
      const res = await api.post('/ai/chat', { messages: nextMessages.map((m) => ({ role: m.role, content: m.content })) });
      const reply = String(res?.data?.message || '').trim();
      if (!reply) throw new Error('Empty AI response');
      setMessages((m) => [...m, { id: `m_${Date.now()}_a`, role: 'assistant', content: reply, createdAt: new Date() }]);
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        'AI error';
      toast.error(msg);
      setMessages((m) => [...m, { id: `m_${Date.now()}_e`, role: 'assistant', content: `Error: ${msg}`, createdAt: new Date() }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
      {open && (
        <div className="w-[420px] max-w-[calc(100vw-48px)] h-[560px] max-h-[calc(100vh-140px)] rounded-2xl shadow-2xl border border-neutral-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 bg-white">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/20 shrink-0">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-base font-bold font-display tracking-tight text-neutral-900 truncate">
                  Tech<span className="text-brand-600">Market</span>
                </div>
                <div className="text-xs text-neutral-500 truncate">Support service</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-700"
              aria-label="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div ref={listRef} className="h-[418px] overflow-y-auto px-4 py-4 space-y-3 bg-white">
            {messages.map((m, idx) => {
              const isUser = m.role === 'user';
              return (
                <div key={m.id || idx} className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap',
                      isUser
                        ? 'bg-brand-700 text-white rounded-br-md'
                        : 'bg-brand-50 text-neutral-900 rounded-bl-md border border-brand-100'
                    )}
                  >
                    <div>{m.content}</div>
                    <div className={cn('mt-1 text-[10px]', isUser ? 'text-white/70' : 'text-neutral-400')}>{formatTime(m.createdAt || new Date())}</div>
                  </div>
                </div>
              );
            })}

            {sending && (
              <div className="flex justify-start">
                <div className="bg-brand-50 text-neutral-700 rounded-2xl rounded-bl-md px-3 py-2 text-sm inline-flex items-center gap-2 border border-brand-100 shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Typing…
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-neutral-200 bg-white p-3">
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={() => {
                  toast('File upload is not enabled yet.');
                  if (fileRef.current) fileRef.current.value = '';
                }}
              />

              <button
                type="button"
                onClick={() => fileRef.current?.click?.()}
                className="w-10 h-10 rounded-xl border border-brand-200 bg-white hover:bg-brand-50 text-brand-800 inline-flex items-center justify-center"
                aria-label="Attach file"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              <div className="flex-1 flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-brand-200 focus-within:border-brand-500">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Your message..."
                  className="flex-1 text-sm outline-none bg-transparent"
                  disabled={sending}
                />
                <button
                  type="button"
                  onClick={send}
                  disabled={sending || !input.trim()}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-brand-200 bg-white hover:bg-brand-50 disabled:opacity-50"
                  aria-label="Send message"
                >
                  <ArrowRight className="w-5 h-5 text-brand-800" />
                </button>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-neutral-500">
              Don’t share passwords or card details. AI answers may be inaccurate.
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-14 h-14 rounded-full shadow-2xl border border-brand-200 flex items-center justify-center',
          open ? 'bg-brand-800 text-white border-brand-200' : 'bg-brand-700 text-white hover:bg-brand-800 border-brand-200'
        )}
        aria-label="Toggle chat"
      >
        <MessageSquareText className="w-6 h-6" />
      </button>
    </div>
  );
}
