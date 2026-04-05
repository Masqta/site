// Save promo code to GitHub
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
    const promoData = JSON.parse(event.body);

    // Validate required fields
    if (!promoData.code || !promoData.discount) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Missing required fields' })
      };
    }

    if (!GITHUB_TOKEN || !GITHUB_REPO || !GITHUB_OWNER) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Promo saved (GitHub not configured)' })
      };
    }

    // Fetch existing promos
    const promosResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/promos.json`,
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    let promos = [];
    let sha = null;

    if (promosResponse.ok) {
      const fileData = await promosResponse.json();
      promos = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf8'));
      sha = fileData.sha;
    }

    // Check if promo already exists
    const existingIndex = promos.findIndex(p => p.code === promoData.code);
    
    if (existingIndex >= 0) {
      // Update existing
      promos[existingIndex] = { ...promos[existingIndex], ...promoData };
    } else {
      // Add new
      promos.push({
        code: promoData.code.toUpperCase(),
        discount: parseInt(promoData.discount),
        uses: 0,
        maxUses: parseInt(promoData.maxUses) || 0,
        expiry: promoData.expiry || null,
        createdAt: new Date().toISOString()
      });
    }

    // Save back to GitHub
    await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/promos.json`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Update promo code ${promoData.code}`,
          content: Buffer.from(JSON.stringify(promos, null, 2)).toString('base64'),
          sha: sha
        })
      }
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, promos })
    };

  } catch (error) {
    console.error('Error saving promo:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
