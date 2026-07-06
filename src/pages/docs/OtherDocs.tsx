export function APIReference() {
  return (
    <div className="max-w-4xl space-y-12 pb-20">
      <div className="space-y-4">
        <h1 className="text-4xl font-black text-[#0f172a]">REST API Reference</h1>
        <p className="text-lg text-[#0f172a]/60 leading-relaxed">
          BugPulse provides a full REST API for programmatic access to your bugs, agents, and analytics.
        </p>
      </div>
      
      <div className="p-8 rounded-2xl bg-white border border-[#0f172a]/10">
        <h3 className="text-xl font-bold text-[#0f172a] mb-2">Coming Soon</h3>
        <p className="text-[#0f172a]/60">
          We are finalizing our OpenAPI specification and will publish interactive API documentation here shortly.
        </p>
      </div>
    </div>
  );
}

export function IntegrationsDocs() {
  return (
    <div className="max-w-4xl space-y-12 pb-20">
      <div className="space-y-4">
        <h1 className="text-4xl font-black text-[#0f172a]">Integrations Guide</h1>
        <p className="text-lg text-[#0f172a]/60 leading-relaxed">
          Learn how to connect BugPulse to your existing tools.
        </p>
      </div>
      
      <div className="p-8 rounded-2xl bg-white border border-[#0f172a]/10">
        <h3 className="text-xl font-bold text-[#0f172a] mb-2">Coming Soon</h3>
        <p className="text-[#0f172a]/60">
          Integration guides for Slack, GitHub, and Webhooks are being updated. Check back soon.
        </p>
      </div>
    </div>
  );
}

export function SelfHostingDocs() {
  return (
    <div className="max-w-4xl space-y-12 pb-20">
      <div className="space-y-4">
        <h1 className="text-4xl font-black text-[#0f172a]">Self-Hosting</h1>
        <p className="text-lg text-[#0f172a]/60 leading-relaxed">
          BugPulse is open source and can be self-hosted on your own infrastructure.
        </p>
      </div>
      
      <div className="p-8 rounded-2xl bg-white border border-[#0f172a]/10">
        <h3 className="text-xl font-bold text-[#0f172a] mb-2">Coming Soon</h3>
        <p className="text-[#0f172a]/60">
          Docker Compose and deployment guides are coming in the next release.
        </p>
      </div>
    </div>
  );
}
