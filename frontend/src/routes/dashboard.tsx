import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  return (
    <main>
      <h1>Dashboard</h1>
      <p>Overview and quick actions go here.</p>
    </main>
  )
}
