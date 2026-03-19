# Section Factory

Section Factory est un projet TypeScript pour générer et valider des sections Shopify avec une architecture claire, testable et extensible.

## Objectif du projet

- Centraliser la définition des types de sections supportés
- Garantir une validation cohérente en mode strict et non-strict
- Exposer des commandes CLI simples pour l'équipe
- Maintenir une base fiable grâce aux tests unitaires et à la CI

## Fonctionnalités actuelles

- Registre central des types de sections
- Validator de section branché sur le registre central
- Commande CLI --list-types
- Tests unitaires avec Vitest
- Pipeline CI avec tests puis build

## Structure du projet

- src/core/section-types/registry.ts : source unique de vérité des types de sections
- src/core/validation/designValidator.ts : validation des sections
- src/index.ts : point d'entrée CLI
- tests/unit : tests unitaires
- .github/workflows/ci.yml : pipeline CI

## Prérequis

- Node.js 20 ou plus
- npm

## Installation

```bash
npm install
```

## Commandes utiles

Lancer le projet en dev :

```bash
npm run dev
```

Lister les types de sections disponibles :

```bash
npm run dev -- --list-types
```

Compiler le projet :

```bash
npm run build
```

Lancer les tests unitaires :

```bash
npm run test:unit
```

Lancer les tests en mode watch :

```bash
npm run test:watch
```

## Workflow d'équipe

1. Créer une branche de travail depuis main
2. Développer une modification ciblée
3. Lancer localement : tests unitaires puis build
4. Ouvrir une Pull Request
5. Laisser la CI valider automatiquement le changement

## Qualité et conventions

- Toute nouvelle section doit être ajoutée dans le registre central
- Le validator ne doit pas contenir de liste locale des types
- Favoriser un code lisible, modulaire et testable
- Ajouter ou mettre à jour les tests pour toute règle métier modifiée

## CI minimale

Le workflow GitHub Actions s'exécute sur push vers main et sur pull request.

Étapes :

1. Installation des dépendances avec npm ci
2. Exécution des tests unitaires avec npm run test:unit
3. Vérification de compilation avec npm run build

## Checklist Pull Request

- Le code compile sans erreur
- Les tests unitaires passent
- Les changements de logique sont couverts par des tests
- Le README ou la documentation est mis à jour si nécessaire

## Templates équipe

- Template de Pull Request : .github/pull_request_template.md
- Template de message de commit : .github/commit-message-template.txt

Pour utiliser le template de commit en local :

1. git config commit.template .github/commit-message-template.txt

## Roadmap courte

- Enrichir la CLI pour lister les catégories de sections
- Ajouter des validations de compatibilité avancées
- Étendre la génération IA en s'appuyant sur le registre central
