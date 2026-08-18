import type { DateTimeString, ID } from "./user";
import type { SpaceMemberRole, VisibilityLevel } from "./space";

export type AssetType = "image" | "document";

/** Visual or document in the personal archive or a shared space */
export interface Asset {
  id: ID;
  ownerId: ID;
  spaceId?: ID;
  type: AssetType;
  title: string;
  storageKey: string;
  mimeType: string;
  visibility: VisibilityLevel;
  /** When set, asset is withdrawn from the shared space but retained privately */
  revokedFromSpaceAt?: DateTimeString;
  aiProcessingAllowed: boolean;
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
}

export type ConsentScope =
  | "ai_profile_generation"
  | "ai_plan_generation"
  | "ai_daily_task"
  | "ai_weekly_review"
  | "ai_shared_space"
  | "data_export"
  /** Retaining a suggestion and the user's reaction to it for model
   *  improvement — a separate purpose from the generation scopes above, so it
   *  is asked for separately and revoking it deletes what was collected. */
  | "ai_training_data";

/** Explicit permission for AI or data processing on specific resources */
export interface Consent {
  id: ID;
  userId: ID;
  scope: ConsentScope;
  granted: boolean;
  grantedAt?: DateTimeString;
  revokedAt?: DateTimeString;
  resourceType?: "profile" | "journal" | "asset" | "space";
  resourceId?: ID;
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
}

export type SpacePermissionAction = "view" | "comment" | "edit" | "share" | "revoke";

/** Content-level visibility grant within a shared space */
export interface SpacePermission {
  id: ID;
  spaceId: ID;
  assetId?: ID;
  granteeId: ID;
  action: SpacePermissionAction;
  visibility: VisibilityLevel;
  grantedById: ID;
  revokedAt?: DateTimeString;
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
}

export type SpaceMembershipStatus = "pending" | "active" | "left" | "removed";

/** Membership record; replaces bare member ID lists for invites and consent */
export interface SpaceMembership {
  id: ID;
  spaceId: ID;
  userId: ID;
  role: SpaceMemberRole;
  status: SpaceMembershipStatus;
  joinedAt?: DateTimeString;
  leftAt?: DateTimeString;
  /** Both parties must accept before status becomes active */
  inviteAcceptedAt?: DateTimeString;
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
}
