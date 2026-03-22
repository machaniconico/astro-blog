const GITHUB_CLIENT_ID = '0v23liQAk8SIIS0HG7Yc';

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);

  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: `${url.origin}/api/callback`,
    scope: 'repo,user',
  });

  return Response.redirect(
    `https://github.com/login/oauth/authorize?${params}`,
    302
  );
}
