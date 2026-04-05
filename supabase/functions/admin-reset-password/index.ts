import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const authHeader = req.headers.get('Authorization')

    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Verify requesting user is admin
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
    
    const userId = claimsData.claims.sub

    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle()

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Not admin' }), {
        status: 403,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const { email, new_password, request_id } = await req.json()

    if (!email || !new_password || !request_id) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Validate password strength
    if (new_password.length < 8) {
      return new Response(JSON.stringify({ error: 'Password too short' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Find user by email
    const { data: { users }, error: listErr } = await adminClient.auth.admin.listUsers()
    if (listErr) throw listErr

    const targetUser = users.find(u => u.email === email)
    if (!targetUser) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Update password
    const { error: updateErr } = await adminClient.auth.admin.updateUserById(targetUser.id, {
      password: new_password,
    })

    if (updateErr) throw updateErr

    // Mark request as resolved
    await adminClient
      .from('password_reset_requests')
      .update({ status: 'resolved', admin_response: 'Đã đổi mật khẩu thành công' })
      .eq('id', request_id)

    // Notify user
    await adminClient.from('notifications').insert({
      user_id: targetUser.id,
      type: 'password_reset_done',
      title: 'Mật khẩu đã được đổi',
      message: 'Admin đã đổi mật khẩu cho bạn. Vui lòng đăng nhập bằng mật khẩu mới.',
    })

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
