'use client';

import AuthForm from './AuthForm';
import FeaturesList from './FeaturesList';

export default function MarketingPanel() {
  return (
    <div className="lg:w-2/5 flex flex-col justify-center px-6 lg:px-16 py-12 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <div className="mb-8">
        {/* Logo/Brand */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">K</span>
          </div>
          <span className="text-xl font-bold text-gray-900 dark:text-white">Kanban</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl lg:text-5xl font-bold mb-4 text-gray-900 dark:text-white leading-tight">
          Visual Task Management,
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400">
            {' '}
            Simplified
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
          Organize projects with drag-and-drop boards. Try it now - no signup required.
        </p>
      </div>

      {/* Auth Form */}
      <AuthForm />

      {/* Features List */}
      <FeaturesList />
    </div>
  );
}
