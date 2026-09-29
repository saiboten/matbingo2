import { betterAuth } from "better-auth"
import { APIError, createAuthMiddleware } from "better-auth/api"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { tanstackStartCookies } from "better-auth/tanstack-start"
import { username } from "better-auth/plugins/username"
import { prisma } from "./prisma"
import { MAX_USERNAME_LENGTH, MIN_PASSWORD_LENGTH, MIN_USERNAME_LENGTH, isUsernameEmail, usernameEmail } from "./username-account"

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  user: {
    additionalFields: {
      familyId: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },
  // Username and password (the login page's "Lag konto"); nobody gets email, so no verification or
  // reset mails
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: MIN_PASSWORD_LENGTH,
  },
  hooks: {
    // Password accounts are username accounts only. A password sign-up with a real email is refused:
    // otherwise someone could claim another person's email and be linked in when they later use Google.
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") return
      const { email, username } = (ctx.body ?? {}) as { email?: unknown; username?: unknown }
      if (typeof username !== "string" || typeof email !== "string" || !isUsernameEmail(email) || email !== usernameEmail(username)) {
        throw new APIError("BAD_REQUEST", { message: "Kontoer med passord må ha et brukernavn" })
      }
    }),
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
  // tanstackStartCookies must stay last
  plugins: [
    username({ minUsernameLength: MIN_USERNAME_LENGTH, maxUsernameLength: MAX_USERNAME_LENGTH }),
    tanstackStartCookies(),
  ],
})
