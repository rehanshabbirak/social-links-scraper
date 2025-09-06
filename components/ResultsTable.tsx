import { useEffect, useMemo, useState } from 'react'
import { Download, Copy, Check, ExternalLink, Filter, Search } from 'lucide-react'
import toast from 'react-hot-toast'

interface ScrapingResult {
  website: string
  emails: string[]
  socialLinks: {
    facebook?: string
    twitter?: string
    linkedin?: string
    instagram?: string
    youtube?: string
    tiktok?: string
    pinterest?: string
    snapchat?: string
    reddit?: string
    telegram?: string
    whatsapp?: string
    discord?: string
  }
  phoneNumbers?: string[]
  addresses?: string[]
  error?: string
}

interface ResultsTableProps {
  results: ScrapingResult[]
}

export default function ResultsTable({ results }: ResultsTableProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'with-emails' | 'with-social' | 'errors'>('all')
  const [verifications, setVerifications] = useState<Record<string, { status?: string, score?: number }>>({})

  const allEmails = useMemo(() => {
    const set = new Set<string>()
    results.forEach(r => r.emails.forEach(e => set.add(e)))
    return Array.from(set)
  }, [results])

  useEffect(() => {
    let cancelled = false
    const toVerify = allEmails.filter(e => !verifications[e])
    if (toVerify.length === 0) return
    ;(async () => {
      try {
        const res = await fetch('/api/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emails: toVerify.slice(0, 200) })
        })
        const data = await res.json()
        if (!data?.success || !Array.isArray(data.results)) return
        if (cancelled) return
        setVerifications(prev => {
          const next = { ...prev }
          for (const r of data.results) {
            if (r?.email) next[r.email] = { status: r.status, score: r.score }
          }
          return next
        })
      } catch {}
    })()
    return () => { cancelled = true }
  }, [allEmails])

  const statusColor = (status?: string) => {
    switch (status) {
      case 'deliverable': return 'bg-green-100 text-green-800'
      case 'risky': return 'bg-amber-100 text-amber-800'
      case 'undeliverable': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      toast.success('Copied to clipboard!')
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch (err) {
      toast.error('Failed to copy to clipboard')
    }
  }

  const exportToCSV = () => {
    const headers = [
      'Website', 'Emails', 'Facebook', 'Twitter', 'LinkedIn', 'Instagram', 
      'YouTube', 'TikTok', 'Pinterest', 'Snapchat', 'Reddit', 'Telegram', 
      'WhatsApp', 'Discord', 'Phone Numbers', 'Addresses', 'Error'
    ]
    const csvContent = [
      headers.join(','),
      ...filteredResults.map(result => [
        result.website,
        result.emails.join('; '),
        result.socialLinks.facebook || '',
        result.socialLinks.twitter || '',
        result.socialLinks.linkedin || '',
        result.socialLinks.instagram || '',
        result.socialLinks.youtube || '',
        result.socialLinks.tiktok || '',
        result.socialLinks.pinterest || '',
        result.socialLinks.snapchat || '',
        result.socialLinks.reddit || '',
        result.socialLinks.telegram || '',
        result.socialLinks.whatsapp || '',
        result.socialLinks.discord || '',
        result.phoneNumbers?.join('; ') || '',
        result.addresses?.join('; ') || '',
        result.error || ''
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `scraping-results-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('CSV exported successfully!')
  }

  const exportToJSON = () => {
    const dataStr = JSON.stringify(filteredResults, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `scraping-results-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('JSON exported successfully!')
  }

  const getSocialIcon = (platform: string) => {
    const icons = {
      facebook: '🔵',
      twitter: '🐦',
      linkedin: '💼',
      instagram: '📷',
      youtube: '🔴',
      tiktok: '🎵',
      pinterest: '📌',
      snapchat: '👻',
      reddit: '🤖',
      telegram: '📡',
      whatsapp: '💬',
      discord: '🎮'
    }
    return icons[platform as keyof typeof icons] || '🔗'
  }

  const getSocialColor = (platform: string) => {
    const colors = {
      facebook: 'bg-blue-100 text-blue-800',
      twitter: 'bg-sky-100 text-sky-800',
      linkedin: 'bg-blue-100 text-blue-800',
      instagram: 'bg-pink-100 text-pink-800',
      youtube: 'bg-red-100 text-red-800',
      tiktok: 'bg-black text-white',
      pinterest: 'bg-red-100 text-red-800',
      snapchat: 'bg-yellow-100 text-yellow-800',
      reddit: 'bg-orange-100 text-orange-800',
      telegram: 'bg-blue-100 text-blue-800',
      whatsapp: 'bg-green-100 text-green-800',
      discord: 'bg-indigo-100 text-indigo-800'
    }
    return colors[platform as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  // Filter results based on search and filter criteria
  const filteredResults = results.filter(result => {
    const matchesSearch = result.website.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         result.emails.some(email => email.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesFilter = filterType === 'all' ||
                         (filterType === 'with-emails' && result.emails.length > 0) ||
                         (filterType === 'with-social' && Object.keys(result.socialLinks).length > 0) ||
                         (filterType === 'errors' && result.error)
    
    return matchesSearch && matchesFilter
  })

  if (results.length === 0) {
    return null
  }

  const totalEmails = results.reduce((sum, result) => sum + result.emails.length, 0)
  const totalSocialLinks = results.reduce((sum, result) => sum + Object.keys(result.socialLinks).length, 0)
  const errorCount = results.filter(result => result.error).length

  return (
    <div className="space-y-6">
      {/* Stats and Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Scraping Results ({filteredResults.length} of {results.length} websites)
          </h2>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <span>📧 {totalEmails} emails found</span>
            <span>🔗 {totalSocialLinks} social links found</span>
            {errorCount > 0 && <span className="text-red-600">❌ {errorCount} errors</span>}
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search websites or emails..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field w-64"
            />
          </div>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="input-field"
          >
            <option value="all">All results</option>
            <option value="with-emails">With emails</option>
            <option value="with-social">With social links</option>
            <option value="errors">Errors only</option>
          </select>
          
          <div className="flex space-x-2">
            <button
              onClick={exportToCSV}
              className="btn-secondary flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>CSV</span>
            </button>
            <button
              onClick={exportToJSON}
              className="btn-secondary flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Website
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Emails
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Verification
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Social Links
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Additional Data
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredResults.map((result, index) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <a
                      href={result.website.startsWith('http') ? result.website : `https://${result.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1"
                    >
                      <span>{result.website}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </td>
                
                <td className="px-6 py-4">
                  {result.error ? (
                    <span className="text-red-600 text-sm">{result.error}</span>
                  ) : result.emails.length > 0 ? (
                    <div className="space-y-1">
                      {result.emails.map((email, emailIndex) => (
                        <div key={emailIndex} className="flex items-center space-x-2">
                          <span className="text-sm text-gray-900">{email}</span>
                          <button
                            onClick={() => copyToClipboard(email, index * 100 + emailIndex)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {copiedIndex === index * 100 + emailIndex ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">No emails found</span>
                  )}
                </td>
                
                <td className="px-6 py-4">
                  {result.error ? (
                    <span className="text-red-600 text-sm">-</span>
                  ) : result.emails.length > 0 ? (
                    <div className="space-y-1">
                      {result.emails.map((email, i2) => {
                        const v = verifications[email]
                        const label = v?.status || 'checking…'
                        return (
                          <div key={i2} className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${statusColor(v?.status)}`}>
                            <span className="font-medium mr-1">{label}</span>
                            {typeof v?.score === 'number' && <span className="opacity-75">(score {v.score})</span>}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">-</span>
                  )}
                </td>

                <td className="px-6 py-4">
                  {result.error ? (
                    <span className="text-red-600 text-sm">-</span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(result.socialLinks).map(([platform, url]) => {
                        if (!url) return null
                        return (
                          <a
                            key={platform}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors ${getSocialColor(platform)}`}
                            title={`${platform} - ${url}`}
                          >
                            <span>{getSocialIcon(platform)}</span>
                            <span className="capitalize">{platform}</span>
                          </a>
                        )
                      })}
                      {Object.values(result.socialLinks).every(url => !url) && (
                        <span className="text-gray-400 text-sm">No social links found</span>
                      )}
                    </div>
                  )}
                </td>
                
                <td className="px-6 py-4">
                  {result.error ? (
                    <span className="text-red-600 text-sm">-</span>
                  ) : (
                    <div className="space-y-1">
                      {result.phoneNumbers && result.phoneNumbers.length > 0 && (
                        <div className="text-xs">
                          <span className="font-medium text-gray-700">📞 Phone:</span>
                          <span className="text-gray-600 ml-1">{result.phoneNumbers.join(', ')}</span>
                        </div>
                      )}
                      {result.addresses && result.addresses.length > 0 && (
                        <div className="text-xs">
                          <span className="font-medium text-gray-700">📍 Address:</span>
                          <span className="text-gray-600 ml-1">{result.addresses.join(', ')}</span>
                        </div>
                      )}
                      {(!result.phoneNumbers || result.phoneNumbers.length === 0) && 
                       (!result.addresses || result.addresses.length === 0) && (
                        <span className="text-gray-400 text-xs">No additional data</span>
                      )}
                    </div>
                  )}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {!result.error && (
                    <button
                      onClick={() => copyToClipboard(
                        `Website: ${result.website}\nEmails: ${result.emails.join(', ')}\nSocial Links: ${JSON.stringify(result.socialLinks, null, 2)}`,
                        index
                      )}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Copy All
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {filteredResults.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
            </svg>
          </div>
          <p className="text-gray-500">No results match your search criteria</p>
        </div>
      )}
    </div>
  )
} 