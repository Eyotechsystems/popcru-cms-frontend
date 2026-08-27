import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/popcru-logo.jpg';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.body?.error || 'Unable to sign in. Check your username and password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <img src={logo} alt="POPCRU" className="w-20 h-20 object-contain mb-3" />
          <h1 className="font-display text-white font-bold text-lg tracking-wide">Case Management System</h1>
          <p className="text-slate-light/50 text-xs mt-1 flex items-center gap-1">
            <Flame size={11} className="text-gold" /> Justice for All
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 border-t-4 border-ember">
          <div className="mb-4">
            <label htmlFor="username" className="text-xs font-medium text-slate">Username</label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full mt-1 px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember"
            />
          </div>
          <div className="mb-5">
            <label htmlFor="password" className="text-xs font-medium text-slate">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full mt-1 px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember"
            />
          </div>

          {error && (
            <p role="alert" className="text-xs text-ember mb-4 bg-ember/5 border border-ember/20 rounded px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded text-sm font-semibold text-white bg-ember disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
