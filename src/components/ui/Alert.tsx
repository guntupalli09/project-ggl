import React from 'react'
import { cn } from '../../lib/utils'
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'success' | 'error' | 'warning' | 'info'
  title?: string
  onClose?: () => void
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'info', title, onClose, children, ...props }, ref) => {
    const variants = {
      success: {
        container: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
        icon: 'text-green-600 dark:text-green-400',
        title: 'text-green-800 dark:text-green-200',
        content: 'text-green-700 dark:text-green-300',
        iconComponent: CheckCircleIcon
      },
      error: {
        container: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
        icon: 'text-red-600 dark:text-red-400',
        title: 'text-red-800 dark:text-red-200',
        content: 'text-red-700 dark:text-red-300',
        iconComponent: XCircleIcon
      },
      warning: {
        container: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
        icon: 'text-yellow-600 dark:text-yellow-400',
        title: 'text-yellow-800 dark:text-yellow-200',
        content: 'text-yellow-700 dark:text-yellow-300',
        iconComponent: ExclamationTriangleIcon
      },
      info: {
        container: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
        icon: 'text-blue-600 dark:text-blue-400',
        title: 'text-blue-800 dark:text-blue-200',
        content: 'text-blue-700 dark:text-blue-300',
        iconComponent: InformationCircleIcon
      }
    }

    const variantStyles = variants[variant]
    const IconComponent = variantStyles.iconComponent

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg border p-4',
          variantStyles.container,
          className
        )}
        {...props}
      >
        <div className="flex">
          <div className="flex-shrink-0">
            <IconComponent className={cn('h-5 w-5', variantStyles.icon)} />
          </div>
          <div className="ml-3 flex-1">
            {title && (
              <h3 className={cn('text-sm font-medium', variantStyles.title)}>
                {title}
              </h3>
            )}
            <div className={cn('text-sm', variantStyles.content, title && 'mt-1')}>
              {children}
            </div>
          </div>
          {onClose && (
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  type="button"
                  onClick={onClose}
                  className={cn(
                    'inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2',
                    variantStyles.icon,
                    'hover:bg-opacity-20'
                  )}
                >
                  <span className="sr-only">Dismiss</span>
                  <XCircleIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }
)

Alert.displayName = 'Alert'

export { Alert }
