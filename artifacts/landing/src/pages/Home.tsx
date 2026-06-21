import React from 'react';
import { ArrowRight, CheckCircle2, Code2, FileText, Github, Layers, Lock, ShieldCheck, Terminal, Zap } from 'lucide-react';
import { CodeBlock } from '@/components/CodeBlock';
import { Button } from '@/components/ui/button';

export default function Home() {
  const claudeConfig = `{
  "mcpServers": {
    "accessibility-ai": {
      "url": "https://accessibilityai.replit.app/mcp",
      "transport": "http"
    }
  }
}`;

  const cursorConfig = `{
  "mcpServers": {
    "accessibility-ai": {
      "url": "https://accessibilityai.replit.app/mcp",
      "transport": "streamable-http"
    }
  }
}`;

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary rounded-md flex items-center justify-center">
              <ShieldCheck className="text-white h-5 w-5" />
            </div>
            <span className="font-bold tracking-tight text-foreground">AccessibilityAI</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How it Works</a>
            <a href="#installation" className="hover:text-foreground transition-colors">Installation</a>
          </nav>
          <div className="flex items-center gap-4">
            <a href="https://github.com/groundlogic-ai-source/accessibility-ai" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
              <Github className="h-5 w-5" />
            </a>
            <Button variant="default" size="sm" asChild>
              <a href="#installation">Quick Start</a>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-24 pb-32 overflow-hidden border-b border-border">
          <div className="absolute inset-0 grid-pattern opacity-60 pointer-events-none" />
          <div className="container relative mx-auto px-4 md:px-8 text-center max-w-4xl">
            <div className="inline-flex items-center rounded-full border border-border px-3 py-1 text-sm font-medium mb-8 bg-background shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
              Open Source MCP Server by GroundLogic AI
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-foreground mb-6 leading-tight">
              Accessibility compliance,<br />
              <span className="text-muted-foreground">automated for developers.</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Automate weeks of WCAG 2.1 compliance work in minutes. Scan websites, generate AI-powered fixes, and produce complete VPAT 2.5 reports directly from your editor.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="h-12 px-8 text-base" asChild>
                <a href="#installation">
                  <Terminal className="mr-2 h-5 w-5" />
                  Install MCP Server
                </a>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-base bg-background" asChild>
                <a href="https://github.com/groundlogic-ai-source/accessibility-ai" target="_blank" rel="noreferrer">
                  <Github className="mr-2 h-5 w-5" />
                  View Source
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* Features / 4 Tools */}
        <section id="features" className="py-24 bg-secondary/30">
          <div className="container mx-auto px-4 md:px-8">
            <div className="mb-16 max-w-3xl">
              <h2 className="text-3xl font-bold tracking-tight mb-4">Four powerful MCP tools.</h2>
              <p className="text-lg text-muted-foreground">
                AccessibilityAI exposes four specialized Model Context Protocol tools to your AI assistant, giving it the ability to deeply analyze and fix accessibility issues.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-card border border-border rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="h-12 w-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center mb-6">
                  <Layers className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold font-mono mb-3">scan_accessibility</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Performs a deep scan using a combination of axe-core and Claude Vision. Detects structural issues, color contrast failures, missing ARIA attributes, and subtle visual violations. Returns structured violations and a unique scan_id.
                </p>
              </div>

              <div className="bg-card border border-border rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="h-12 w-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center mb-6">
                  <Code2 className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold font-mono mb-3">generate_fixes</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Generates deterministic, AI-powered code fixes for every detected violation. Fixes are batched and formatted to be copy-paste ready for Claude Code or Replit Agent to apply directly to your codebase.
                </p>
              </div>

              <div className="bg-card border border-border rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="h-12 w-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center mb-6">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold font-mono mb-3">re_verify</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Executes a re-scan of the target pages after fixes have been applied. Generates a diff of resolved violations versus persisting issues, ensuring your fixes actually meet the standard before generating reports.
                </p>
              </div>

              <div className="bg-card border border-border rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="h-12 w-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center mb-6">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold font-mono mb-3">generate_vpat</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Compiles the final scan results into a complete, auditor-ready VPAT 2.5 / EN 301 549 compliance report. Outputs standard JSON format and a highly polished PDF document ready for procurement teams.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* BYOK / Security */}
        <section id="how-it-works" className="py-24 border-y border-border overflow-hidden relative">
          <div className="container mx-auto px-4 md:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="flex-1">
                <div className="inline-flex items-center rounded-full border border-border px-3 py-1 text-sm font-medium mb-6 bg-secondary/50">
                  <Lock className="h-4 w-4 mr-2 text-muted-foreground" />
                  Security First
                </div>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">Bring Your Own Key model.</h2>
                <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                  AccessibilityAI is designed for enterprise security. We don't proxy your requests through our servers or mark up token costs.
                </p>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5 mr-3" />
                    <span className="text-foreground">Users supply their own Anthropic key per request.</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5 mr-3" />
                    <span className="text-foreground">Keys are never stored on our servers.</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5 mr-3" />
                    <span className="text-foreground">Fully transparent open-source implementation.</span>
                  </li>
                </ul>
              </div>
              <div className="flex-1 w-full max-w-xl">
                <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
                    <span className="font-mono text-sm font-semibold">Request Flow</span>
                    <span className="text-xs text-muted-foreground">Stateless Architecture</span>
                  </div>
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 bg-secondary rounded-lg flex items-center justify-center shrink-0">
                        <Terminal className="h-5 w-5 text-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Claude Code / Cursor</p>
                        <p className="text-xs text-muted-foreground">Initiates MCP tool call with BYOK</p>
                      </div>
                    </div>
                    <div className="ml-5 border-l-2 border-dashed border-border h-8"></div>
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">AccessibilityAI Server</p>
                        <p className="text-xs text-muted-foreground">Processes scan & inference statelessly</p>
                      </div>
                    </div>
                    <div className="ml-5 border-l-2 border-dashed border-border h-8"></div>
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 bg-secondary rounded-lg flex items-center justify-center shrink-0">
                        <Zap className="h-5 w-5 text-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Anthropic API</p>
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
        <section id="installation" className="py-24 bg-background">
          <div className="container mx-auto px-4 md:px-8">
            <div className="mb-16 max-w-3xl">
              <h2 className="text-3xl font-bold tracking-tight mb-4">Connect to your AI assistant.</h2>
              <p className="text-lg text-muted-foreground">
                Add the connection string to your editor's MCP configuration file to instantly enable the accessibility toolset.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              <div className="flex flex-col h-full">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold flex items-center">
                    Claude Desktop / Claude Code
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">Add to <code className="bg-secondary px-1.5 py-0.5 rounded text-foreground font-mono text-xs">claude_desktop_config.json</code> or <code className="bg-secondary px-1.5 py-0.5 rounded text-foreground font-mono text-xs">.mcp.json</code></p>
                </div>
                <CodeBlock 
                  code={claudeConfig} 
                  language="json" 
                  filename="claude_desktop_config.json"
                  className="flex-1 shadow-md"
                />
              </div>

              <div className="flex flex-col h-full">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold flex items-center">
                    Cursor
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">Add to <code className="bg-secondary px-1.5 py-0.5 rounded text-foreground font-mono text-xs">~/.cursor/mcp.json</code></p>
                </div>
                <CodeBlock 
                  code={cursorConfig} 
                  language="json" 
                  filename="mcp.json"
                  className="flex-1 shadow-md"
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-12">
        <div className="container mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">GroundLogic AI</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Building rigorous compliance tools for modern development workflows.
          </div>
          <div className="flex items-center gap-6 text-sm">
            <a href="mailto:info@groundlogic.ai" className="text-muted-foreground hover:text-foreground font-medium transition-colors">
              info@groundlogic.ai
            </a>
            <a href="https://github.com/groundlogic-ai-source/accessibility-ai" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
              <Github className="h-4 w-4" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
