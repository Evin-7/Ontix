"use client";

import { createAuthClient } from "better-auth/react";

// The browser only communicates with Ontix's same-origin auth handler. It
// never connects to PostgreSQL or receives server credentials.
export const authClient = createAuthClient();
