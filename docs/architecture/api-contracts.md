# API Contracts

> **Status:** Draft — populated during `/init-architecture`.
> Define endpoints BEFORE implementing them. This is the contract between frontend and backend.

## Conventions

- RESTful endpoints under `/api/` for external integrations
- Next.js Server Actions preferred for internal app mutations
- All responses use consistent shape: `{ data, error }`
- Authentication via Supabase session token in cookies
- All endpoints return appropriate HTTP status codes

## Response Shape

```typescript
// Success
{ data: T, error: null }

// Error
{ data: null, error: { message: string, code: string } }
```

## Endpoints

### Authentication
Handled by Supabase Auth client — no custom endpoints needed for:
- Sign up, sign in, sign out, password reset, OAuth

### API Routes

> Document each endpoint as it's designed:

#### `GET /api/example`
**Purpose:** [What this endpoint does]
**Auth required:** Yes / No
**Request:** [Query params, headers]
**Response:**
```json
{
  "data": { },
  "error": null
}
```
**Error cases:**
- 401: Not authenticated
- 403: Not authorized
- 404: Resource not found

---

### Server Actions

> Document server actions used for mutations:

#### `createExample(formData: FormData)`
**Purpose:** [What this action does]
**Auth required:** Yes
**Input:** [Expected form fields]
**Returns:** [Success/error shape]
**Validation:** [What input validation is applied]
