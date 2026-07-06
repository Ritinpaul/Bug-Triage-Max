import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
}

export function CodeBlock({ code, language = "bash", title }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200/50 bg-[#0f172a] shadow-lg shadow-slate-900/10 my-6">
      {title && (
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-white/5">
          <span className="text-xs font-mono text-slate-300">{title}</span>
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">{language}</span>
        </div>
      )}
      {!title && (
        <div className="flex items-center justify-end px-3 py-1.5 bg-slate-800/20 border-b border-white/5">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">{language}</span>
        </div>
      )}
      <div className="relative group">
        <button
          onClick={handleCopy}
          className="absolute right-3 top-3 p-2 rounded-lg bg-white/10 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20 hover:text-white"
          aria-label="Copy code"
        >
          {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
        </button>
        <div className="overflow-x-auto p-4 text-sm font-mono text-slate-50 leading-relaxed">
          <pre>
            <code>{code}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
