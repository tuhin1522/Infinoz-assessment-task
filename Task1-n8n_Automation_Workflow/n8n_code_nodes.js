/**
 * ============================================================================
 *  n8n Code Nodes — JavaScript
 *  Copy each section into the matching Code node in your n8n workflow.
 * ============================================================================
 */


// ============================================================================
// NODE: "Load Service Catalog"
// Position: After Webhook, before AI Agent
// Purpose : Reads the service catalog as structured data (mirrors dataset.csv).
//           The AI Agent receives this via its text-field expression — the
//           service data is NOT hardcoded in the system prompt.
// ============================================================================
{
  const services = [
    { name: "Samsung Galaxy Phone", price: 900, timeline: "3 days", description: "Latest Samsung smartphone with high performance camera and battery.", maxDiscount: "10%", discountLogic: "Offer 10% off for first-time customers only." },
    
    { name: "Cotton Shirt", price: 25, timeline: "2 days", description: "Comfortable formal cotton shirt suitable for office wear.", maxDiscount: "5%", discountLogic: "Offer 5% discount if customer buys more than 2 shirts." },
    
    { name: "Casual T-Shirt", price: 15, timeline: "2 days", description: "Soft breathable casual t-shirt available in multiple colors.", maxDiscount: "5%", discountLogic: "Offer 5% discount for orders of 3 or more items." },
    
    { name: "Traditional Panjabi", price: 40, timeline: "3 days", description: "Premium traditional Panjabi suitable for festivals and special occasions.", maxDiscount: "7%", discountLogic: "Offer 7% discount during festive seasons." },
    
    { name: "Programming Book", price: 30, timeline: "2 days", description: "Educational programming book covering modern software development concepts.", maxDiscount: "5%", discountLogic: "Offer 5% discount for students." },
    
    { name: "Wireless Earbuds", price: 60, timeline: "3 days", description: "Bluetooth wireless earbuds with noise cancellation and long battery life.", maxDiscount: "8%", discountLogic: "Offer 8% discount if customer also buys a smartphone." },
    
    { name: "Laptop Backpack", price: 35, timeline: "2 days", description: "Durable backpack designed to carry laptops and accessories safely.", maxDiscount: "5%", discountLogic: "Offer 5% discount for bundle purchases." },
    
    { name: "Sports Sneakers", price: 70, timeline: "4 days", description: "Lightweight running shoes designed for comfort and performance.", maxDiscount: "10%", discountLogic: "Offer 10% discount during seasonal sales." },
    
    { name: "Smart Watch", price: 120, timeline: "3 days", description: "Feature-rich smartwatch with health tracking and notifications.", maxDiscount: "8%", discountLogic: "Offer 8% discount for returning customers." },
    
    { name: "Notebook Set", price: 10, timeline: "1 day", description: "Pack of high-quality notebooks for school or office use.", maxDiscount: "5%", discountLogic: "Offer 5% discount when buying more than 5 notebooks." }
  ];

  const catalogText = services.map(s =>
    `- ${s.name}: $${s.price} | Timeline: ${s.timeline} | ${s.description} | Max Discount: ${s.maxDiscount} | Rule: ${s.discountLogic}`
  ).join('\n');

  return [{ json: { services, catalogText } }];
}


