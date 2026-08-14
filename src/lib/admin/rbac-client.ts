"use client";

import { createAuthClient } from "better-auth/react";
import { adminClient, inferAdditionalFields } from "better-auth/client/plugins";
import type { leadCenterAuth } from "./rbac-auth";

export const leadCenterAuthClient = createAuthClient({
  basePath: "/api/lead-center-auth",
  plugins: [adminClient(), inferAdditionalFields<typeof leadCenterAuth>()],
});
