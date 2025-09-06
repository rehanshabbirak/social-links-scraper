import { useState } from 'react'
import { Globe, Plus, X } from 'lucide-react'

interface UrlInputProps {
  urls: string[]
  onUrlsChange: (urls: string[]) => void
}

export default function UrlInput({ urls, onUrlsChange }: UrlInputProps) {
  const [inputValue, setInputValue] = useState('')

  const addUrl = () => {
    if (inputValue.trim() && !urls.includes(inputValue.trim())) {
      onUrlsChange([...urls, inputValue.trim()])
      setInputValue('')
    }
  }

  const removeUrl = (index: number) => {
    onUrlsChange(urls.filter((_, i) => i !== index))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addUrl()
    }
  }

  const isValidUrl = (url: string) => {
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`)
      return true
    } catch {
      return false
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex space-x-2">
        <div className="flex-1 relative">
          <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter website URL (e.g., example.com)"
            className="input-field pl-10"
          />
        </div>
        <button
          onClick={addUrl}
          disabled={!inputValue.trim()}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add</span>
        </button>
      </div>

      {urls.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">Added URLs:</h3>
          <div className="space-y-2">
            {urls.map((url, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  isValidUrl(url) ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}
              >
                <span className={`text-sm ${isValidUrl(url) ? 'text-green-800' : 'text-red-800'}`}>
                  {url}
                </span>
                <button
                  onClick={() => removeUrl(index)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 