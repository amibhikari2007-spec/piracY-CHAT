import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Lock, MessageCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

type Mode = 'login' | 'register';

const AuthPage: React.FC = () => {
  const [mode, setMode]         = useState<Mode>('login');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [form, setForm]         = useState({ username: '', email: '', password: '' });
  const { login, register, isLoading } = useAuthStore();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form.username, form.email, form.password);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#111b21]">
      {/* Green top bar */}
      <div className="h-[220px] bg-[#00a884] dark:bg-[#00a884] flex-shrink-0" />

      {/* Card */}
      <div className="flex-1 flex items-start justify-center px-4 -mt-[130px]">
        <div className="w-full max-w-md bg-white dark:bg-[#1f2c33] rounded-2xl shadow-xl p-8 animate-fade-in">

          {/* Logo */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 rounded-full bg-[#00a884] flex items-center justify-center mb-3 shadow-lg">
              <MessageCircle size={30} className="text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-[#111b21] dark:text-[#e9edef]">WhatsApp</h1>
            <p className="text-[13px] text-[#8696a0] mt-1">End-to-end encrypted messaging</p>
          </div>

          {/* Tabs */}
          <div className="flex bg-[#f0f2f5] dark:bg-[#111b21] rounded-xl p-1 mb-6">
            {(['login', 'register'] as Mode[]).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 py-2 text-[13px] font-medium rounded-lg transition-all ${
                  mode === m
                    ? 'bg-white dark:bg-[#2a3942] shadow text-[#111b21] dark:text-[#e9edef]'
                    : 'text-[#8696a0]'
                }`}>
                {m === 'login' ? 'Log In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-[12px] font-medium text-[#8696a0] mb-1.5 uppercase tracking-wide">Username</label>
                <input name="username" type="text" value={form.username} onChange={handleChange}
                  placeholder="john_doe" required minLength={3}
                  className="w-full px-4 py-3 rounded-xl border border-[#e9edef] dark:border-[#313d45] bg-[#f0f2f5] dark:bg-[#111b21] text-[#111b21] dark:text-[#e9edef] placeholder-[#8696a0] focus:outline-none focus:ring-2 focus:ring-[#00a884] text-[14px] transition" />
              </div>
            )}

            <div>
              <label className="block text-[12px] font-medium text-[#8696a0] mb-1.5 uppercase tracking-wide">Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange}
                placeholder="you@example.com" required
                className="w-full px-4 py-3 rounded-xl border border-[#e9edef] dark:border-[#313d45] bg-[#f0f2f5] dark:bg-[#111b21] text-[#111b21] dark:text-[#e9edef] placeholder-[#8696a0] focus:outline-none focus:ring-2 focus:ring-[#00a884] text-[14px] transition" />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#8696a0] mb-1.5 uppercase tracking-wide">Password</label>
              <div className="relative">
                <input name="password" type={showPass ? 'text' : 'password'} value={form.password} onChange={handleChange}
                  placeholder={mode === 'register' ? 'Min. 6 characters' : '••••••••'} required
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-[#e9edef] dark:border-[#313d45] bg-[#f0f2f5] dark:bg-[#111b21] text-[#111b21] dark:text-[#e9edef] placeholder-[#8696a0] focus:outline-none focus:ring-2 focus:ring-[#00a884] text-[14px] transition" />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8696a0] hover:text-[#54656f]">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl px-4 py-3 text-[13px] text-red-600 dark:text-red-400 animate-fade-in">
                {error}
              </div>
            )}

            <button type="submit" disabled={isLoading}
              className="w-full py-3 rounded-xl bg-[#00a884] hover:bg-[#008069] text-white font-semibold text-[14px] transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 mt-2 shadow-sm">
              {isLoading ? (
                <><Loader2 size={17} className="animate-spin" /> {mode === 'login' ? 'Signing in…' : 'Creating account…'}</>
              ) : (
                <><Lock size={15} /> {mode === 'login' ? 'Sign In' : 'Create Account'}</>
              )}
            </button>
          </form>

          <p className="text-center text-[11.5px] text-[#8696a0] mt-5 leading-relaxed">
            🔐 Your messages are end-to-end encrypted.<br />
            Nobody outside this chat can read them.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
