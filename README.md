# Document Transformer

Document Transformer is an intelligent document processing platform. The project is split into a **Backend** (NestJS) and a **Frontend** (React/Vite).

## Tech Stack

### Backend
- **Framework**: [NestJS](https://nestjs.com/)
- **Database**: PostgreSQL (via Prisma ORM)
- **Cache**: Redis
- **Auth**: Keycloak
- **File Processing**: PDF parsing, Tesseract OCR, DOCX, and PPTX support

### Frontend
- **Framework**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling**: Vanilla CSS, `clsx`, `lucide-react`
- **Animation**: Framer Motion
- **Routing**: React Router DOM

## Prerequisites

Ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (v20+ recommended)
- [Docker](https://www.docker.com/) and Docker Compose

## Running the Project

### 1. Backend Setup

Open a terminal and navigate to the `backend` directory:
```bash
cd backend
```

**Step 1: Install Dependencies**
```bash
npm install
```

**Step 2: Environment Variables**
Copy the example environment file to `.env` and adjust the variables if necessary. (On Windows, you can just manually duplicate the `.env.example` file and rename it to `.env`).

**Step 3: Start Services**
Start the backing services (PostgreSQL, Redis, Keycloak) using Docker Compose:
```bash
docker-compose up -d
```

**Step 4: Database Setup**
Run Prisma migrations to initialize your database schema and generate the Prisma Client:
```bash
npm run prisma:generate
npm run prisma:migrate
```

**Step 5: Start the Backend Server**
```bash
npm run start:dev
```
The backend server will start in development watch mode.

### 2. Frontend Setup

Open a new terminal window and navigate to the `frontend` directory:
```bash
cd frontend
```

**Step 1: Install Dependencies**
```bash
npm install
```

**Step 2: Start the Frontend Server**
```bash
npm run dev
```
The frontend will start on [http://localhost:5173/](http://localhost:5173/).

## Additional Commands

### Backend
- `npm run prisma:studio`: Opens Prisma Studio to view and manage your database graphically.
- `npm run build`: Compiles the NestJS application.
- `npm run test`: Runs unit tests.

### Frontend
- `npm run build`: Compiles the React application for production.
- `npm run preview`: Previews the production build locally.
