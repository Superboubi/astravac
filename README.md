# Application de Gestion de Photos

Une application web moderne pour gérer et organiser vos photos.

## Fonctionnalités

- Création et gestion de dossiers
- Upload de photos par glisser-déposer ou sélection
- Prévisualisation des photos
- Mode de sélection pour les actions en masse
- Téléchargement et suppression de photos
- Interface utilisateur intuitive et responsive

## Technologies utilisées

- Next.js
- TypeScript
- Tailwind CSS
- Supabase (base de données et stockage)

## Installation

1. Clonez le dépôt :
```bash
git clone [URL_DU_REPO]
```

2. Installez les dépendances :
```bash
npm install
```

3. Configurez les variables d'environnement :
Créez un fichier `.env.local` avec les variables suivantes :
```
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_clé_anon_supabase
```

4. Lancez l'application en mode développement :
```bash
npm run dev
```

## Déploiement

L'application peut être déployée sur Vercel :

1. Créez un compte sur [Vercel](https://vercel.com)
2. Connectez votre dépôt GitHub
3. Configurez les variables d'environnement
4. Déployez !

## Licence

MIT 