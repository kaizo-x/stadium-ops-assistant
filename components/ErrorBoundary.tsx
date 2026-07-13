"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in dashboard:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-center space-y-4 shadow-xl shadow-rose-950/10">
            <div className="text-rose-500 text-5xl">⚠️</div>
            <h1 className="text-xl font-bold tracking-tight text-white">System Operational Error</h1>
            <p className="text-sm text-zinc-400">
              The AURA operations system encountered a critical runtime error. The interface has been isolated to prevent corrupted data dispatches.
            </p>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="w-full px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold rounded transition-all duration-200 ease-in-out cursor-pointer"
            >
              Clear Cache & Reset System
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
