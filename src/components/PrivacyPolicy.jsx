import React from 'react'
import { ArrowLeft } from 'lucide-react'

function PrivacyPolicy({ onBack }) {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-16">

        <button onClick={onBack} className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 text-sm mb-12 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-12">Last updated: November 4, 2026</p>

        <div className="space-y-10 text-gray-600 text-sm leading-7">

          <section>
            <h2 className="text-base font-medium text-gray-800 mb-2">1. Introduction</h2>
            <p>Pmail is committed to protecting your personal information. This Privacy Policy explains what data we collect, how we use it, and the choices you have. By using Pmail, you agree to the collection and use of information as described here.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-gray-800 mb-2">2. Information We Collect</h2>
            <p className="mb-3">We collect the following types of information:</p>
            <p className="mb-1"><span className="text-gray-700 font-medium">Account information</span> — name, email address, username, password (hashed), phone number, age, gender, and country provided at registration.</p>
            <p className="mb-1"><span className="text-gray-700 font-medium">Email content</span> — messages you compose, send, receive, and store within Pmail, processed solely to deliver the Service.</p>
            <p className="mb-1"><span className="text-gray-700 font-medium">Transaction data</span> — Knocc payment history, wallet deposits, and withdrawals.</p>
            <p className="mb-1"><span className="text-gray-700 font-medium">Usage data</span> — log data including IP address, browser type, pages visited, and timestamps.</p>
            <p><span className="text-gray-700 font-medium">Device information</span> — device type, operating system, and unique device identifiers.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-gray-800 mb-2">3. How We Use Your Information</h2>
            <p>We use your information to provide and improve the Service, process Knocc requests and wallet transactions, send service notifications, detect and prevent fraud, comply with legal obligations, and respond to support requests.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-gray-800 mb-2">4. Information Sharing</h2>
            <p>We do not sell your personal information. We may share your data with service providers who help us operate the Service (bound by confidentiality agreements), other users you communicate with (name and email address), and authorities when required by law.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-gray-800 mb-2">5. Data Retention</h2>
            <p>We retain your data for as long as your account is active or as needed to provide the Service. If you delete your account, we will delete or anonymize your data within 30 days, except where required by law.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-gray-800 mb-2">6. Security</h2>
            <p>We use encryption in transit (TLS), hashed password storage, and access controls to protect your data. No method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-gray-800 mb-2">7. Your Rights</h2>
            <p>Depending on your location, you may have the right to access, correct, delete, or export your personal data, and to object to or restrict its processing. To exercise any of these rights, contact us at <a href="mailto:privacy@pryro.com" className="text-gray-800 underline underline-offset-2">privacy@pryro.com</a>.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-gray-800 mb-2">8. Cookies</h2>
            <p>Pmail uses cookies to maintain your session, remember your preferences, and analyze usage. You can control cookies through your browser settings, though disabling them may affect some functionality.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-gray-800 mb-2">9. Children's Privacy</h2>
            <p>Pmail is not directed to children under 13. We do not knowingly collect personal information from children. If you believe we have inadvertently done so, contact us and we will delete it promptly.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-gray-800 mb-2">10. Third-Party Links</h2>
            <p>The Service may contain links to third-party websites. We are not responsible for their privacy practices and encourage you to review their policies before providing any personal information.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-gray-800 mb-2">11. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by email or through a notice in the Service. Continued use of Pmail after changes become effective constitutes acceptance of the revised policy.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-gray-800 mb-2">12. Contact</h2>
            <p>Questions about this Privacy Policy? Email us at <a href="mailto:privacy@pryro.com" className="text-gray-800 underline underline-offset-2">privacy@pryro.com</a>.</p>
          </section>

        </div>
      </div>
    </div>
  )
}

export default PrivacyPolicy
