import { useState } from 'react'
import { Github, Globe, ChevronDown } from 'lucide-react'

export default function Navbar() {
  const [open, setOpen] = useState(false)

  const toggle = () => setOpen(v => !v)
  const close = () => setOpen(false)

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Email & Social Scraper
              </h1>
              <p className="text-xs text-gray-500">Advanced Web Scraping Tool</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              <button
                onClick={toggle}
                onBlur={(e) => {
                  // close when tabbing away outside the menu
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) close()
                }}
                className="inline-flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white rounded-md px-2 py-1"
                aria-haspopup="menu"
                aria-expanded={open}
              >
                Documentation
                <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>
              {open && (
                <div
                  className="absolute right-0 mt-2 w-[28rem] max-w-[90vw] bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 overflow-y-auto max-h-[80vh]"
                  role="menu"
                  tabIndex={-1}
                  onMouseLeave={close}
                >
                  <div className="space-y-4 text-sm text-gray-700 leading-6">
                    <div>
                      <h3 className="text-gray-900 font-semibold">Getting started</h3>
                      <ul className="list-disc pl-5 mt-1 space-y-1">
                        <li>Enter one or more website URLs in the input.</li>
                        <li>Or upload a CSV/TXT file containing one URL per line.</li>
                        <li>Click <span className="font-medium">Start Scraping</span> to begin.</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-gray-900 font-semibold">Advanced options</h3>
                      <ul className="list-disc pl-5 mt-1 space-y-1">
                        <li>
                          <span className="font-medium">Depth: 1 level deep</span> — Scrapes the given page and then follows a small number of the most relevant links (prioritizing contact/about/support pages) once.
                        </li>
                        <li>
                          <span className="font-medium">Depth: 2 levels deep</span> — Same as above, then also follows links from those pages. This can find emails located on contact pages or subpages but takes longer.
                        </li>
                        <li>
                          <span className="font-medium">Timeout</span> — Maximum time to wait for each page to load before skipping.
                        </li>
                        <li>
                          <span className="font-medium">Follow redirects</span> — If enabled, follows HTTP redirects (recommended).
                        </li>
                        <li>
                          <span className="font-medium">Extract phone numbers / addresses</span> — Adds basic detection of phone and address patterns.
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-gray-900 font-semibold">What gets extracted</h3>
                      <ul className="list-disc pl-5 mt-1 space-y-1">
                        <li>Emails in plain text (e.g. info@example.com) and common obfuscated forms.</li>
                        <li>Emails in <span className="font-mono">mailto:</span> links in HTML.</li>
                        <li>Social links (Facebook, Instagram, X/Twitter, LinkedIn, YouTube, TikTok, etc.).</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-gray-900 font-semibold">Email verification (auto)</h3>
                      <ul className="list-disc pl-5 mt-1 space-y-1">
                        <li><span className="font-medium">Where to see it</span> — A Verification column appears next to Emails with a status badge and score.</li>
                        <li><span className="font-medium">Criteria used</span>:
                          <ul className="list-disc pl-5 mt-1 space-y-1">
                            <li>Syntax validity (RFC-compliant address format)</li>
                            <li>Disposable domain detection (e.g., temp-mail providers)</li>
                            <li>DNS MX records present for the domain</li>
                            <li>Quick SMTP greeting reachability to the top MX</li>
                          </ul>
                        </li>
                        <li><span className="font-medium">Statuses</span> — deliverable, risky, undeliverable (based on combined signals).</li>
                        <li><span className="font-medium">Score</span> — a heuristic confidence number:
                          <ul className="list-disc pl-5 mt-1 space-y-1">
                            <li>+2 syntax valid, +3 MX found, +2 SMTP reachable</li>
                            <li>−3 disposable domain</li>
                            <li>≥5 deliverable, ≥3 risky, else undeliverable</li>
                          </ul>
                        </li>
                        <li><span className="font-medium">Notes</span> — paid tools may also probe catch‑all, greylisting, and inbox existence; this tool performs safe, lightweight checks to avoid blocking.</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-gray-900 font-semibold">Tips for better results</h3>
                      <ul className="list-disc pl-5 mt-1 space-y-1">
                        <li>If the email is not on the homepage, try depth 1–2 to scan contact/about pages.</li>
                        <li>Some sites block scraping by region or provider. If you see a block error, use a VPN or different IP/location.</li>
                        <li>Limit very large URL lists or increase timeouts for slow sites.</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-gray-900 font-semibold">Reading results</h3>
                      <ul className="list-disc pl-5 mt-1 space-y-1">
                        <li><span className="font-medium">Emails</span> — All unique emails found across the scanned pages.</li>
                        <li><span className="font-medium">Social links</span> — First detected link for each platform.</li>
                        <li><span className="font-medium">Error</span> — Any issue encountered (e.g., regional block with VPN suggestion).</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-gray-900 font-semibold">Export</h3>
                      <ul className="list-disc pl-5 mt-1 space-y-1">
                        <li>Download CSV or JSON after a run. Files are saved in the backend <span className="font-mono">/backend/output</span> folder with a timestamp.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="View on GitHub"
            >
              <Github className="w-5 h-5" />
            </a>
            
            <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>API Status: Online</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
} 