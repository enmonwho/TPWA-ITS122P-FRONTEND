import React, { useState } from 'react';
import { Mail, MessageSquare, Phone, Send, CheckCircle2, X } from 'lucide-react';
import { api } from '../services/api';

interface ContactSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContactSupportModal({ isOpen, onClose }: ContactSupportModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('General Inquiry');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setErrorMsg('Please fill out all required fields.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      const response = await api.post('/support/contact', {
        name,
        email,
        category,
        subject,
        message,
      });
      setSuccessMsg(response.data.message || 'Support ticket submitted successfully!');
      setTimeout(() => {
        setSuccessMsg('');
        setName('');
        setEmail('');
        setSubject('');
        setMessage('');
        onClose();
      }, 2500);
    } catch (err: unknown) {
      const errorMessage =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        (err as { response?: { data?: { message?: string } } }).response?.data?.message
          ? (err as { response: { data: { message: string } } }).response.data.message
          : 'Unable to send message right now. Please try again.';
      setErrorMsg(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-2xl bg-orange-50 text-[#f05a28] border border-orange-100">
            <MessageSquare size={22} />
          </div>
          <div>
            <h3 className="text-xl font-black text-[#2F1B0C]">LakBye Help & Support</h3>
            <p className="text-xs text-slate-500">
              We're here to help you have the smoothest trip possible
            </p>
          </div>
        </div>

        {/* Quick contact badges */}
        <div className="grid grid-cols-2 gap-2 my-4">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-2.5 text-xs text-slate-600">
            <Mail size={16} className="text-[#f05a28] shrink-0" />
            <div className="truncate">
              <span className="font-bold text-[#2F1B0C] block">Direct Email</span>
              support@lakbye.com
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-2.5 text-xs text-slate-600">
            <Phone size={16} className="text-emerald-500 shrink-0" />
            <div className="truncate">
              <span className="font-bold text-[#2F1B0C] block">Hotline Support</span>
              +63 (02) 8888-LAKBYE
            </div>
          </div>
        </div>

        {successMsg ? (
          <div className="my-6 p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center animate-in zoom-in-95">
            <CheckCircle2 size={40} className="text-emerald-600 mx-auto mb-2" />
            <h4 className="font-extrabold text-emerald-900 text-base">Message Sent!</h4>
            <p className="text-xs text-emerald-700 mt-1">{successMsg}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 mt-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Your Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Maria Santos"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#f05a28] focus:ring-1 focus:ring-[#f05a28]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#f05a28] focus:ring-1 focus:ring-[#f05a28]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-[#f05a28] focus:ring-1 focus:ring-[#f05a28]"
                >
                  <option value="General Inquiry">General Inquiry</option>
                  <option value="Itinerary & Route Help">Itinerary & Route Help</option>
                  <option value="Activity Booking Assistance">
                    Activity Booking Assistance
                  </option>
                  <option value="Account & Security">Account & Security</option>
                  <option value="Technical Issue">Technical Issue</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of inquiry"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#f05a28] focus:ring-1 focus:ring-[#f05a28]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Your Message *
              </label>
              <textarea
                required
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="How can our travel support team assist you today?"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#f05a28] focus:ring-1 focus:ring-[#f05a28] resize-none"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#f05a28] to-[#e04816] text-white text-xs font-bold shadow-md hover:shadow-lg hover:brightness-105 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {submitting ? (
                  'Submitting...'
                ) : (
                  <>
                    <Send size={14} /> Send Message
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ContactSupportModal;
