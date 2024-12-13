"use client";
import { useState } from 'react';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { database } from '../utils/firebaseConfig';
import { ref, set } from 'firebase/database';
import AuthLayout from '@/components/AuthLayout';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const auth = getAuth();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;

      const nodeRef = ref(database, `nodes/${userId}`);
      await set(nodeRef, {
        status: 'active',
        lastSeen: new Date().toISOString(),
        isAvailable: true,
        dateJoined: new Date().toISOString(),
        performance: {
          cpu: navigator.hardwareConcurrency,
          memory: navigator?.deviceMemory || 'unknown'
        },
        tasksCompleted: 0,
        tasksFailed: 0
      });

      router.push('/');
    } catch (error) {
      setError('Error creating account. Please try again.');
    }
  };

  return (
    <AuthLayout>
      <h2 className="text-2xl font-bold text-[#ECEFF4] mb-6 text-center">
        Join DASH Network
      </h2>
      
      {error && (
        <div className="mb-4 p-3 bg-[#BF616A] text-[#ECEFF4] rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label className="block text-[#D8DEE9] mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 bg-[#4C566A] text-[#ECEFF4] rounded-lg focus:ring-2 focus:ring-[#88C0D0] focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-[#D8DEE9] mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 bg-[#4C566A] text-[#ECEFF4] rounded-lg focus:ring-2 focus:ring-[#88C0D0] focus:outline-none"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-[#88C0D0] text-[#2E3440] rounded-lg hover:bg-[#81A1C1] transition-colors"
        >
          Create Account
        </button>
      </form>
    </AuthLayout>
  );
}
