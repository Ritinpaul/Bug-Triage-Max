import { CodeBlock } from "../../components/CodeBlock";

export function MCPDocs() {
  return (
    <div className="max-w-4xl space-y-12 pb-20">
      <div className="space-y-4">
        <h1 className="text-4xl font-black text-[#0f172a]">MCP Server</h1>
        <p className="text-lg text-[#0f172a]/60 leading-relaxed">
          The BugPulse MCP (Model Context Protocol) server allows AI assistants like Claude Desktop 
          and Cursor to directly interact with your bug triage pipeline. They can query bugs, assign them, 
          update statuses, and fetch dashboard stats.
        </p>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-[#0f172a]" id="installation">Installation & Build</h2>
        <p className="text-[#0f172a]/70">
          The MCP server is provided as an npm package. You can run it directly using `npx`.
        </p>
        <CodeBlock 
          title="Terminal"
          language="bash"
          code={`# Run directly via npx
npx @bugpulse/mcp

# Or install globally
npm install -g @bugpulse/mcp`}
        />
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-[#0f172a]" id="configuration">Configuration</h2>
        <p className="text-[#0f172a]/70">
          The server requires the `BUGPULSE_API_URL` environment variable to know where your BugPulse instance is running.
        </p>
        <CodeBlock 
          title="Terminal"
          language="bash"
          code={`export BUGPULSE_API_URL=https://api.yourdomain.com`}
        />
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-[#0f172a]" id="claude-desktop">Claude Desktop Integration</h2>
        <p className="text-[#0f172a]/70">
          To use BugPulse with Claude Desktop, add the following to your `claude_desktop_config.json`:
        </p>
        <CodeBlock 
          title="claude_desktop_config.json"
          language="json"
          code={`{
  "mcpServers": {
    "bugpulse": {
      "command": "npx",
      "args": ["-y", "@bugpulse/mcp"],
      "env": {
        "BUGPULSE_API_URL": "https://api.yourdomain.com"
      }
    }
  }
}`}
        />
        <div className="bg-slate-100 rounded-lg p-4 text-sm text-slate-600">
          <strong>Config file location:</strong><br/>
          macOS: <code>~/Library/Application Support/Claude/claude_desktop_config.json</code><br/>
          Windows: <code>%APPDATA%\\Claude\\claude_desktop_config.json</code>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-[#0f172a]" id="cursor">Cursor Integration</h2>
        <p className="text-[#0f172a]/70">
          In Cursor, go to <strong>Settings {'>'} Features {'>'} MCP</strong> and add a new server:
        </p>
        <ul className="list-disc list-inside text-[#0f172a]/70 space-y-2 ml-2">
          <li><strong>Type:</strong> command</li>
          <li><strong>Name:</strong> bugpulse</li>
          <li><strong>Command:</strong> <code>npx -y @bugpulse/mcp</code></li>
        </ul>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-[#0f172a]" id="tools">Available Tools Reference</h2>
        
        <div className="space-y-8 mt-6">
          <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-sm">
            <h3 className="text-lg font-bold text-[#0f172a] mb-2 font-mono">list_bugs</h3>
            <p className="text-sm text-slate-600 mb-4">Search and filter bug reports.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="py-2 px-4 font-semibold rounded-tl-lg">Parameter</th>
                    <th className="py-2 px-4 font-semibold">Type</th>
                    <th className="py-2 px-4 font-semibold rounded-tr-lg">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2 px-4 font-mono text-xs text-sky-600">status</td>
                    <td className="py-2 px-4 font-mono text-xs">string</td>
                    <td className="py-2 px-4 text-slate-600">open | in_progress | resolved | closed | all</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 font-mono text-xs text-sky-600">severity</td>
                    <td className="py-2 px-4 font-mono text-xs">string</td>
                    <td className="py-2 px-4 text-slate-600">P0 | P1 | P2 | P3 | all</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 font-mono text-xs text-sky-600">component</td>
                    <td className="py-2 px-4 font-mono text-xs">string</td>
                    <td className="py-2 px-4 text-slate-600">Component name (e.g. auth)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-sm">
            <h3 className="text-lg font-bold text-[#0f172a] mb-2 font-mono">update_bug_status</h3>
            <p className="text-sm text-slate-600 mb-4">Update a bug's status.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="py-2 px-4 font-semibold rounded-tl-lg">Parameter</th>
                    <th className="py-2 px-4 font-semibold">Type</th>
                    <th className="py-2 px-4 font-semibold rounded-tr-lg">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2 px-4 font-mono text-xs text-sky-600">id</td>
                    <td className="py-2 px-4 font-mono text-xs">number</td>
                    <td className="py-2 px-4 text-slate-600">Bug ID (required)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 font-mono text-xs text-sky-600">status</td>
                    <td className="py-2 px-4 font-mono text-xs">string</td>
                    <td className="py-2 px-4 text-slate-600">New status (required)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-sm">
            <h3 className="text-lg font-bold text-[#0f172a] mb-2 font-mono">search_similar_bugs</h3>
            <p className="text-sm text-slate-600 mb-4">Search for similar bugs based on natural language or description.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="py-2 px-4 font-semibold rounded-tl-lg">Parameter</th>
                    <th className="py-2 px-4 font-semibold">Type</th>
                    <th className="py-2 px-4 font-semibold rounded-tr-lg">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2 px-4 font-mono text-xs text-sky-600">query</td>
                    <td className="py-2 px-4 font-mono text-xs">string</td>
                    <td className="py-2 px-4 text-slate-600">Natural language query describing the issue (required)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
