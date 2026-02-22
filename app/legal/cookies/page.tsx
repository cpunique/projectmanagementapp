import type { Metadata } from 'next';
import { LEGAL_VERSIONS, LEGAL_LAST_UPDATED } from '@/types/legal';

export const metadata: Metadata = {
  title: 'Cookie Policy - Kan-do',
  description: 'Cookie Policy for our project management application',
};

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Cookie Policy
          </h1>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div>
              <span className="font-semibold">Version:</span> {LEGAL_VERSIONS.COOKIE_POLICY}
            </div>
            <div>
              <span className="font-semibold">Last Updated:</span> {LEGAL_LAST_UPDATED.COOKIE_POLICY}
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg p-6 mb-8">
          <p className="text-yellow-800 dark:text-yellow-300 text-sm">
            <strong>⚠️ DRAFT - ATTORNEY REVIEW REQUIRED</strong> - See{' '}
            <code className="bg-yellow-100 dark:bg-yellow-800 px-2 py-1 rounded">
              app/legal/cookies/COOKIE_POLICY_OUTLINE.md
            </code>
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 prose prose-lg dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              1. What Are Cookies?
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              Cookies are small text files stored on your device when you visit our website. They help
              us provide and improve the Service by remembering your preferences and session information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              2. Cookies We Use
            </h2>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Strictly Necessary Cookies
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              These cookies are essential for the Service to function. Cannot be disabled.
            </p>
            <div className="overflow-x-auto mb-6">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <th className="px-4 py-2 text-left text-sm font-semibold">Cookie</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Purpose</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  <tr>
                    <td className="px-4 py-2 text-sm font-mono">auth_token</td>
                    <td className="px-4 py-2 text-sm">Keep you logged in</td>
                    <td className="px-4 py-2 text-sm">30 days</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-sm font-mono">session_id</td>
                    <td className="px-4 py-2 text-sm">Maintain session</td>
                    <td className="px-4 py-2 text-sm">Session</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-sm font-mono">csrf_token</td>
                    <td className="px-4 py-2 text-sm">Security protection</td>
                    <td className="px-4 py-2 text-sm">Session</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Functional Cookies
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              Remember your preferences and settings.
            </p>
            <div className="overflow-x-auto mb-6">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <th className="px-4 py-2 text-left text-sm font-semibold">Item</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Purpose</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  <tr>
                    <td className="px-4 py-2 text-sm font-mono">dark_mode</td>
                    <td className="px-4 py-2 text-sm">Dark mode preference</td>
                    <td className="px-4 py-2 text-sm">1 year</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-sm font-mono">kanban-store</td>
                    <td className="px-4 py-2 text-sm">Board data (local)</td>
                    <td className="px-4 py-2 text-sm">Persistent</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              3. Third-Party Cookies
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We use services that may set their own cookies:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
              <li>
                <strong>Firebase/Google:</strong> Authentication and database services
                <br />
                <a href="https://policies.google.com/privacy" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                  Google Privacy Policy
                </a>
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              4. Managing Cookies
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              You can control cookies through your browser settings:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
              <li><strong>Chrome:</strong> Settings → Privacy and security → Cookies</li>
              <li><strong>Firefox:</strong> Settings → Privacy & Security → Cookies</li>
              <li><strong>Safari:</strong> Preferences → Privacy → Cookies</li>
              <li><strong>Edge:</strong> Settings → Cookies and site permissions</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 mt-4">
              <strong>Note:</strong> Disabling essential cookies will prevent the Service from working properly.
            </p>
          </section>

          <section className="mb-8 mt-12 pt-8 border-t-2 border-gray-300 dark:border-gray-600">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                📋 Complete Outline Available
              </h3>
              <code className="block bg-gray-200 dark:bg-gray-800 px-4 py-2 rounded text-sm">
                app/legal/cookies/COOKIE_POLICY_OUTLINE.md
              </code>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Contact Us
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              Questions about cookies?
              <br />
              Email: <a href="mailto:privacy@yourdomain.com" className="text-blue-600 dark:text-blue-400 hover:underline">privacy@yourdomain.com</a>
            </p>
          </section>
        </div>

        <div className="mt-8 text-center">
          <a href="/" className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
