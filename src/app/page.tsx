import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl text-center">
        <h1 className="mb-8 text-5xl font-bold text-gray-900">
          Bienvenue sur Photo Gallery
        </h1>
        <p className="mb-12 text-xl text-gray-600">
          Une application moderne pour gérer et partager vos photos
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/auth/login"
            className="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
          >
            Se connecter
          </Link>
          <Link
            href="/auth/register"
            className="rounded-lg border border-gray-300 px-6 py-3 text-gray-700 transition-colors hover:bg-gray-50"
          >
            S'inscrire
          </Link>
        </div>
      </div>
    </div>
  )
} 