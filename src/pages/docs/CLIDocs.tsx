import { CodeBlock } from "../../components/CodeBlock";

export function CLIDocs() {
  return (
    <div className="max-w-4xl space-y-12 pb-20">
      <div className="space-y-4">
        <h1 className="text-4xl font-black text-[#0f172a]">CLI Reference</h1>
        <p className="text-lg text-[#0f172a]/60 leading-relaxed">
          Manage your BugPulse instance without leaving your terminal. The CLI provides a powerful 
          interface for listing bugs, updating statuses, viewing stats, and even submitting new reports.
        </p>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-[#0f172a]" id="cli-installation">Installation</h2>
        <p className="text-[#0f172a]/70">
          Install the CLI globally using npm to make the `bugpulse` command available everywhere.
        </p>
        <CodeBlock 
          title="Terminal"
          language="bash"
          code={`npm install -g bugpulse-cli`}
        />
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-[#0f172a]" id="cli-configuration">Configuration</h2>
        <p className="text-[#0f172a]/70">
          Point the CLI at your running BugPulse server.
        </p>
        <CodeBlock 
          title="Terminal"
          language="bash"
          code={`bugpulse config --api-url https://api.yourdomain.com`}
        />
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-[#0f172a]" id="cli-commands">Commands</h2>
        
        <div className="space-y-8 mt-6">
          <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-sm">
            <h3 className="text-lg font-bold text-[#0f172a] mb-2 font-mono">bugpulse list</h3>
            <p className="text-sm text-slate-600 mb-4">List and filter all bug reports.</p>
            <CodeBlock 
              language="bash"
              code={`bugpulse list                             # all bugs
bugpulse list --status open              # only open bugs
bugpulse list --severity P0             # critical bugs only
bugpulse list --search "payment"        # search by title
bugpulse list --component auth          # filter by component`}
            />
          </div>

          <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-sm">
            <h3 className="text-lg font-bold text-[#0f172a] mb-2 font-mono">bugpulse update {'<id>'}</h3>
            <p className="text-sm text-slate-600 mb-4">Update the status of a bug.</p>
            <CodeBlock 
              language="bash"
              code={`bugpulse update 42 --status resolved
bugpulse update 42 --status in_progress`}
            />
          </div>
          
          <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-sm">
            <h3 className="text-lg font-bold text-[#0f172a] mb-2 font-mono">bugpulse watch</h3>
            <p className="text-sm text-slate-600 mb-4">Stream new open bugs into your terminal in real-time as they are reported.</p>
            <CodeBlock 
              language="bash"
              code={`bugpulse watch                            # poll every 10 seconds
bugpulse watch --interval 5               # poll every 5 seconds
bugpulse watch --severity P0              # only watch for critical bugs`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
