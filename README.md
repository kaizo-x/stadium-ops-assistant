This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 🚀 Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🧪 Testing Suite (Vitest)

We use **Vitest** for automated unit testing of our decision engine and operations logic.

### Running Tests
To execute the test suite once:
```bash
npm test
```

To run tests in watch mode during development:
```bash
npx vitest
```

The test files reside in the [`__tests__`](file:///c:/Users/Sayali/OneDrive/Desktop/stadium-ops-assistant/__tests__) directory. They validate:
1. `calculateAverageDensity` boundary values (normal states, empty arrays, division-by-zero stand capacities).
2. `getRecommendations` decision boundary rules (e.g., Gate detour redirects when capacity exceeds 80%).

## 🛡️ Security Implementation

We prioritize application stability and dispatcher input safety:
1. **Security Headers**: Defined custom headers in [`next.config.ts`](file:///c:/Users/Sayali/OneDrive/Desktop/stadium-ops-assistant/next.config.ts) to enforce:
   - **Content Security Policy (CSP)**: `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self';`
   - **Clickjacking Protection**: `X-Frame-Options: DENY`
   - **MIME Sniffing Prevention**: `X-Content-Type-Options: nosniff`
   - **Referrer Control**: `Referrer-Policy: strict-origin-when-cross-origin`
2. **Input Sanitization**: Operational incident descriptions are sanitized on submission to strip dangerous HTML tags and escape active characters to prevent XSS/Script Injection. The sanitization logic is located in [`lib/security.ts`](file:///c:/Users/Sayali/OneDrive/Desktop/stadium-ops-assistant/lib/security.ts).
3. **No Hardcoded Keys**: The project contains zero hardcoded API keys or secrets. Check [`env.example`](file:///c:/Users/Sayali/OneDrive/Desktop/stadium-ops-assistant/.env.example) for recommended variables.

## 📊 Challenge Compliance

A comprehensive mapping of features to the tournament challenge requirements is maintained in [`COMPLIANCE.md`](file:///c:/Users/Sayali/OneDrive/Desktop/stadium-ops-assistant/COMPLIANCE.md).

