import { useState } from 'react'
import { Play, Loader2, Settings, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import UrlInput from './UrlInput'
import FileUpload from './FileUpload'
import ScrapingProgress from './ScrapingProgress'
import axios from 'axios'

interface ScrapingFormProps {
  onScrapingComplete: (results: any[]) => void
  onScrapingStart: () => void
  isLoading: boolean
}

interface ScrapingOptions {
  maxDepth: number
  timeout: number
  extractPhoneNumbers: boolean
  extractAddresses: boolean
  followRedirects: boolean
  smartCrawling: boolean
}

export default function ScrapingForm({ onScrapingComplete, onScrapingStart, isLoading }: ScrapingFormProps) {
  const [urls, setUrls] = useState<string[]>([])
  const [csvData, setCsvData] = useState<any[]>([])
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const [isScrapingActive, setIsScrapingActive] = useState(false)
  const [options, setOptions] = useState<ScrapingOptions>({
    maxDepth: 2,
    timeout: 30000,
    extractPhoneNumbers: false,
    extractAddresses: false,
    followRedirects: true,
    smartCrawling: true
  })

  const handleUrlsChange = (newUrls: string[]) => {
    setUrls(newUrls)
  }

  const handleFileContent = (fileUrls: string[], fileCsvData?: any[]) => {
    // Merge file URLs with manually entered URLs, removing duplicates
    const allUrls = [...new Set([...urls, ...fileUrls])]
    setUrls(allUrls)
    
    // Store CSV data if provided
    if (fileCsvData) {
      setCsvData(fileCsvData)
    }
  }

  const handleOptionChange = (key: keyof ScrapingOptions, value: any) => {
    setOptions(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const startScraping = async () => {
    if (urls.length === 0) {
      toast.error('Please add at least one URL to scrape')
      return
    }

    // Validate URLs
    const validUrls = urls.filter(url => {
      try {
        new URL(url.startsWith('http') ? url : `https://${url}`)
        return true
      } catch {
        return false
      }
    })

    if (validUrls.length === 0) {
      toast.error('Please provide valid URLs')
      return
    }

    if (validUrls.length > 100) {
      toast.error('Maximum 100 URLs allowed per request')
      return
    }

    onScrapingStart()
    setIsScrapingActive(true)
    toast.loading(`Starting scraping process for ${validUrls.length} websites...`)

    try {
      const response = await axios.post('http://localhost:5000/api/scrape', {
        urls: validUrls,
        csvData: csvData.length > 0 ? csvData : undefined,
        options: options
      })

      toast.dismiss()
      
      if (response.data.success) {
        const stats = response.data.statistics
        const breakInfo = response.data.errorBreakInfo
        
        if (breakInfo && breakInfo.broken) {
          toast.error(`Scraping stopped early: ${breakInfo.reason}. Processed ${stats.processedUrls}/${stats.totalUrls} websites.`)
        } else {
          toast.success(`Successfully scraped ${stats.successfulUrls}/${stats.totalUrls} websites in ${response.data.duration}!`)
        }
        
        // Show detailed statistics
        if (stats.errorUrls > 0 || stats.skippedUrls > 0) {
          toast(`📊 Results: ${stats.successfulUrls} successful, ${stats.errorUrls} errors, ${stats.skippedUrls} skipped`, {
            duration: 5000,
            icon: '📊'
          })
        }
        
        onScrapingComplete(response.data.results)
      } else {
        toast.error(response.data.message || 'Scraping failed')
      }
    } catch (error: any) {
      toast.dismiss()
      const errorMessage = error.response?.data?.message || 'An error occurred during scraping'
      toast.error(errorMessage)
    } finally {
      setIsScrapingActive(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Real-time scraping progress */}
      <ScrapingProgress 
        isActive={isScrapingActive}
        totalUrls={urls.length}
        onComplete={onScrapingComplete}
      />
      
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <svg className="w-6 h-6 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          Website URLs
        </h2>
        <UrlInput urls={urls} onUrlsChange={handleUrlsChange} />
      </div>

      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <svg className="w-6 h-6 mr-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Bulk Upload
        </h2>
        <FileUpload onFileContent={handleFileContent} />
      </div>

      <div className="card">
        <button
          onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
          className="flex items-center justify-between w-full text-left"
        >
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Settings className="w-6 h-6 mr-3 text-gray-600" />
            Advanced Options
          </h2>
          {showAdvancedOptions ? (
            <ChevronUp className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-600" />
          )}
        </button>
        
        {showAdvancedOptions && (
          <div className="mt-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Crawl Depth
                </label>
                <select
                  value={options.maxDepth}
                  onChange={(e) => handleOptionChange('maxDepth', parseInt(e.target.value))}
                  className="input-field"
                >
                  <option value={0}>Homepage only</option>
                  <option value={1}>1 level deep</option>
                  <option value={2}>2 levels deep</option>
                  <option value={3}>3 levels deep</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  How many levels deep to crawl from the main page
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timeout (seconds)
                </label>
                <select
                  value={options.timeout / 1000}
                  onChange={(e) => handleOptionChange('timeout', parseInt(e.target.value) * 1000)}
                  className="input-field"
                >
                  <option value={15}>15 seconds</option>
                  <option value={30}>30 seconds</option>
                  <option value={45}>45 seconds</option>
                  <option value={60}>60 seconds</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Maximum time to wait for each page to load
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="extractPhoneNumbers"
                  checked={options.extractPhoneNumbers}
                  onChange={(e) => handleOptionChange('extractPhoneNumbers', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="extractPhoneNumbers" className="ml-2 block text-sm text-gray-900">
                  Extract phone numbers
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="extractAddresses"
                  checked={options.extractAddresses}
                  onChange={(e) => handleOptionChange('extractAddresses', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="extractAddresses" className="ml-2 block text-sm text-gray-900">
                  Extract addresses
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="followRedirects"
                  checked={options.followRedirects}
                  onChange={(e) => handleOptionChange('followRedirects', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="followRedirects" className="ml-2 block text-sm text-gray-900">
                  Follow redirects
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="smartCrawling"
                  checked={options.smartCrawling}
                  onChange={(e) => handleOptionChange('smartCrawling', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="smartCrawling" className="ml-2 block text-sm text-gray-900">
                  Smart crawling (skip deep crawl if emails found on homepage)
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="text-center">
        <button
          onClick={startScraping}
          disabled={isLoading || urls.length === 0}
          className="btn-primary text-lg px-8 py-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-3 mx-auto"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Scraping...</span>
            </>
          ) : (
            <>
              <Play className="h-6 w-6" />
              <span>Start Scraping</span>
            </>
          )}
        </button>
        
        {urls.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>{urls.length}</strong> website{urls.length !== 1 ? 's' : ''} ready to scrape
              {options.maxDepth > 0 && (
                <span className="block mt-1">
                  Will crawl {options.maxDepth} level{options.maxDepth !== 1 ? 's' : ''} deep from each website
                </span>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  )
} 