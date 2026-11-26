import sharp from "sharp";

const SITE_NAME = "Abdul Rauf Gift Centre";
const ALLOWED_HOST = "eanlsdwzmridqgwjqduu.supabase.co";

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function getImageUrl(value) {
  try {
    const url = new URL(value);

    if (
      url.hostname !== ALLOWED_HOST ||
      !url.pathname.startsWith(
        "/storage/v1/object/public/product-images/"
      )
    ) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

export default async (request) => {
  const url = new URL(request.url);

  const name = url.searchParams.get("name") || "Product";
  const image = getImageUrl(url.searchParams.get("image") || "");
  const price = url.searchParams.get("price") || "";
  const description = url.searchParams.get("description") || "";

  if (!image) {
    return new Response("Invalid product image.", {
      status: 400
    });
  }

  // Blurred WhatsApp preview image
  if (url.searchParams.get("preview") === "1") {
    try {
      const response = await fetch(image);

      if (!response.ok) {
        throw new Error("Image unavailable");
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      const blurred = await sharp(buffer)
        .resize(800, 600, { fit: "cover" })
        .blur(18)
        .png()
        .toBuffer();

      return new Response(blurred, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=86400"
        }
      });

    } catch (error) {
      return new Response("Preview unavailable.", {
        status: 404
      });
    }
  }

  const previewUrl = new URL(request.url);
  previewUrl.searchParams.set("preview", "1");

  const title = escapeHtml(name);
  const safePrice = escapeHtml(price);
  const safeDescription = escapeHtml(description);
  const safeImage = escapeHtml(image);
  const safePreview = escapeHtml(previewUrl.href);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">

<title>${title} | ${SITE_NAME}</title>

<meta property="og:type" content="product">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${safeDescription} ${safePrice}">
<meta property="og:image" content="${safePreview}">
<meta property="og:image:width" content="800">
<meta property="og:image:height" content="600">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:image" content="${safePreview}">

<style>
body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 24px;
  background: #f5eee8;
  color: #29221e;
}
main {
  max-width: 520px;
  margin: 25px auto;
  background: white;
  padding: 18px;
  border-radius: 14px;
}
img {
  width: 100%;
  height: auto;
  border-radius: 10px;
}
h1 {
  font-size: 24px;
}
.price {
  font-size: 20px;
  font-weight: bold;
}
a {
  display: inline-block;
  background: #806044;
  color: white;
  padding: 12px 18px;
  border-radius: 8px;
  text-decoration: none;
}
</style>
</head>

<body>
<main>
<img src="${safeImage}" alt="${title}">
<h1>${title}</h1>
<p class="price">${safePrice}</p>
<p>${safeDescription}</p>
<a href="/">Visit our store</a>
</main>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300"
    }
  });
};
