import { useEffect, lazy, Suspense } from 'react'
import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { useAuthStore } from '../store/useAuthStore'

const TanStackRouterDevtools = import.meta.env.DEV
  ? lazy(() => import('@tanstack/router-devtools').then((m) => ({ default: m.TanStackRouterDevtools })))
  : () => null

function RootLayout() {
  const fetchSession = useAuthStore((s) => s.fetchSession)

  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  return (
    <>
      <nav style={{ display: 'flex', gap: '1rem', padding: '1rem', borderBottom: '1px solid #ccc' }}>
        <Link to="/dashboard" activeProps={{ style: { fontWeight: 'bold' } }}>Dashboard</Link>
        <Link to="/gear" activeProps={{ style: { fontWeight: 'bold' } }}>Gear</Link>
        <Link to="/checkout" activeProps={{ style: { fontWeight: 'bold' } }}>Checkout</Link>
        <Link to="/login" activeProps={{ style: { fontWeight: 'bold' } }}>Login</Link>
      </nav>
      <Outlet />
      <Suspense>
        <TanStackRouterDevtools />
      </Suspense>
    </>
  )
}

export const Route = createRootRoute({
  component: RootLayout,
})
