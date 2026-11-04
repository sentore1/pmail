import React from 'react'
import { ArrowLeft } from 'lucide-react'

function PrivacyPolicy({ onBack }) {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <span className="text-gray-300">|</span>
          <span className="text-blue-600 font-bold text-lg" style={{ fontFamily: "'Jost', sans-serif" }}>pmail</span>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: November 4, 2026</p>

        <div className="space-y-8 text-gray-700 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Introduction</h2>
            <p>Pmail ("we", "us", or "our") is committed to protecting your personal information. This Privacy Policy explains what data we collect, how we use it, and the choices you have. By using Pmail, you agree to the collection and use of information as described in this policy.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
            <p className="mb-2">We collect the following types of information:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="font-medium text-gray-900">Account information:</span> Name, email address, username, password (hashed), phone number, age, gender, and country provided during registration.
              </li>
              <li>
                <span className="font-medium text-gray-900">Email content:</span> Messages you compose, send, receive, and store within Pmail. This content is processed to deliver the Service.
              </li>
              <li>
                <span className="font-medium text-gray-900">Transaction data:</span> Knocc payment history, wallet deposits, and withdrawals.
              </li>
              <li>
                <span className="font-medium text-gray-900">Usage data:</span> Log data including IP address, browser type, pages visited, and timestamps.
              </li>
              <li>
                <span className="font-medium text-gray-900">Device information:</span> Device type, operating system, and unique device identifiers.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
            <p className="mb-2">We use your information to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Provide, maintain, and improve the Pmail Service</li>
              <li>Process Knocc requests and wallet transactions</li>
              <li>Send transactional emails and service notifications</li>
              <li>Detect, prevent, and address fraud or security issues</li>
              <li>Comply with legal obligations</li>
              <li>Analyze usage trends to improve the user experience</li>
              <li>Respond to your support requests and inquiries</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Information Sharing</h2>
            <p className="mb-2">We do not sell your personal information. We may share your data with:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><span className="font-medium text-gray-900">Service providers:</span> Payment processors, cloud hosting providers, and analytics tools that help us operate the Service, bound by confidentiality agreements.</li>
              <li><span className="font-medium text-gray-900">Other users:</span> Your display name and email address are visible to users you communicate with through Pmail.</li>
              <li><span className="font-medium text-gray-900">Legal requirements:</span> We may disclose your information if required by law, court order, or governmental authority.</li>
              <li><span className="font-medium text-gray-900">Business transfers:</span> In the event of a merger, acquisition, or sale of assets, your data may be transferred to the acquiring entity.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Data Retention</h2>
            <p>We retain your personal data for as long as your account is active or as needed to provide the Service. If you delete your account, we will delete or anonymize your data within 30 days, except where we are required to retain it for legal, tax, or regulatory purposes.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Security</h2>
            <p>We implement industry-standard security measures including encryption in transit (TLS), hashed password storage, and access controls to protect your data. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Your Rights</h2>
            <p className="mb-2">Depending on your location, you may have the right to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Access the personal data we hold about you</li>
              <li>Correct inaccurate or incomplete data</li>
              <li>Request deletion of your personal data</li>
              <li>Object to or restrict processing of your data</li>
              <li>Receive a copy of your data in a portable format</li>
              <li>Withdraw consent at any time where processing is based on consent</li>
            </ul>
            <p className="mt-3">To exercise any of these rights, contact us at <a href="mailto:privacy@pmail.com" className="text-blue-600 hover:underline">privacy@pmail.com</a>.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Cookies</h2>
            <p>Pmail uses cookies and similar technologies to maintain your session, remember your preferences, and analyze usage. You can control cookies through your browser settings. Disabling cookies may affect the functionality of the Service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Children's Privacy</h2>
            <p>Pmail is not directed to children under the age of 13. We do not knowingly collect personal information from children. If you believe we have inadvertently collected data from a child, please contact us and we will delete it promptly.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Third-Party Links</h2>
            <p>The Service may contain links to third-party websites. We are not responsible for the privacy practices of those sites and encourage you to review their privacy policies before providing any personal information.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">11. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by email or through a notice in the Service. Your continued use of Pmail after changes become effective constitutes acceptance of the revised policy.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">12. Contact Us</h2>
            <p>If you have questions or concerns about this Privacy Policy, please contact us at <a href="mailto:privacy@pmail.com" className="text-blue-600 hover:underline">privacy@pmail.com</a>.</p>
          </section>

        </div>
      </div>
    </div>
  )
}

export default PrivacyPolicy
