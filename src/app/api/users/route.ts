import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  // Verify caller is admin
  const serverSb = createServerClient()
  const { data: { user } } = await serverSb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { data: profile } = await serverSb.from('users').select('role, firm_id').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') return NextResponse.json({ error: 'Not admin' }, { status: 403 })

  const body = await request.json()
  const { email, password, full_name, role, hourly_rate, expected_monthly_hours, module_permissions } = body

  // Use service role to create user without affecting current session
  const adminSb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: authData, error: authErr } = await adminSb.auth.admin.createUser({
    email, password, email_confirm: true,
  })
  if (authErr || !authData.user) {
    return NextResponse.json({ error: authErr?.message || 'Failed to create auth user' }, { status: 400 })
  }

  const { error: dbErr } = await adminSb.from('users').insert({
    id: authData.user.id, firm_id: profile.firm_id,
    email, full_name, role, hourly_rate: hourly_rate || 0,
    expected_monthly_hours: expected_monthly_hours || 160,
    module_permissions: module_permissions || {},
  })
  if (dbErr) {
    return NextResponse.json({ error: dbErr.message }, { status: 400 })
  }

  return NextResponse.json({ id: authData.user.id })
}