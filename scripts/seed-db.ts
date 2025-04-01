import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

// Charger les variables d'environnement depuis .env.local
config({ path: join(rootDir, '.env.local') })

import '../src/lib/seed.ts' 