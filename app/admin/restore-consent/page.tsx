'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/firebase/AuthContext';
import { restoreMissingConsent } from '@/lib/firebase/legal';

export default function RestoreConsentPage() {
  const { user, markToSAccepted } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleRestore = async () => {
    if (!user) {
      setError('You must be logged in');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      console.log('Restoring consent for user:', user.uid);
      await restoreMissingConsent(user.uid);

      // Update the local auth state to hide the ToS modal immediately
      // This prevents the modal from showing again while on this page
      markToSAccepted();

      setMessage('✅ Successfully restored your ToS/Privacy consent records!');
      setMessage(prev => prev + '\n\nThe ToS/Privacy modal has been closed.');
      setMessage(prev => prev + '\n\nYou should no longer see it when you log out and back in.');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to restore consent: ${errorMsg}`);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Restore ToS/Privacy Consent</h1>
        <p className="text-red-600">Please log in first</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">Restore ToS/Privacy Consent</h1>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-yellow-800">
          Your user account is missing ToS/Privacy acceptance records. This tool will restore them.
        </p>
      </div>

      <button
        onClick={handleRestore}
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
      >
        {loading ? 'Restoring...' : 'Restore Consent Records'}
      </button>

      {message && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 whitespace-pre-wrap">{message}</p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}
    </div>
  );
}
