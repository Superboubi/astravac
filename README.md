# Photo Gallery App

Une application web moderne pour la gestion et le partage de photos, construite avec Next.js et Tailwind CSS.

## Fonctionnalités

- Interface utilisateur moderne et responsive
- Authentification sécurisée
- Gestion des dossiers et des photos
- Dashboard administrateur
- Interface utilisateur intuitive
- Design professionnel et esthétique

## Technologies utilisées

- Next.js 14
- TypeScript
- Tailwind CSS
- React Hook Form
- Zod
- Heroicons
- Headless UI

## Prérequis

- Node.js 18.x ou supérieur
- npm ou yarn

## Installation

1. Clonez le dépôt :
```bash
git clone https://github.com/votre-username/photo-gallery-app.git
cd photo-gallery-app
```

2. Installez les dépendances :
```bash
npm install
# ou
yarn install
```

3. Lancez le serveur de développement :
```bash
npm run dev
# ou
yarn dev
```

4. Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

## Structure du projet

```
src/
├── app/                    # Pages et routes de l'application
│   ├── admin/             # Pages du dashboard administrateur
│   ├── auth/              # Pages d'authentification
│   └── dashboard/         # Pages du dashboard utilisateur
├── components/            # Composants réutilisables
│   └── ui/               # Composants UI de base
└── lib/                  # Utilitaires et configurations
```

## Scripts disponibles

- `npm run dev` : Lance le serveur de développement
- `npm run build` : Construit l'application pour la production
- `npm run start` : Lance l'application en mode production
- `npm run lint` : Vérifie le code avec ESLint

## Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou à soumettre une pull request.

## Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails. 