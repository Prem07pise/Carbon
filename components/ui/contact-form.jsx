import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function ContactForm({ className = '' }) {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState({ loading: false, error: null, success: null });

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, error: null, success: null });
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to submit');
      setStatus({ loading: false, error: null, success: 'Thanks — we received your message.' });
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      setStatus({ loading: false, error: err.message || 'Submission failed', success: null });
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input name="name" placeholder="Your name" value={form.name} onChange={handleChange} required />
        <Input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required />
      </div>
      <div className="mt-3">
        <Input name="subject" placeholder="Subject" value={form.subject} onChange={handleChange} />
      </div>
      <div className="mt-3">
        <Textarea name="message" rows={5} placeholder="How can we help?" value={form.message} onChange={handleChange} required />
      </div>

      <div className="mt-4">
        <Button type="submit" className="w-full" disabled={status.loading}>
          {status.loading ? 'Sending...' : 'Send Message'}
        </Button>
      </div>

      {status.error && <div className="mt-3 text-sm text-red-600">{status.error}</div>}
      {status.success && <div className="mt-3 text-sm text-green-600">{status.success}</div>}
    </form>
  );
}
