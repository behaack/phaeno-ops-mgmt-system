const jsonResponse = (status: number, body: unknown) =>
  Response.json(body, {
    status,
    headers: {
      'cache-control': 'private, no-store',
    },
  })

export async function GET(request: Request) {
  if (process.env.PUBLIC_SITE_REVIEW_MODE?.trim().toLowerCase() !== 'true') {
    return jsonResponse(404, { message: 'Not found.' })
  }

  const requestUrl = new URL(request.url)
  const query = requestUrl.searchParams.get('search')?.trim() ?? ''
  const requestedLocale = requestUrl.searchParams.get('locale')?.trim().toLowerCase() ?? ''
  const locale = requestedLocale === 'ar' || requestedLocale.startsWith('ar-')
    ? 'ar'
    : 'en-US'
  if (query.length < 3 || query.length > 200) {
    return jsonResponse(400, { message: 'Search must contain between 3 and 200 characters.' })
  }

  const apiBaseUrl = process.env.WEBSITE_PREVIEW_SEARCH_API_BASE_URL?.trim()
  const apiKey = process.env.WEBSITE_PREVIEW_SEARCH_API_KEY?.trim()
  if (!apiBaseUrl || !apiKey) {
    return jsonResponse(503, { message: 'Team preview search is not configured.' })
  }

  let upstreamUrl: URL
  try {
    const normalizedBaseUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl : `${apiBaseUrl}/`
    upstreamUrl = new URL('web-ops/team-preview/search-pages', normalizedBaseUrl)
  } catch {
    return jsonResponse(503, { message: 'Team preview search is not configured.' })
  }
  upstreamUrl.searchParams.set('search', query)
  upstreamUrl.searchParams.set('locale', locale)

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: {
        accept: 'application/json',
        'X-Phaeno-Preview-Search-Key': apiKey,
      },
      redirect: 'error',
    })
    const responseBody = await upstream.arrayBuffer()

    return new Response(responseBody, {
      status: upstream.status,
      headers: {
        'cache-control': 'private, no-store',
        'content-type': upstream.headers.get('content-type') ?? 'application/json',
      },
    })
  } catch {
    return jsonResponse(502, { message: 'Team preview search is temporarily unavailable.' })
  }
}
