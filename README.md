# Sentinel — Autonomous Codebase Auditor Dashboard

![react](https://img.shields.io/badge/react-18.3-blue) ![vite](https://img.shields.io/badge/vite-6.0-purple) ![tailwindcss](https://img.shields.io/badge/tailwindcss-3.4-cyan) ![license](https://img.shields.io/badge/license-MIT-green)

Sentinel is an autonomous codebase auditing system dashboard. It visualizes the multi-agent pipeline that hunts for vulnerabilities, verifies exploits in isolated execution environments, ranks findings, generates minimal verified patches, and opens reviewable draft pull requests.

## Features

- **Interactive Multi-Agent Pipeline Graph**: Real-time visualization of pipeline stages: Ingest &rarr; Callgraph &rarr; AST Index &rarr; Static Analysis &rarr; Bug Hunt &rarr; ML Triage &rarr; Exploit Verify &rarr; Severity Rank &rarr; Fix Generation &rarr; Human Review &rarr; Report & PR.
- **Run Management & Filtering**: Browse audit runs, inspect running or completed analyses, monitor dollar budget and token burn rate in real time, and trigger new multi-repository audit jobs.
- **Finding Inspection & Triage**: Drill down into verified vulnerabilities with syntax-highlighted unified diffs, reproducible test cases, sandbox execution traces, and regression logs.
- **Human-in-the-Loop Review**: Approve, reject, or suppress findings with audit notes before PRs are created.
- **Multi-Arm Benchmarking**: Compare detection precision, recall, and cost across Sentinel Full Graph, No-Triage, and Single-Shot LLM review comparison baselines.
- **Telemetry & Configuration**: Fine-tune budget caps, target limits, model routing, and triage confidence thresholds.
- **Built-in Mock Server & Live API Switch**: Seamlessly connects to real Sentinel API instances or runs standalone with full mock simulation and streaming SSE events.

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The application runs on `http://localhost:3000`.

### Production Build

```bash
npm run build
npm run preview
```

## Architecture

- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS with custom glassmorphism and light/dark theme support
- **State & Streaming**: Custom React hooks with live Server-Sent Events (SSE) support and in-memory simulated client
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Data Visualization**: Recharts
