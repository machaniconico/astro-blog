export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return new Response('Missing code parameter', { status: 400 });
  }

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      return new Response(`OAuth Error: ${tokenData.error_description}`, { status: 400 });
    }

    const messageData = JSON.stringify({
      token: tokenData.access_token,
      provider: 'github',
    });

    const html = `<!DOCTYPE html>
<html><head><title>認証中...</title></head>
<body>
<script>
(function() {
  var MESSAGE = 'authorization:github:success:' + ${JSON.stringify(messageData)};
  function receiveMessage(e) {
    window.opener.postMessage(MESSAGE, e.origin);
  }
  window.addEventListener('message', receiveMessage, false);
  window.opener.postMessage('authorizing:github', '*');
})();
</script>
</body></html>`;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (err) {
    return new Response(`Server error: ${err.message}`, { status: 500 });
  }
}
