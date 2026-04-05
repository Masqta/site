// Save review to GitHub
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  }

  try {
    const { GITHUB_TOKEN, GITHUB_REPO, GITHUB_OWNER } = process.env;
    const reviewData = JSON.parse(event.body);

    // Validate required fields
    if (!reviewData.name || !reviewData.text || !reviewData.rating) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Missing required fields' })
      };
    }

    // Generate review ID
    const reviewId = 'REV-' + Date.now().toString(36).toUpperCase();
    const newReview = {
      id: reviewId,
      name: reviewData.name.trim(),
      rating: parseInt(reviewData.rating) || 5,
      text: reviewData.text.trim(),
      verified: false,
      createdAt: new Date().toISOString()
    };

    // If GitHub is configured, save there
    if (GITHUB_TOKEN && GITHUB_REPO && GITHUB_OWNER) {
      // Fetch existing reviews
      const reviewsResponse = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/reviews.json`,
        {
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      let reviews = [];
      let reviewsSha = null;

      if (reviewsResponse.ok) {
        const fileData = await reviewsResponse.json();
        const content = Buffer.from(fileData.content, 'base64').toString('utf8');
        reviews = JSON.parse(content);
        reviewsSha = fileData.sha;
      }

      // Add new review at the beginning
      reviews.unshift(newReview);

      // Save back to GitHub
      await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/reviews.json`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: `Add review from ${newReview.name}`,
            content: Buffer.from(JSON.stringify(reviews, null, 2)).toString('base64'),
            sha: reviewsSha
          })
        }
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          reviewId: reviewId,
          review: newReview,
          totalReviews: reviews.length
        })
      };
    }

    // If GitHub not configured, return success anyway (for testing)
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        reviewId: reviewId,
        review: newReview,
        message: 'Review saved (GitHub not configured)'
      })
    };

  } catch (error) {
    console.error('Error saving review:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
