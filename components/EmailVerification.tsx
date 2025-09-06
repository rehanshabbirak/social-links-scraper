import { useState } from 'react'
import toast from 'react-hot-toast'

interface VerificationResult {
  email: string
  isValidSyntax?: boolean
  isDisposable?: boolean
  isRoleAccount?: boolean
  hasMxRecords?: boolean
  smtpConnectable?: boolean
  score?: number
  status?: 'deliverable' | 'risky' | 'undeliverable' | 'unknown' | 'error'
  notes?: string[]
  error?: string
}

interface Props {
  emails: string[]
}

export default function EmailVerification({ emails }: Props) {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<VerificationResult[] | null>(null)

  const verify = async () => {
    if (!emails || emails.length === 0) {
      toast.error('No emails to verify')
      return
    }
    setLoading(true)
    setResults(null)
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails })
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message || 'Verification failed')
      setResults(data.results)
      toast.success(`Verified ${data.results.length} emails`)
    } catch (e: any) {
      toast.error(e.message || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-3">
      <button
        onClick={verify}
        disabled={loading || !emails || emails.length === 0}
        className="btn-secondary"
      >
        {loading ? 'Verifying…' : 'Verify Emails'}
      </button>

      {results && (
        <div className="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
          <h4 className="text-sm font-semibold text-gray-800 mb-2">Verification results</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {results.map((r, i) => (
              <div key={i} className="text-sm flex items-start justify-between gap-3 bg-white border border-gray-100 rounded p-2">
                <div className="space-y-1">
                  <div className="font-medium text-gray-900">{r.email}</div>
                  <div className="text-xs text-gray-600">
                    {r.status && <span className="mr-2">Status: <span className="font-medium">{r.status}</span></span>}
                    {typeof r.score === 'number' && <span className="mr-2">Score: {r.score}</span>}
                    {r.isDisposable && <span className="text-red-600 mr-2">Disposable</span>}
                    {r.isRoleAccount && <span className="text-amber-600 mr-2">Role</span>}
                    {r.hasMxRecords && <span className="text-green-600 mr-2">MX</span>}
                    {r.smtpConnectable && <span className="text-green-600 mr-2">SMTP</span>}
                  </div>
                  {r.notes && r.notes.length > 0 && (
                    <div className="text-xs text-gray-500">{r.notes.join(' • ')}</div>
                  )}
                  {r.error && (
                    <div className="text-xs text-red-600">{r.error}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}



