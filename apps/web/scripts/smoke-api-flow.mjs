/**
 * Live API smoke for the web /app flow (same Go API the mobile app uses).
 *
 * Usage:
 *   node scripts/smoke-api-flow.mjs
 *   API_BASE_URL=http://localhost:8080 node scripts/smoke-api-flow.mjs
 *
 * Covers: register → onboarding (future-self, goal, plan) → today task + check-in
 * → future-self + progress reads → second login (mobile-equivalent session).
 */
const BASE = (process.env.API_BASE_URL || "http://localhost:8080").replace(/\/$/, "");

function unwrap(payload) {
  if (payload && typeof payload === "object" && "data" in payload) return payload.data;
  return payload;
}

async function request(path, { method = "GET", token, body } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || payload?.error || text || response.status;
    throw new Error(`${method} ${path} → ${response.status}: ${message}`);
  }
  return unwrap(payload);
}

async function main() {
  const stamp = Date.now();
  const email = `smoke.web.${stamp}@yuvmi.test`;
  const password = "SmokePass9!";
  const firstName = "Smoke";
  const lastName = "Web";

  await request("/health/live");

  await request("/api/v1/auth/register", {
    method: "POST",
    body: { email, password, first_name: firstName, last_name: lastName },
  });

  const login = await request("/api/v1/auth/login", {
    method: "POST",
    body: { email, password },
  });
  if (!login.token) throw new Error("login did not return token");
  let token = login.token;

  const me = await request("/api/v1/me", { token });
  if (me.onboardingComplete) throw new Error("new user should not have onboardingComplete");

  const future = await request("/api/v1/future-selfs", {
    method: "POST",
    token,
    body: {
      title: "Gelecekteki Ben",
      description: "Sakin, disiplinli ve meraklı.",
      domains: ["personal_growth", "health"],
      affirmations: ["Her gün bir adım."],
      visionItems: [{ domain: "personal_growth", title: "Düzenli sabahlar", sortOrder: 0 }],
    },
  });
  await request("/api/v1/future-selfs/me/approve", { method: "POST", token, body: {} });

  const goal = await request("/api/v1/goals", {
    method: "POST",
    token,
    body: { futureSelfId: future.id, title: "Sabah rutini", description: "30 gün" },
  });
  const plan = await request("/api/v1/plans", {
    method: "POST",
    token,
    body: {
      goalId: goal.id,
      title: "Sabah rutini",
      description: "İlk plan",
      steps: [
        { dayOffset: 0, title: "10 dakika günlüğü", description: "Niyetini yaz", sortOrder: 0 },
        { dayOffset: 1, title: "5 dakika nefes", description: "Sakin başla", sortOrder: 1 },
      ],
    },
  });
  await request(`/api/v1/plans/${plan.id}/activate`, { method: "POST", token, body: {} });

  const onboarded = await request("/api/v1/me", { token });
  if (!onboarded.onboardingComplete) throw new Error("activate plan should set onboardingComplete");

  const task = await request("/api/v1/tasks/today", { token });
  if (!task?.id) throw new Error("today task missing after plan activate");
  await request(`/api/v1/tasks/${task.id}/complete`, { method: "POST", token, body: {} });

  const checkin = await request("/api/v1/checkins/today", {
    method: "PUT",
    token,
    body: { mood: 4, energy: 4, gratitude: ["smoke"], reflection: "Web smoke check-in" },
  });
  if (checkin.mood !== 4) throw new Error("check-in did not persist");

  const futureRead = await request("/api/v1/future-selfs/me", { token });
  if (futureRead.description !== "Sakin, disiplinli ve meraklı.") {
    throw new Error("future-self screen would not see saved profile");
  }
  const alignment = await request("/api/v1/alignment/today", { token });
  if (typeof alignment.overallScore !== "number") throw new Error("progress alignment missing");

  const mobileLogin = await request("/api/v1/auth/login", {
    method: "POST",
    body: { email, password },
  });
  const mobileMe = await request("/api/v1/me", { token: mobileLogin.token });
  const mobileFuture = await request("/api/v1/future-selfs/me", { token: mobileLogin.token });
  const mobileCheckin = await request("/api/v1/checkins/today", { token: mobileLogin.token });
  const mobileTask = await request("/api/v1/tasks/today", { token: mobileLogin.token });

  if (mobileMe.id !== me.id) throw new Error("second session is a different user");
  if (mobileFuture.id !== futureRead.id) throw new Error("mobile session missing future-self");
  if (mobileCheckin.reflection !== "Web smoke check-in") throw new Error("mobile session missing check-in");
  if (mobileTask.status !== "completed") throw new Error("mobile session missing completed task");

  let rejected = false;
  try {
    await request("/api/v1/me", { token: "invalid" });
  } catch {
    rejected = true;
  }
  if (!rejected) throw new Error("invalid token should not access /me");

  console.log(
    JSON.stringify(
      {
        ok: true,
        email,
        userId: me.id,
        onboardingComplete: onboarded.onboardingComplete,
        taskStatus: "completed",
        checkinMood: checkin.mood,
        futureSelf: futureRead.title,
        alignmentScore: alignment.overallScore,
        secondSessionSameUser: true,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(`SMOKE FAIL against ${BASE}: ${error.message}`);
  process.exit(1);
});