// ============================================================================
// NODE: "Parse AI Reply" (Code in JavaScript)
// Position: After AI Agent, before Switch
// ============================================================================
{
  const webhookData = $('webhook-chatbot').first().json;
  const userMessage  = webhookData.body.message ?? webhookData.body.chatInput ?? '';
  const sessionId    = webhookData.body.sessionId  ?? 'default-session';
  const timestamp    = new Date().toISOString();

  const output = $input.first().json.output ?? '';

  // Extract INTENT
  const intentMatch = output.match(/INTENT:\s*(\w+)/i);
  const intent = intentMatch ? intentMatch[1].toLowerCase().trim() : 'inquiry';

  // Extract STATUS
  const statusMatch = output.match(/STATUS:\s*([\w_]+)/i);
  const status = statusMatch ? statusMatch[1].toLowerCase().trim() : 'collecting';

  // Extract ORDER_DATA JSON
  const orderDataMatch = output.match(/ORDER_DATA:\s*(\{[\s\S]*?\})/i);
  let orderData = null;
  if (orderDataMatch) {
    try { orderData = JSON.parse(orderDataMatch[1]); } catch { orderData = null; }
  }

  // Strip all machine blocks from the human reply
  let humanReply = output
    .split(/\nINTENT:/i)[0]
    .replace(/SESSION_CONFIRMED[\s\S]*?END_SESSION/gi, '')
    .replace(/ORDER_CONFIRMED[\s\S]*?END_ORDER/gi, '')
    .replace(/ORDER_CANCELLED[\s\S]*?END_CANCELLED/gi, '')
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Extract SESSION_CONFIRMED block (discovery call booking)
  const sessionMatch = output.match(/SESSION_CONFIRMED\n([\s\S]*?)END_SESSION/i);
  let sessionData = null;
  if (sessionMatch) {
    const lines = sessionMatch[1].trim().split('\n');
    sessionData = {};
    lines.forEach(line => {
      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1) {
        const key = line.slice(0, colonIdx).trim().toLowerCase().replace(/\s+/g, '_');
        const val = line.slice(colonIdx + 1).trim();
        if (key) sessionData[key] = val;
      }
    });
  }

  // Extract ORDER_CONFIRMED block
  const orderConfirmedMatch = output.match(/ORDER_CONFIRMED\n([\s\S]*?)END_ORDER/i);
  let confirmedOrder = null;
  if (orderConfirmedMatch) {
    const lines = orderConfirmedMatch[1].trim().split('\n');
    confirmedOrder = {};
    lines.forEach(line => {
      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1) {
        const key = line.slice(0, colonIdx).trim().toLowerCase().replace(/\s+/g, '_');
        const val = line.slice(colonIdx + 1).trim();
        if (key) confirmedOrder[key] = val;
      }
    });
  }

  // Extract ORDER_CANCELLED block
  const cancelledMatch = output.match(/ORDER_CANCELLED\n([\s\S]*?)END_CANCELLED/i);
  let cancelledData = null;
  if (cancelledMatch) {
    const lines = cancelledMatch[1].trim().split('\n');
    cancelledData = {};
    lines.forEach(line => {
      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1) {
        const key = line.slice(0, colonIdx).trim().toLowerCase().replace(/\s+/g, '_');
        const val = line.slice(colonIdx + 1).trim();
        if (key) cancelledData[key] = val;
      }
    });
  }

  // Override intent/status when session or order is confirmed
  const effectiveIntent = sessionData ? 'booking' : intent;
  const effectiveStatus = (sessionData || confirmedOrder) ? 'confirmed' : status;

  return [{
    json: {
      humanReply,
      intent:         effectiveIntent,
      status:         effectiveStatus,
      orderData,
      sessionData,
      confirmedOrder,
      cancelledData,
      sessionId,
      userMessage,
      timestamp,
      rawOutput: output
    }
  }];
}



// ============================================================================
// NODE: "Parse AI Reply"
// Position: After OpenAI, before Switch
// ============================================================================
// Paste into → Code node "Parse AI Reply"
{
  const raw = $input.first().json.message?.content
    || $input.first().json.choices?.[0]?.message?.content
    || '';

  const sessionId   = $('Prep Input').first().json.sessionId;
  const userMessage = $('Prep Input').first().json.chatInput;
  const timestamp   = $('Prep Input').first().json.timestamp;
  const usage       = $input.first().json.usage || {};

  // Extract key:value line blocks between start/end tags
  function extractLineBlock(text, startTag, endTag) {
    const idx = text.indexOf(startTag);
    if (idx === -1) return null;
    const endIdx = text.indexOf(endTag, idx);
    const block = endIdx === -1 ? text.slice(idx) : text.slice(idx, endIdx + endTag.length);
    const fields = {};
    block.split('\n').slice(1).forEach(line => {
      const sep = line.indexOf(':');
      if (sep === -1) return;
      const k = line.slice(0, sep).trim();
      const v = line.slice(sep + 1).trim();
      if (k && k !== endTag.trim()) fields[k] = v;
    });
    return Object.keys(fields).length ? fields : null;
  }

  const orderConfirmed   = extractLineBlock(raw, 'ORDER_CONFIRMED',   'END_ORDER');
  const orderCancelled   = extractLineBlock(raw, 'ORDER_CANCELLED',   'END_CANCELLED');
  const bookingConfirmed = extractLineBlock(raw, 'BOOKING_CONFIRMED', 'END_BOOKING');

  // Extract metadata lines
  const intentMatch = raw.match(/^INTENT:\s*(.+)$/m);
  const statusMatch = raw.match(/^STATUS:\s*(.+)$/m);
  const orderMatch  = raw.match(/^ORDER_DATA:\s*(.+)$/m);

  const intent = (intentMatch?.[1] || 'inquiry').trim().toLowerCase();
  const status = (statusMatch?.[1] || 'collecting').trim().toLowerCase();

  let orderData = null;
  try { orderData = orderMatch ? JSON.parse(orderMatch[1]) : null; } catch { orderData = null; }

  // Strip all machine blocks from the human reply
  const machinePatterns = [
    /ORDER_CONFIRMED[\s\S]*?END_ORDER/g,
    /ORDER_CANCELLED[\s\S]*?END_CANCELLED/g,
    /BOOKING_CONFIRMED[\s\S]*?END_BOOKING/g,
    /^INTENT:.*$/mg,
    /^STATUS:.*$/mg,
    /^ORDER_DATA:.*$/mg,
  ];
  let cleanReply = raw;
  machinePatterns.forEach(p => { cleanReply = cleanReply.replace(p, ''); });
  cleanReply = cleanReply.replace(/\n{3,}/g, '\n\n').trim();

  return [{
    json: {
      reply:            cleanReply,
      intent,
      status,
      orderData,
      orderConfirmed:   orderConfirmed   || null,
      orderCancelled:   orderCancelled   || null,
      bookingConfirmed: bookingConfirmed  || null,
      sessionId,
      userMessage,
      timestamp,
      tokensPrompt:     usage.prompt_tokens     || 0,
      tokensCompletion: usage.completion_tokens || 0,
      tokensTotal:      usage.total_tokens      || 0,
    }
  }];
}


