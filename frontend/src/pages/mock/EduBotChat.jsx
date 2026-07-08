import { useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import PreviewBanner from '../../components/PreviewBanner';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';

const SCRIPTED_REPLY =
  "I'm a preview of EduBot — once connected, I'll generate practice questions, explain concepts, and give contextual hints based on your actual quiz history. For now, this is just a static demo.";

export default function EduBotChat() {
  const [messages, setMessages] = useState([
    { from: 'bot', text: "Hi! I'm EduBot. Ask me to explain a topic or generate a practice question. (Preview mode — I don't have a real backend yet.)" },
  ]);
  const [input, setInput] = useState('');

  const send = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setMessages((m) => [...m, { from: 'user', text: input }, { from: 'bot', text: SCRIPTED_REPLY }]);
    setInput('');
  };

  return (
    <div>
      <PreviewBanner feature="EduBot" />
      <h1 className="text-2xl font-bold text-heading mb-6">EduBot Assistant</h1>
      <Card className="flex flex-col h-[60vh] p-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[75%] rounded-lg px-4 py-2.5 text-sm ${
                m.from === 'bot'
                  ? 'bg-input text-body self-start flex items-start gap-2'
                  : 'bg-gold text-navy self-end'
              }`}
            >
              {m.from === 'bot' && <Sparkles size={14} className="mt-0.5 shrink-0 text-gold" />}
              {m.text}
            </div>
          ))}
        </div>
        <form onSubmit={send} className="flex items-center gap-2 border-t border-border p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask EduBot anything..."
            className="flex-1 rounded-lg border border-border bg-input px-3.5 py-2.5 text-sm text-heading focus:outline-none focus:border-gold"
          />
          <Button type="submit" size="sm"><Send size={15} /></Button>
        </form>
      </Card>
    </div>
  );
}
