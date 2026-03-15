/**
 * GET   /api/user/me/survey-profile — Return the user's survey profile
 * PATCH /api/user/me/survey-profile — Partially update the survey profile
 */
import { db } from "@/lib/db";
import { withAuth, jsonOk, jsonError, parseBody } from "@/lib/middleware";
import { updateSurveyProfileSchema } from "@/lib/validations/user";

/** Fields used to calculate completion percentage. */
const PROFILE_FIELDS = [
  "age",
  "gender",
  "education",
  "employmentStatus",
  "incomeRange",
  "householdSize",
  "hasChildren",
  "maritalStatus",
  "industry",
  "interests",
] as const;

function calcCompletionPct(
  profile: Record<string, unknown>
): number {
  let filled = 0;
  for (const field of PROFILE_FIELDS) {
    const val = profile[field];
    if (val === null || val === undefined) continue;
    // interests is an array — only count if non-empty
    if (Array.isArray(val)) {
      if (val.length > 0) filled++;
    } else {
      filled++;
    }
  }
  return Math.round((filled / PROFILE_FIELDS.length) * 100);
}

/**
 * GET — Return the user's survey profile, creating an empty one if it doesn't exist.
 */
export const GET = withAuth(async (_request, user) => {
  let profile = await db.surveyProfile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    profile = await db.surveyProfile.create({
      data: { userId: user.id },
    });
  }

  return jsonOk({ profile });
});

/**
 * PATCH — Partially update the survey profile. Recalculates completionPct.
 */
export const PATCH = withAuth(async (request, user) => {
  const { data, error } = await parseBody(request, updateSurveyProfileSchema);
  if (error) return error;

  // Build the update payload — only include fields that were actually sent
  const update: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data!)) {
    if (value !== undefined) {
      update[key] = value;
    }
  }

  if (Object.keys(update).length === 0) {
    return jsonError("No fields to update", 400);
  }

  // Upsert: create if missing, update if exists
  const existing = await db.surveyProfile.findUnique({
    where: { userId: user.id },
  });

  let profile;
  if (existing) {
    profile = await db.surveyProfile.update({
      where: { userId: user.id },
      data: {
        ...update,
        updatedAt: new Date(),
      },
    });
  } else {
    profile = await db.surveyProfile.create({
      data: {
        userId: user.id,
        ...update,
      },
    });
  }

  // Recalculate completion percentage
  const completionPct = calcCompletionPct(profile as unknown as Record<string, unknown>);
  profile = await db.surveyProfile.update({
    where: { userId: user.id },
    data: { completionPct },
  });

  return jsonOk({ profile });
});
