import { SignUp } from '@clerk/clerk-react'

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f0f4f8] bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:24px_24px]">
      <div className="w-full max-w-md px-4">
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'shadow-xl border-0 rounded-2xl',
            },
          }}
        />
      </div>
    </div>
  )
}
