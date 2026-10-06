import { useAuth } from '@clerk/clerk-react'
import { Navigate, useLocation } from 'react-router-dom'

export function ProtectedRoute({ children }) {
  const { isLoaded, isSignedIn } = useAuth()
  const location = useLocation()

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
      </div>
    )
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace state={{ from: location }} />
  }

  return children
}