// ============================================================================
// NODE: "Booking Branch"
// Position: Output 0 of Switch (booking)
// ============================================================================
// Paste into → Code node "Booking Branch"
{
  const d = $input.first().json;
  const isConfirmed = !!d.bookingConfirmed;
  return [{
    json: {
      ...d,
      branchType:   'booking',
      sheetStatus:  isConfirmed ? 'confirmed' : 'collecting',
      orderDataJson: isConfirmed ? JSON.stringify(d.bookingConfirmed) : JSON.stringify(d.orderData),
    }
  }];
}


// ============================================================================
// NODE: "Order Branch"
// Position: Output 1 of Switch (order / negotiation)
// ============================================================================
// Paste into → Code node "Order Branch"
{
  const d = $input.first().json;
  const isConfirmed = !!d.orderConfirmed;
  return [{
    json: {
      ...d,
      branchType:   'order',
      sheetStatus:  isConfirmed ? 'confirmed' : d.status,
      orderDataJson: isConfirmed
        ? JSON.stringify(d.orderConfirmed)
        : JSON.stringify(d.orderData),
    }
  }];
}


// ============================================================================
// NODE: "Cancel Branch"
// Position: Output 2 of Switch (cancel)
// ============================================================================
// Paste into → Code node "Cancel Branch"
{
  const d = $input.first().json;
  return [{
    json: {
      ...d,
      branchType:   'cancel',
      sheetStatus:  'cancelled',
      orderDataJson: JSON.stringify(d.orderCancelled || { reason: 'user requested cancellation' }),
    }
  }];
}


// ============================================================================
// NODE: "Inquiry Branch"
// Position: Fallback output of Switch (inquiry / greeting)
// ============================================================================
// Paste into → Code node "Inquiry Branch"
{
  const d = $input.first().json;
  return [{
    json: {
      ...d,
      branchType:   'inquiry',
      sheetStatus:  'none',
      orderDataJson: null,
    }
  }];
}


// ============================================================================
// NODE: "Prepare Sheets Row"
// Position: After Merge, before Google Sheets
// ============================================================================
// Paste into → Code node "Prepare Sheets Row"
{
  const d = $input.first().json;
  const od = d.orderConfirmed || d.bookingConfirmed || d.orderCancelled || d.orderData || {};

  return [{
    json: {
      Timestamp:        d.timestamp,
      Session_ID:       d.sessionId,
      User_Message:     d.userMessage,
      AI_Reply:         d.reply,
      Intent:           d.branchType  || d.intent,
      Status:           d.sheetStatus,
      Product_Name:     od.product_name      || '',
      Customer_Name:    od.customer_name     || od.name  || '',
      Phone:            od.phone             || '',
      Delivery_Address: od.delivery_address  || '',
      Quantity:         od.quantity          || '',
      Final_Price:      od.final_price       || od.price || '',
      Email:            od.email             || '',
      Platform:         od.platform          || '',
      Order_Data_JSON:  d.orderDataJson      || '',
      Tokens_Total:     d.tokensTotal        || 0,
    }
  }];
}


// ============================================================================
// NODE: "Format Webhook Response"
// Position: After Parse AI Reply (parallel to Merge), before Respond to Webhook
// ============================================================================
// Paste into → Code node "Format Webhook Response"
{
  const d = $('Merge Branches').first().json;

  const response = {
    reply:      d.reply      || 'Sorry, something went wrong. Please try again.',
    intent:     d.intent     || 'inquiry',
    status:     d.sheetStatus || d.status || 'none',
    session_id: d.sessionId,
  };

  if (d.orderConfirmed)   response.order_confirmed   = d.orderConfirmed;
  if (d.bookingConfirmed) response.booking_confirmed = d.bookingConfirmed;
  if (d.orderCancelled)   response.order_cancelled   = d.orderCancelled;

  return [{ json: response }];
}
