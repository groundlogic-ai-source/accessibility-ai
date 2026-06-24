import React from 'react';
import { ArrowRight, CheckCircle2, Code2, FileText, Github, Layers, Lock, ShieldCheck, Terminal, Zap } from 'lucide-react';
import { CodeBlock } from '@/components/CodeBlock';
import { Button } from '@/components/ui/button';

export default function Home() {
  const claudeConfig = `{
  "mcpServers": {
    "accessibility-ai": {
      "url": "https://accessibility.groundlogic.ai/mcp",
      "transport": "http"
    }
  }
}`;

  const cursorConfig = `{
  "mcpServers": {
    "accessibility-ai": {
      "url": "https://accessibility.groundlogic.ai/mcp",
      "transport": "streamable-http"
    }
  }
}`;

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center">
              <ShieldCheck className="text-primary h-4 w-4" />
            </div>
            <span className="font-medium text-sm tracking-tight text-foreground">AccessibilityAI</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How it Works</a>
            <a href="#installation" className="hover:text-foreground transition-colors">Installation</a>
          </nav>
          <div className="flex items-center gap-4">
            <a href="https://github.com/groundlogic-ai-source/accessibility-ai" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
              <Github className="h-4 w-4" />
            </a>
            <Button variant="default" size="sm" className="h-8 px-4 text-xs font-medium rounded" asChild>
              <a href="#installation">Quick Start</a>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-24 pb-24 border-b border-border">
          <div className="container mx-auto px-6 max-w-4xl">
            <div className="inline-flex items-center rounded-sm border border-border px-2 py-0.5 text-xs font-medium mb-6 bg-secondary/50 text-secondary-foreground">
              <span className="flex h-1.5 w-1.5 rounded-full bg-foreground/60 mr-2"></span>
              Open Source MCP Server by GroundLogic AI
            </div>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground mb-6 leading-[1.1]">
              Accessibility compliance,<br />
              <span className="text-muted-foreground">automated for developers.</span>
            </h1>
            <p className="text-base text-muted-foreground mb-8 max-w-2xl leading-relaxed">
              Automate weeks of WCAG 2.1 compliance work in minutes. Scan websites, generate AI-powered fixes, and produce complete VPAT 2.5 reports directly from your editor.
            </p>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <Button size="default" className="h-9 px-5 text-sm font-medium rounded" asChild>
                <a href="#installation">
                  <Terminal className="mr-2 h-4 w-4" />
                  Connect Your Editor
                </a>
              </Button>
              <Button size="default" variant="outline" className="h-9 px-5 text-sm font-medium rounded bg-background" asChild>
                <a href="https://github.com/groundlogic-ai-source/accessibility-ai" target="_blank" rel="noreferrer">
                  <Github className="mr-2 h-4 w-4" />
                  View Source
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* Features / 4 Tools */}
        <section id="features" className="py-24 border-b border-border">
          <div className="container mx-auto px-6">
            <div className="mb-12 max-w-2xl">
              <h2 className="text-2xl font-semibold tracking-tight mb-4">Four powerful MCP tools.</h2>
              <p className="text-base text-muted-foreground leading-relaxed">
                AccessibilityAI exposes four specialized Model Context Protocol tools to your AI assistant, giving it the ability to deeply analyze and fix accessibility issues.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-px bg-border/50 overflow-hidden rounded-md border border-border">
              <div className="bg-background p-8">
                <div className="h-8 w-8 text-foreground mb-6">
                  <Layers className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-mono font-medium mb-3">scan_accessibility</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Performs a deep scan using a combination of axe-core and Claude Vision. Detects structural issues, color contrast failures, missing ARIA attributes, and subtle visual violations. Returns structured violations and a unique scan_id.
                </p>
              </div>

              <div className="bg-background p-8">
                <div className="h-8 w-8 text-foreground mb-6">
                  <Code2 className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-mono font-medium mb-3">generate_fixes</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Generates deterministic, AI-powered code fixes for every detected violation. Fixes are batched and formatted to be copy-paste ready for Claude Code or Replit Agent to apply directly to your codebase.
                </p>
              </div>

              <div className="bg-background p-8">
                <div className="h-8 w-8 text-foreground mb-6">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-mono font-medium mb-3">re_verify</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Executes a re-scan of the target pages after fixes have been applied. Generates a diff of resolved violations versus persisting issues, ensuring your fixes actually meet the standard before generating reports.
                </p>
              </div>

              <div className="bg-background p-8">
                <div className="h-8 w-8 text-foreground mb-6">
                  <FileText className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-mono font-medium mb-3">generate_vpat</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Compiles the final scan results into a complete, auditor-ready VPAT 2.5 / EN 301 549 compliance report. Outputs standard JSON format and a highly polished PDF document ready for procurement teams.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* BYOK / Security */}
        <section id="how-it-works" className="py-24 border-b border-border bg-secondary/20">
          <div className="container mx-auto px-6">
            <div className="flex flex-col lg:flex-row items-start gap-16">
              <div className="flex-1 max-w-xl">
                <div className="inline-flex items-center rounded-sm border border-border px-2 py-0.5 text-xs font-medium mb-6 bg-background">
                  <Lock className="h-3 w-3 mr-1.5 text-muted-foreground" />
                  Security First
                </div>
                <h2 className="text-2xl font-semibold tracking-tight mb-4">Bring Your Own Key model.</h2>
                <p className="text-base text-muted-foreground mb-8 leading-relaxed">
                  AccessibilityAI is designed for enterprise security. We don't proxy your requests through our servers or mark up token costs.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-start text-sm">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 mr-3" />
                    <span className="text-foreground">Users supply their own Anthropic key per request.</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 mr-3" />
                    <span className="text-foreground">Keys are never stored on our servers.</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 mr-3" />
                    <span className="text-foreground">Fully transparent open-source implementation.</span>
                  </li>
                </ul>
              </div>
              
              <div className="flex-1 w-full max-w-md lg:ml-auto">
                <div className="bg-background border border-border rounded-md p-6">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
                    <span className="font-mono text-xs font-medium">Request Flow</span>
                    <span className="text-xs text-muted-foreground">Stateless Architecture</span>
                  </div>
                  <div className="space-y-5">
                    <div className="flex items-start gap-4">
                      <div className="h-8 w-8 bg-secondary/50 rounded flex items-center justify-center shrink-0 border border-border">
                        <Terminal className="h-4 w-4 text-foreground" />
                      </div>
                      <div className="flex-1 pt-1.5">
                        <p className="text-sm font-medium leading-none mb-1">Claude Code / Cursor</p>
                        <p className="text-xs text-muted-foreground">Initiates MCP tool call with BYOK</p>
                      </div>
                    </div>
                    <div className="ml-4 border-l border-border h-6"></div>
                    <div className="flex items-start gap-4">
                      <div className="h-8 w-8 bg-secondary/50 rounded flex items-center justify-center shrink-0 border border-border">
                        <ShieldCheck className="h-4 w-4 text-foreground" />
                      </div>
                      <div className="flex-1 pt-1.5">
                        <p className="text-sm font-medium leading-none mb-1">AccessibilityAI Server</p>
                        <p className="text-xs text-muted-foreground">Processes scan & inference statelessly</p>
                      </div>
                    </div>
                    <div className="ml-4 border-l border-border h-6"></div>
                    <div className="flex items-start gap-4">
                      <div className="h-8 w-8 bg-secondary/50 rounded flex items-center justify-center shrink-0 border border-border">
                        <Zap className="h-4 w-4 text-foreground" />
                      </div>
                      <div className="flex-1 pt-1.5">
                        <p className="text-sm font-medium leading-none mb-1">Anthropic API</p>
                        <p className="text-xs text-muted-foreground">Direct connection for inference</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Installation */}
        <section id="installation" className="py-24">
          <div className="container mx-auto px-6">
            <div className="mb-12 max-w-2xl">
              <h2 className="text-2xl font-semibold tracking-tight mb-4">Connect to your AI assistant.</h2>
              <p className="text-base text-muted-foreground leading-relaxed">
                Add the connection string to your editor's MCP configuration file to instantly enable the accessibility toolset.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              <div className="flex flex-col h-full">
                <div className="mb-4">
                  <h3 className="text-sm font-medium mb-1">
                    Claude Desktop / Claude Code
                  </h3>
                  <p className="text-xs text-muted-foreground">Add to <code className="bg-secondary px-1 py-0.5 rounded text-foreground font-mono text-[10px]">claude_desktop_config.json</code> or <code className="bg-secondary px-1 py-0.5 rounded text-foreground font-mono text-[10px]">.mcp.json</code></p>
                </div>
                <CodeBlock 
                  code={claudeConfig} 
                  language="json" 
                  filename="claude_desktop_config.json"
                  className="flex-1 text-xs"
                />
              </div>

              <div className="flex flex-col h-full">
                <div className="mb-4">
                  <h3 className="text-sm font-medium mb-1">
                    Cursor
                  </h3>
                  <p className="text-xs text-muted-foreground">Add to <code className="bg-secondary px-1 py-0.5 rounded text-foreground font-mono text-[10px]">~/.cursor/mcp.json</code></p>
                </div>
                <CodeBlock 
                  code={cursorConfig} 
                  language="json" 
                  filename="mcp.json"
                  className="flex-1 text-xs"
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-10">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm text-foreground">GroundLogic AI</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Building rigorous compliance tools for modern development workflows.
          </div>
          <div className="flex items-center gap-6 text-xs">
            <a href="mailto:info@groundlogic.ai" className="text-muted-foreground hover:text-foreground transition-colors">
              info@groundlogic.ai
            </a>
            <a href="https://github.com/groundlogic-ai-source/accessibility-ai" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
              <Github className="h-3 w-3" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
