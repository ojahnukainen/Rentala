import { useEffect, lazy, Suspense } from 'react'
import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { useAuthStore } from '../store/useAuthStore'


const TanStackRouterDevtools = import.meta.env.DEV
  ? lazy(() => import('@tanstack/router-devtools').then((m) => ({ default: m.TanStackRouterDevtools })))
  : () => null

function RootLayout() {
  const { fetchSession, user } = useAuthStore()

  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  return (
    <>
      <nav style={{ display: 'flex', gap: '1rem', padding: '1rem', borderBottom: '1px solid #ccc' }}>
        <Link to="/dashboard" activeProps={{ style: { fontWeight: 'bold' } }}>Dashboard</Link>
        <Link to="/gear" activeProps={{ style: { fontWeight: 'bold' } }}>Gear</Link>
        <Link to="/checkout" activeProps={{ style: { fontWeight: 'bold' } }}>Checkout</Link>
        {user
          ? <Link to="/profile" activeProps={{ style: { fontWeight: 'bold' } }}>{user.name.split(' ')[0]}</Link>
          : <Link to="/login" activeProps={{ style: { fontWeight: 'bold' } }}>Login</Link>
        }
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
