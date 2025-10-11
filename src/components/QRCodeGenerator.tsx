import React, { useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import html2canvas from 'html2canvas'
import { 
  QrCodeIcon, 
  ArrowDownTrayIcon, 
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline'

interface QRCodeGeneratorProps {
  businessSlug: string
  businessName?: string
  onClose: () => void
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({ 
  businessSlug, 
  businessName = 'Your Business',
  onClose 
}) => {
  const qrRef = useRef<HTMLDivElement>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadSuccess, setDownloadSuccess] = useState(false)
  
  const leadCaptureUrl = `${window.location.origin}/leads/${businessSlug || 'demo'}`

  const handleDownload = async () => {
    if (!qrRef.current) return

    setIsDownloading(true)
    setDownloadSuccess(false)

    try {
      // Generate canvas from QR code element
      const canvas = await html2canvas(qrRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: true
      })

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error('Failed to generate blob')
          setIsDownloading(false)
          return
        }

        // Create download link
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${businessSlug}-lead-capture-qr.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        setDownloadSuccess(true)
        setIsDownloading(false)

        // Reset success state after 2 seconds
        setTimeout(() => setDownloadSuccess(false), 2000)
      }, 'image/png')
    } catch (error) {
      console.error('Error generating QR code image:', error)
      setIsDownloading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <QrCodeIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Lead Capture QR Code
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* QR Code Display */}
        <div className="text-center mb-6">
          <div 
            ref={qrRef}
            className="inline-block p-4 bg-white rounded-lg border-2 border-gray-200 dark:border-gray-600"
          >
            <QRCodeSVG
              value={leadCaptureUrl}
              size={200}
              level="M"
              includeMargin={true}
            />
          </div>
        </div>

        {/* Business Info */}
        <div className="mb-6 text-center">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
            {businessName}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 break-all">
            {leadCaptureUrl}
          </p>
        </div>

        {/* Instructions */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h5 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
            How to use:
          </h5>
          <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Download the QR code as PNG</li>
            <li>• Print it on business cards, flyers, or posters</li>
            <li>• Customers scan to access your lead form</li>
            <li>• Leads are automatically added to your dashboard</li>
          </ul>
        </div>

        {/* Download Button */}
        <div className="flex justify-center">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className={`flex items-center px-6 py-3 rounded-lg font-medium transition-colors ${
              downloadSuccess
                ? 'bg-green-600 text-white'
                : isDownloading
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {downloadSuccess ? (
              <>
                <CheckIcon className="h-5 w-5 mr-2" />
                Downloaded!
              </>
            ) : isDownloading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Generating...
              </>
            ) : (
              <>
                <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                Download PNG
              </>
            )}
          </button>
        </div>

        {/* Preview Note */}
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
          QR code links to your public lead capture form
        </p>
      </div>
    </div>
  )
}

export default QRCodeGenerator
