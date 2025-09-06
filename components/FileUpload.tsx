import { useState, useRef } from 'react'
import { Upload, FileText, X, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface FileUploadProps {
  onFileContent: (urls: string[], csvData?: any[]) => void
}

export default function FileUpload({ onFileContent }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    if (!file) return

    // Validate file type
    const allowedTypes = ['text/csv', 'text/plain', 'application/csv']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a CSV or TXT file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB')
      return
    }

    setUploadedFile(file)
    processFile(file)
  }

  const processFile = (file: File) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const { urls, csvData } = extractUrlsFromContent(content, file.name)
        
        if (urls.length === 0) {
          toast.error('No valid URLs found in the file')
          setUploadedFile(null)
          return
        }

        onFileContent(urls, csvData)
        toast.success(`Found ${urls.length} URLs in the uploaded file`)
      } catch (error) {
        toast.error('Error processing file')
        setUploadedFile(null)
      }
    }

    reader.onerror = () => {
      toast.error('Error reading file')
      setUploadedFile(null)
    }

    reader.readAsText(file)
  }

  const extractUrlsFromContent = (content: string, fileName: string): { urls: string[], csvData?: any[] } => {
    const lines = content.split('\n').filter(line => line.trim())
    const urls: string[] = []
    let csvData: any[] | undefined

    // Check if it's a CSV file
    const isCSV = fileName.toLowerCase().endsWith('.csv')
    
    if (isCSV && lines.length > 1) {
      // Parse CSV
      const headers = parseCSVLine(lines[0])
      const websiteColumnIndex = detectWebsiteColumn(headers)
      
      if (websiteColumnIndex !== -1) {
        csvData = []
        
        // Process each data row
        for (let i = 1; i < lines.length; i++) {
          const row = parseCSVLine(lines[i])
          if (row.length > websiteColumnIndex) {
            const websiteValue = row[websiteColumnIndex]?.trim()
            if (websiteValue) {
              const normalizedUrl = normalizeUrl(websiteValue)
              if (normalizedUrl) {
                urls.push(normalizedUrl)
                // Store the entire row data for later use
                const rowData: any = {}
                headers.forEach((header, index) => {
                  rowData[header] = row[index] || ''
                })
                csvData.push(rowData)
              }
            }
          }
        }
      } else {
        // No website column detected, treat as simple text file
        return extractUrlsFromTextContent(content)
      }
    } else {
      // Not a CSV or no data rows, treat as text file
      return extractUrlsFromTextContent(content)
    }

    return { urls: [...new Set(urls)], csvData }
  }

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    
    result.push(current.trim())
    return result
  }

  const detectWebsiteColumn = (headers: string[]): number => {
    const websiteKeywords = [
      'website', 'url', 'link', 'domain', 'site', 'web', 'homepage',
      'webpage', 'address', 'www', 'http', 'https', 'company website',
      'business website', 'official website', 'main website'
    ]
    
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i].toLowerCase().trim()
      
      // Direct match
      if (websiteKeywords.some(keyword => header.includes(keyword))) {
        return i
      }
      
      // Check for common patterns
      if (header.match(/^(url|link|website|domain|site)$/i)) {
        return i
      }
    }
    
    return -1
  }

  const normalizeUrl = (url: string): string | null => {
    if (!url || typeof url !== 'string') return null
    
    const trimmed = url.trim()
    if (!trimmed) return null
    
    // If already has protocol, validate and return
    if (trimmed.match(/^https?:\/\//i)) {
      try {
        new URL(trimmed)
        return trimmed
      } catch {
        return null
      }
    }
    
    // Remove common prefixes
    let cleanUrl = trimmed
      .replace(/^(www\.)/i, '')
      .replace(/^\/+/, '')
      .replace(/\/+$/, '')
    
    // Check if it looks like a domain
    const domainPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/
    
    if (domainPattern.test(cleanUrl)) {
      return `https://${cleanUrl}`
    }
    
    // Check if it's a path that might be a domain
    const pathPattern = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
    if (pathPattern.test(cleanUrl)) {
      return `https://${cleanUrl}`
    }
    
    return null
  }

  const extractUrlsFromTextContent = (content: string): { urls: string[], csvData?: any[] } => {
    const lines = content.split('\n')
    const urls: string[] = []

    lines.forEach(line => {
      const trimmedLine = line.trim()
      if (trimmedLine) {
        // Try to extract URLs from the line
        const urlMatch = trimmedLine.match(/https?:\/\/[^\s,]+/g)
        if (urlMatch) {
          urls.push(...urlMatch)
        } else {
          // Try to normalize as domain
          const normalized = normalizeUrl(trimmedLine)
          if (normalized) {
            urls.push(normalized)
          }
        }
      }
    })

    return { urls: [...new Set(urls)] }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const removeFile = () => {
    setUploadedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600">
        <p>Upload a CSV or TXT file containing URLs</p>
        <p className="text-xs text-gray-500 mt-1">
          Supported formats: .csv, .txt | Max size: 5MB
        </p>
        <p className="text-xs text-gray-500">
          CSV files: Automatically detects website columns (website, url, domain, etc.)
        </p>
      </div>

      {!uploadedFile ? (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragOver
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <div className="space-y-2">
            <p className="text-lg font-medium text-gray-900">
              Drop your file here, or{' '}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                browse
              </button>
            </p>
            <p className="text-sm text-gray-500">
              Supports CSV and TXT files with URLs
            </p>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="border border-green-200 bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-medium text-green-900">{uploadedFile.name}</p>
                <p className="text-sm text-green-700">
                  {formatFileSize(uploadedFile.size)} • {uploadedFile.type}
                </p>
              </div>
            </div>
            <button
              onClick={removeFile}
              className="text-green-600 hover:text-green-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">File Format Examples:</p>
            <div className="space-y-1 text-xs">
              <p>• CSV with website column: <code className="bg-blue-100 px-1 rounded">Company,Website,Email</code></p>
              <p>• One URL per line: <code className="bg-blue-100 px-1 rounded">example.com</code></p>
              <p>• Full URLs: <code className="bg-blue-100 px-1 rounded">https://example.com</code></p>
              <p>• URLs without protocol: <code className="bg-blue-100 px-1 rounded">www.example.com</code></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 