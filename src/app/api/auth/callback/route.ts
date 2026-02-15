import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no_code", req.url));
  }

  // Exchange code for access token
  const tokenResponse = await fetch(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    }
  );

  const tokenData = await tokenResponse.json();
  if (tokenData.error) {
    return NextResponse.redirect(
      new URL(`/login?error=${tokenData.error}`, req.url)
    );
  }

  // Fetch user profile
  const userResponse = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  const userData = await userResponse.json();

  // Store in session
  const session = await getSession();
  session.githubToken = tokenData.access_token;
  session.githubUser = {
    id: userData.id,
    login: userData.login,
    avatar_url: userData.avatar_url,
    name: userData.name,
  };
  session.trackedRepos = session.trackedRepos || [];
  session.theme = session.theme || "system";
  await session.save();

  return NextResponse.redirect(new URL("/", req.url));
}
