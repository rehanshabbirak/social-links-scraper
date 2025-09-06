import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Clock, Loader2, AlertCircle, Info } from 'lucide-react'
import toast from 'react-hot-toast'

interface ScrapingProgressProps {
  isActive: boolean
  totalUrls: number
  onComplete: (results: any[]) => void
}

interface UrlStatus {
  url: string
  status: 'pending' | 'scraping' | 'success' | 'error' | 'skipped'
  emails: string[]
  error?: string
  startTime?: number
  endTime?: number
  duration?: number
}

export default function ScrapingProgress({ isActive, totalUrls, onComplete }: ScrapingProgressProps) {
  const [urls, setUrls] = useState<UrlStatus[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPolling, setIsPolling] = useState(false)

  // Start polling for updates when scraping begins
  useEffect(() => {
    if (isActive && !isPolling) {
      setIsPolling(true)
      pollForUpdates()
    } else if (!isActive && isPolling) {
      setIsPolling(false)
    }
  }, [isActive, isPolling])

  const pollForUpdates = async () => {
    if (!isPolling) return

    try {
      const response = await fetch('http://localhost:5000/api/scraping-status')
      if (response.ok) {
        const data = await response.json()
        updateUrlStatuses(data)
      }
    } catch (error) {
      console.error('Error polling for updates:', error)
    }

    // Continue polling every 2 seconds
    if (isPolling) {
      setTimeout(pollForUpdates, 2000)
    }
  }

  const updateUrlStatuses = (data: any) => {
    if (data.currentUrl) {
      setCurrentIndex(data.currentIndex || 0)
      
      // Update current URL status
      setUrls(prev => {
        const newUrls = [...prev]
        const urlIndex = data.currentIndex || 0
        
        if (!newUrls[urlIndex]) {
          newUrls[urlIndex] = {
            url: data.currentUrl,
            status: 'scraping',
            emails: [],
            startTime: Date.now()
          }
        } else {
          newUrls[urlIndex] = {
            ...newUrls[urlIndex],
            status: 'scraping'
          }
        }
        
        return newUrls
      })
    }

    if (data.completedUrls) {
      setUrls(prev => {
        const newUrls = [...prev]
        data.completedUrls.forEach((completed: any) => {
          const index = completed.index
          if (index < newUrls.length) {
            newUrls[index] = {
              ...newUrls[index],
              status: completed.status,
              emails: completed.emails || [],
              error: completed.error,
              endTime: Date.now(),
              duration: completed.duration
            }
          }
        })
        return newUrls
      })
    }

    if (data.isComplete) {
      setIsPolling(false)
      onComplete(data.results || [])
    }
  }

  const getStatusIcon = (status: UrlStatus['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-400" />
      case 'scraping':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'skipped':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: UrlStatus['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-600'
      case 'scraping':
        return 'bg-blue-100 text-blue-600'
      case 'success':
        return 'bg-green-100 text-green-600'
      case 'error':
        return 'bg-red-100 text-red-600'
      case 'skipped':
        return 'bg-yellow-100 text-yellow-600'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  const showUrlToast = (urlStatus: UrlStatus) => {
    const { url, status, emails, error } = urlStatus
    
    if (status === 'success' && emails.length > 0) {
      toast.success(`✅ ${emails.length} email(s) found on ${url}`, {
        duration: 2000,
        icon: '📧'
      })
    } else if (status === 'error') {
      // Check if it's a Cloudflare block
      if (error && error.includes('Cloudflare security')) {
        toast.error(`🚫 ${url} is blocked by Cloudflare. Try using a VPN.`, {
          duration: 4000,
          icon: '🚫'
        })
      } else {
        toast.error(`❌ Failed to scrape ${url}: ${error}`, {
          duration: 2000,
          icon: '⚠️'
        })
      }
    } else if (status === 'success' && emails.length === 0) {
      toast(`ℹ️ No emails found on ${url}`, {
        duration: 1500,
        icon: 'ℹ️'
      })
    } else if (status === 'skipped') {
      toast(`⏭️ Skipped ${url}: ${error}`, {
        duration: 1500,
        icon: '⏭️'
      })
    }
  }

  // Show toast when URL status changes
  useEffect(() => {
    urls.forEach((urlStatus, index) => {
      if (urlStatus.status === 'success' || urlStatus.status === 'error' || urlStatus.status === 'skipped') {
        // Only show toast if this is a recent completion
        if (urlStatus.endTime && Date.now() - urlStatus.endTime < 3000) {
          showUrlToast(urlStatus)
        }
      }
    })
  }, [urls])

  if (!isActive) return null

  const completedCount = urls.filter(u => u.status === 'success' || u.status === 'error' || u.status === 'skipped').length
  const successCount = urls.filter(u => u.status === 'success').length
  const errorCount = urls.filter(u => u.status === 'error').length
  const skippedCount = urls.filter(u => u.status === 'skipped').length

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Scraping Progress</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            {completedCount}/{totalUrls}
          </span>
          <div className="w-16 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(completedCount / totalUrls) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
        <div className="bg-green-50 text-green-700 px-2 py-1 rounded text-center">
          ✅ {successCount}
        </div>
        <div className="bg-red-50 text-red-700 px-2 py-1 rounded text-center">
          ❌ {errorCount}
        </div>
        <div className="bg-yellow-50 text-yellow-700 px-2 py-1 rounded text-center">
          ⏭️ {skippedCount}
        </div>
      </div>

      {/* Current URL */}
      {urls[currentIndex] && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-2 mb-2">
            {getStatusIcon(urls[currentIndex].status)}
            <span className="text-sm font-medium text-blue-900">Currently Scraping:</span>
          </div>
          <p className="text-sm text-blue-800 break-all">
            {urls[currentIndex].url}
          </p>
          {urls[currentIndex].status === 'scraping' && urls[currentIndex].startTime && (
            <p className="text-xs text-blue-600 mt-1">
              Duration: {Math.round((Date.now() - urls[currentIndex].startTime!) / 1000)}s
            </p>
          )}
        </div>
      )}

      {/* URL List */}
      <div className="max-h-64 overflow-y-auto space-y-2">
        {urls.map((urlStatus, index) => (
          <div
            key={index}
            className={`flex items-center justify-between p-2 rounded-lg border ${
              index === currentIndex ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
            }`}
          >
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              {getStatusIcon(urlStatus.status)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {urlStatus.url}
                </p>
                {urlStatus.status === 'success' && urlStatus.emails.length > 0 && (
                  <p className="text-xs text-green-600">
                    {urlStatus.emails.length} email(s) found
                  </p>
                )}
                {urlStatus.status === 'error' && (
                  <p className="text-xs text-red-600 truncate">
                    {urlStatus.error && urlStatus.error.includes('Cloudflare security') 
                      ? '🚫 Blocked by Cloudflare - Try VPN' 
                      : `Error: ${urlStatus.error}`
                    }
                  </p>
                )}
                {urlStatus.status === 'skipped' && (
                  <p className="text-xs text-yellow-600 truncate">
                    Skipped: {urlStatus.error}
                  </p>
                )}
                {urlStatus.duration && (
                  <p className="text-xs text-gray-500">
                    {Math.round(urlStatus.duration / 1000)}s
                  </p>
                )}
              </div>
            </div>
            
            {/* Tooltip trigger for detailed info */}
            <div className="group relative">
              <Info className="h-4 w-4 text-gray-400 cursor-help" />
              <div className="absolute bottom-full right-0 mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                <div className="space-y-1">
                  <p><strong>URL:</strong> {urlStatus.url}</p>
                  <p><strong>Status:</strong> {urlStatus.status}</p>
                  {urlStatus.emails.length > 0 && (
                    <div>
                      <p><strong>Emails found:</strong></p>
                      <ul className="ml-2">
                        {urlStatus.emails.map((email, i) => (
                          <li key={i}>• {email}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {urlStatus.error && (
                    <p><strong>Error:</strong> {urlStatus.error}</p>
                  )}
                  {urlStatus.duration && (
                    <p><strong>Duration:</strong> {Math.round(urlStatus.duration / 1000)}s</p>
                  )}
                </div>
                <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Progress Summary */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="flex justify-between text-xs text-gray-600">
          <span>Progress: {Math.round((completedCount / totalUrls) * 100)}%</span>
          <span>Success Rate: {completedCount > 0 ? Math.round((successCount / completedCount) * 100) : 0}%</span>
        </div>
      </div>
    </div>
  )
}
