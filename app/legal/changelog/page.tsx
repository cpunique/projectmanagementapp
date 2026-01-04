import type { Metadata } from 'next';
import { LEGAL_VERSIONS, LEGAL_LAST_UPDATED, LEGAL_DOCUMENTS } from '@/types/legal';

export const metadata: Metadata = {
  title: 'Legal Changelog - Kanban Board',
  description: 'History of changes to our legal documents',
};

interface ChangelogEntry {
  version: string;
  date: string;
  documents: string[];
  changes: string[];
  breaking?: boolean;
}

// This should be updated whenever legal documents are modified
const CHANGELOG: ChangelogEntry[] = [
  {
    version: 'v1.0.0',
    date: '2026-01-04',
    documents: ['Terms of Service', 'Privacy Policy', 'Cookie Policy', 'AI Usage Policy'],
    changes: [
      'Initial release of all legal documents',
      'Comprehensive Terms of Service with AI-specific provisions',
      'GDPR and CCPA compliant Privacy Policy',
      'Detailed Cookie Policy with cookie inventory',
      'AI Usage Policy covering OpenAI data processing and limitations',
      'Consent tracking system implemented',
    ],
    breaking: true,
  },
  // Add future entries here when legal documents are updated
];

export default function LegalChangelog() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Legal Documents Changelog
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            History of changes to our Terms of Service, Privacy Policy, and other legal documents.
            We believe in transparency about how our legal agreements evolve.
          </p>
        </div>

        {/* Current Versions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Current Versions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {LEGAL_DOCUMENTS.map((doc) => (
              <div
                key={doc.type}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div>
                  <a
                    href={doc.path}
                    className="font-medium text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                  >
                    {doc.name}
                  </a>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Updated: {doc.lastUpdated}
                  </p>
                </div>
                <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-sm font-medium">
                  {doc.version}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Changelog Entries */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Change History
          </h2>

          {CHANGELOG.map((entry, index) => (
            <div
              key={`${entry.version}-${entry.date}`}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
            >
              {/* Entry Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {entry.version}
                    </h3>
                    {entry.breaking && (
                      <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded text-xs font-semibold uppercase">
                        Breaking
                      </span>
                    )}
                    {index === 0 && (
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded text-xs font-semibold uppercase">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Released: {new Date(entry.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              {/* Affected Documents */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Affected Documents:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {entry.documents.map((doc) => (
                    <span
                      key={doc}
                      className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm"
                    >
                      {doc}
                    </span>
                  ))}
                </div>
              </div>

              {/* Changes */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Changes:
                </h4>
                <ul className="space-y-2">
                  {entry.changes.map((change, changeIndex) => (
                    <li
                      key={changeIndex}
                      className="flex items-start gap-2 text-gray-700 dark:text-gray-300"
                    >
                      <span className="text-purple-600 dark:text-purple-400 mt-1">•</span>
                      <span className="text-sm">{change}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Breaking Change Notice */}
              {entry.breaking && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded">
                  <p className="text-sm text-red-800 dark:text-red-300">
                    <strong>⚠️ Breaking Change:</strong> This update includes material changes that
                    require user acceptance. Existing users were notified and required to accept the
                    updated terms.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* How We Notify Users */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-400 dark:border-blue-600 rounded-lg p-6">
          <h3 className="text-lg font-bold text-blue-900 dark:text-blue-200 mb-3">
            How We Notify You of Changes
          </h3>
          <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 mt-1">✓</span>
              <span><strong>Email notification</strong> to your registered email address for material changes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 mt-1">✓</span>
              <span><strong>In-app banner</strong> when you log in after a policy update</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 mt-1">✓</span>
              <span><strong>30-day notice period</strong> for material changes before they take effect</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 mt-1">✓</span>
              <span><strong>Updated "Last Modified" date</strong> at the top of each document</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 mt-1">✓</span>
              <span><strong>This changelog</strong> documenting all changes</span>
            </li>
          </ul>
          <p className="mt-4 text-sm text-blue-800 dark:text-blue-300">
            <strong>Your options:</strong> If you don't agree with material changes, you can close your
            account and download your data before the changes take effect.
          </p>
        </div>

        {/* RSS Feed / Email Notifications (Future) */}
        <div className="mt-8 bg-gray-100 dark:bg-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
            📬 Stay Updated
          </h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            Want to be notified of legal document changes?
          </p>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p>• Subscribe to email notifications in your account settings (coming soon)</p>
            <p>• Bookmark this changelog page to check for updates</p>
            <p>• Contact <a href="mailto:legal@yourdomain.com" className="text-purple-600 dark:text-purple-400 hover:underline">legal@yourdomain.com</a> with questions</p>
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
