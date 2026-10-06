# HomeManager NestJS

A TypeScript/NestJS port of the HomeManager backend API.

This project keeps the same core backend ideas from the Kotlin/Spring Boot version, but implements them with a full-stack JavaScript/TypeScript-friendly stack:

- NestJS
- TypeScript
- PostgreSQL
- Prisma
- JWT auth
- BCrypt password hashing
- Swagger/OpenAPI
- OpenAI audio grocery extraction
- Server-Sent Events for live shopping mode

## What is ported

Implemented in this NestJS version:

- Email/password signup and login
- Demo login
- JWT-protected endpoints
- Homes and rooms
- Tasks with recurring-next-task creation
- Projects
- Inventory
- Low-stock shopping list sync
- Shopping trips
- Shopping mode state and SSE updates
- Check off shopping items and update budget totals
- Complete shopping trips and reconcile items into inventory
- AI audio capture flow with OpenAI transcription + structured item extraction
- Capture job review/update/apply flow with duplicate-apply guard
- Swagger docs at `/swagger`

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy the example env file:

```bash
cp .env.example .env
```

Set:

```env
DATABASE_URL="postgresql://homemanager:homemanager@localhost:5432/homemanager_nest?schema=public"
JWT_SECRET="replace-with-a-long-random-secret"
JWT_EXPIRES_IN="0"
OPENAI_API_KEY=""
PORT=3000
CORS_ALLOWED_ORIGINS="http://localhost:5173,http://127.0.0.1:5173"
```

`JWT_EXPIRES_IN=0` means generated JWTs do not expire.

### 3. Run Prisma migration

```bash
npx prisma migrate dev --name initial
```

### 4. Start API

```bash
npm run start:dev
```

Swagger:

```text
http://localhost:3000/swagger
```

## Auth endpoints

```http
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/demo-login
```

Example login response:

```json
{
  "accessToken": "jwt...",
  "tokenType": "Bearer"
}
```

Use the token in Swagger or clients as:

```text
Authorization: Bearer YOUR_TOKEN
```

## AI audio capture endpoint

```http
POST /api/homes/{homeId}/shopping-trips/{tripId}/capture/audio
Content-Type: multipart/form-data
```

Form field:

```text
audio
```

The service:

1. transcribes audio with OpenAI Whisper
2. extracts structured shopping items
3. creates a capture job
4. creates reviewable shopping trip items

## Notes

This is not a line-by-line conversion. It is a NestJS-style implementation of the same domain model and workflows.

The original Spring Boot version remains the stronger Kotlin/Java backend portfolio project. This version is useful if you want a full-stack TypeScript/NestJS portfolio direction.
