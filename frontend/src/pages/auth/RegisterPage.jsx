import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';

function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', phone: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const onChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      await api.register(form);
      setMessage('Registration successful. Please login.');
      setTimeout(() => navigate('/login'), 1200);
    } catch {
      setError('Registration failed. Check your values and try again.');
    }
  };

  return (
    <section className="max-w-md">
      <h1 className="font-display text-5xl leading-[0.95] text-zinc-900 max-md:text-4xl">Register</h1>
      <form onSubmit={onSubmit} className="mt-5 space-y-3 rounded-2xl border border-zinc-200 bg-white p-5">
        <input name="username" value={form.username} onChange={onChange} placeholder="Username" className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" />
        <input name="email" value={form.email} onChange={onChange} placeholder="Email" className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" />
        <input type="password" name="password" value={form.password} onChange={onChange} placeholder="Password" className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" />
        <input name="phone" value={form.phone} onChange={onChange} placeholder="Phone" className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" />
        <button type="submit" className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">Create Account</button>
      </form>
      {message ? <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
    </section>
  );
}

export default RegisterPage;
