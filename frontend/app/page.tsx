"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  CheckCircle,
  FileText,
  FolderOpen,
  Shield,
  TrendingUp,
  ArrowRight,
  Github,
  Linkedin,
} from "lucide-react";
import { getAccessToken } from "@/lib/auth";

export default function LandingPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    setIsAuthenticated(!!token);
    setLoading(false);
  }, []);

  if (loading) {
    return null; // Or a spinner
  }

  const ctaDestination = isAuthenticated ? "/dashboard" : "/register";
  const ctaText = isAuthenticated ? "Go to Dashboard" : "Start using GoGet-a-Job";

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900">
      {/* Navigation */}
      <nav className="bg-navy-900/50 backdrop-blur-sm border-b border-navy-700">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-pink-500" />
            <span className="text-xl font-bold text-white">GoGet-a-Job</span>
          </div>
          <Link href={isAuthenticated ? "/dashboard" : "/login"}>
            <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
              {isAuthenticated ? "Dashboard" : "Continue to app"} →
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
          GoGet-a-Job
        </h1>
        <h2 className="text-2xl md:text-3xl font-semibold mb-4">
          <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            Track applications. Build CVs in minutes.
          </span>
        </h2>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-12">
          One place to manage your job hunt: applications, progress, and role-specific CVs —
          without rewriting everything every time.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href={ctaDestination}>
            <Button size="lg" className="px-8 py-6 text-lg font-semibold bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600">
              {ctaText}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          {!isAuthenticated && (
            <Link href="/login">
              <Button variant="secondary" size="lg" className="px-8 py-6 text-lg">
                Log in
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* Problem Section */}
      <section className="container mx-auto px-4 py-16">
        <Card className="bg-navy-800/50 backdrop-blur-sm border-navy-700 p-8 md:p-12">
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-6">
            Job hunting gets messy fast:
          </h3>
          <ul className="space-y-4 text-lg text-gray-300">
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">✗</span>
              <span>Applications are scattered across bookmarks, notes, emails.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">✗</span>
              <span>You forget what you sent and when.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-400 mt-1">✗</span>
              <span>Tailoring CVs takes forever — and you end up duplicating the same info.</span>
            </li>
          </ul>
        </Card>
      </section>

      {/* Solution Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
            GoGet-a-Job fixes that:
          </h3>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          <Card className="bg-navy-800/50 backdrop-blur-sm border-navy-700 p-6">
            <CheckCircle className="h-8 w-8 text-green-400 mb-4" />
            <p className="text-lg text-gray-200">
              Track every application with status, dates, and notes.
            </p>
          </Card>

          <Card className="bg-navy-800/50 backdrop-blur-sm border-navy-700 p-6">
            <CheckCircle className="h-8 w-8 text-green-400 mb-4" />
            <p className="text-lg text-gray-200">
              Build a reusable Experience Library once.
            </p>
          </Card>

          <Card className="bg-navy-800/50 backdrop-blur-sm border-navy-700 p-6">
            <CheckCircle className="h-8 w-8 text-green-400 mb-4" />
            <p className="text-lg text-gray-200">
              Create multiple CV versions by selecting only relevant items.
            </p>
          </Card>

          <Card className="bg-navy-800/50 backdrop-blur-sm border-navy-700 p-6">
            <CheckCircle className="h-8 w-8 text-green-400 mb-4" />
            <p className="text-lg text-gray-200">
              Preview your CV instantly with a clean, professional template.
            </p>
          </Card>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold text-white text-center mb-12">
          Everything you need
        </h3>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-navy-800/50 backdrop-blur-sm border-navy-700 p-6 text-center">
            <TrendingUp className="h-12 w-12 text-pink-500 mx-auto mb-4" />
            <h4 className="text-xl font-semibold text-white mb-3">Application Tracker</h4>
            <p className="text-gray-300">
              Statuses, notes, search, filters, timeline
            </p>
          </Card>

          <Card className="bg-navy-800/50 backdrop-blur-sm border-navy-700 p-6 text-center">
            <FolderOpen className="h-12 w-12 text-purple-500 mx-auto mb-4" />
            <h4 className="text-xl font-semibold text-white mb-3">Experience Library</h4>
            <p className="text-gray-300">
              Add work/skills/projects once, reuse everywhere
            </p>
          </Card>

          <Card className="bg-navy-800/50 backdrop-blur-sm border-navy-700 p-6 text-center">
            <FileText className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <h4 className="text-xl font-semibold text-white mb-3">Multiple CVs</h4>
            <p className="text-gray-300">
              Tailor in seconds by selecting items
            </p>
          </Card>

          <Card className="bg-navy-800/50 backdrop-blur-sm border-navy-700 p-6 text-center">
            <Shield className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h4 className="text-xl font-semibold text-white mb-3">Privacy-first</h4>
            <p className="text-gray-300">
              Your data stays yours (no public sharing by default)
            </p>
          </Card>
        </div>
      </section>

      {/* Screenshots Section - Auto-sliding Carousel */}
      <section className="py-16 overflow-hidden">
        <div className="container mx-auto px-4 mb-12">
          <h3 className="text-3xl font-bold text-white text-center">
            See it in action
          </h3>
        </div>

        <div className="relative py-8">
          {/* Gradient overlays for fade effect */}
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-navy-900 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-navy-900 to-transparent z-10 pointer-events-none" />
          
          {/* Sliding container - duplicate content for seamless loop */}
          <div className="flex gap-6 animate-scroll-seamless group-hover:animation-play-state-paused">
            {/* Render screenshots 3 times for smooth infinite loop */}
            {Array(3).fill([
              { name: 'Dashboard', file: 'dashboard.png' },
              { name: 'Applications Tracker', file: 'applications.png' },
              { name: 'CV Editor', file: 'cv-editor.png' },
              { name: 'CV Preview', file: 'cv-preview.png' },
              { name: 'Experience Library', file: 'experience-library.png' },
              { name: 'Settings', file: 'settings.png' },
            ]).flat().map((screenshot, index) => (
              <div
                key={`screenshot-${index}`}
                className="flex-shrink-0 w-[600px] group"
              >
                <Card className="bg-navy-800/50 backdrop-blur-sm border-navy-700 p-4 overflow-visible h-full transition-all duration-300 hover:scale-110 hover:z-50 hover:shadow-2xl hover:shadow-pink-500/20">
                  <div className="aspect-video bg-navy-700/50 rounded-lg overflow-hidden ring-2 ring-transparent group-hover:ring-pink-500/50 transition-all duration-300">
                    <img
                      src={`/screenshots/${screenshot.file}`}
                      alt={screenshot.name}
                      className="w-full h-full object-cover transition-transform duration-300"
                    />
                  </div>
                  <p className="text-sm text-gray-300 mt-3 text-center font-medium group-hover:text-pink-400 transition-colors duration-300">
                    {screenshot.name}
                  </p>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Creator Section */}
      <section className="container mx-auto px-4 py-16">
        <Card className="bg-navy-800/50 backdrop-blur-sm border-navy-700 p-8 md:p-12 max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-white mb-4">Built by Valle Vaalanti</h3>
          <p className="text-lg text-gray-300 mb-6">
            I&apos;m Valle — a Finnish entrepreneur and developer-in-transition. I&apos;ve run an
            electrician company (VSP-Group) and studied software development at Hive Helsinki.
            I built GoGet-a-Job to make job hunting less chaotic and more systematic.
          </p>
          <p className="text-gray-400 mb-6">
            GoGet-a-Job is free to use. If it helps you, share it with a friend.
          </p>
          <div className="flex gap-4">
            <a
              href="https://www.linkedin.com/in/vallevaalanti"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-400 hover:text-blue-300"
            >
              <Linkedin className="h-5 w-5" />
              LinkedIn
            </a>
            <a
              href="https://github.com/vallevaalanti"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-400 hover:text-gray-300"
            >
              <Github className="h-5 w-5" />
              GitHub
            </a>
          </div>
        </Card>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h3 className="text-3xl md:text-4xl font-bold text-white mb-8">
          Ready to organize your job hunt?
        </h3>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href={ctaDestination}>
            <Button size="lg" className="px-10 py-6 text-xl font-semibold bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600">
              {ctaText}
              <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
          </Link>
          {!isAuthenticated && (
            <Link href="/login">
              <Button variant="secondary" size="lg" className="px-10 py-6 text-xl">
                Log in
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-navy-700 py-8">
        <div className="container mx-auto px-4 text-center text-gray-400">
          <p>© 2026 GoGet-a-Job. Built with ❤️ for job seekers.</p>
        </div>
      </footer>
    </div>
  );
}
