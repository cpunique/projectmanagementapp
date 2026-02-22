'use client';

import Link from 'next/link';
import { LEGAL_DOCUMENTS, LEGAL_VERSIONS } from '@/types/legal';
import { useAuth } from '@/lib/firebase/AuthContext';

export default function Footer() {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();

  // Authenticated users get a slim single-line footer — the marketing footer is for the landing page
  if (user) {
    return (
      <footer className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between">
          <span className="text-xs text-gray-400 dark:text-gray-500">© {currentYear} Kan-do</span>
          <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
            {LEGAL_DOCUMENTS.map((doc) => (
              <Link
                key={doc.type}
                href={doc.path}
                className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
              >
                {doc.name}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Kan-do
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Project management made simple with AI-powered features
            </p>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Legal
            </h3>
            <ul className="space-y-2">
              {LEGAL_DOCUMENTS.map((doc) => (
                <li key={doc.type}>
                  <Link
                    href={doc.path}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                  >
                    {doc.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/legal/changelog"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                >
                  Legal Changelog
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Resources */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Contact
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>
                <a
                  href="mailto:support@yourdomain.com"
                  className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                >
                  Support
                </a>
              </li>
              <li>
                <a
                  href="mailto:privacy@yourdomain.com"
                  className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                >
                  Privacy Requests
                </a>
              </li>
              <li>
                <a
                  href="mailto:legal@yourdomain.com"
                  className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                >
                  Legal
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              © {currentYear} Kan-do. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
              <span>Legal Docs v{LEGAL_VERSIONS.TERMS_OF_SERVICE}</span>
              <span>•</span>
              <Link
                href="/legal/changelog"
                className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
              >
                View Changes
              </Link>
            </div>
          </div>
        </div>

        {/* Attorney Notice (remove after legal review) */}
        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-400 dark:border-yellow-600 rounded-lg">
          <p className="text-xs text-yellow-800 dark:text-yellow-300">
            ⚠️ <strong>Development Notice:</strong> Legal documents are drafts pending attorney review.
            See comprehensive outlines in <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">app/legal/*/</code> directories.
          </p>
        </div>
      </div>
    </footer>
  );
}
