// Get promo codes from GitHub
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

    if (!GITHUB_TOKEN || !GITHUB_REPO || !GITHUB_OWNER) {
      // Return default promo codes
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          promos: [
            { code: 'EASTER15', discount: 15, uses: 0, maxUses: 0, expiry: '2025-05-01' },
            { code: 'SAVE10', discount: 10, uses: 0, maxUses: 0, expiry: null }
          ]
        })
      };
    }

    // Fetch promos from GitHub
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/promos.json`,
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (response.status === 404) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          promos: [
            { code: 'EASTER15', discount: 15, uses: 0, maxUses: 0, expiry: '2025-05-01' },
            { code: 'SAVE10', discount: 10, uses: 0, maxUses: 0, expiry: null }
          ]
        })
      };
    }

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const fileData = await response.json();
    const promos = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf8'));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, promos })
    };

  } catch (error) {
    console.error('Error fetching promos:', error);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        promos: [
          { code: 'EASTER15', discount: 15, uses: 0, maxUses: 0, expiry: '2025-05-01' },
          { code: 'SAVE10', discount: 10, uses: 0, maxUses: 0, expiry: null }
        ]
      })
    };
  }
};
