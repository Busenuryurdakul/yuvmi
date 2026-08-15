import type { DateTimeString, ID } from "./user";

/** Space types for personalized experiences */
export type SpaceType = "personal" | "couple" | "friends" | "family";

/** Friend connection status */
export type FriendStatus = "pending" | "accepted" | "blocked";

export type SpaceMemberRole = "owner" | "member" | "viewer";

/** Content visibility within personal or shared contexts */
export type VisibilityLevel = "private" | "space_members" | "specific_members";

export type SpaceFeature =
  | "shared_vision_board"
  | "joint_affirmations"
  | "progress_comparison"
  | "private_notes";

/** Shared or private space (personal, couple, friends…) */
export interface Space {
  id: ID;
  type: SpaceType;
  name: string;
  ownerId: ID;
  memberIds: ID[];
  /** Feature flags unlocked in this space */
  features: SpaceFeature[];
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
}

export interface FriendConnection {
  id: ID;
  requesterId: ID;
  addresseeId: ID;
  status: FriendStatus;
  /** Optional shared space created on accept */
  sharedSpaceId?: ID;
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
}

export interface SpaceInvite {
  id: ID;
  spaceId: ID;
  inviterId: ID;
  inviteeEmail: string;
  role: SpaceMemberRole;
  expiresAt: DateTimeString;
  createdAt: DateTimeString;
}
