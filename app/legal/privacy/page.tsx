import type { Metadata } from 'next';
import { LEGAL_VERSIONS, LEGAL_LAST_UPDATED } from '@/types/legal';

export const metadata: Metadata = {
  title: 'Privacy Policy - Kan-do',
  description: 'Privacy Policy for our project management application',
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Privacy Policy
          </h1>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div>
              <span className="font-semibold">Version:</span> {LEGAL_VERSIONS.PRIVACY_POLICY}
            </div>
            <div>
              <span className="font-semibold">Last Updated:</span> {LEGAL_LAST_UPDATED.PRIVACY_POLICY}
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
                ⚠️ DRAFT DOCUMENT - PRIVACY LAW ATTORNEY REVIEW REQUIRED
              </h3>
              <p className="text-yellow-800 dark:text-yellow-300 text-sm">
                This must be reviewed by an attorney specializing in GDPR, CCPA, and privacy law.
                See <code className="bg-yellow-100 dark:bg-yellow-800 px-2 py-1 rounded">app/legal/privacy/PRIVACY_OUTLINE.md</code>
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 prose prose-lg dark:prose-invert max-w-none">

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              1. Information We Collect
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We collect information you provide directly and information automatically when you use our Service:
            </p>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Information You Provide
            </h3>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-6">
              <li>Email address and password (encrypted)</li>
              <li>Google account information (if using Google sign-in)</li>
              <li>Board names, descriptions, and content you create</li>
              <li>Task titles, descriptions, and due dates</li>
              <li>Communications with our support team</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Information Collected Automatically
            </h3>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
              <li>Usage data (features used, pages visited, time spent)</li>
              <li>Device information (browser type, OS, IP address)</li>
              <li>Cookies and local storage data</li>
              <li>Error logs and performance data</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              2. How We Use Your Information
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              We use your information to:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
              <li>Provide and maintain the Service</li>
              <li>Authenticate your identity and maintain your session</li>
              <li>Sync your boards across devices</li>
              <li>Process AI feature requests (see AI Usage Policy)</li>
              <li>Improve and optimize the Service</li>
              <li>Provide customer support</li>
              <li>Detect and prevent fraud and abuse</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              3. AI and Third-Party Data Sharing
            </h2>
            <div className="bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500 p-4 mb-4">
              <h3 className="font-bold text-purple-900 dark:text-purple-200 mb-2">
                Important: AI Data Processing
              </h3>
              <p className="text-sm text-purple-800 dark:text-purple-300 mb-3">
                When you use AI features, your data is sent to third-party AI providers:
              </p>
              <ul className="list-disc list-inside text-sm text-purple-800 dark:text-purple-300 space-y-1">
                <li><strong>Anthropic:</strong> Board names, task descriptions, and prompts</li>
                <li><strong>Data retention:</strong> Typically 30 days by Anthropic</li>
                <li><strong>Training:</strong> API data is NOT used to train models (per Anthropic's current policy)</li>
              </ul>
            </div>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Service Providers We Use
            </h3>
            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="font-semibold text-gray-900 dark:text-white">Firebase/Google Cloud</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Database, authentication, hosting. All account and board data.
                  <br />
                  <a href="https://firebase.google.com/support/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">
                    Firebase Privacy Policy
                  </a>
                </p>
              </div>
              <div className="border-l-4 border-purple-500 pl-4">
                <h4 className="font-semibold text-gray-900 dark:text-white">Anthropic</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  AI-powered features. Task descriptions and prompts.
                  <br />
                  <a href="https://www.anthropic.com/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">
                    Anthropic Privacy Policy
                  </a>
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              4. Your Privacy Rights
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              You have the following rights regarding your personal data:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
              <li><strong>Access:</strong> Request a copy of your data</li>
              <li><strong>Correction:</strong> Update inaccurate information</li>
              <li><strong>Deletion:</strong> Delete your account and data</li>
              <li><strong>Portability:</strong> Export your data in a portable format</li>
              <li><strong>Objection:</strong> Object to certain data processing</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 mt-4">
              To exercise these rights, contact us at{' '}
              <a href="mailto:privacy@yourdomain.com" className="text-blue-600 dark:text-blue-400 hover:underline">
                privacy@yourdomain.com
              </a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              5. GDPR Rights (EU Users)
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              If you are in the European Union, you have additional rights under GDPR:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
              <li>Right to erasure ("right to be forgotten")</li>
              <li>Right to restriction of processing</li>
              <li>Right to data portability</li>
              <li>Right to object to automated decision-making</li>
              <li>Right to lodge a complaint with supervisory authority</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              6. CCPA Rights (California Users)
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              California residents have specific rights under CCPA/CPRA:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
              <li>Right to know what personal information we collect</li>
              <li>Right to delete personal information</li>
              <li>Right to opt-out of sale (we do NOT sell your data)</li>
              <li>Right to non-discrimination for exercising these rights</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              7. Data Security
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              We implement reasonable security measures including:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 my-3">
              <li>Encryption in transit (TLS/SSL)</li>
              <li>Secure password hashing</li>
              <li>Access controls and authentication</li>
              <li>Regular security monitoring</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300">
              However, no method of transmission or storage is 100% secure. You use the Service at your own risk.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              8. Data Retention
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              We retain your data:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 my-3">
              <li>For as long as your account is active</li>
              <li>30-day grace period after account deletion</li>
              <li>Up to 90 days in backups for disaster recovery</li>
              <li>As required by law for legal obligations</li>
            </ul>
          </section>

          {/* Complete Outline Notice */}
          <section className="mb-8 mt-12 pt-8 border-t-2 border-gray-300 dark:border-gray-600">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                📋 Comprehensive Outline for Attorney
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                A detailed outline covering ALL privacy requirements is at:
              </p>
              <code className="block bg-gray-200 dark:bg-gray-800 px-4 py-2 rounded text-sm">
                app/legal/privacy/PRIVACY_OUTLINE.md
              </code>
              <p className="text-gray-700 dark:text-gray-300 mt-4">
                Includes <strong>20 comprehensive sections</strong> covering GDPR, CCPA, cookies,
                AI data processing, international transfers, and more.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Contact Us
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              For privacy questions or to exercise your rights:
            </p>
            <div className="text-gray-700 dark:text-gray-300 mt-3">
              <p>Email: <a href="mailto:privacy@yourdomain.com" className="text-blue-600 dark:text-blue-400 hover:underline">privacy@yourdomain.com</a></p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                [Your Company Address - To Be Completed]
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
              href="/legal/terms"
              className="block p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
            >
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Terms of Service</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Usage terms and conditions</p>
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
