// Save order and decrease stock
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
    const orderData = JSON.parse(event.body);

    // Generate order ID
    const orderId = 'ORD-' + Date.now().toString(36).toUpperCase();
    const newOrder = {
      id: orderId,
      ...orderData,
      status: 'new',
      date: new Date().toISOString()
    };

    // If GitHub is configured, save there
    if (GITHUB_TOKEN && GITHUB_REPO && GITHUB_OWNER) {
      // First, check and decrease stock
      const stockResponse = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/stock.json`,
        {
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      let stock = { airpods_pro_3: 23, lastUpdated: new Date().toISOString() };
      let stockSha = null;

      if (stockResponse.ok) {
        const fileData = await stockResponse.json();
        const content = Buffer.from(fileData.content, 'base64').toString('utf8');
        stock = JSON.parse(content);
        stockSha = fileData.sha;
      }

      // Check if enough stock
      const currentStock = stock.airpods_pro_3 || 0;
      const qty = orderData.qty || 1;

      if (currentStock < qty) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            success: false, 
            error: 'Недостатъчна наличност',
            stock: currentStock
          })
        };
      }

      // Decrease stock
      stock.airpods_pro_3 = currentStock - qty;
      stock.lastUpdated = new Date().toISOString();

      await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/stock.json`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: `Decrease stock by ${qty} for order ${orderId}`,
            content: Buffer.from(JSON.stringify(stock, null, 2)).toString('base64'),
            sha: stockSha
          })
        }
      );

      // Save order
      const ordersResponse = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/orders.json`,
        {
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      let orders = [];
      let ordersSha = null;

      if (ordersResponse.ok) {
        const fileData = await ordersResponse.json();
        const content = Buffer.from(fileData.content, 'base64').toString('utf8');
        orders = JSON.parse(content);
        ordersSha = fileData.sha;
      }

      orders.unshift(newOrder);

      await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/orders.json`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: `Add order ${orderId}`,
            content: Buffer.from(JSON.stringify(orders, null, 2)).toString('base64'),
            sha: ordersSha
          })
        }
      );
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        orderId: orderId,
        order: newOrder
      })
    };

  } catch (error) {
    console.error('Error saving order:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
