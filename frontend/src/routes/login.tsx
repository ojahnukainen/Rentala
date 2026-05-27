import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  return (
    <main>
      <h1>Login</h1>
      <p>Login form goes here.</p>
    </main>
  )
}
