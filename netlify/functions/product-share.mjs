import sharp from 'sharp';

const SUPABASE_URL = 'https://eanlsdwzmridqgwjqduu.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

function html(value = '') {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

export default async (request) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id') || '';
  const photoIndex = Math.max(0, Math.min(9, Number.parseInt(url.searchParams.get('photo') || '0', 10) || 0));
  const preview = url.searchParams.get('preview') === '1';
  if (!id || !SUPABASE_KEY) return new Response('Product not found', { status: 404 });

  try {
    const api = `${SUPABASE_URL}/rest/v1/products?id=eq.${encodeURIComponent(id)}&select=id,name,price,description,image_url,image_urls`;
    const response = await fetch(api, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
    if (!response.ok) return new Response('Unable to load product', { status: 502 });
    const rows = await response.json();
    const product = rows[0];
    if (!product) return new Response('Product not found', { status: 404 });

    const images = Array.isArray(product.image_urls) && product.image_urls.length ? product.image_urls : (product.image_url ? [product.image_url] : []);
    const image = images[photoIndex] || images[0] || '';
    if (!image || !image.startsWith(SUPABASE_URL + '/storage/v1/object/public/')) return new Response('Product image not found', { status: 404 });

    if (preview) {
      const imageResponse = await fetch(image);
      if (!imageResponse.ok) return new Response('Image not found', { status: 404 });
      const bytes = Buffer.from(await imageResponse.arrayBuffer());
      const blurred = await sharp(bytes).resize(900, 900, { fit: 'inside', withoutEnlargement: true }).blur(18).png().toBuffer();
      return new Response(blurred, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
    }

    const title = html(product.name || 'Product');
    const price = html(product.price ? `PKR ${product.price}` : 'Price on request');
    const description = html(product.description || 'View this product at Abdul Rauf Gift Centre.');
    const canonical = `${url.origin}/.netlify/functions/product-share?id=${encodeURIComponent(id)}&photo=${photoIndex}`;
    const previewUrl = `${canonical}&preview=1`;
    const page = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | Abdul Rauf Gift Centre</title><meta name="description" content="${description}"><meta property="og:type" content="product"><meta property="og:title" content="${title} | Abdul Rauf Gift Centre"><meta property="og:description" content="${price}"><meta property="og:image" content="${html(previewUrl)}"><meta property="og:url" content="${html(canonical)}"><meta name="twitter:card" content="summary_large_image"><style>body{font-family:Arial,sans-serif;margin:0;background:#f5eee8;color:#171717}.wrap{max-width:620px;margin:28px auto;padding:18px;background:white;border-radius:16px;text-align:center}img{width:100%;max-height:70vh;object-fit:contain;background:#fffaf3;border-radius:10px}h1{font-size:22px}p{color:#555}a{color:inherit;text-decoration:none}</style></head><body><a href="${html(image)}"><main class="wrap"><img src="${html(image)}" alt="${title}"><h1>${title}</h1><strong>${price}</strong><p>${description}</p><p>Abdul Rauf Gift Centre</p></main></a></body></html>`;
    return new Response(page, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
  } catch (error) {
    return new Response('Unable to create product link', { status: 500 });
  }
};
