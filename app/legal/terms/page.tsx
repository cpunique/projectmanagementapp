import type { Metadata } from 'next';
import { LEGAL_VERSIONS, LEGAL_LAST_UPDATED } from '@/types/legal';

export const metadata: Metadata = {
  title: 'Terms of Service - Kanban Board',
  description: 'Terms of Service for our project management application',
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Terms of Service
          </h1>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div>
              <span className="font-semibold">Version:</span> {LEGAL_VERSIONS.TERMS_OF_SERVICE}
            </div>
            <div>
              <span className="font-semibold">Last Updated:</span> {LEGAL_LAST_UPDATED.TERMS_OF_SERVICE}
            </div>
            <div>
              <span className="font-semibold">Effective Date:</span> {LEGAL_LAST_UPDATED.TERMS_OF_SERVICE}
            </div>
          </div>
        </div>

        {/* Attorney Review Notice */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg p-6 mb-8">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="text-lg font-bold text-yellow-900 dark:text-yellow-200 mb-2">
                ⚠️ DRAFT DOCUMENT - ATTORNEY REVIEW REQUIRED
              </h3>
              <p className="text-yellow-800 dark:text-yellow-300 text-sm">
                This is a comprehensive outline that must be reviewed and completed by a licensed attorney
                before being used as official Terms of Service. See the detailed outline at{' '}
                <code className="bg-yellow-100 dark:bg-yellow-800 px-2 py-1 rounded">
                  app/legal/terms/TERMS_OUTLINE.md
                </code>
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 prose prose-lg dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              1. Acceptance of Terms
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              By creating an account or using our kanban board service (the "Service"), you agree to be
              bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not
              use the Service.
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 my-4">
              <p className="text-sm text-blue-900 dark:text-blue-200">
                <strong>Note to Attorney:</strong> This section requires completion with proper legal
                language defining the binding nature of the agreement, definitions of key terms, and
                acceptance mechanisms. See the comprehensive outline for detailed guidance.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              2. Description of Service
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              We provide a project management application featuring:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 my-4">
              <li>Kanban board interface for task management</li>
              <li>AI-powered task description generation using OpenAI's GPT models</li>
              <li>Board sharing and collaboration features</li>
              <li>Cloud synchronization via Firebase</li>
              <li>Customizable boards, columns, and tasks</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              3. Artificial Intelligence Features
            </h2>
            <div className="bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500 p-4 mb-4">
              <h3 className="font-bold text-purple-900 dark:text-purple-200 mb-2">
                Important Information About AI
              </h3>
              <p className="text-sm text-purple-800 dark:text-purple-300">
                Our Service uses AI technology from OpenAI. By using AI features:
              </p>
              <ul className="list-disc list-inside text-sm text-purple-800 dark:text-purple-300 space-y-1 mt-2">
                <li>Your board and task data may be sent to OpenAI for processing</li>
                <li>AI-generated content may be inaccurate or inappropriate</li>
                <li>You must review and verify all AI outputs</li>
                <li>You are responsible for AI-generated content you use</li>
              </ul>
            </div>
            <p className="text-gray-700 dark:text-gray-300">
              See our{' '}
              <a href="/legal/ai-usage" className="text-blue-600 dark:text-blue-400 hover:underline">
                AI Usage Policy
              </a>{' '}
              for complete details on AI data processing and your rights.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              4. User Content and Ownership
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              <strong>You own your content.</strong> You retain all rights to the boards, tasks, and
              descriptions you create. However, you grant us a limited license to operate the Service
              on your behalf.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              <strong>You are responsible for your content.</strong> You represent that you have all
              necessary rights to the content you create and share through the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              5. Privacy and Data Protection
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              Your privacy is important to us. Our collection and use of personal information is
              governed by our{' '}
              <a href="/legal/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">
                Privacy Policy
              </a>, which is incorporated into these Terms by reference.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              6. Disclaimers and Limitations
            </h2>
            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-400 dark:border-red-600 rounded p-4 mb-4">
              <p className="text-sm font-semibold text-red-900 dark:text-red-200 mb-2">
                IMPORTANT LEGAL NOTICE
              </p>
              <p className="text-sm text-red-800 dark:text-red-300">
                THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DISCLAIM ALL
                WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR
                PURPOSE, AND NON-INFRINGEMENT.
              </p>
            </div>
            <p className="text-gray-700 dark:text-gray-300">
              We are not liable for any indirect, incidental, or consequential damages arising from
              your use of the Service, including but not limited to data loss, business interruption,
              or reliance on AI-generated content.
            </p>
          </section>

          {/* Attorney Completion Notice */}
          <section className="mb-8 mt-12 pt-8 border-t-2 border-gray-300 dark:border-gray-600">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                📋 Complete Outline Available
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                This is a simplified version. A comprehensive outline covering all required sections
                is available at:
              </p>
              <code className="block bg-gray-200 dark:bg-gray-800 px-4 py-2 rounded text-sm">
                app/legal/terms/TERMS_OUTLINE.md
              </code>
              <p className="text-gray-700 dark:text-gray-300 mt-4">
                The complete outline includes {' '}
                <strong>23 detailed sections</strong> covering:
              </p>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1 mt-2 text-sm">
                <li>Intellectual property rights</li>
                <li>Account termination procedures</li>
                <li>Dispute resolution and arbitration</li>
                <li>Indemnification clauses</li>
                <li>Governing law and jurisdiction</li>
                <li>GDPR and CCPA compliance considerations</li>
                <li>AI-specific terms and limitations</li>
                <li>And 16 additional critical sections</li>
              </ul>
            </div>
          </section>

          {/* Contact Information */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Contact Us
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-2">
              If you have questions about these Terms:
            </p>
            <div className="text-gray-700 dark:text-gray-300">
              <p>Email: <a href="mailto:legal@yourdomain.com" className="text-blue-600 dark:text-blue-400 hover:underline">legal@yourdomain.com</a></p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                [Your Company Address - To Be Completed by Attorney]
              </p>
            </div>
          </section>
        </div>

        {/* Related Documents */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Related Legal Documents
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/legal/privacy"
              className="block p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
            >
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Privacy Policy</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">How we handle your data</p>
            </a>
            <a
              href="/legal/cookies"
              className="block p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
            >
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Cookie Policy</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">How we use cookies</p>
            </a>
            <a
              href="/legal/ai-usage"
              className="block p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
            >
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">AI Usage Policy</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">AI features and limitations</p>
            </a>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-8 text-center">
          <a
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
