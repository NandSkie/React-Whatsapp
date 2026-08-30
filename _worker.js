// worker.js - Deploy ke Cloudflare Workers
// API-only version, no frontend

export default {
  async fetch(request, env) {
    // ===== CORS HANDLING =====
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // ===== ROUTING =====
    // Root endpoint
    if (path === '/' || path === '') {
      return new Response(JSON.stringify({
        name: 'Channel Engagement API',
        version: '2.0.0',
        endpoints: {
          '/api/handshake': 'POST - Initialize session',
          '/api/react': 'POST - Send reactions',
          '/api/status': 'GET - Check API status',
          '/api/limits': 'GET - Check remaining quota'
        },
        docs: 'https://github.com/your-repo/docs'
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // ===== API ROUTES =====
    try {
      // Status endpoint
      if (path === '/api/status') {
        return new Response(JSON.stringify({
          success: true,
          status: 'online',
          timestamp: new Date().toISOString(),
          server: 'Cloudflare Workers'
        }), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // Handshake endpoint
      if (path === '/api/handshake') {
        if (request.method !== 'POST') {
          return new Response(JSON.stringify({
            success: false,
            error: 'Method not allowed'
          }), {
            status: 405,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }

        // Forward to original API
        const response = await fetch('https://satriareact.satriadeveloperz.workers.dev/api/handshake', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ server: 3 })
        });

        const data = await response.json();
        
        return new Response(JSON.stringify(data), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // React endpoint
      if (path === '/api/react') {
        if (request.method !== 'POST') {
          return new Response(JSON.stringify({
            success: false,
            error: 'Method not allowed'
          }), {
            status: 405,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }

        // Get request body
        const body = await request.json();
        
        // Validate required fields
        if (!body.url || !body.reactions || !body.token) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Missing required fields: url, reactions, token'
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }

        // Forward to original API
        const response = await fetch('https://satriareact.satriadeveloperz.workers.dev/api/react', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: body.url,
            reactions: body.reactions,
            token: body.token,
            authToken: body.authToken || null,
            server: body.server || 3
          })
        });

        const data = await response.json();
        
        return new Response(JSON.stringify(data), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // Limits endpoint
      if (path === '/api/limits') {
        // Do handshake first to get limits
        const handshake = await fetch('https://satriareact.satriadeveloperz.workers.dev/api/handshake', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ server: 3 })
        });

        const data = await handshake.json();
        
        return new Response(JSON.stringify({
          success: true,
          freeLimit: data.freeLimit || 0,
          expires: data.expires || null,
          server: data.server || 3
        }), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // 404 - Not found
      return new Response(JSON.stringify({
        success: false,
        error: 'Endpoint not found',
        available: ['/api/status', '/api/handshake', '/api/react', '/api/limits']
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });

    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  }
};
