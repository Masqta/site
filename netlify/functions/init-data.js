// Initialize data files in GitHub if they don't exist
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { GITHUB_TOKEN, GITHUB_REPO, GITHUB_OWNER } = process.env;

    if (!GITHUB_TOKEN || !GITHUB_REPO || !GITHUB_OWNER) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: false, message: 'GitHub not configured' })
      };
    }

    const files = [
      { path: 'data/orders.json', content: [] },
      { path: 'data/reviews.json', content: [
        { id: 'REV-1', name: 'Иван П.', rating: 5, text: 'Много чист звук и шумопотискането е топ. Дойдоха бързо!', verified: true, createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
        { id: 'REV-2', name: 'Мария К.', rating: 5, text: 'Удобни за носене и батерията държи много. Препоръчвам!', verified: true, createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
        { id: 'REV-3', name: 'Георги Д.', rating: 5, text: 'Добро качество за цената. Доставката беше бърза.', verified: true, createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() }
      ]},
      { path: 'data/promos.json', content: [
        { code: 'EASTER15', discount: 15, uses: 0, maxUses: 0, expiry: '2025-05-01', createdAt: new Date().toISOString() },
        { code: 'SAVE10', discount: 10, uses: 0, maxUses: 0, expiry: null, createdAt: new Date().toISOString() }
      ]},
      { path: 'data/stock.json', content: { airpods: 50 } },
      { path: 'data/visitors.json', content: { total: 0, today: 0 } },
      { path: 'data/settings.json', content: { price: 55, oldPrice: 89, phone: '0878 460 279', email: 'info@airstore.bg', siteName: 'AirStore Bulgaria' } }
    ];

    const results = [];

    for (const file of files) {
      try {
        // Check if file exists
        const checkResponse = await fetch(
          `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${file.path}`,
          {
            headers: {
              'Authorization': `token ${GITHUB_TOKEN}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );

        if (checkResponse.status === 404) {
          // File doesn't exist, create it
          const createResponse = await fetch(
            `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${file.path}`,
            {
              method: 'PUT',
              headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                message: `Initialize ${file.path}`,
                content: Buffer.from(JSON.stringify(file.content, null, 2)).toString('base64')
              })
            }
          );

          if (createResponse.ok) {
            results.push({ file: file.path, status: 'created' });
          } else {
            results.push({ file: file.path, status: 'error', error: await createResponse.text() });
          }
        } else {
          results.push({ file: file.path, status: 'exists' });
        }
      } catch (error) {
        results.push({ file: file.path, status: 'error', error: error.message });
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, results })
    };

  } catch (error) {
    console.error('Error initializing data:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
