import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  className?: string;
}

export function CodeBlock({ code, language = 'json', filename, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className={cn("rounded-lg border border-border bg-[#0d1117] overflow-hidden shadow-sm", className)}>
      {filename && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-[#161b22]">
          <span className="text-xs font-mono text-muted-foreground">{filename}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-white"
            onClick={copyToClipboard}
            data-testid={`copy-btn-${filename.replace(/[^a-zA-Z0-9]/g, '-')}`}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
      )}
      <div className="relative group">
        {!filename && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-white opacity-0 group-hover:opacity-100 transition-opacity bg-[#161b22]/50 hover:bg-[#161b22]"
            onClick={copyToClipboard}
            data-testid="copy-btn-unnamed"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        )}
        <pre className="p-4 overflow-x-auto text-sm font-mono leading-relaxed text-[#c9d1d9]">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}
