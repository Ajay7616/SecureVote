import React from 'react';
import { Shield, Vote, Lock, ChevronRight } from 'lucide-react';

const FeatureCard = ({ icon, title, description }) => (
  <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 hover:shadow-md transition-shadow">
    <div className="inline-flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 bg-blue-100 rounded-xl mb-3 sm:mb-4 text-blue-600">
      {icon}
    </div>
    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1.5 sm:mb-2">{title}</h3>
    <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
  </div>
);

const Step = ({ number, title, description }) => (
  <div className="flex sm:flex-col items-start sm:items-center gap-4 sm:gap-0 sm:text-center">
    <div className="inline-flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 bg-blue-600 text-white rounded-full font-bold text-base sm:mb-3 flex-shrink-0">
      {number}
    </div>
    <div>
      <h4 className="font-semibold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">{title}</h4>
      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
    </div>
  </div>
);

const Home = () => (
  <div className="space-y-8 sm:space-y-12" style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>

    <section className="text-center py-8 sm:py-12 px-2">
      <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-blue-100 rounded-full mb-4 sm:mb-6">
        <Vote className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600" />
      </div>
      <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 leading-tight">
        Secure Blockchain<br className="sm:hidden" /> Voting System
      </h1>
      <p className="text-sm sm:text-lg text-gray-500 max-w-2xl mx-auto mb-6 sm:mb-8 leading-relaxed px-2">
        Experience transparent, tamper-proof elections powered by blockchain technology.
        Vote securely from anywhere with complete anonymity and verifiability.
      </p>
      {/* <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-4 sm:px-0">
        <button className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm sm:text-base flex items-center justify-center gap-2">
          Start Voting <ChevronRight size={16} />
        </button>
        <button className="w-full sm:w-auto px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-colors font-medium text-sm sm:text-base">
          Learn More
        </button>
      </div> */}
    </section>

    <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8">
      <FeatureCard
        icon={<Shield className="w-6 h-6 sm:w-8 sm:h-8" />}
        title="Secure & Encrypted"
        description="Post-quantum cryptography ensures your vote remains secure against future threats."
      />
      <FeatureCard
        icon={<Lock className="w-6 h-6 sm:w-8 sm:h-8" />}
        title="Complete Privacy"
        description="Zero-Knowledge Proofs guarantee voter anonymity while maintaining verifiability."
      />
      <FeatureCard
        icon={<Vote className="w-6 h-6 sm:w-8 sm:h-8" />}
        title="Transparent Results"
        description="Blockchain technology provides immutable audit trails and transparent vote counting."
      />
    </section>

    <section className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
      <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-6 sm:mb-8 text-center">
        How It Works
      </h2>

      <div className="flex flex-col gap-6 sm:hidden">
        {[
          { number: "1", title: "Register",     description: "Verify your identity through secure authentication" },
          { number: "2", title: "Authenticate", description: "Login with one-time credentials and OTP verification" },
          { number: "3", title: "Vote",         description: "Cast your vote securely and anonymously" },
          { number: "4", title: "Verify",       description: "Receive confirmation of your vote submission" },
        ].map((step, i, arr) => (
          <div key={step.number}>
            <Step {...step} />
            {i < arr.length - 1 && (
              <div className="ml-5 mt-4 w-0.5 h-4 bg-blue-200 rounded-full" />
            )}
          </div>
        ))}
      </div>

      <div className="hidden sm:grid sm:grid-cols-4 gap-6">
        <Step number="1" title="Register"     description="Verify your identity through secure authentication" />
        <Step number="2" title="Authenticate" description="Login with one-time credentials and OTP verification" />
        <Step number="3" title="Vote"         description="Cast your vote securely and anonymously" />
        <Step number="4" title="Verify"       description="Receive confirmation of your vote submission" />
      </div>
    </section>

  </div>
);

export default Home;