"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    // Prepare data for submission
    const formData = {
      username,
      password,
    };

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }
      setError('');
      router.push('/dashboard')
     
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
   
    <form onSubmit={handleSubmit}>
         {error && <p style={{ color: 'red' }}>{error}</p>}
    <div data-mdb-input-init className="form-outline mb-4 col-xs-3">
    <label className="form-label" htmlFor="username">User name / code</label>
      <input type="txt" id="username" className="form-control" 
      onChange={(e) => setUsername(e.target.value)}
      />
    </div>

    <div data-mdb-input-init className="form-outline mb-4">
    <label className="form-label" htmlFor="password">Password</label>
      <input type="password" id="password" className="form-control" 
      onChange={(e) => setPassword(e.target.value)}
      />
    </div>
   
    <button data-mdb-ripple-init type="submit" className="btn btn-primary btn-block">Sign in</button>
  </form>
  );
};

export default LoginForm;
