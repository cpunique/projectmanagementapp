import type { Metadata } from 'next';
import { LEGAL_VERSIONS, LEGAL_LAST_UPDATED } from '@/types/legal';

export const metadata: Metadata = {
  title: 'AI Usage Policy - Kan-do',
  description: 'AI Usage Policy for our project management application',
};

export default function AIUsagePolicy() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            AI Usage Policy
          </h1>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div>
              <span className="font-semibold">Version:</span> {LEGAL_VERSIONS.AI_USAGE_POLICY}
            </div>
            <div>
              <span className="font-semibold">Last Updated:</span> {LEGAL_LAST_UPDATED.AI_USAGE_POLICY}
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg p-6 mb-8">
          <p className="text-yellow-800 dark:text-yellow-300 text-sm">
            <strong>⚠️ DRAFT - AI LAW SPECIALIST REVIEW REQUIRED</strong> - See{' '}
            <code className="bg-yellow-100 dark:bg-yellow-800 px-2 py-1 rounded">
              app/legal/ai-usage/AI_USAGE_POLICY_OUTLINE.md
            </code>
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 prose prose-lg dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              1. AI Features Overview
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Our Service uses artificial intelligence to enhance your productivity. Current AI features include:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
              <li><strong>Task Description Generation:</strong> AI generates detailed descriptions from brief prompts</li>
              <li><strong>Board Optimization:</strong> AI suggests improvements to board organization</li>
              <li><strong>Content Suggestions:</strong> AI provides contextual recommendations</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 mt-4">
              <strong>Powered by:</strong> Anthropic Claude Sonnet 4.5 (claude-sonnet-4-20250514)
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              2. How AI Processing Works
            </h2>
            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 mb-4">
              <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-2">
                Data Flow
              </h3>
              <ol className="list-decimal list-inside text-sm text-blue-800 dark:text-blue-300 space-y-1">
                <li>You provide input (task title, prompt, etc.)</li>
                <li>Your input is sent to Anthropic's Claude API for processing</li>
                <li>Anthropic's Claude model generates a response</li>
                <li>Response is returned and displayed to you</li>
                <li>You review and choose whether to use the output</li>
              </ol>
            </div>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              What Data is Sent to AI
            </h3>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
              <li>Text you enter into AI prompts</li>
              <li>Task titles and descriptions (for context)</li>
              <li>Board names and descriptions (for context)</li>
              <li>Surrounding task context (when needed)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-4">
              What is NOT Sent
            </h3>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
              <li>Your email or password</li>
              <li>Payment information</li>
              <li>Data from boards where you don't use AI</li>
              <li>Usage analytics or behavior patterns</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              3. Anthropic Data Processing
            </h2>
            <div className="bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500 p-4 mb-4">
              <h3 className="font-bold text-purple-900 dark:text-purple-200 mb-2">
                Critical Information
              </h3>
              <p className="text-sm text-purple-800 dark:text-purple-300 mb-3">
                As of the last update to this policy:
              </p>
              <ul className="list-disc list-inside text-sm text-purple-800 dark:text-purple-300 space-y-2">
                <li><strong>Training:</strong> Anthropic does NOT use API data to train models - this is a core commitment</li>
                <li><strong>Retention:</strong> Anthropic retains data for 30 days for trust & safety monitoring, then deletes it</li>
                <li><strong>Policies:</strong> Anthropic's policies may change; review their current policies at{' '}
                  <a href="https://www.anthropic.com/legal" className="text-purple-600 dark:text-purple-400 hover:underline">
                    anthropic.com/legal
                  </a>
                </li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              4. AI Accuracy and Limitations
            </h2>
            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-400 dark:border-red-600 rounded p-4 mb-4">
              <p className="text-sm font-semibold text-red-900 dark:text-red-200 mb-2">
                ⚠️ CRITICAL: AI IS NOT PERFECT
              </p>
              <p className="text-sm text-red-800 dark:text-red-300 mb-3">
                AI-generated content may be:
              </p>
              <ul className="list-disc list-inside text-sm text-red-800 dark:text-red-300 space-y-1">
                <li>Inaccurate, incorrect, or misleading</li>
                <li>Incomplete or missing critical information</li>
                <li>Biased or discriminatory</li>
                <li>Offensive or inappropriate</li>
                <li>Plagiarized or infringing on copyrights</li>
                <li>Inconsistent or nonsensical</li>
              </ul>
            </div>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              You MUST:
            </h3>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
              <li>Review all AI-generated content before using it</li>
              <li>Verify accuracy and appropriateness</li>
              <li>Exercise independent professional judgment</li>
              <li>NOT rely solely on AI for important decisions</li>
              <li>Understand that AI may "hallucinate" false information</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              5. No Professional Advice
            </h2>
            <div className="bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500 p-4">
              <p className="text-sm font-semibold text-orange-900 dark:text-orange-200 mb-2">
                AI DOES NOT PROVIDE PROFESSIONAL ADVICE
              </p>
              <p className="text-sm text-orange-800 dark:text-orange-300 mb-3">
                AI outputs are NOT:
              </p>
              <ul className="list-disc list-inside text-sm text-orange-800 dark:text-orange-300 space-y-1">
                <li>Legal advice (consult a lawyer)</li>
                <li>Medical advice (consult a doctor)</li>
                <li>Financial advice (consult a financial advisor)</li>
                <li>Tax advice (consult a tax professional)</li>
                <li>Any other professional advice</li>
              </ul>
              <p className="text-sm text-orange-800 dark:text-orange-300 mt-3">
                Always consult qualified professionals for professional matters.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              6. Your Responsibilities
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              When using AI features, you are responsible for:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
              <li>Reviewing and verifying all AI outputs</li>
              <li>Ensuring content accuracy and appropriateness</li>
              <li>Complying with laws and regulations</li>
              <li>Not infringing third-party rights</li>
              <li>Not using AI for prohibited purposes</li>
              <li>All consequences of using AI-generated content</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              7. Prohibited Uses
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              You may NOT use AI features for:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
              <li>Illegal activities or content</li>
              <li>Generating harmful, violent, or dangerous content</li>
              <li>Creating spam or malware</li>
              <li>Violating others' privacy or intellectual property</li>
              <li>Impersonating others or creating deepfakes</li>
              <li>Academic dishonesty or plagiarism</li>
              <li>Attempting to manipulate or "jailbreak" the AI</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              8. Intellectual Property
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              <strong>Your inputs:</strong> You own the text you provide to AI.
              <br />
              <strong>AI outputs:</strong> To the extent allowed by law, you receive rights to AI-generated
              content. However:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 my-3">
              <li>AI outputs may not be copyrightable under current law</li>
              <li>Similar content may be generated for other users</li>
              <li>No guarantee of exclusivity or originality</li>
              <li>You must verify outputs don't infringe existing copyrights</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              9. Your Control Over AI
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              AI features are optional. You can:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
              <li>Choose whether to use AI features</li>
              <li>Disable AI features in account settings</li>
              <li>Use the Service without AI</li>
              <li>Withdraw consent for AI processing at any time</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 mt-4">
              <strong>Note:</strong> Disabling AI does NOT delete previously generated content or
              recall data already sent to Anthropic.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              10. Disclaimers
            </h2>
            <div className="bg-gray-100 dark:bg-gray-700 border-2 border-gray-400 dark:border-gray-600 rounded p-4">
              <p className="text-sm font-semibold mb-2">
                AI FEATURES PROVIDED "AS IS"
              </p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>No warranty of accuracy or reliability</li>
                <li>No warranty outputs will meet your needs</li>
                <li>No warranty of availability</li>
                <li>You use AI features entirely at your own risk</li>
                <li>We are not liable for AI errors or harmful outputs</li>
                <li>We are not liable for decisions based on AI outputs</li>
              </ul>
            </div>
          </section>

          <section className="mb-8 mt-12 pt-8 border-t-2 border-gray-300 dark:border-gray-600">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                📋 Comprehensive Outline for Attorney
              </h3>
              <code className="block bg-gray-200 dark:bg-gray-800 px-4 py-2 rounded text-sm">
                app/legal/ai-usage/AI_USAGE_POLICY_OUTLINE.md
              </code>
              <p className="text-gray-700 dark:text-gray-300 mt-4">
                Includes <strong>16 detailed sections</strong> covering AI ethics, bias, training data,
                emerging regulations, and comprehensive liability protections.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Contact Us
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              Questions about AI usage?
              <br />
              Email: <a href="mailto:ai@yourdomain.com" className="text-blue-600 dark:text-blue-400 hover:underline">ai@yourdomain.com</a>
            </p>
            <p className="text-gray-700 dark:text-gray-300 mt-4">
              Report harmful AI outputs:
              <br />
              Email: <a href="mailto:ai-safety@yourdomain.com" className="text-blue-600 dark:text-blue-400 hover:underline">ai-safety@yourdomain.com</a>
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
