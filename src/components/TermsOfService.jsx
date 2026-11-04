import React from 'react'
import { ArrowLeft } from 'lucide-react'

function TermsOfService({ onBack }) {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: November 4, 2026</p>

        <div className="space-y-8 text-gray-700 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using Pmail ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service. These terms apply to all users, including visitors, registered users, and anyone else who accesses the Service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Description of Service</h2>
            <p>Pmail is a professional email platform that includes the Knocc system — a feature that allows users to set a fee for unsolicited contact requests. Pmail provides email composition, inbox management, contact approval workflows, wallet functionality, and related communication tools.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Account Registration</h2>
            <p className="mb-2">To use Pmail, you must create an account. You agree to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Provide accurate, current, and complete information during registration</li>
              <li>Maintain and update your account information to keep it accurate</li>
              <li>Keep your password confidential and not share it with others</li>
              <li>Be responsible for all activity that occurs under your account</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">4. The Knocc System</h2>
            <p className="mb-2">The Knocc system allows users to require a payment from unknown contacts before receiving their emails. By using the Knocc feature, you acknowledge:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Knocc fees are set by individual users and are non-negotiable by Pmail</li>
              <li>Payments are processed through our integrated payment provider</li>
              <li>Pmail takes a service fee on Knocc transactions as described in our pricing documentation</li>
              <li>Refunds for Knocc payments are handled on a case-by-case basis</li>
              <li>Abuse of the Knocc system may result in account suspension</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Acceptable Use</h2>
            <p className="mb-2">You agree not to use Pmail to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Send spam, unsolicited bulk messages, or harassing communications</li>
              <li>Transmit malware, viruses, or any malicious code</li>
              <li>Impersonate any person or entity or misrepresent your affiliation</li>
              <li>Engage in any illegal activity or violate any applicable laws</li>
              <li>Attempt to gain unauthorized access to any part of the Service</li>
              <li>Interfere with or disrupt the integrity or performance of the Service</li>
              <li>Collect or harvest user data without explicit consent</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Wallet and Payments</h2>
            <p>Pmail provides an in-app wallet for managing Knocc fees and other transactions. Wallet funds are held in your account and may be withdrawn subject to our withdrawal policies. Pmail is not a bank and wallet balances are not insured. We reserve the right to freeze accounts suspected of fraudulent activity pending investigation.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Intellectual Property</h2>
            <p>All content, trademarks, and technology comprising the Pmail Service are owned by or licensed to Pmail. You retain ownership of the content you create and send through the Service. By using the Service, you grant Pmail a limited license to process and store your content solely to provide the Service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Termination</h2>
            <p>We reserve the right to suspend or terminate your account at any time for violation of these Terms, fraudulent activity, or any behavior we determine to be harmful to the Service or other users. You may also delete your account at any time from your settings. Upon termination, your data may be deleted in accordance with our Privacy Policy.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Disclaimers</h2>
            <p>The Service is provided "as is" without warranties of any kind, either express or implied. We do not warrant that the Service will be uninterrupted, error-free, or free of viruses. To the fullest extent permitted by law, Pmail disclaims all warranties including implied warranties of merchantability and fitness for a particular purpose.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, Pmail shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service. Our total liability to you for any claim shall not exceed the amount you paid to Pmail in the 12 months preceding the claim.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">11. Changes to Terms</h2>
            <p>We may update these Terms from time to time. We will notify you of material changes by email or by a prominent notice in the Service. Your continued use of the Service after changes take effect constitutes acceptance of the updated Terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">12. Contact Us</h2>
            <p>If you have questions about these Terms of Service, please contact us at <a href="mailto:legal@pmail.com" className="text-blue-600 hover:underline">legal@pmail.com</a>.</p>
          </section>

        </div>
      </div>
    </div>
  )
}

export default TermsOfService
