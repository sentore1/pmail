import React from 'react'
import { ArrowLeft } from 'lucide-react'

function TermsOfService({ onBack }) {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-16">

        <button onClick={onBack} className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 text-sm mb-12 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Terms of Service</h1>
        <p className="text-sm text-gray-400 mb-12">Last updated: November 4, 2026</p>

        <div className="space-y-10 text-gray-600 text-sm leading-7">

          <section>
            <h2 className="text-base font-medium text-gray-800 mb-2">1. Acceptance of Terms</h2>
            <p>By accessing or using Pmail, you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service. These terms apply to all users, including visitors, registered users, and anyone else who accesses the Service.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-gray-800 mb-2">2. Description of Service</h2>
            <p>Pmail is a professional email platform that includes the Knocc system — a feature that lets users set a fee for unsolicited contact requests. Pmail provides email composition, inbox management, contact approval workflows, wallet functionality, and related communication tools.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-gray-800 mb-2">3. Account Registration</h2>
            <p>To use Pmail, you must create an account. You agree to provide accurate and complete information, keep your password confidential, be responsible for all activity under your account, and notify us immediately of any unauthorized use.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-gray-800 mb-2">4. The Knocc System</h2>
            <p>Knocc allows users to require a payment from unknown contacts before receiving their emails. Knocc fees are set by individual users. Pmail takes a service fee on Knocc transactions. Refunds are handled on a case-by-case basis. Abuse of the Knocc system may result in account suspension.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-gray-800 mb-2">5. Acceptable Use</h2>
            <p>You agree not to use Pmail to send spam, transmit malware, impersonate others, engage in illegal activity, attempt unauthorized access to any part of the Service, or interfere with the Service's integrity or performance.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-gray-800 mb-2">6. Wallet and Payments</h2>
            <p>Pmail provides an in-app wallet for managing Knocc fees and other transactions. Wallet funds may be withdrawn subject to our withdrawal policies. Pmail is not a bank and wallet balances are not insured. We reserve the right to freeze accounts suspected of fraudulent activity pending investigation.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-gray-800 mb-2">7. Intellectual Property</h2>
            <p>All content, trademarks, and technology comprising the Pmail Service are owned by or licensed to Pmail. You retain ownership of the content you create and send. By using the Service, you grant Pmail a limited license to process and store your content solely to provide the Service.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-gray-800 mb-2">8. Termination</h2>
            <p>We may suspend or terminate your account at any time for violation of these Terms, fraudulent activity, or behavior we determine to be harmful to the Service or other users. You may delete your account at any time from your settings. Upon termination, your data may be deleted in accordance with our Privacy Policy.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-gray-800 mb-2">9. Disclaimers</h2>
            <p>The Service is provided "as is" without warranties of any kind, either express or implied. We do not warrant that the Service will be uninterrupted or error-free. To the fullest extent permitted by law, Pmail disclaims all implied warranties including merchantability and fitness for a particular purpose.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-gray-800 mb-2">10. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, Pmail shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service. Our total liability for any claim shall not exceed the amount you paid to Pmail in the 12 months preceding the claim.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-gray-800 mb-2">11. Changes to Terms</h2>
            <p>We may update these Terms from time to time. We will notify you of material changes by email or by a prominent notice in the Service. Your continued use of the Service after changes take effect constitutes acceptance of the updated Terms.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-gray-800 mb-2">12. Contact</h2>
            <p>Questions about these Terms? Email us at <a href="mailto:legal@pmail.com" className="text-gray-800 underline underline-offset-2">legal@pmail.com</a>.</p>
          </section>

        </div>
      </div>
    </div>
  )
}

export default TermsOfService
