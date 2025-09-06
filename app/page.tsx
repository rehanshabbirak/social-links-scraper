'use client'

import { useState } from 'react'
import Navbar from '../components/Navbar'
import ScrapingForm from '../components/ScrapingForm'
import ResultsTable from '../components/ResultsTable'
import { Toaster } from 'react-hot-toast'

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

export default function Home() {
  const [results, setResults] = useState<ScrapingResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleScrapingComplete = (scrapingResults: ScrapingResult[]) => {
    setResults(scrapingResults)
    setShowResults(true)
    setIsLoading(false)
  }

  const handleScrapingStart = () => {
    setIsLoading(true)
  }

  const resetResults = () => {
    setResults([])
    setShowResults(false)
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
      
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!showResults ? (
          <div className="space-y-8">
            <div className="text-center">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-6">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
                Email & Social Scraper
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Extract emails and social media profiles from websites with our advanced scraping tool. 
                Enter URLs manually or upload a CSV/TXT file for bulk processing.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Email Extraction</h3>
                <p className="text-sm text-gray-600">Find all email addresses including obfuscated formats</p>
              </div>
              
              <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Social Media</h3>
                <p className="text-sm text-gray-600">Extract links from all major social platforms</p>
              </div>
              
              <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Export Results</h3>
                <p className="text-sm text-gray-600">Download data in CSV or JSON format</p>
              </div>
            </div>
            
            <ScrapingForm 
              onScrapingComplete={handleScrapingComplete}
              onScrapingStart={handleScrapingStart}
              isLoading={isLoading}
            />
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Scraping Results
                </h1>
                <p className="text-gray-600">
                  Found data from {results.length} website{results.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={resetResults}
                className="btn-secondary flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Start New Scraping</span>
              </button>
            </div>
            
            <ResultsTable results={results} />
          </div>
        )}
      </main>
    </div>
  )
} 