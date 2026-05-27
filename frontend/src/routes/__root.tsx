import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'

export const Route = createRootRoute({
  component: () => (
    <>
      <nav style={{ display: 'flex', gap: '1rem', padding: '1rem', borderBottom: '1px solid #ccc' }}>
        <Link to="/dashboard" activeProps={{ style: { fontWeight: 'bold' } }}>Dashboard</Link>
        <Link to="/gear" activeProps={{ style: { fontWeight: 'bold' } }}>Gear</Link>
        <Link to="/checkout" activeProps={{ style: { fontWeight: 'bold' } }}>Checkout</Link>
        <Link to="/login" activeProps={{ style: { fontWeight: 'bold' } }}>Login</Link>
      </nav>
      <Outlet />
      <TanStackRouterDevtools />
    </>
  ),
})
