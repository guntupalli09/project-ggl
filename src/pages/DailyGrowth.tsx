import { useState } from 'react'
import DailyGrowthPlan from '../components/DailyGrowthPlan'
import { GrowthAction } from '../components/DailyGrowthPlan'

export default function DailyGrowth() {
  const [savedActions, setSavedActions] = useState<GrowthAction[]>([])

  const handleActionsGenerated = (actions: GrowthAction[]) => {
    setSavedActions(actions)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Daily Growth Plan</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Get AI-powered daily action items tailored to your business performance
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Daily Growth Plan Component */}
          <div className="lg:col-span-2">
            <DailyGrowthPlan onActionsGenerated={handleActionsGenerated} />
          </div>

          {/* Sidebar with Tips and Stats */}
          <div className="space-y-6">
            {/* Quick Tips */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Growth Tips</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">1</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Focus on high-value activities that directly impact revenue
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <span className="text-green-600 dark:text-green-400 text-sm font-medium">2</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Track your progress daily to maintain momentum
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 dark:text-purple-400 text-sm font-medium">3</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Prioritize relationship building and follow-ups
                  </p>
                </div>
              </div>
            </div>

            {/* Action Summary */}
            {savedActions.length > 0 && (
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Today's Progress</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Actions:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{savedActions.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Completed:</span>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      {savedActions.filter(action => action.completed).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Remaining:</span>
                    <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                      {savedActions.filter(action => !action.completed).length}
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${savedActions.length > 0 ? (savedActions.filter(action => action.completed).length / savedActions.length) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                      {savedActions.length > 0 ? Math.round((savedActions.filter(action => action.completed).length / savedActions.length) * 100) : 0}% Complete
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Motivation Quote */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 rounded-lg p-6 text-white">
              <h3 className="text-lg font-medium mb-2">Daily Motivation</h3>
              <p className="text-sm opacity-90">
                "Success is the sum of small efforts repeated day in and day out."
              </p>
              <p className="text-xs opacity-75 mt-2">- Robert Collier</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
