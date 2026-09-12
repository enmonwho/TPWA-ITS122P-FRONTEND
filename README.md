# ✈️ LakBye: Travel Planner Web Application — Frontend Client

**Course:** ITS122P - WEB SYSTEMS AND TECHNOLOGIES 2
**Section:** AM2 | Group 2  
**Date:** September 2026  
**Status:** Phase 2 (User Interface & API Integration) — Active Sprint

---

## 📌 Project Overview

**LakBye** (_"Saan aabot ang Lakbye mo?"_) is a centralized travel planning web platform designed to streamline trip coordination, multi-destination itinerary scheduling, live expense tracking, and activity bookings across three distinct user roles: **Customer**, **Staff**, and **Administrator**.

This repository hosts the decoupled single-page application (SPA) client built with React 19, Vite, TypeScript, and Tailwind CSS v4, communicating with the Node.js/Express.js RESTful API engine.

---

## 👥 Team Group 2 & Responsibilities

- **Adyson M. Reales** — Project Manager / System Analyst
- **Jose Andres B. Pagcu** — Backend Developer
- **Vincent Joseph A. Villanueva** — Database / API Developer
- **Edmund Jacob B. Borja** — Frontend Developer
- **Marla Rue P. Canlas** — QA / Security / UI / Documentation

---

## 🛠️ Technology Stack

- **Framework & Core:** React 19, React DOM, Vite 8, TypeScript (Strict Mode)
- **Routing:** React Router v7 (`react-router-dom`)
- **Styling & Design System:** Tailwind CSS v4, Custom Vanilla CSS Design System
- **HTTP & Session:** Axios (configured with `withCredentials: true` for HTTP-only cookie session auth)
- **3D & Spatial Mapping:** Mapbox GL (`mapbox-gl` v3.30.0) with atmospheric fog & custom markers, Three.js, `@react-three/fiber`, `@react-three/drei`
- **Analytics & Data Viz:** Recharts v3 (Budget category donut charts)
- **Icons & Assets:** Lucide React (`lucide-react`) + custom SVG/PNG asset library
- **Code Quality & CI:** ESLint, Prettier, Husky, lint-staged
- **Hosting & Deployment:** Vercel (Continuous Deployment via `main` branch)

---

## 🌟 Application Features

### 1. Landing & Onboarding

- **3D Interactive Earth Hero**: Rotating 3D globe driven by scroll mechanics using Three.js and React Three Fiber.
- **Visual Design System**: Cream aesthetic (`#FFFAF2` / `#F8F3EC`), torn paper card textures, and signature brand gradients.
- **Authentication**: Split-screen stamp collage design for Sign In and Sign Up with HTTP-only cookie session authentication.
- **Personalized Onboarding**: Multi-step setup for travel preferences and username configuration.

### 2. Customer Dashboard

- **Dynamic Traveler Profile**: Displays live user details, trip counts, journal entries, and customized greetings.
- **Dynamic Stat Cards**: Auto-calculates Countries Explored, Total Bookings, Countdown Until Next Trip, and Total Spent with responsive shrink-to-fit font clamping.
- **Trip Filtering & Management**: Tabs for _All Trips_, _Upcoming_, and _Past_ with status countdown chips ("In # Days").
- **Create Trip Modal**: Custom multi-select country autocomplete dropdown, in-house calendar date-range picker, and travel style selectors.

### 3. Explore & 3D Map View

- **3D Satellite Globe**: Powered by Mapbox GL with atmospheric fog and custom orange pin markers (`#E9724C`).
- **Explore Hub (`/dashboard/explore`)**: Browse destinations across regions (Asia, Europe, Americas, etc.) and launch trip planners directly from destination cards.
- **My Map (`/dashboard/map`)**: Visualize custom collections synchronized with real user trips. Add pins via location search or manual coordinate entry categorized by Activities, Stays, Eat & Drink, or Destinations.

### 4. Trip Workspace

- **Planner**: Interactive itinerary table with accommodation, activity, and transport tracking. Supports switching between _Route_ and _Day-by-Day_ views with gradient-outline pill tabs.
- **Budget Tracker (`/trip/:tripId/budget`)**: Recharts donut chart visualization, 5 categorized expenditure badges, live balance tracking, and itemized expense ledger connected to backend endpoints.
- **Trip Settings (`/trip/:tripId/settings`)**: Edit trip details, travel dates, countries, and delete trips with automated storage cleanup.

---

## 🗂️ Project Structure

```text
src/
├── assets/             # Brand logos, category icons, textures, stamp collages
├── components/         # Reusable UI components (GlobeMap, StatCard, DateRangePicker, Modals)
├── constants/          # Country lists (195+ countries) and coordinate catalogs
├── context/            # AuthContext (user session, login, register, logout)
├── hooks/              # Custom hooks (useEarthScroll, useMediaQuery)
├── layouts/            # BaseLayout, DashboardLayout, TripWorkspaceLayout
├── lib/                # Route constants, storage keys, and client side-tables
├── pages/              # Home, Login, SignUp, Onboarding, Dashboard, Explore, MapView, TripWorkspace, Budget, Settings
├── services/           # Axios instance and API modules (authApi, tripsApi, destinationsApi, budgetApi)
├── types/              # TypeScript definitions (User, Trip, Destination, Category)
├── router.tsx          # Application router configuration
├── App.tsx             # Root application component
├── index.css           # Global design system tokens and application styles
└── main.tsx            # Entry point
```

---

## 🚀 Running Locally

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/enmonwho/TPWA-ITS122P-FRONTEND.git
   cd TPWA-ITS122P-FRONTEND
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up local environment:**

   Copy the example template to create your local environment configuration:

   ```bash
   cp .env.example .env.local
   ```

4. **Start the development server:**

   ```bash
   npm run dev
   ```

   The app will run at `http://localhost:5173`.

---

## 📜 Available Scripts

| Command                | Description                                                           |
| :--------------------- | :-------------------------------------------------------------------- |
| `npm run dev`          | Starts Vite local development server with hot-module replacement      |
| `npm run build`        | Compiles TypeScript (`tsc -b`) and bundles application for production |
| `npm run preview`      | Locally preview the production build output                           |
| `npm run lint`         | Runs ESLint across all TypeScript and React files                     |
| `npm run lint:fix`     | Automatically fixes auto-fixable ESLint issues                        |
| `npm run format`       | Formats all code files using Prettier                                 |
| `npm run format:check` | Checks formatting compliance with Prettier                            |

---

## 🌐 Deployment

The frontend client is continuously deployed via **Vercel** (`main` branch), communicating with the backend API engine hosted on **Render**.
