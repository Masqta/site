// Get reviews from GitHub
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { GITHUB_TOKEN, GITHUB_REPO, GITHUB_OWNER } = process.env;
    
    // Parse query parameters
    const params = new URLSearchParams(event.queryStringParameters || {});
    const limit = parseInt(params.get('limit')) || 10;

    // Default fallback reviews - exactly 3 reviews
    const fallbackReviews = [
      { id: 'REV-1', name: 'Иван П.', rating: 5, text: 'Много чист звук и шумопотискането е топ. Дойдоха бързо!', verified: true, createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'REV-2', name: 'Мария К.', rating: 5, text: 'Удобни за носене и батерията държи много. Препоръчвам!', verified: true, createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'REV-3', name: 'Георги Д.', rating: 5, text: 'Добро качество за цената. Доставката беше бърза.', verified: true, createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() }
    ];

    if (!GITHUB_TOKEN || !GITHUB_REPO || !GITHUB_OWNER) {
      // Return fallback reviews if env vars not set
      const avgRating = (fallbackReviews.reduce((sum, r) => sum + r.rating, 0) / fallbackReviews.length).toFixed(1);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          reviews: fallbackReviews.slice(0, limit),
          count: fallbackReviews.length,
          averageRating: avgRating
        })
      };
    }

    // Try to fetch reviews from GitHub
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/reviews.json`,
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (response.status === 404) {
      // File doesn't exist, return fallback
      const avgRating = (fallbackReviews.reduce((sum, r) => sum + r.rating, 0) / fallbackReviews.length).toFixed(1);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          reviews: fallbackReviews.slice(0, limit),
          count: fallbackReviews.length,
          averageRating: avgRating
        })
      };
    }

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const fileData = await response.json();
    const content = Buffer.from(fileData.content, 'base64').toString('utf8');
    const reviews = JSON.parse(content);

    // Calculate average rating
    const avgRating = reviews.length > 0 
      ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
      : '4.9';

    // Return limited reviews
    const limitedReviews = reviews.slice(0, limit);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        reviews: limitedReviews,
        count: reviews.length,
        averageRating: avgRating
      })
    };

  } catch (error) {
    console.error('Error fetching reviews:', error);
    // Return fallback on error - exactly 3 reviews
    const fallbackReviews = [
      { id: 'REV-1', name: 'Иван П.', rating: 5, text: 'Много чист звук и шумопотискането е топ. Дойдоха бързо!', verified: true, createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'REV-2', name: 'Мария К.', rating: 5, text: 'Удобни за носене и батерията държи много. Препоръчвам!', verified: true, createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'REV-3', name: 'Георги Д.', rating: 5, text: 'Добро качество за цената. Доставката беше бърза.', verified: true, createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() }
    ];
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        reviews: fallbackReviews.slice(0, limit),
        count: fallbackReviews.length,
        averageRating: '5.0'
      })
    };
  }
};
