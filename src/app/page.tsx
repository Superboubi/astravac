import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#50AFC9]/10 to-[#3F8BA1]/10 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full">
        <div className="bg-white p-8 rounded-2xl shadow-xl transform transition-all duration-300 hover:shadow-2xl">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              Espace Client Astravacances
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Votre espace dédié pour partager vos photos et nous aider à gérer vos réseaux sociaux
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
            <Link
              href="/auth/login"
              className="w-full sm:w-auto px-8 py-4 bg-[#50AFC9] hover:bg-[#3F8BA1] text-white font-medium rounded-lg shadow-md hover:shadow-lg transform transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#50AFC9] text-center"
            >
              Accéder à mon espace
            </Link>
            <Link
              href="/auth/register"
              className="w-full sm:w-auto px-8 py-4 border-2 border-[#50AFC9] text-[#50AFC9] hover:bg-[#50AFC9]/10 font-medium rounded-lg shadow-md hover:shadow-lg transform transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#50AFC9] text-center"
            >
              Créer mon compte
            </Link>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-xl bg-gray-50 border border-gray-200 text-center">
              <div className="text-[#50AFC9] mb-4 flex justify-center">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Partage de photos</h3>
              <p className="text-gray-600">Déposez facilement vos photos pour vos réseaux sociaux</p>
            </div>

            <div className="p-6 rounded-xl bg-gray-50 border border-gray-200 text-center">
              <div className="text-[#50AFC9] mb-4 flex justify-center">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Gestion simplifiée</h3>
              <p className="text-gray-600">Organisez vos photos par dossiers et dates</p>
            </div>

            <div className="p-6 rounded-xl bg-gray-50 border border-gray-200 text-center">
              <div className="text-[#50AFC9] mb-4 flex justify-center">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Publication rapide</h3>
              <p className="text-gray-600">Vos photos sont directement utilisables pour vos réseaux sociaux</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 