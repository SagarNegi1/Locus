import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    let decodedUrl = url;
    try {
      while (decodedUrl !== decodeURIComponent(decodedUrl)) {
        decodedUrl = decodeURIComponent(decodedUrl);
      }
    } catch {
      // ignore
    }
    let urlToFetch = decodedUrl;
    if (urlToFetch.startsWith('/')) {
      urlToFetch = `${req.nextUrl.origin}${urlToFetch}`;
    }
    const finalUrl = encodeURI(urlToFetch);

    const response = await fetch(finalUrl);
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch PDF: ${response.statusText}` },
        { status: response.status }
      );
    }

    const arrayBuffer = await response.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("PDF proxy error:", error);
    return NextResponse.json(
      { error: "Failed to proxy PDF" },
      { status: 500 }
    );
  }
}
